export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAgeOfMajority } from "@/lib/age-validation";
import { verifyCaptcha } from "@/lib/captcha";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { enforceRateLimitAsync, getClientIP } from "@/lib/security";
import { ensureProfileForIntent } from "@/lib/account-profiles";
import {
  recordConsentPreference,
  recordUserAcceptances,
  registrationDocumentKeys,
} from "@/lib/legal-acceptance";
import type { EntryAccountRole } from "@/lib/account-routes";

const schema = z.object({
  accessToken: z.string(),
  accountType: z.enum(["GUEST", "PROFESSIONAL", "PROPERTY_HOST"]).optional(),
  category: z.enum(["TRANS", "MULHER", "HOMEM"]).optional(),
  birthDate: z.string().optional(),
  lgpdConsent: z.boolean().default(false),
  termsConsent: z.boolean().default(false),
  ageConfirmed: z.boolean().default(false),
  captchaToken: z.string().optional(),
});

function publicAccountType(accountType: "GUEST" | "PROFESSIONAL" | "PROPERTY_HOST" | undefined) {
  if (accountType === "PROFESSIONAL") return "model";
  if (accountType === "PROPERTY_HOST") return "host";
  return "client";
}

function roleIntentFor(accountType: "GUEST" | "PROFESSIONAL" | "PROPERTY_HOST" | undefined): EntryAccountRole {
  if (accountType === "PROFESSIONAL") return "profissional";
  if (accountType === "PROPERTY_HOST") return "anfitriao";
  return "cliente";
}

function legacyRoleFor(accountType: "GUEST" | "PROFESSIONAL" | "PROPERTY_HOST" | undefined) {
  return accountType === "PROFESSIONAL" ? "HOST" : "GUEST";
}

function safeTokenInfo(token: string | undefined | null) {
  return {
    hasToken: Boolean(token),
    tokenLength: token?.length ?? 0,
  };
}

function isTrustedOAuthProvider(authUser: {
  app_metadata?: { provider?: unknown } | null;
  identities?: Array<{ provider?: string | null }> | null;
}) {
  const provider = typeof authUser.app_metadata?.provider === "string" ? authUser.app_metadata.provider : "";
  return provider === "google" || Boolean(authUser.identities?.some((identity) => identity.provider === "google"));
}

export async function POST(req: NextRequest) {
  const requestIp = getClientIP(req);
  const limited = await enforceRateLimitAsync(`register:${requestIp}`, 20, 60 * 60 * 1000, "Muitas tentativas de cadastro. Tente novamente mais tarde.");
  if (limited) return limited;

  try {
    const body = await req.json();
    const { accessToken, accountType, category, birthDate, lgpdConsent, termsConsent, ageConfirmed, captchaToken } = schema.parse(body);
    const profileIntent = roleIntentFor(accountType);
    const targetAccountType = publicAccountType(accountType);
    const headerCaptchaToken = req.headers.get("x-captcha-token");
    const effectiveCaptchaToken = captchaToken ?? headerCaptchaToken ?? "";

    console.info("[register] inicio", {
      accountType,
      profileIntent,
      hasAccessToken: Boolean(accessToken),
      bodyCaptcha: safeTokenInfo(captchaToken),
      headerCaptcha: safeTokenInfo(headerCaptchaToken),
      ip: requestIp,
    });

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data.user) {
      console.warn("[register] sessao Supabase invalida", {
        reason: error?.message ?? "usuario ausente",
        hasAccessToken: Boolean(accessToken),
        captcha: safeTokenInfo(effectiveCaptchaToken),
        ip: requestIp,
      });
      return NextResponse.json({ error: "Sessão Supabase inválida." }, { status: 401 });
    }

    const authUser = data.user;
    const trustedOAuthProvider = isTrustedOAuthProvider(authUser);
    const phone = authUser.phone?.replace(/\D/g, "").replace(/^55/, "");
    const email = authUser.email ?? (phone ? `phone_${phone}@sms.elitemodell.local` : null);

    if (!email) {
      return NextResponse.json({ error: "E-mail ou telefone não encontrado." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    const shouldValidateCaptcha = !existing && !trustedOAuthProvider;

    if (shouldValidateCaptcha) {
      console.info("[register] validando CAPTCHA", {
        reason: "novo cadastro sem provedor OAuth confiavel",
        captcha: safeTokenInfo(effectiveCaptchaToken),
        ip: requestIp,
      });
      const captcha = await verifyCaptcha(effectiveCaptchaToken, requestIp);
      if (!captcha.success) {
        console.warn("[register] CAPTCHA bloqueou cadastro", {
          providerError: captcha.error,
          captcha: safeTokenInfo(effectiveCaptchaToken),
          ip: requestIp,
        });
        return NextResponse.json({ error: "Não foi possível validar a proteção anti-spam. Tente novamente." }, { status: 403 });
      }
      console.info("[register] CAPTCHA validado", {
        captcha: safeTokenInfo(effectiveCaptchaToken),
        ip: requestIp,
      });
    } else {
      console.info("[register] CAPTCHA dispensado", {
        reason: existing ? "usuario existente autenticado" : "provedor OAuth confiavel",
        trustedOAuthProvider,
        existingUser: Boolean(existing),
        captcha: safeTokenInfo(effectiveCaptchaToken),
        ip: requestIp,
      });
    }

    const hasBirthDate = Boolean(birthDate || existing?.birthDate);
    const birthDateIsValid = birthDate ? isAgeOfMajority(birthDate) : Boolean(existing?.birthDate);

    if (!hasBirthDate || !birthDateIsValid) {
      return NextResponse.json({ error: "Você deve ter 18 anos ou mais para se registrar." }, { status: 400 });
    }

    if (!ageConfirmed) {
      return NextResponse.json({ error: "Confirme que voce e maior de 18 anos para se registrar." }, { status: 400 });
    }

    if (!(lgpdConsent || existing?.lgpdConsent) || !(termsConsent || existing?.termsConsent)) {
      return NextResponse.json({ error: "Você deve aceitar os Termos de Uso e a Política de Privacidade." }, { status: 400 });
    }

    if (existing) {
      const user = await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: existing.name ?? (authUser.user_metadata?.name as string | undefined) ?? null,
          image: existing.image ?? (authUser.user_metadata?.avatar_url as string | undefined) ?? null,
          phone: existing.phone ?? phone ?? null,
          accountType: targetAccountType === "client" ? existing.accountType : targetAccountType,
          role: existing.role === "ADMIN" ? "ADMIN" : targetAccountType === "model" ? "HOST" : existing.role,
          category: targetAccountType === "model" ? category ?? existing.category : existing.category,
          birthDate: birthDate ? new Date(birthDate) : existing.birthDate,
          lgpdConsent: existing.lgpdConsent || lgpdConsent,
          termsConsent: existing.termsConsent || termsConsent,
          consentDate: existing.consentDate ?? new Date(),
        },
        select: { id: true, name: true, email: true, role: true, accountType: true },
      });

      await ensureProfileForIntent(user.id, profileIntent, category);
      await recordUserAcceptances({
        userId: user.id,
        userCategory: user.accountType,
        documentKeys: registrationDocumentKeys(user.accountType),
        source: "auth-register",
        acceptanceType: "REGISTRATION",
        req,
      });
      await recordConsentPreference({
        userId: user.id,
        purpose: "PRIVACY_POLICY",
        granted: true,
        source: "auth-register",
        req,
      });
      return NextResponse.json(user, { status: 200 });
    }

    if (!birthDate) {
      return NextResponse.json({ error: "Você deve ter 18 anos ou mais para se registrar." }, { status: 400 });
    }

    const user = await prisma.user.create({
      data: {
        email,
        name: (authUser.user_metadata?.name as string | undefined) ?? authUser.email ?? phone ?? null,
        image: (authUser.user_metadata?.avatar_url as string | undefined) ?? null,
        phone: phone ?? null,
        role: legacyRoleFor(accountType),
        accountType: targetAccountType,
        category: targetAccountType === "model" ? category ?? null : null,
        birthDate: new Date(birthDate),
        lgpdConsent,
        termsConsent,
        consentDate: new Date(),
        clientProfile: { create: {} },
      },
      select: { id: true, name: true, email: true, role: true, accountType: true },
    });

    await ensureProfileForIntent(user.id, profileIntent, category);
    await recordUserAcceptances({
      userId: user.id,
      userCategory: user.accountType,
      documentKeys: registrationDocumentKeys(user.accountType),
      source: "auth-register",
      acceptanceType: "REGISTRATION",
      req,
    });
    await recordConsentPreference({
      userId: user.id,
      purpose: "PRIVACY_POLICY",
      granted: true,
      source: "auth-register",
      req,
    });
    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error("[register]", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

import { monitorRegistration, registrationIdentity, registrationAccountType } from "@/lib/registration-monitor";
import { readPendingProfessionalPhone } from "@/lib/professional-phone-registration";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { isAgeOfMajority } from "@/lib/age-validation";
import { AuthEmailDeliveryError, buildAuthEmail, sendAuthEmail } from "@/lib/auth-email";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { enforceRateLimitAsync, getClientIP } from "@/lib/security";
import { canonicalizeRequestedEmailCallback } from "@/lib/email-auth-callback";
import { createEmailSignupSuccessPayload } from "@/lib/email-verification-attempt";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  redirectTo: z.string().url(),
  accountType: z.enum(["GUEST", "PROFESSIONAL", "PROPERTY_HOST"]).default("GUEST"),
  category: z.enum(["TRANS", "MULHER", "HOMEM"]).optional(),
  birthDate: z.string().min(8),
  lgpdConsent: z.boolean(),
  termsConsent: z.boolean(),
  ageConfirmed: z.boolean(),
  captchaToken: z.string().optional(),
  name: z.string().min(2),
  role: z.string().optional(),
  attemptId: z.string().uuid(),
});

function publicErrorForSupabase(message?: string) {
  const normalized = (message ?? "").toLowerCase();
  if (normalized.includes("password")) return "Senha fraca. Use no minimo 6 caracteres.";
  if (normalized.includes("email")) return "Email invalido ou ja cadastrado.";
  return "Nao foi possivel criar o cadastro agora.";
}

class EmailSignupError extends Error {
  constructor(message: string, public status = 400, public code = "email_signup_failed") {
    super(message);
  }
}

function isAlreadyRegistered(error: { code?: string; message: string }) {
  return error.code === "user_already_exists" || error.code === "email_exists"
    || /already (been )?(registered|in use|exists)/i.test(error.message);
}

async function generateSignupLink(input: z.infer<typeof schema>) {
  const supabase = createSupabaseServerClient();
  const metadata = {
    role: input.role,
    accountType: input.accountType,
    category: input.accountType === "PROFESSIONAL" ? input.category : undefined,
    birthDate: input.birthDate,
    lgpdConsent: input.lgpdConsent,
    termsConsent: input.termsConsent,
    ageConfirmed: input.ageConfirmed,
    name: input.name,
    captchaToken: input.captchaToken,
  };

  const signup = await supabase.auth.admin.generateLink({
    type: "signup",
    email: input.email,
    password: input.password,
    options: {
      redirectTo: input.redirectTo,
      data: metadata,
    },
  });

  if (!signup.error) {
    return { actionType: "signup" as const, data: signup.data };
  }

  if (isAlreadyRegistered(signup.error)) {
    throw new EmailSignupError(
      "Este email ja esta cadastrado. Entre com sua senha ou use Recuperar senha.",
      409,
      "user_already_exists"
    );
  }

  const status = signup.error.status ?? 500;
  if (status >= 500) throw new EmailSignupError("Não foi possível criar o cadastro agora.", 502, "SUPABASE_SIGNUP_FAILED");
  if (status === 429) throw new EmailSignupError("Muitas tentativas. Aguarde e tente novamente.", 429, "SUPABASE_SIGNUP_LIMIT");
  throw new EmailSignupError(publicErrorForSupabase(signup.error.message));
}

export const POST = monitorRegistration("EMAIL_SEND", async (req, trace) => {
  const requestIp = getClientIP(req);
  const limited = await enforceRateLimitAsync(
    `email-signup:${requestIp}`,
    10,
    60 * 60 * 1000,
    "Muitas tentativas de cadastro. Tente novamente mais tarde."
  );
  if (limited) return limited;

  try {
    const body = schema.parse(await req.json());
    const email = body.email.trim().toLowerCase();
    trace.accountType = registrationAccountType(body.accountType);
    trace.identity = registrationIdentity("email", email);
    if (trace.accountType === "model") {
      try {
        const pending = readPendingProfessionalPhone(req);
        if (pending) trace.identity = registrationIdentity("phone", pending.phone);
      } catch {
        // Expired phone proof does not prevent requesting an email.
      }
    }
    trace.provider = "SUPABASE";
    let redirectTo: string;
    try {
      redirectTo = canonicalizeRequestedEmailCallback(body.redirectTo);
    } catch {
      throw new EmailSignupError("URL de confirmação inválida.", 400, "invalid_redirect");
    }

    if (!isAgeOfMajority(body.birthDate) || !body.ageConfirmed) {
      return NextResponse.json({ error: "Voce deve ter 18 anos ou mais para se registrar." }, { status: 400 });
    }

    if (!body.termsConsent || !body.lgpdConsent) {
      return NextResponse.json(
        { error: "Aceite os Termos de Uso e a Politica de Privacidade para continuar." },
        { status: 400 }
      );
    }

    if (body.accountType === "PROFESSIONAL" && !body.category) {
      return NextResponse.json({ error: "Selecione a categoria do anuncio." }, { status: 400 });
    }

    const generated = await generateSignupLink({ ...body, email, redirectTo });
    const properties = generated.data.properties;
    const tokenHash = properties?.hashed_token;
    if (!tokenHash) {
      console.error("[email-signup] Supabase nao retornou hashed_token", {
        actionType: generated.actionType,
        hasProperties: Boolean(properties),
      });
      return NextResponse.json({ error: "Nao foi possivel gerar o link de confirmacao." }, { status: 500 });
    }

    const authEmail = buildAuthEmail({
      user: { email },
      email_data: {
        token: "",
        token_hash: tokenHash,
        redirect_to: properties.redirect_to || redirectTo,
        email_action_type: generated.actionType,
        site_url: process.env.NEXT_PUBLIC_APP_URL || "https://www.elitemodell.com.br",
        action_link: properties.action_link,
      },
    });

    if (!authEmail) {
      return NextResponse.json({ error: "Nao foi possivel montar o email de confirmacao." }, { status: 500 });
    }

    trace.provider = "RESEND";
    trace.providerReference = (await sendAuthEmail(email, authEmail, {
      category: "REGISTRATION_" + trace.accountType.toUpperCase(),
      idempotencyKey: "signup/" + generated.data.user.id + "/" + body.attemptId,
      retryTransient: true,
    })) ?? undefined;
    const successPayload = createEmailSignupSuccessPayload({
      userId: generated.data.user.id,
      email,
      attemptId: body.attemptId,
      actionType: generated.actionType,
    });
    console.info("[email-signup] solicitacao aceita pelo provedor", {
      emailDomain: email.split("@")[1] ?? "unknown",
      actionType: generated.actionType,
      draftSession: false,
    });

    return NextResponse.json(successPayload, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });
    }
    if (err instanceof EmailSignupError) {
      trace.reason = err.code;
      console.info("[email-signup] cadastro recusado", {
        code: err.code,
        status: err.status,
        requestIp,
      });
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    trace.reason = trace.provider === "RESEND" ? "EMAIL_SEND_FAILED" : "SIGNUP_ERROR";
    if (err instanceof AuthEmailDeliveryError) {
      trace.reason = err.reason;
      trace.providerCode = err.providerStatus;
    }
    console.error("[email-signup] falha inesperada", {
      errorType: err instanceof Error ? err.name : "unknown",
    });
    return NextResponse.json(
      { error: "Nao foi possivel enviar o email de confirmacao." },
      { status: 500 }
    );
  }
});

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAgeOfMajority } from "@/lib/age-validation";
import { buildAuthEmail, sendAuthEmail } from "@/lib/auth-email";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { enforceRateLimitAsync, getClientIP } from "@/lib/security";

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

function isAlreadyRegistered(message?: string) {
  return /already|registered|exists|user/i.test(message ?? "");
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

  if (isAlreadyRegistered(signup.error.message)) {
    throw new EmailSignupError(
      "Este email ja esta cadastrado. Entre com sua senha ou use Recuperar senha.",
      409,
      "user_already_exists"
    );
  }

  throw new EmailSignupError(publicErrorForSupabase(signup.error.message));
}

export async function POST(req: NextRequest) {
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

    const generated = await generateSignupLink({ ...body, email });
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
        redirect_to: properties.redirect_to || body.redirectTo,
        email_action_type: generated.actionType,
        site_url: process.env.NEXT_PUBLIC_APP_URL || "https://www.elitemodell.com.br",
        action_link: properties.action_link,
      },
    });

    if (!authEmail) {
      return NextResponse.json({ error: "Nao foi possivel montar o email de confirmacao." }, { status: 500 });
    }

    await sendAuthEmail(email, authEmail);
    console.info("[email-signup] email enviado", {
      email,
      actionType: generated.actionType,
      requestIp,
    });

    return NextResponse.json({ ok: true, email, actionType: generated.actionType });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });
    }
    if (err instanceof EmailSignupError) {
      console.info("[email-signup] cadastro recusado", {
        code: err.code,
        status: err.status,
        requestIp,
      });
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("[email-signup]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Nao foi possivel enviar o email de confirmacao." },
      { status: 500 }
    );
  }
}

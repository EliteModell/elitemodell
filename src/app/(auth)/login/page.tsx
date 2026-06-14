"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- Existing auth error payloads are provider-specific. */

import { Suspense, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, BadgeCheck, Eye, EyeOff, Globe2, LockKeyhole, Sparkles } from "lucide-react";
import { EntryChoiceCards, EntryChoiceStyles } from "@/components/EntryChoiceSheet";
import { supabaseAuth } from "@/lib/supabase-client";
import { ACCOUNT_ROUTES, normalizeEntryRole, postLoginPathFromUser } from "@/lib/account-routes";
import { buildAuthCallbackUrl } from "@/lib/auth-redirect";

const GOLD = "#d4a843";
const GOLD_GRADIENT = "linear-gradient(135deg, #ffe5a0 0%, #d4a843 22%, #f5d78c 45%, #9e7b2a 72%, #d4a843 100%)";
const PROPERTY_DRAFT_KEY = "elitemodell_location_onboarding_v2";
const PROPERTY_DRAFT_FINAL_PATH = ACCOUNT_ROUTES.onboardingAnfitriao;
const ROLE_INTENT_KEY = "elitemodell_login_role_intent";
const ROLE_INTENT_COOKIE = "elitemodell_login_role_intent";
const PROFESSIONAL_CATEGORIES = ["MULHER", "HOMEM", "TRANS"];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: 8,
  color: "#f1f5f9",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

const focusGold = (e: React.FocusEvent<HTMLInputElement>) =>
  (e.target.style.borderColor = GOLD);
const blurGray = (e: React.FocusEvent<HTMLInputElement>) =>
  (e.target.style.borderColor = "#1e293b");

const authMsg: Record<string, string> = {
  invalid_credentials: "E-mail ou senha inválidos.",
  user_not_found: "E-mail não cadastrado.",
  over_request_rate_limit: "Muitas tentativas. Tente mais tarde.",
};

const GoogleIcon = (
  <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#EA4335" d="M5.27 9.76A7.08 7.08 0 0112 4.9c1.84 0 3.5.67 4.79 1.77l3.56-3.56A11.96 11.96 0 0012 .96C7.43.96 3.48 3.77 1.6 7.76l3.67 2z" />
    <path fill="#34A853" d="M16.04 18.02A7.06 7.06 0 0112 19.1c-2.96 0-5.49-1.82-6.64-4.44l-3.68 2.01C3.59 20.3 7.5 23.04 12 23.04c2.93 0 5.72-1.08 7.81-3.01l-3.77-2.01z" />
    <path fill="#4A90D9" d="M19.81 20.03A11.95 11.95 0 0023.04 12c0-.72-.07-1.47-.2-2.18H12v4.36h6.19a5.26 5.26 0 01-2.29 3.45l3.91 2.4z" />
    <path fill="#FBBC05" d="M5.36 14.66A7.17 7.17 0 014.9 12c0-.92.16-1.8.46-2.62L1.6 7.37A11.97 11.97 0 00.96 12c0 1.63.33 3.18.93 4.6l3.47-1.94z" />
  </svg>
);

function safeInternalPath(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return value.startsWith("/") && !value.startsWith("//") ? value : null;
  }
}

async function getPostLoginPath(returnUrl: string | null, roleIntent: ReturnType<typeof normalizeEntryRole>) {
  const safeReturnUrl = safeInternalPath(returnUrl);
  if (safeReturnUrl && !roleIntent) return safeReturnUrl;
  if (roleIntent === "anfitriao" && localStorage.getItem(PROPERTY_DRAFT_KEY)) return PROPERTY_DRAFT_FINAL_PATH;

  const res = await fetch("/api/users/me");
  if (!res.ok) return fallbackPathForRoleIntent(roleIntent);
  const user = await res.json();
  const hasProfessionalAccess =
    Boolean(user?.professional) ||
    user?.accountType === "model" ||
    user?.accountType === "professional" ||
    PROFESSIONAL_CATEGORIES.includes(user?.category ?? "");
  if (roleIntent === "profissional" && !hasProfessionalAccess) {
    return `${ACCOUNT_ROUTES.cadastro}?tipo=acompanhante`;
  }
  if (roleIntent) return postLoginPathFromUser(user, roleIntent);
  if (!user?.lgpdConsent || !user?.termsConsent || !user?.birthDate) return "/completar-cadastro";
  return postLoginPathFromUser(user, roleIntent);
}

async function clearInvalidAuthState() {
  await supabaseAuth.auth.signOut().catch(() => undefined);
  await signOut({ redirect: false }).catch(() => undefined);
}

function fallbackPathForRoleIntent(roleIntent: ReturnType<typeof normalizeEntryRole>) {
  if (roleIntent === "profissional") return ACCOUNT_ROUTES.onboardingAcompanhante;
  if (roleIntent === "anfitriao") return ACCOUNT_ROUTES.onboardingAnfitriao;
  return ACCOUNT_ROUTES.dashboardCliente;
}

function rememberRoleIntent(roleIntent: ReturnType<typeof normalizeEntryRole>) {
  if (!roleIntent) return;
  sessionStorage.setItem(ROLE_INTENT_KEY, roleIntent);
  localStorage.setItem(ROLE_INTENT_KEY, roleIntent);
  const domain = window.location.hostname.endsWith("elitemodell.com.br")
    ? "; Domain=.elitemodell.com.br"
    : "";
  document.cookie = `${ROLE_INTENT_COOKIE}=${encodeURIComponent(roleIntent)}; Max-Age=900; Path=/${domain}; SameSite=Lax; Secure`;
}

function inferRoleIntentFromReturnUrl(returnUrl: string | null) {
  const safeReturnUrl = safeInternalPath(returnUrl);
  if (!safeReturnUrl) return null;
  if (safeReturnUrl.startsWith("/profissional") || safeReturnUrl.startsWith("/verificacao/acompanhante") || safeReturnUrl.startsWith("/painel/acompanhante")) {
    return "profissional" as const;
  }
  if (safeReturnUrl.startsWith("/anfitriao") || safeReturnUrl.startsWith("/verificacao/anfitriao") || safeReturnUrl.startsWith("/painel/anfitriao")) {
    return "anfitriao" as const;
  }
  if (safeReturnUrl.startsWith("/dashboard") || safeReturnUrl.startsWith("/painel/cliente")) {
    return "cliente" as const;
  }
  return null;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") ?? searchParams.get("redirectTo");
  const roleIntent = normalizeEntryRole(searchParams.get("role")) ?? inferRoleIntentFromReturnUrl(returnUrl);
  const signupHref =
    roleIntent === "profissional"
      ? `${ACCOUNT_ROUTES.cadastro}?tipo=acompanhante`
      : roleIntent === "anfitriao"
        ? ACCOUNT_ROUTES.onboardingAnfitriao
        : roleIntent === "cliente"
          ? `${ACCOUNT_ROUTES.cadastro}?tipo=cliente`
          : ACCOUNT_ROUTES.cadastro;
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  function handleBack() {
    router.back();
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabaseAuth.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (error || !data.session?.access_token) throw error ?? new Error("E-mail ou senha inválidos.");
      const res = await signIn("supabase", { accessToken: data.session.access_token, roleIntent: roleIntent ?? "", redirect: false });

      if (res?.error) {
        await clearInvalidAuthState();
        console.error("[login] NextAuth recusou sessão Supabase", { error: res.error, roleIntent });
        toast.error("Erro ao entrar. Tente novamente.");
      } else {
        toast.success("Bem-vindo de volta!");
        router.push(await getPostLoginPath(returnUrl, roleIntent));
        router.refresh();
      }
    } catch (err: any) {
      toast.error(authMsg[err?.code] ?? err?.message ?? "E-mail ou senha inválidos.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      const effectiveReturnUrl = returnUrl
        ?? (roleIntent === "profissional"
          ? ACCOUNT_ROUTES.dashboardAcompanhante
          : roleIntent === "anfitriao"
            ? ACCOUNT_ROUTES.dashboardAnfitriao
            : null);
      const callbackParams = [
        effectiveReturnUrl ? `returnUrl=${encodeURIComponent(effectiveReturnUrl)}` : "",
        roleIntent ? `role=${roleIntent}` : "",
      ].filter(Boolean).join("&");
      rememberRoleIntent(roleIntent);
      const { error } = await supabaseAuth.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: buildAuthCallbackUrl(callbackParams),
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao entrar com Google.");
    } finally {
      setLoading(false);
    }
  }

  if (!roleIntent && !returnUrl) {
    return (
      <main className="auth-login-page">
        <header className="auth-topbar">
          <button type="button" onClick={handleBack} aria-label="Voltar">
            <ArrowLeft size={18} />
          </button>
          <Link href="/" className="auth-brand" aria-label="Elite Modell">
            <span>elite</span>
            <strong>modell</strong>
          </Link>
          <span className="country-pill"><Globe2 size={14} /> Brasil</span>
        </header>

        <section className="login-hero" aria-labelledby="login-choice-title">
          <div className="login-mark"><Sparkles size={24} /></div>
          <p className="eyebrow">Acesso por tipo de conta</p>
          <h1 id="login-choice-title">Entrar como</h1>
          <p>Escolha a área correta para acessar o painel certo sem misturar cliente, profissional e anfitrião.</p>
        </section>

        <section className="auth-card" aria-label="Escolha de login">
          <div className="gold-line" />
          <EntryChoiceCards mode="login" />
          <div className="signup-block">
            <p>Ainda não tem conta?</p>
            <Link href={signupHref}>Cadastre-se</Link>
          </div>
        </section>

        <EntryChoiceStyles />
        {loginPageStyles}
      </main>
    );
  }

  return (
    <main className="auth-login-page">
      <header className="auth-topbar">
        <button type="button" onClick={handleBack} aria-label="Voltar">
          <ArrowLeft size={18} />
        </button>
        <Link href="/" className="auth-brand" aria-label="Elite Modell">
          <span>elite</span>
          <strong>modell</strong>
        </Link>
        <span className="country-pill"><Globe2 size={14} /> Brasil</span>
      </header>

      <section className="login-hero" aria-labelledby="login-title">
        <div className="login-mark"><Sparkles size={24} /></div>
        <p className="eyebrow">Acesse a Elite Modell</p>
        <h1 id="login-title">Entre como {roleIntent === "profissional" ? "profissional" : roleIntent === "anfitriao" ? "anfitrião" : roleIntent === "cliente" ? "cliente" : "sua conta"}</h1>
        <p>Descubra novidades, gerencie sua conta e continue no painel correto em um ambiente premium.</p>
      </section>

      <section className="auth-card" aria-label="Login">
        <div className="gold-line" />
        <div id="recaptcha-container" />

        <button className="google-button" type="button" onClick={handleGoogle} disabled={loading}>
          {GoogleIcon}
          Entrar com Google
        </button>

        <div className="divider"><span>ou acesse com email</span></div>

        <form onSubmit={handleEmailLogin} className="auth-form">
          <label>
            <span>E-mail</span>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="seu@email.com" style={inputStyle} onFocus={focusGold} onBlur={blurGray} />
          </label>

          <label>
            <span>Senha</span>
            <div className="password-field">
              <input type={showPassword ? "text" : "password"} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Sua senha" style={inputStyle} onFocus={focusGold} onBlur={blurGray} />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <div className="security-box">
            <BadgeCheck size={20} />
            <span>Acesso protegido com verificação de sessão e navegação discreta.</span>
          </div>

          <button type="submit" disabled={loading} className="primary-auth-button">
            {loading ? "Entrando..." : "Fazer login"}
          </button>
        </form>

        <Link href="/esqueci-senha" className="forgot-link">Esqueceu sua senha?</Link>

        <div className="signup-block">
          <p>Ainda não tem conta?</p>
          <Link href={signupHref}>Cadastre-se</Link>
        </div>
      </section>

      <section className="trust-section" aria-label="Sobre a Elite Modell">
        <Link href="/" className="footer-brand" aria-label="Elite Modell">
          <span>elite</span>
          <strong>modell</strong>
        </Link>
        <div className="restricted-badge"><LockKeyhole size={18} /> Ambiente restrito a maiores de 18 anos</div>
        <p>
          A Elite Modell conecta clientes, profissionais e locais reservados com foco em discricao, seguranca e uma
          experiencia premium. Navegue por perfis e oportunidades em um ambiente pensado para privacidade.
        </p>
      </section>

      <section className="link-groups" aria-label="Informações">
        <div>
          <h2>Legal</h2>
          <Link href="/terms">Termos de Uso</Link>
          <Link href="/privacy">Política de Privacidade</Link>
        </div>
        <div>
          <h2>Suporte</h2>
          <Link href="/dashboard/informacoes">Central de ajuda</Link>
          <Link href="/esqueci-senha">Recuperar senha</Link>
        </div>
        <div>
          <h2>Segurança</h2>
          <Link href="/dashboard/verificacao-idade">Verificação de conta</Link>
          <Link href="/privacy">Como cuidamos dos seus dados</Link>
        </div>
      </section>

      <section className="visibility-section">
        <h2>Aumente sua visibilidade</h2>
        <Link href={ACCOUNT_ROUTES.cadastroAcompanhante} className="secondary-cta">Ativar perfil profissional</Link>
        <Link href={ACCOUNT_ROUTES.cadastroAnfitriao} className="outline-cta">Cadastrar local reservado</Link>
      </section>

      <footer className="auth-footer">
        <div className="social-row" aria-hidden="true">
          <span>IG</span>
          <span>X</span>
          <span>TT</span>
          <span>FB</span>
        </div>
        <p>Direitos autorais 2026 © Elite Modell</p>
      </footer>

      {loginPageStyles}
    </main>
  );
}

const loginPageStyles = (
  <style>{`
        .auth-login-page {
          width: 100%;
          max-width: 430px;
          min-height: 100dvh;
          margin: 0 auto;
          padding: max(16px, env(safe-area-inset-top)) 16px 0;
          color: #fff;
          overflow-x: hidden;
        }
        .auth-topbar {
          display: grid;
          grid-template-columns: 44px 1fr auto;
          align-items: center;
          gap: 10px;
          margin-bottom: 28px;
        }
        .auth-topbar button {
          width: 42px;
          height: 42px;
          border-radius: 999px;
          border: 1px solid rgba(214,168,58,0.25);
          background: rgba(11,11,13,0.82);
          color: #f5d77a;
          display: grid;
          place-items: center;
        }
        .auth-brand,
        .footer-brand {
          display: inline-flex;
          align-items: baseline;
          gap: 1px;
          text-decoration: none;
          font-size: 22px;
          font-weight: 950;
          justify-self: center;
        }
        .auth-brand span,
        .footer-brand span {
          background: ${GOLD_GRADIENT};
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .auth-brand strong,
        .footer-brand strong {
          color: #fff;
          font: inherit;
        }
        .country-pill {
          min-height: 36px;
          border: 1px solid rgba(214,168,58,0.18);
          border-radius: 999px;
          background: rgba(16,16,20,0.72);
          color: #b8b8b8;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0 10px;
          font-size: 12px;
          font-weight: 800;
        }
        .login-hero {
          text-align: center;
          margin-bottom: 22px;
        }
        .login-mark {
          width: 58px;
          height: 58px;
          margin: 0 auto 16px;
          border-radius: 18px;
          border: 1px solid rgba(214,168,58,0.28);
          background: rgba(214,168,58,0.10);
          color: #f5d77a;
          display: grid;
          place-items: center;
          box-shadow: 0 22px 60px rgba(214,168,58,0.10);
        }
        .eyebrow {
          margin: 0 0 8px;
          color: #d6a83a;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .login-hero h1 {
          margin: 0;
          color: #fff;
          font-size: clamp(30px, 9vw, 42px);
          line-height: 1.04;
          font-weight: 950;
          letter-spacing: 0;
          text-wrap: balance;
        }
        .login-hero p {
          margin: 12px auto 0;
          color: #b8b8b8;
          font-size: 15px;
          line-height: 1.62;
          max-width: 360px;
        }
        .auth-card,
        .trust-section,
        .link-groups,
        .visibility-section {
          position: relative;
          border: 1px solid rgba(214,168,58,0.25);
          border-radius: 24px;
          background: linear-gradient(180deg, rgba(20,20,20,0.98), rgba(11,11,13,0.98));
          box-shadow: 0 24px 70px rgba(0,0,0,0.34);
        }
        .auth-card {
          overflow: hidden;
          padding: 24px 18px 20px;
        }
        .gold-line {
          position: absolute;
          inset: 0 0 auto;
          height: 2px;
          background: linear-gradient(90deg, transparent, #d6a83a 32%, #f5d77a 50%, #d6a83a 68%, transparent);
        }
        .google-button {
          width: 100%;
          min-height: 54px;
          border: 1px solid rgba(255,255,255,0.16);
          border-radius: 18px;
          background: rgba(255,255,255,0.94);
          color: #101014;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 18px 0;
          color: #777;
          font-size: 12px;
          font-weight: 800;
        }
        .divider::before,
        .divider::after {
          content: "";
          height: 1px;
          flex: 1;
          background: rgba(214,168,58,0.14);
        }
        .auth-form {
          display: grid;
          gap: 16px;
        }
        .auth-form label > span {
          display: block;
          margin-bottom: 7px;
          color: #d6a83a;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .auth-form input {
          min-height: 58px;
          border-radius: 18px !important;
          background: rgba(11,11,13,0.94) !important;
          border-color: rgba(214,168,58,0.28) !important;
          color: #fff !important;
          padding: 15px 16px !important;
          font-size: 15px !important;
        }
        .auth-form input::placeholder {
          color: rgba(184,184,184,0.56);
        }
        .password-field {
          position: relative;
        }
        .password-field input {
          padding-right: 52px !important;
        }
        .password-field button {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          width: 42px;
          height: 42px;
          border: 0;
          border-radius: 14px;
          background: transparent;
          color: #b8b8b8;
          display: grid;
          place-items: center;
        }
        .security-box {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          border: 1px solid rgba(214,168,58,0.20);
          border-left: 4px solid #d6a83a;
          border-radius: 16px;
          background: rgba(214,168,58,0.08);
          color: #d7d7d7;
          padding: 13px;
          font-size: 13px;
          line-height: 1.45;
        }
        .security-box svg {
          color: #f5d77a;
          flex: 0 0 auto;
        }
        .primary-auth-button,
        .signup-block a,
        .secondary-cta {
          min-height: 58px;
          border: 0;
          border-radius: 18px;
          background: linear-gradient(135deg, #f5d77a, #d6a83a 45%, #a77818);
          color: #070707;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-size: 15px;
          font-weight: 950;
          box-shadow: 0 20px 52px rgba(214,168,58,0.24);
        }
        .primary-auth-button:disabled {
          opacity: 0.62;
        }
        .forgot-link {
          display: block;
          margin: 18px 0 0;
          color: #f5d77a;
          text-align: center;
          text-decoration: none;
          font-weight: 850;
        }
        .signup-block {
          margin-top: 24px;
          padding-top: 22px;
          border-top: 1px solid rgba(214,168,58,0.18);
          text-align: center;
        }
        .signup-block p {
          margin: 0 0 14px;
          color: #b8b8b8;
          font-size: 15px;
        }
        .signup-block a {
          width: 100%;
          background: transparent;
          color: #f5d77a;
          border: 1px solid rgba(214,168,58,0.45);
          box-shadow: none;
        }
        .trust-section {
          margin-top: 26px;
          padding: 24px 18px;
        }
        .footer-brand {
          justify-self: start;
          margin-bottom: 14px;
        }
        .restricted-badge {
          width: fit-content;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 14px;
          background: rgba(214,168,58,0.12);
          border: 1px solid rgba(214,168,58,0.24);
          color: #f5d77a;
          padding: 10px 12px;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
        }
        .trust-section p {
          margin: 18px 0 0;
          color: #b8b8b8;
          font-size: 15px;
          line-height: 1.65;
        }
        .link-groups {
          margin-top: 18px;
          padding: 24px 18px;
          display: grid;
          gap: 24px;
        }
        .link-groups h2,
        .visibility-section h2 {
          margin: 0 0 12px;
          color: #fff;
          font-size: 17px;
          font-weight: 950;
        }
        .link-groups a {
          display: block;
          color: #b8b8b8;
          text-decoration: none;
          padding: 7px 0;
          font-size: 15px;
        }
        .visibility-section {
          margin-top: 18px;
          padding: 24px 18px;
        }
        .secondary-cta,
        .outline-cta {
          width: 100%;
          margin-top: 12px;
        }
        .outline-cta {
          min-height: 56px;
          border: 1px solid rgba(214,168,58,0.35);
          border-radius: 18px;
          background: rgba(16,16,20,0.88);
          color: #f5d77a;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-weight: 900;
        }
        .auth-footer {
          margin: 28px -16px 0;
          padding: 30px 16px calc(30px + env(safe-area-inset-bottom));
          background: #101010;
          border-top: 1px solid rgba(214,168,58,0.18);
          text-align: center;
        }
        .social-row {
          display: flex;
          justify-content: center;
          gap: 22px;
          color: #fff;
          font-weight: 950;
          font-size: 18px;
          margin-bottom: 18px;
        }
        .auth-footer p {
          margin: 0;
          color: #b8b8b8;
          font-size: 13px;
        }
        @media (min-width: 768px) {
          .auth-login-page {
            max-width: 520px;
            padding-top: 28px;
          }
        }
  `}</style>
);

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}

"use client";
/* eslint-disable @next/next/no-img-element -- The logo is an SVG brand asset. */

import { useEffect, useMemo, useState } from "react";
import type { ConfirmationResult, RecaptchaVerifier } from "firebase/auth";
import { signInWithPhoneNumber } from "firebase/auth";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, CheckCircle2, Info, Menu, Phone, ShieldCheck } from "lucide-react";
import { getFirebaseClientAuth } from "@/lib/firebase/client";

type FlowMode = "client" | "model" | "host";
type ScreenMode = "register" | "verify";
type OtpStatus = "idle" | "sending" | "sent" | "verifying" | "verified" | "error";

type StoredConsent = {
  termsConsent?: boolean;
  lgpdConsent?: boolean;
  ageConfirmed?: boolean;
  ownershipConfirmed?: boolean;
};

let firebaseConfirmationResult: ConfirmationResult | null = null;
let firebaseRecaptchaVerifier: RecaptchaVerifier | null = null;

const GOLD = "#c9a84c";
const INK = "#1f2a32";
const PHONE_STORAGE_KEY: Record<FlowMode, string> = {
  client: "elitemodell_client_phone",
  model: "elitemodell_model_phone",
  host: "elitemodell_host_phone",
};
const CONSENT_STORAGE_KEY: Record<FlowMode, string> = {
  client: "elitemodell_client_phone_consent",
  model: "elitemodell_model_phone_consent",
  host: "elitemodell_host_phone_consent",
};
const REGISTER_ROUTE: Record<FlowMode, string> = {
  client: "/app/consumer/register",
  model: "/cadastro-modelo",
  host: "/cadastro-anfitriao",
};
const VERIFY_ROUTE: Record<FlowMode, string> = {
  client: "/app/consumer/verify-phone",
  model: "/cadastro-modelo/verificar-telefone",
  host: "/cadastro-anfitriao/verificar-telefone",
};

const copy: Record<FlowMode, {
  title: React.ReactNode;
  phoneLabel: string;
  phonePlaceholder: string;
  hint: string;
  submit: string;
  loginHref: string;
  loginLabel: string;
  ownershipLabel?: string;
  verifyBack: string;
}> = {
  client: {
    title: "Vamos verificar o seu telefone",
    phoneLabel: "Numero de telefone",
    phonePlaceholder: "+55 11 96123 4567",
    hint: "Esta etapa e obrigatoria para manter sua conta segura. Este numero nao sera exibido publicamente.",
    submit: "Enviar codigo via SMS",
    loginHref: "/app/consumer/login",
    loginLabel: "Ja tenho uma conta",
    verifyBack: "/app/consumer/register",
  },
  model: {
    title: "Vamos verificar o seu telefone",
    phoneLabel: "Numero de telefone",
    phonePlaceholder: "+55 11 96123 4567",
    hint: "Esta etapa e obrigatoria para manter seu perfil seguro. Este numero nao sera exibido publicamente. Depois, voce podera escolher outro para mostrar nos seus anuncios.",
    submit: "Enviar codigo via SMS",
    loginHref: "/modelo/login",
    loginLabel: "Ja tenho conta",
    ownershipLabel: "Confirmo que estou criando meu proprio perfil.",
    verifyBack: "/cadastro-modelo",
  },
  host: {
    title: "Vamos verificar o seu telefone",
    phoneLabel: "Numero de telefone",
    phonePlaceholder: "+55 11 96123 4567",
    hint: "Esta etapa e obrigatoria para manter seu cadastro seguro. Este numero nao sera exibido publicamente no local anunciado.",
    submit: "Enviar codigo via SMS",
    loginHref: "/login?returnUrl=/anfitriao/imoveis/novo",
    loginLabel: "Ja tenho conta",
    ownershipLabel: "Confirmo que sou responsavel pelo local que vou cadastrar.",
    verifyBack: "/cadastro-anfitriao",
  },
};

function digits(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

function maskPhone(value: string) {
  const clean = digits(value);
  if (clean.length <= 2) return clean ? `(${clean}` : "";
  if (clean.length <= 7) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
  return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
}

function isValidPhone(value: string) {
  return /^[1-9]{2}9\d{8}$/.test(digits(value));
}

function e164BrazilianPhone(value: string) {
  return `+55${digits(value)}`;
}

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

function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/" aria-label="Elite Modell" style={{ display: "inline-flex", alignItems: "center" }}>
      <img src="/brand/elite-modell-logo.svg" alt="Elite Modell" style={{ height: dark ? 34 : 30, width: "auto" }} />
    </Link>
  );
}

function AuthShell({
  children,
  backHref,
  menu,
  premium = false,
}: {
  children: React.ReactNode;
  backHref?: string;
  menu?: boolean;
  premium?: boolean;
}) {
  return (
    <main style={{
      minHeight: "100dvh",
      overflowX: "hidden",
      background: premium
        ? "radial-gradient(circle at 20% 10%, rgba(214,168,58,0.16), transparent 32%), radial-gradient(circle at 85% 35%, rgba(214,168,58,0.10), transparent 34%), #050505"
        : "#f8faf8",
      color: premium ? "#fff" : INK,
    }}>
      <header
        style={{
          height: 88,
          background: premium ? "rgba(5,5,5,0.92)" : "#fff",
          borderBottom: premium ? "1px solid rgba(214,168,58,0.25)" : "1px solid #e4e8e4",
          display: "grid",
          gridTemplateColumns: "56px 1fr 56px",
          alignItems: "center",
          padding: "0 16px",
          boxShadow: premium ? "0 18px 50px rgba(0,0,0,0.34)" : "0 2px 12px rgba(25, 35, 38, 0.06)",
        }}
      >
        <Link
          href={backHref ?? "/"}
          aria-label={backHref ? "Voltar" : "Abrir menu"}
          style={{ color: premium ? "#d6a83a" : INK, display: "grid", placeItems: "center", textDecoration: "none" }}
        >
          {backHref ? <ArrowLeft size={28} /> : menu ? <Menu size={30} /> : null}
        </Link>
        <div style={{ textAlign: "center" }}>
          <Logo />
        </div>
        <span />
      </header>
      {children}
    </main>
  );
}

function LegalFooter() {
  return (
    <footer style={{ marginTop: 70, background: "#172229", color: "#f7f1df", padding: "28px 20px", textAlign: "center" }}>
      <Logo dark />
      <p style={{ margin: "14px 0 0", fontSize: 13, color: "rgba(247,241,223,0.78)" }}>
        Copyright 2026 Elite Modell.
      </p>
      <p style={{ margin: "12px 0 0", fontSize: 12 }}>
        <Link href="/privacy" style={{ color: "inherit" }}>Privacidade</Link>
        <span style={{ margin: "0 8px", opacity: 0.5 }}>|</span>
        <Link href="/terms" style={{ color: "inherit" }}>Termos</Link>
      </p>
    </footer>
  );
}

void LegalFooter;

function PremiumAuthFooter() {
  return (
    <footer className="phone-premium-footer">
      <section>
        <Logo />
        <div className="restricted">Ambiente restrito a maiores de 18 anos</div>
        <p>
          A Elite Modell conecta clientes, profissionais e locais reservados com discricao, seguranca e uma experiencia
          premium. O telefone e usado para verificacao da conta e prevencao de abuso.
        </p>
      </section>
      <div className="groups">
        <div>
          <strong>Legal</strong>
          <Link href="/terms">Termos de Uso</Link>
          <Link href="/privacy">Politica de Privacidade</Link>
        </div>
        <div>
          <strong>Suporte</strong>
          <Link href="/dashboard/informacoes">Central de ajuda</Link>
          <Link href="/esqueci-senha">Recuperar senha</Link>
        </div>
        <div>
          <strong>Seguranca</strong>
          <Link href="/verificacao">Verificacao de conta</Link>
          <Link href="/privacy">Como cuidamos dos seus dados</Link>
        </div>
      </div>
      <p className="copyright">Direitos autorais 2026 © Elite Modell</p>
      <style>{`
        .phone-premium-footer {
          width: 100%;
          max-width: 430px;
          margin: 34px auto 0;
          padding: 0 24px calc(30px + env(safe-area-inset-bottom));
          color: #fff;
        }
        .phone-premium-footer section,
        .phone-premium-footer .groups {
          border: 1px solid rgba(214,168,58,0.25);
          border-radius: 24px;
          background: linear-gradient(180deg, rgba(20,20,20,0.98), rgba(11,11,13,0.98));
          box-shadow: 0 24px 70px rgba(0,0,0,0.34);
          padding: 24px 18px;
        }
        .phone-premium-footer .restricted {
          width: fit-content;
          margin-top: 14px;
          border: 1px solid rgba(214,168,58,0.24);
          border-radius: 14px;
          background: rgba(214,168,58,0.12);
          color: #f5d77a;
          padding: 10px 12px;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
        }
        .phone-premium-footer p {
          margin: 18px 0 0;
          color: #b8b8b8;
          font-size: 15px;
          line-height: 1.65;
        }
        .phone-premium-footer .groups {
          display: grid;
          gap: 24px;
          margin-top: 18px;
        }
        .phone-premium-footer strong {
          display: block;
          margin-bottom: 10px;
          color: #fff;
          font-size: 17px;
          font-weight: 950;
        }
        .phone-premium-footer a {
          display: block;
          color: #b8b8b8;
          text-decoration: none;
          padding: 7px 0;
          font-size: 15px;
        }
        .phone-premium-footer .copyright {
          text-align: center;
          color: #777;
          font-size: 13px;
        }
      `}</style>
    </footer>
  );
}

function SubmitButton({ children, disabled, premium = false }: { children: React.ReactNode; disabled?: boolean; premium?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      style={{
        width: "100%",
        height: 58,
        border: "none",
        borderRadius: premium ? 18 : 8,
        background: disabled
          ? premium ? "rgba(214,168,58,0.15)" : "#cad4d9"
          : premium ? "linear-gradient(135deg, #f5d77a, #d6a83a 45%, #a77818)" : GOLD,
        color: disabled ? premium ? "rgba(255,255,255,0.38)" : "#7a878d" : "#111",
        fontSize: 17,
        fontWeight: 900,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: premium && !disabled ? "0 18px 46px rgba(214,168,58,0.22)" : undefined,
      }}
    >
      {children}
    </button>
  );
}

function StatusMessage({ status, message, premium = false }: { status: OtpStatus; message: string; premium?: boolean }) {
  if (!message) return null;
  const isError = status === "error";
  const isSuccess = status === "sent" || status === "verified";
  return (
    <div
      role={isError ? "alert" : "status"}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        margin: "18px 0 0",
        padding: 14,
        borderRadius: premium ? 16 : 8,
        border: premium ? `1px solid ${isError ? "rgba(255,139,134,0.42)" : "rgba(214,168,58,0.25)"}` : `1px solid ${isError ? "#f1b5b5" : isSuccess ? "#b8dbc0" : "#dfe4e7"}`,
        background: premium ? "rgba(16,16,20,0.88)" : isError ? "#fff2f2" : isSuccess ? "#eef8f0" : "#eef0f3",
        color: premium ? isError ? "#ffb4af" : "#b8b8b8" : isError ? "#8a1f1f" : "#354047",
        fontSize: 14,
        lineHeight: 1.45,
      }}
    >
      {isSuccess ? <CheckCircle2 size={18} /> : <Info size={18} />}
      <span>{message}</span>
    </div>
  );
}

export function PhoneRegistrationClient({ mode, screen }: { mode: FlowMode; screen: ScreenMode }) {
  const router = useRouter();
  const params = useSearchParams();
  const { data: session } = useSession();
  const text = copy[mode];
  const storageKey = PHONE_STORAGE_KEY[mode];
  const consentKey = CONSENT_STORAGE_KEY[mode];
  const returnUrl = safeInternalPath(params.get("returnUrl"));
  const isClient = mode === "client";
  const isHost = mode === "host";
  void isHost;
  const isPremium = true;
  const sessionEmail = session?.user?.email;
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [terms, setTerms] = useState(false);
  const [adult, setAdult] = useState(false);
  const [ownProfile, setOwnProfile] = useState(false);
  const [promo, setPromo] = useState(true);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpStatus, setOtpStatus] = useState<OtpStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    return () => {
      if (screen !== "verify") return;
      firebaseRecaptchaVerifier?.clear();
      firebaseRecaptchaVerifier = null;
    };
  }, [screen]);

  useEffect(() => {
    const urlPhone = params.get("phone");
    const saved = sessionStorage.getItem(storageKey);
    const savedConsent = readStoredConsent();
    const hydrate = window.setTimeout(() => {
      setPhone(maskPhone(urlPhone ?? saved ?? ""));
      setTerms(Boolean(savedConsent.termsConsent));
      setAdult(Boolean(savedConsent.ageConfirmed));
      setOwnProfile(Boolean(savedConsent.ownershipConfirmed));
    }, 0);
    return () => window.clearTimeout(hydrate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, storageKey]);

  useEffect(() => {
    if (timer <= 0) return;
    const tick = window.setInterval(() => setTimer((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(tick);
  }, [timer]);

  function readStoredConsent(): StoredConsent {
    try {
      return JSON.parse(sessionStorage.getItem(consentKey) ?? "{}") as StoredConsent;
    } catch {
      return {};
    }
  }

  function consentPayload(): Required<StoredConsent> {
    const saved = readStoredConsent();
    return {
      termsConsent: terms || Boolean(saved.termsConsent),
      lgpdConsent: terms || Boolean(saved.lgpdConsent),
      ageConfirmed: isClient ? false : adult || Boolean(saved.ageConfirmed),
      ownershipConfirmed: isClient ? false : ownProfile || Boolean(saved.ownershipConfirmed),
    };
  }

  const canSubmit = useMemo(() => {
    if (!isValidPhone(phone) || loading) return false;
    if (isClient) return terms;
    return terms && adult && ownProfile;
  }, [adult, isClient, loading, ownProfile, phone, terms]);
  const themedCheckStyle = isPremium ? { ...checkStyle, color: "#b8b8b8" } : checkStyle;
  const themedLinkStyle = isPremium ? { ...linkStyle, color: "#f5d77a" } : linkStyle;

  async function sendCode(nextPhone = phone) {
    const normalized = digits(nextPhone);
    if (!isValidPhone(normalized)) {
      const message = "Informe um celular brasileiro valido.";
      setOtpStatus("error");
      setStatusMessage(message);
      toast.error(message);
      return false;
    }

    const consent = consentPayload();
    setLoading(true);
    setOtpStatus("sending");
    setStatusMessage("Enviando codigo de verificacao...");

    try {
      const { RecaptchaVerifier: FirebaseRecaptchaVerifier } = await import("firebase/auth");
      const auth = getFirebaseClientAuth();

      firebaseRecaptchaVerifier?.clear();
      firebaseRecaptchaVerifier = new FirebaseRecaptchaVerifier(auth, "firebase-phone-recaptcha", {
        size: "invisible",
        callback: () => undefined,
      });

      firebaseConfirmationResult = await signInWithPhoneNumber(
        auth,
        e164BrazilianPhone(normalized),
        firebaseRecaptchaVerifier,
      );

      sessionStorage.setItem(storageKey, normalized);
      sessionStorage.setItem(consentKey, JSON.stringify(consent));
      setTimer(60);
      setOtpStatus("sent");
      setStatusMessage("Codigo enviado. Verifique seu SMS.");
      toast.success("Codigo enviado.");
      return true;
    } catch (err) {
      firebaseRecaptchaVerifier?.clear();
      firebaseRecaptchaVerifier = null;
      const message = err instanceof Error ? err.message : "Nao foi possivel enviar o codigo.";
      setOtpStatus("error");
      setStatusMessage(message);
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) {
      toast.error(isClient ? "Informe o telefone e aceite os termos." : "Complete as confirmacoes obrigatorias.");
      return;
    }
    if (await sendCode()) {
      router.push(`${VERIFY_ROUTE[mode]}?phone=${digits(phone)}${returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : ""}`);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4,6}$/.test(code)) {
      toast.error("Digite o codigo recebido.");
      return;
    }

    setLoading(true);
    setOtpStatus("verifying");
    setStatusMessage("Validando codigo...");
    try {
      if (!firebaseConfirmationResult) {
        throw new Error("Sessao de verificacao expirada. Solicite um novo codigo.");
      }

      const credential = await firebaseConfirmationResult.confirm(code);
      const firebaseIdToken = await credential.user.getIdToken();
      const consent = consentPayload();

      const res = await fetch("/api/auth/phone/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: digits(phone),
          code,
          accountType: mode,
          firebaseIdToken,
          ...consent,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Nao foi possivel verificar o codigo.");

      const auth = await signIn("phone-otp-token", { token: data.authToken, redirect: false });
      if (auth?.error) throw new Error("Codigo validado, mas nao foi possivel iniciar a sessao.");

      sessionStorage.removeItem(consentKey);
      firebaseConfirmationResult = null;
      setOtpStatus("verified");
      setStatusMessage("Telefone validado com sucesso.");
      toast.success("Telefone verificado.");
      router.push(returnUrl ?? data.redirectTo ?? (mode === "host" ? "/anfitriao/imoveis/novo" : mode === "model" ? "/profissional/novo" : "/painel/cliente"));
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nao foi possivel verificar o codigo.";
      setOtpStatus("error");
      setStatusMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  if (screen === "verify") {
    return (
      <AuthShell backHref={text.verifyBack} premium={isPremium}>
        <section style={{ width: "100%", maxWidth: isPremium ? 430 : 680, margin: "0 auto", padding: "32px 24px 0" }}>
          <h1 style={{ fontSize: 32, lineHeight: 1.14, margin: "0 0 12px", color: isPremium ? "#fff" : INK }}>Digite o codigo enviado</h1>
          <p style={{ fontSize: 17, lineHeight: 1.5, color: isPremium ? "#b8b8b8" : "#5b656b", margin: "0 0 28px" }}>
            Enviamos um codigo de verificacao para {phone || "o telefone informado"}.
          </p>
          <form onSubmit={handleVerify}>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              style={{
                width: "100%",
                height: 64,
                border: isPremium ? "1px solid rgba(214,168,58,0.28)" : "1px solid #cdd5d5",
                borderRadius: isPremium ? 18 : 8,
                background: isPremium ? "rgba(11,11,13,0.94)" : "#fff",
                color: isPremium ? "#fff" : INK,
                textAlign: "center",
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: 6,
                outlineColor: GOLD,
              }}
            />
            <StatusMessage status={otpStatus} message={statusMessage} premium={isPremium} />
            <div style={{ height: 22 }} />
            <SubmitButton disabled={loading || otpStatus === "verified"} premium={isPremium}>
              {otpStatus === "verifying" ? "Verificando..." : otpStatus === "verified" ? "Validado" : "Verificar codigo"}
            </SubmitButton>
          </form>
          <button
            type="button"
            onClick={() => sendCode()}
            disabled={loading || timer > 0 || otpStatus === "verified"}
            style={{ marginTop: 22, width: "100%", border: "none", background: "transparent", color: isPremium ? "#d6a83a" : INK, fontSize: 16, fontWeight: 800, cursor: timer > 0 ? "not-allowed" : "pointer" }}
          >
            {timer > 0 ? `Reenviar codigo em ${timer}s` : "Reenviar codigo"}
          </button>
          <button
            type="button"
            onClick={() => router.push(REGISTER_ROUTE[mode])}
            style={{ marginTop: 18, width: "100%", border: "none", background: "transparent", color: isPremium ? "#b8b8b8" : "#526067", fontSize: 15, textDecoration: "underline", cursor: "pointer" }}
          >
            Alterar telefone
          </button>
        </section>
        <div id="firebase-phone-recaptcha" />
        <PremiumAuthFooter />
      </AuthShell>
    );
  }

  return (
    <AuthShell backHref={isClient ? undefined : "/"} menu={isClient} premium={isPremium}>
      <section style={{ width: "100%", maxWidth: 430, margin: "0 auto", padding: "32px 24px 0" }}>
        <div style={{ textAlign: "center", marginBottom: 42 }}>
          <p style={{ margin: "0 0 10px", color: "#d6a83a", fontSize: 11, fontWeight: 950, letterSpacing: "0.18em", textTransform: "uppercase" }}>Acesse Elite Modell</p>
          <h1 style={{ fontSize: 34, lineHeight: 1.08, margin: 0, color: "#fff", fontWeight: 950, letterSpacing: 0 }}>Verificacao obrigatoria</h1>
          <p style={{ fontSize: 16, color: "#b8b8b8", margin: "12px auto 0", lineHeight: 1.55, maxWidth: 340 }}>Ative sua conta com uma camada extra de seguranca.</p>
        </div>

        {sessionEmail && (
          <div style={{ marginBottom: 34 }}>
            <h2 style={{ margin: "0 0 14px", color: "#fff", fontSize: 22, fontWeight: 950 }}>Seu e-mail</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#b8b8b8", fontSize: 16, fontWeight: 800 }}>
              <CheckCircle2 size={22} color="#5bd37a" />
              <span style={{ overflowWrap: "anywhere" }}>{sessionEmail}</span>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 18 }}>
          <Phone size={34} color="#f5d77a" />
          <h2 style={{ fontSize: 27, lineHeight: 1.12, margin: 0, color: "#fff", fontWeight: 950 }}>{text.title}</h2>
        </div>
        <p style={{ fontSize: 18, color: "#d7d7d7", margin: "0 0 34px", lineHeight: 1.58 }}>{text.hint}</p>
        <form onSubmit={handleRegister}>
          <label style={{ display: "block", fontSize: 15, fontWeight: 950, marginBottom: 12, color: "#d6a83a", letterSpacing: "0.08em", textTransform: "uppercase" }}>*{text.phoneLabel}</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 16, top: 17, height: 36, minWidth: 54, borderRadius: 12, background: "rgba(214,168,58,0.10)", border: "1px solid rgba(214,168,58,0.24)", color: "#f5d77a", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900 }}>
              +55
            </span>
            <input
              value={phone}
              onChange={(e) => setPhone(maskPhone(e.target.value))}
              inputMode="tel"
              autoComplete="tel"
              placeholder={text.phonePlaceholder}
              style={{ width: "100%", height: 70, border: "1px solid rgba(214,168,58,0.28)", borderRadius: 18, background: "rgba(11,11,13,0.94)", color: "#fff", padding: "0 18px 0 86px", fontSize: 17, outlineColor: GOLD }}
            />
          </div>

          {!isClient && (
            <label style={{ ...themedCheckStyle, marginTop: 24 }}>
              <input type="checkbox" checked={promo} onChange={(e) => setPromo(e.target.checked)} style={nativeCheckStyle} />
              Aceito receber informacoes sobre meu cadastro.
            </label>
          )}

          <button
            type="button"
            onClick={() => setPrivacyOpen(true)}
            style={{ width: "100%", minHeight: 58, border: isPremium ? "1px solid rgba(214,168,58,0.25)" : "none", borderRadius: isPremium ? 18 : 8, background: isPremium ? "rgba(16,16,20,0.88)" : "#eef7ef", display: "flex", alignItems: "center", gap: 14, padding: "0 16px", color: isPremium ? "#fff" : "#233037", fontSize: 17, fontWeight: 800, cursor: "pointer", marginTop: 24 }}
          >
            <ShieldCheck size={23} color={isPremium ? "#d6a83a" : "#4a9b5a"} />
            <span style={{ flex: 1, textAlign: "left" }}>Privacidade e seguranca</span>
            <Info size={24} />
          </button>

          <label style={{ ...themedCheckStyle, marginTop: 28, fontSize: isClient ? 18 : 16, fontWeight: isClient ? 900 : 500, color: isPremium ? "#b8b8b8" : INK }}>
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} style={nativeCheckStyle} />
            <span>Li e aceito os <Link href="/terms" style={themedLinkStyle}>Termos de Uso</Link> e a <Link href="/privacy" style={themedLinkStyle}>Politica de Privacidade</Link>.</span>
          </label>

          {!isClient && (
            <>
              <label style={themedCheckStyle}>
                <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} style={nativeCheckStyle} />
                Confirmo que sou maior de 18 anos.
              </label>
              <label style={themedCheckStyle}>
                <input type="checkbox" checked={ownProfile} onChange={(e) => setOwnProfile(e.target.checked)} style={nativeCheckStyle} />
                {text.ownershipLabel}
              </label>
            </>
          )}

          <StatusMessage status={otpStatus} message={statusMessage} premium={isPremium} />
          <div style={{ height: 22 }} />
          <SubmitButton disabled={!canSubmit || loading} premium={isPremium}>
            {otpStatus === "sending" ? "Enviando..." : otpStatus === "sent" ? "Codigo enviado" : text.submit}
          </SubmitButton>
        </form>

        <p style={{ textAlign: "center", margin: "34px 0 0", fontSize: 19, fontWeight: 900 }}>
          <Link href={text.loginHref} style={{ color: isPremium ? "#d6a83a" : INK, textDecoration: "none" }}>{text.loginLabel}</Link>
        </p>
        {isClient && (
          <p style={{ textAlign: "center", margin: "28px 0", fontSize: 17, color: "#39454c" }}>
            Quer anunciar? <Link href="/cadastro-modelo" style={linkStyle}>Cadastre-se como acompanhante</Link> ou <Link href="/cadastro-anfitriao" style={linkStyle}>anfitriao</Link>.
          </p>
        )}
      </section>
      <div id="firebase-phone-recaptcha" />
      <PremiumAuthFooter />
      {privacyOpen && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.42)", display: "grid", placeItems: "center", padding: 20, zIndex: 40 }}>
          <div style={{ background: "#fff", borderRadius: 10, padding: 24, maxWidth: 420, color: INK, boxShadow: "0 18px 60px rgba(0,0,0,0.2)" }}>
            <ShieldCheck size={28} color={GOLD} />
            <h2 style={{ margin: "12px 0 10px", fontSize: 22 }}>Privacidade e seguranca</h2>
            <p style={{ margin: 0, color: "#4f5b61", lineHeight: 1.55 }}>
              O telefone e usado para verificacao da conta, prevencao de abuso e comunicacoes do cadastro. O tratamento segue a LGPD, os Termos de Uso e a Politica de Privacidade.
            </p>
            <button onClick={() => setPrivacyOpen(false)} style={{ marginTop: 20, height: 46, width: "100%", border: "none", borderRadius: 8, background: GOLD, color: "#111", fontWeight: 900, cursor: "pointer" }}>Entendi</button>
          </div>
        </div>
      )}
    </AuthShell>
  );
}

const checkStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
  color: "#4d5960",
  fontSize: 16,
  lineHeight: 1.45,
  marginBottom: 16,
};

const nativeCheckStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  flex: "0 0 auto",
  accentColor: GOLD,
  marginTop: 1,
};

const linkStyle: React.CSSProperties = {
  color: INK,
  textDecoration: "underline",
  fontWeight: 800,
};

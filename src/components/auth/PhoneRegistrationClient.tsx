"use client";
/* eslint-disable @next/next/no-img-element -- The logo is an SVG brand asset. */

import { useEffect, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, CheckCircle2, Info, Menu, Phone, ShieldCheck } from "lucide-react";

type FlowMode = "client" | "model" | "host";
type ScreenMode = "register" | "verify";
type OtpStatus = "idle" | "sending" | "sent" | "verifying" | "verified" | "error";

type StoredConsent = {
  termsConsent?: boolean;
  lgpdConsent?: boolean;
  ageConfirmed?: boolean;
  ownershipConfirmed?: boolean;
};

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
    title: "Crie sua conta gratis de forma rapida e segura",
    phoneLabel: "Telefone",
    phonePlaceholder: "Insira seu numero de telefone",
    hint: "Vamos enviar um codigo de verificacao para confirmar que o numero pertence a voce.",
    submit: "Criar conta gratis",
    loginHref: "/app/consumer/login",
    loginLabel: "Ja tenho uma conta",
    verifyBack: "/app/consumer/register",
  },
  model: {
    title: <>Cadastre-se gratis como <span style={{ color: GOLD }}>acompanhante</span></>,
    phoneLabel: "Qual seu numero de telefone?",
    phonePlaceholder: "Digite seu telefone profissional",
    hint: "Este numero sera validado antes das etapas de perfil, documentos e biometria.",
    submit: "Continuar",
    loginHref: "/modelo/login",
    loginLabel: "Ja tenho conta",
    ownershipLabel: "Confirmo que estou criando meu proprio perfil.",
    verifyBack: "/cadastro-modelo",
  },
  host: {
    title: <>Cadastre seu espaco como <span style={{ color: GOLD }}>anfitriao</span></>,
    phoneLabel: "Qual seu numero de telefone?",
    phonePlaceholder: "Digite seu telefone de contato",
    hint: "Validamos o telefone antes de liberar o cadastro do local.",
    submit: "Continuar",
    loginHref: "/login",
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
}: {
  children: React.ReactNode;
  backHref?: string;
  menu?: boolean;
}) {
  return (
    <main style={{ minHeight: "100vh", background: "#f8faf8", color: INK }}>
      <header
        style={{
          height: 88,
          background: "#fff",
          borderBottom: "1px solid #e4e8e4",
          display: "grid",
          gridTemplateColumns: "56px 1fr 56px",
          alignItems: "center",
          padding: "0 16px",
          boxShadow: "0 2px 12px rgba(25, 35, 38, 0.06)",
        }}
      >
        <Link
          href={backHref ?? "/"}
          aria-label={backHref ? "Voltar" : "Abrir menu"}
          style={{ color: INK, display: "grid", placeItems: "center", textDecoration: "none" }}
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

function SubmitButton({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      style={{
        width: "100%",
        height: 58,
        border: "none",
        borderRadius: 8,
        background: disabled ? "#cad4d9" : GOLD,
        color: disabled ? "#7a878d" : "#111",
        fontSize: 17,
        fontWeight: 900,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function StatusMessage({ status, message }: { status: OtpStatus; message: string }) {
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
        borderRadius: 8,
        border: `1px solid ${isError ? "#f1b5b5" : isSuccess ? "#b8dbc0" : "#dfe4e7"}`,
        background: isError ? "#fff2f2" : isSuccess ? "#eef8f0" : "#eef0f3",
        color: isError ? "#8a1f1f" : "#354047",
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
  const text = copy[mode];
  const storageKey = PHONE_STORAGE_KEY[mode];
  const consentKey = CONSENT_STORAGE_KEY[mode];
  const isClient = mode === "client";
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
      const res = await fetch("/api/auth/phone/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: normalized,
          accountType: mode,
          channel: "sms",
          ...consent,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Nao foi possivel enviar o codigo.");

      sessionStorage.setItem(storageKey, normalized);
      sessionStorage.setItem(consentKey, JSON.stringify(consent));
      setTimer(Number(data.resendInSeconds ?? 60));
      setOtpStatus("sent");
      setStatusMessage("Codigo enviado. Verifique seu SMS ou WhatsApp.");
      toast.success("Codigo enviado.");
      return true;
    } catch (err) {
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
      router.push(`${VERIFY_ROUTE[mode]}?phone=${digits(phone)}`);
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
      const res = await fetch("/api/auth/phone/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: digits(phone), code, accountType: mode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Nao foi possivel verificar o codigo.");

      const auth = await signIn("phone-otp-token", { token: data.authToken, redirect: false });
      if (auth?.error) throw new Error("Codigo validado, mas nao foi possivel iniciar a sessao.");

      sessionStorage.removeItem(consentKey);
      setOtpStatus("verified");
      setStatusMessage("Telefone validado com sucesso.");
      toast.success("Telefone verificado.");
      router.push(data.redirectTo ?? (mode === "host" ? "/anfitriao/imoveis/novo" : mode === "model" ? "/profissional/novo" : "/painel/cliente"));
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
      <AuthShell backHref={text.verifyBack}>
        <section style={{ width: "100%", maxWidth: 680, margin: "0 auto", padding: "32px 24px 0" }}>
          <h1 style={{ fontSize: 32, lineHeight: 1.14, margin: "0 0 12px", color: INK }}>Digite o codigo enviado</h1>
          <p style={{ fontSize: 17, lineHeight: 1.5, color: "#5b656b", margin: "0 0 28px" }}>
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
                border: "1px solid #cdd5d5",
                borderRadius: 8,
                background: "#fff",
                color: INK,
                textAlign: "center",
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: 6,
                outlineColor: GOLD,
              }}
            />
            <StatusMessage status={otpStatus} message={statusMessage} />
            <div style={{ height: 22 }} />
            <SubmitButton disabled={loading || otpStatus === "verified"}>
              {otpStatus === "verifying" ? "Verificando..." : otpStatus === "verified" ? "Validado" : "Verificar codigo"}
            </SubmitButton>
          </form>
          <button
            type="button"
            onClick={() => sendCode()}
            disabled={loading || timer > 0 || otpStatus === "verified"}
            style={{ marginTop: 22, width: "100%", border: "none", background: "transparent", color: INK, fontSize: 16, fontWeight: 800, cursor: timer > 0 ? "not-allowed" : "pointer" }}
          >
            {timer > 0 ? `Reenviar codigo em ${timer}s` : "Reenviar codigo"}
          </button>
          <button
            type="button"
            onClick={() => router.push(REGISTER_ROUTE[mode])}
            style={{ marginTop: 18, width: "100%", border: "none", background: "transparent", color: "#526067", fontSize: 15, textDecoration: "underline", cursor: "pointer" }}
          >
            Alterar telefone
          </button>
        </section>
      </AuthShell>
    );
  }

  return (
    <AuthShell backHref={isClient ? undefined : "/"} menu={isClient}>
      <section style={{ width: "100%", maxWidth: 680, margin: "0 auto", padding: "32px 24px 0" }}>
        <h1 style={{ fontSize: 34, lineHeight: 1.16, margin: "0 0 20px", color: INK }}>{text.title}</h1>
        <p style={{ fontSize: 17, color: "#3d4a51", margin: "0 0 36px", lineHeight: 1.5 }}>{text.hint}</p>
        <form onSubmit={handleRegister}>
          <label style={{ display: "block", fontSize: isClient ? 17 : 22, fontWeight: 900, marginBottom: 12 }}>{text.phoneLabel}</label>
          <div style={{ position: "relative" }}>
            <Phone size={22} style={{ position: "absolute", left: 20, top: 21, color: "#314047" }} />
            <input
              value={phone}
              onChange={(e) => setPhone(maskPhone(e.target.value))}
              inputMode="tel"
              autoComplete="tel"
              placeholder={text.phonePlaceholder}
              style={{ width: "100%", height: 70, border: "1px solid #cdd5d5", borderRadius: 8, background: "#fff", color: INK, padding: "0 18px 0 58px", fontSize: 17, outlineColor: GOLD }}
            />
          </div>

          {!isClient && (
            <label style={{ ...checkStyle, marginTop: 24 }}>
              <input type="checkbox" checked={promo} onChange={(e) => setPromo(e.target.checked)} style={nativeCheckStyle} />
              Aceito receber informacoes sobre meu cadastro.
            </label>
          )}

          <button
            type="button"
            onClick={() => setPrivacyOpen(true)}
            style={{ width: "100%", minHeight: 58, border: "none", borderRadius: 8, background: "#eef7ef", display: "flex", alignItems: "center", gap: 14, padding: "0 16px", color: "#233037", fontSize: 17, fontWeight: 800, cursor: "pointer", marginTop: 24 }}
          >
            <ShieldCheck size={23} color="#4a9b5a" />
            <span style={{ flex: 1, textAlign: "left" }}>Privacidade e seguranca</span>
            <Info size={24} />
          </button>

          <label style={{ ...checkStyle, marginTop: 28, fontSize: isClient ? 18 : 16, fontWeight: isClient ? 900 : 500, color: INK }}>
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} style={nativeCheckStyle} />
            <span>Li e aceito os <Link href="/terms" style={linkStyle}>Termos de Uso</Link> e a <Link href="/privacy" style={linkStyle}>Politica de Privacidade</Link>.</span>
          </label>

          {!isClient && (
            <>
              <label style={checkStyle}>
                <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} style={nativeCheckStyle} />
                Confirmo que sou maior de 18 anos.
              </label>
              <label style={checkStyle}>
                <input type="checkbox" checked={ownProfile} onChange={(e) => setOwnProfile(e.target.checked)} style={nativeCheckStyle} />
                {text.ownershipLabel}
              </label>
            </>
          )}

          <StatusMessage status={otpStatus} message={statusMessage} />
          <div style={{ height: 22 }} />
          <SubmitButton disabled={!canSubmit || loading}>
            {otpStatus === "sending" ? "Enviando..." : otpStatus === "sent" ? "Codigo enviado" : text.submit}
          </SubmitButton>
        </form>

        <p style={{ textAlign: "center", margin: "34px 0 0", fontSize: 19, fontWeight: 900 }}>
          <Link href={text.loginHref} style={{ color: INK, textDecoration: "none" }}>{text.loginLabel}</Link>
        </p>
        {isClient && (
          <p style={{ textAlign: "center", margin: "28px 0", fontSize: 17, color: "#39454c" }}>
            Quer anunciar? <Link href="/cadastro-modelo" style={linkStyle}>Cadastre-se como acompanhante</Link> ou <Link href="/cadastro-anfitriao" style={linkStyle}>anfitriao</Link>.
          </p>
        )}
      </section>
      <LegalFooter />
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

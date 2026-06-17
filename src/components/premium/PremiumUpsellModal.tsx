"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Check, Copy, Crown, LoaderCircle, ShieldCheck, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

type Plan = {
  id: "client-premium-24h" | "client-premium-30d" | "elite-premium-monthly";
  label: string;
  durationLabel: string;
  badge: string | null;
  price: number;
  regularPrice: number;
  firstPurchaseOffer: boolean;
};

type Checkout = {
  intentId: string;
  qrCodeBase64: string;
  copyPaste: string;
  expiresAt: string | null;
  amount: number;
  authenticated: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  featureLabel?: string;
  returnTo: string;
};

const FALLBACK_PLANS: Plan[] = [
  {
    id: "client-premium-24h",
    label: "24 horas",
    durationLabel: "24 horas",
    badge: null,
    price: 4.99,
    regularPrice: 4.99,
    firstPurchaseOffer: false,
  },
  {
    id: "client-premium-30d",
    label: "30 dias",
    durationLabel: "30 dias",
    badge: "Mais escolhido",
    price: 10.99,
    regularPrice: 39.9,
    firstPurchaseOffer: true,
  },
  {
    id: "elite-premium-monthly",
    label: "Mensal",
    durationLabel: "1 mês",
    badge: "Acesso completo",
    price: 49.9,
    regularPrice: 49.9,
    firstPurchaseOffer: false,
  },
];

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function onlyDigits(value: string, max: number) {
  return value.replace(/\D/g, "").slice(0, max);
}

export default function PremiumUpsellModal({
  open,
  onClose,
  featureLabel = "este recurso exclusivo",
  returnTo,
}: Props) {
  if (!open) return null;
  return (
    <PremiumUpsellContent
      onClose={onClose}
      featureLabel={featureLabel}
      returnTo={returnTo}
    />
  );
}

function PremiumUpsellContent({
  onClose,
  featureLabel,
  returnTo,
}: Omit<Props, "open">) {
  const { data: session } = useSession();
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);
  const [selectedPlan, setSelectedPlan] = useState<Plan["id"]>("client-premium-30d");
  const [stage, setStage] = useState<"offer" | "identity" | "pix" | "paid" | "error">("offer");
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlan) ?? plans[0],
    [plans, selectedPlan],
  );
  const linkPage = `/premium/vincular?returnUrl=${encodeURIComponent(returnTo)}`;
  const loginHref = `${ACCOUNT_ROUTES.login}?returnUrl=${encodeURIComponent(linkPage)}`;
  const signupHref = `${ACCOUNT_ROUTES.cadastro}?tipo=cliente&returnUrl=${encodeURIComponent(linkPage)}`;

  useEffect(() => {
    void fetch("/api/premium/access", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => {
        if (Array.isArray(data?.plans) && data.plans.length) setPlans(data.plans);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    void Promise.resolve().then(() => {
      setName((current) => current || session.user?.name || "");
      setEmail((current) => current || session.user?.email || "");
    });
  }, [session?.user]);

  useEffect(() => {
    if (stage !== "pix" || !checkout) return;

    async function refreshStatus() {
      const response = await fetch(`/api/premium/checkout/status/${checkout?.intentId}`, {
        cache: "no-store",
      }).catch(() => null);
      if (!response?.ok) return;
      const data = await response.json();
      if (data.paid) {
        setStage("paid");
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }

    void refreshStatus();
    pollingRef.current = setInterval(() => void refreshStatus(), 4000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = null;
    };
  }, [checkout, stage]);

  async function createPix() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/premium/checkout/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan,
          checkoutToken: crypto.randomUUID(),
          payerName: name,
          payerEmail: email,
          payerCpf: cpf,
          payerPhone: phone,
          acceptedTerms: accepted,
          ageConfirmed,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Não foi possível gerar o Pix.");
      setCheckout(data);
      setStage("pix");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível gerar o Pix.");
    } finally {
      setLoading(false);
    }
  }

  async function copyPix() {
    if (!checkout?.copyPaste) return;
    await navigator.clipboard.writeText(checkout.copyPaste);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="premium-upsell-backdrop" role="dialog" aria-modal="true" aria-labelledby="premium-upsell-title">
      <style>{`
        .premium-upsell-backdrop {
          position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center;
          padding: 16px; overflow-y: auto; background: rgba(0,0,0,.86); backdrop-filter: blur(18px);
        }
        .premium-upsell-panel {
          width: min(760px, 100%); max-height: calc(100dvh - 32px); overflow-y: auto;
          border: 1px solid rgba(212,168,67,.34); border-radius: 24px; color: #f5f1e8;
          background: radial-gradient(circle at 50% -15%, rgba(212,168,67,.19), transparent 42%), linear-gradient(180deg,#15120d,#070707 58%);
          box-shadow: 0 40px 120px rgba(0,0,0,.82); scrollbar-width: thin;
        }
        .premium-upsell-plans { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 10px; }
        .premium-upsell-plan {
          position: relative; min-height: 132px; padding: 16px 13px; border: 1px solid rgba(255,255,255,.09);
          border-radius: 16px; background: rgba(255,255,255,.025); color: #f4f1ea; text-align: left; cursor: pointer;
          transition: transform .2s ease, border-color .2s ease, background .2s ease;
        }
        .premium-upsell-plan:hover { transform: translateY(-2px); border-color: rgba(212,168,67,.42); }
        .premium-upsell-plan[data-active="true"] { border-color: #d4a843; background: rgba(212,168,67,.11); box-shadow: inset 0 0 0 1px rgba(212,168,67,.12); }
        .premium-upsell-input {
          width: 100%; min-height: 48px; box-sizing: border-box; border-radius: 12px; padding: 0 13px;
          border: 1px solid rgba(212,168,67,.2); background: #090909; color: #fff; outline: none;
        }
        .premium-upsell-input:focus { border-color: #d4a843; box-shadow: 0 0 0 3px rgba(212,168,67,.09); }
        .premium-upsell-primary {
          min-height: 50px; border: 0; border-radius: 13px; padding: 0 20px; cursor: pointer;
          background: linear-gradient(135deg,#ffe5a0,#d4a843 48%,#9e7b2a); color: #090704; font-weight: 950;
          box-shadow: 0 16px 36px rgba(212,168,67,.15); transition: transform .2s ease, filter .2s ease;
        }
        .premium-upsell-primary:hover { transform: translateY(-1px); filter: brightness(1.04); }
        .premium-upsell-primary:disabled { cursor: wait; opacity: .58; transform: none; }
        @media (max-width: 640px) {
          .premium-upsell-backdrop { padding: 0; align-items: end; }
          .premium-upsell-panel { width: 100%; max-height: 94dvh; border-radius: 24px 24px 0 0; border-bottom: 0; }
          .premium-upsell-plans { grid-template-columns: 1fr; }
          .premium-upsell-plan { min-height: 90px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .premium-upsell-plan, .premium-upsell-primary { transition: none; }
        }
      `}</style>

      <section className="premium-upsell-panel">
        <header style={{ display: "flex", justifyContent: "space-between", gap: 18, padding: "22px 22px 0" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, color: "#d4a843", fontSize: 11, fontWeight: 950, letterSpacing: 2, textTransform: "uppercase" }}>
              <Crown size={17} />
              Elite Modell Premium
            </div>
            <h2 id="premium-upsell-title" style={{ margin: "10px 0 0", fontSize: "clamp(24px,5vw,34px)", lineHeight: 1.08 }}>
              Desbloqueie {featureLabel}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" style={{ width: 42, height: 42, flex: "0 0 auto", display: "grid", placeItems: "center", borderRadius: 999, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: "#fff", cursor: "pointer" }}>
            <X size={19} />
          </button>
        </header>

        <div style={{ padding: 22 }}>
          {stage === "offer" && (
            <>
              <div style={{ display: "grid", gap: 9, marginBottom: 20, color: "#c3bbae", fontSize: 14 }}>
                {["Vídeos e conteúdos exclusivos", "Avaliações completas e benefícios Premium", "Navegação discreta, rápida e sem bloquear perfis públicos"].map((benefit) => (
                  <span key={benefit} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <Check size={16} color="#d4a843" /> {benefit}
                  </span>
                ))}
              </div>
              <div className="premium-upsell-plans">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    className="premium-upsell-plan"
                    data-active={selectedPlan === plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                  >
                    {plan.badge && <span style={{ color: "#d4a843", fontSize: 10, fontWeight: 950, textTransform: "uppercase", letterSpacing: 1 }}>{plan.badge}</span>}
                    <strong style={{ display: "block", marginTop: plan.badge ? 8 : 0, fontSize: 18 }}>{plan.label}</strong>
                    <span style={{ display: "block", marginTop: 8, color: "#f5d78c", fontSize: 21, fontWeight: 950 }}>{money(plan.price)}</span>
                    {plan.firstPurchaseOffer && <small style={{ display: "block", marginTop: 3, color: "#8f887d" }}>Primeira compra. Depois {money(plan.regularPrice)}.</small>}
                  </button>
                ))}
              </div>
              <button type="button" className="premium-upsell-primary" onClick={() => setStage("identity")} style={{ width: "100%", marginTop: 18 }}>
                Assinar agora com Pix
              </button>
              <p style={{ margin: "13px 0 0", color: "#817a70", fontSize: 12, lineHeight: 1.55, textAlign: "center" }}>
                Pagamento único, sem renovação automática. O acesso só é liberado após confirmação real do Pix.
              </p>
              <Link href={`${ACCOUNT_ROUTES.login}?returnUrl=${encodeURIComponent(returnTo)}`} style={{ display: "block", marginTop: 14, color: "#d4a843", fontSize: 13, fontWeight: 800, textAlign: "center" }}>
                Já possui conta? Entrar
              </Link>
            </>
          )}

          {stage === "identity" && (
            <>
              <button type="button" onClick={() => setStage("offer")} style={{ border: 0, background: "transparent", color: "#d4a843", padding: 0, cursor: "pointer", fontWeight: 800 }}>← Voltar aos planos</button>
              <p style={{ margin: "14px 0 18px", color: "#a39b90", fontSize: 14, lineHeight: 1.6 }}>
                Para gerar o Pix, informe apenas os dados mínimos exigidos pelo processador. Você cria ou acessa sua conta depois do pagamento.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
                <input className="premium-upsell-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome do pagador" autoComplete="name" />
                <input className="premium-upsell-input" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="E-mail para vincular o acesso" type="email" autoComplete="email" />
                <input className="premium-upsell-input" value={cpf} onChange={(event) => setCpf(onlyDigits(event.target.value, 11))} placeholder="CPF" inputMode="numeric" autoComplete="off" />
                <input className="premium-upsell-input" value={phone} onChange={(event) => setPhone(onlyDigits(event.target.value, 11))} placeholder="Telefone com DDD" inputMode="tel" autoComplete="tel" />
              </div>
              <label style={{ display: "flex", gap: 10, marginTop: 15, color: "#aaa298", fontSize: 12, lineHeight: 1.55 }}>
                <input type="checkbox" checked={ageConfirmed} onChange={(event) => setAgeConfirmed(event.target.checked)} style={{ marginTop: 3, accentColor: "#d4a843" }} />
                Confirmo que tenho 18 anos ou mais.
              </label>
              <label style={{ display: "flex", gap: 10, marginTop: 10, color: "#aaa298", fontSize: 12, lineHeight: 1.55 }}>
                <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} style={{ marginTop: 3, accentColor: "#d4a843" }} />
                <span>
                  Li e aceito o <Link href="/documentos/checkout-notice" target="_blank" style={{ color: "#d4a843" }}>Aviso de Checkout</Link>, a{" "}
                  <Link href="/documentos/payments-policy" target="_blank" style={{ color: "#d4a843" }}>Política de Pagamentos</Link> e a{" "}
                  <Link href="/documentos/refund-policy" target="_blank" style={{ color: "#d4a843" }}>Política de Reembolso</Link>.
                </span>
              </label>
              {error && <p role="alert" style={{ margin: "14px 0 0", padding: 11, borderRadius: 10, background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.22)", color: "#fca5a5", fontSize: 13 }}>{error}</p>}
              <button type="button" className="premium-upsell-primary" disabled={loading || !accepted || !ageConfirmed} onClick={() => void createPix()} style={{ width: "100%", marginTop: 16 }}>
                {loading ? <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><LoaderCircle size={17} className="animate-spin" /> Gerando Pix...</span> : `Gerar Pix de ${money(currentPlan.price)}`}
              </button>
              <p style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, color: "#777168", fontSize: 11, margin: "12px 0 0" }}>
                <ShieldCheck size={14} /> CPF não é armazenado em texto aberto pela Elite Modell.
              </p>
            </>
          )}

          {stage === "pix" && checkout && (
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: 0, color: "#d4a843", fontWeight: 900 }}>Pix gerado com segurança</p>
              <h3 style={{ margin: "8px 0 18px", fontSize: 24 }}>Pague {money(checkout.amount)}</h3>
              <div style={{ width: 220, height: 220, margin: "0 auto", padding: 10, borderRadius: 18, background: "#fff" }}>
                <Image src={`data:image/png;base64,${checkout.qrCodeBase64}`} alt="QR Code Pix" width={200} height={200} unoptimized style={{ width: "100%", height: "100%" }} />
              </div>
              <button type="button" onClick={() => void copyPix()} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", minHeight: 48, marginTop: 16, borderRadius: 12, border: "1px solid rgba(212,168,67,.3)", background: "rgba(212,168,67,.08)", color: "#f5d78c", fontWeight: 900, cursor: "pointer" }}>
                <Copy size={16} /> {copied ? "Código copiado" : "Copiar código Pix"}
              </button>
              <p style={{ margin: "14px 0 0", color: "#918a80", fontSize: 13, lineHeight: 1.55 }}>
                Aguardando confirmação do provedor. Não feche esta tela até o pagamento ser reconhecido.
              </p>
              <LoaderCircle size={22} className="animate-spin" style={{ margin: "14px auto 0", color: "#d4a843" }} />
            </div>
          )}

          {stage === "paid" && checkout && (
            <div style={{ textAlign: "center", padding: "12px 0 4px" }}>
              <div style={{ width: 62, height: 62, margin: "0 auto", display: "grid", placeItems: "center", borderRadius: 999, background: "rgba(34,197,94,.12)", color: "#4ade80" }}>
                <Check size={31} />
              </div>
              <h3 style={{ margin: "16px 0 8px", fontSize: 27 }}>Pagamento confirmado</h3>
              {checkout.authenticated ? (
                <>
                  <p style={{ color: "#aaa298", lineHeight: 1.6 }}>Seu acesso está sendo vinculado à conta atual. A confirmação final pode levar alguns segundos.</p>
                  <button type="button" className="premium-upsell-primary" onClick={() => window.location.reload()} style={{ width: "100%", marginTop: 12 }}>Continuar com Premium</button>
                </>
              ) : (
                <>
                  <p style={{ color: "#aaa298", lineHeight: 1.6 }}>
                    Agora entre ou crie uma conta com <strong style={{ color: "#fff" }}>{email}</strong> para vincular o acesso. Nenhum Premium é liberado sem essa identificação.
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 18 }}>
                    <Link href={signupHref} className="premium-upsell-primary" style={{ display: "grid", placeItems: "center", textDecoration: "none" }}>Criar conta</Link>
                    <Link href={loginHref} style={{ display: "grid", minHeight: 50, placeItems: "center", borderRadius: 13, border: "1px solid rgba(212,168,67,.34)", color: "#f5d78c", fontWeight: 900, textDecoration: "none" }}>Entrar</Link>
                  </div>
                </>
              )}
            </div>
          )}

          {stage === "error" && (
            <div style={{ textAlign: "center" }}>
              <h3>Não foi possível concluir</h3>
              <button type="button" className="premium-upsell-primary" onClick={() => setStage("offer")}>Tentar novamente</button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

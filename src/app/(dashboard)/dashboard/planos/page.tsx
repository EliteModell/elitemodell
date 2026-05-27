"use client";
import { useEffect, useState } from "react";
import { Check, ChevronDown, ChevronUp, Loader, QrCode, Shield, Star } from "lucide-react";
import { ClientSensitiveAction } from "@/components/client-area/ClientSensitiveGate";
import dynamic from "next/dynamic";
import { CLIENT_PLANS, type ClientPlan, type ClientPlanId } from "@/lib/client-plans";

const PixPaymentModal = dynamic(() => import("@/components/payments/PixPaymentModal"), { ssr: false });

const GOLD = "#d4a843";
const GOLD_DIM = "rgba(212,168,67,0.12)";
const GOLD_MID = "rgba(212,168,67,0.28)";
const GOLD_TEXT = "#f5d78c";

const BENEFITS = [
  "Mais de 10 mil avaliações para ver",
  "WhatsApp das profissionais exclusivas",
  "Vídeos e fotos exclusivos e ilimitados",
  "Todos os benefícios do plano básico",
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "O que libera no Premium?",
    a: "Acesso a recursos exclusivos da área do cliente: avaliações completas, conteúdos exclusivos e contatos liberados conforme regras da plataforma.",
  },
  {
    q: "Como pago?",
    a: "Por Pix através do checkout seguro. O acesso é liberado após a confirmação do pagamento.",
  },
  {
    q: "Quando libera?",
    a: "Imediatamente após a confirmação do pagamento pelo Pix.",
  },
  {
    q: "O que acontece quando vencer?",
    a: "Seu acesso Premium expira e volta ao plano básico. Você pode renovar a qualquer momento.",
  },
  {
    q: "Posso cancelar?",
    a: "O Premium é pré-pago, sem cobrança automática. Não há o que cancelar — basta não renovar ao vencer.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "16px 0",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", lineHeight: 1.4 }}>{q}</span>
        {open
          ? <ChevronUp style={{ width: 16, height: 16, color: GOLD, flexShrink: 0 }} />
          : <ChevronDown style={{ width: 16, height: 16, color: "#64748b", flexShrink: 0 }} />}
      </button>
      {open && (
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>{a}</p>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  resolvedPrice,
  isFirstPurchase,
  selected,
  onSelect,
}: {
  plan: ClientPlan;
  resolvedPrice: number;
  isFirstPurchase: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const showFirstPurchaseBadge = isFirstPurchase && plan.firstPurchasePrice !== undefined;
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        width: "100%",
        textAlign: "left",
        background: selected
          ? "linear-gradient(135deg, rgba(212,168,67,0.14) 0%, rgba(212,168,67,0.06) 100%)"
          : "rgba(255,255,255,0.03)",
        border: `2px solid ${selected ? GOLD : "rgba(255,255,255,0.08)"}`,
        borderRadius: 16,
        padding: "18px 20px",
        cursor: "pointer",
        position: "relative",
        transition: "all 0.18s ease",
      }}
    >
      {plan.badge && (
        <div style={{
          position: "absolute",
          top: -11,
          left: 18,
          background: GOLD,
          color: "#060e1b",
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          padding: "3px 10px",
          borderRadius: 20,
        }}>
          {plan.badge}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {/* Radio visual */}
        <div style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          border: `2px solid ${selected ? GOLD : "rgba(255,255,255,0.2)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "border-color 0.15s",
        }}>
          {selected && (
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: GOLD }} />
          )}
        </div>

        {/* Duração */}
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: selected ? GOLD_TEXT : "#e2e8f0" }}>
            {plan.label}
          </p>
          {showFirstPurchaseBadge && (
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#4ade80", fontWeight: 600 }}>
              Preço de 1ª compra
            </p>
          )}
        </div>

        {/* Preço */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: selected ? GOLD_TEXT : "#e2e8f0" }}>
            {resolvedPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          {plan.pricePerMonthLabel && (
            <p style={{ margin: "1px 0 0", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
              {plan.pricePerMonthLabel}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

function SuccessBanner() {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 14,
      background: "rgba(74,222,128,0.08)",
      border: "1px solid rgba(74,222,128,0.22)",
      borderRadius: 14,
      padding: "16px 20px",
    }}>
      <div style={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        background: "rgba(74,222,128,0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}>
        <Check style={{ width: 20, height: 20, color: "#4ade80" }} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#fff" }}>Elite Model Premium ativado!</p>
        <p style={{ margin: "3px 0 0", fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
          Seu acesso exclusivo foi liberado com sucesso.
        </p>
      </div>
    </div>
  );
}

function FixedCta({
  plan,
  resolvedPrice,
  onCheckout,
}: {
  plan: ClientPlan;
  resolvedPrice: number;
  onCheckout: () => void;
}) {
  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 60,
      background: "rgba(6,14,27,0.97)",
      backdropFilter: "blur(16px)",
      borderTop: `1px solid ${GOLD_MID}`,
      padding: "12px 20px calc(12px + env(safe-area-inset-bottom))",
      display: "flex",
      alignItems: "center",
      gap: 14,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>
          {plan.durationLabel}
        </p>
        <p style={{ margin: "1px 0 0", fontSize: 18, fontWeight: 900, color: GOLD_TEXT }}>
          {resolvedPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>
      </div>
      <ClientSensitiveAction className="planos-cta-btn" onAllowed={onCheckout}>
        Assine agora
      </ClientSensitiveAction>
    </div>
  );
}

export default function PlanosPage() {
  const defaultPlan = CLIENT_PLANS.find((p) => p.id === "client-premium-30d") ?? CLIENT_PLANS[0];
  const [selected, setSelected] = useState<ClientPlan>(defaultPlan);
  const [showPix, setShowPix] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [statusLoading, setStatusLoading] = useState(true);
  const [isFirstPurchase, setIsFirstPurchase] = useState(false);
  const [prices, setPrices] = useState<Record<ClientPlanId, number>>(() =>
    Object.fromEntries(CLIENT_PLANS.map((p) => [p.id, p.price])) as Record<ClientPlanId, number>
  );

  useEffect(() => {
    fetch("/api/payments/client-premium-status")
      .then((r) => r.json())
      .then((data: { isFirstPurchase: boolean; prices: Record<ClientPlanId, number> }) => {
        setIsFirstPurchase(data.isFirstPurchase);
        setPrices(data.prices);
      })
      .catch(() => {})
      .finally(() => setStatusLoading(false));
  }, []);

  const resolvedPrice = prices[selected.id] ?? selected.price;

  function handleSuccess() {
    setShowPix(false);
    setShowSuccess(true);
  }

  return (
    <>
      <div style={{ paddingBottom: 100, maxWidth: 560, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: GOLD_DIM,
            border: `1px solid ${GOLD_MID}`,
            borderRadius: 20,
            padding: "5px 14px",
            marginBottom: 14,
          }}>
            <Star style={{ width: 13, height: 13, color: GOLD, fill: GOLD }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Recomendado
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: "#fff", lineHeight: 1.2 }}>
            Elite Model Premium
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 15, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
            Veja o que ninguém vê
          </p>
        </div>

        {showSuccess && <div style={{ marginBottom: 24 }}><SuccessBanner /></div>}

        {/* Benefícios */}
        <div style={{
          background: "rgba(212,168,67,0.07)",
          border: `1px solid ${GOLD_MID}`,
          borderRadius: 18,
          padding: "20px 22px",
          marginBottom: 28,
        }}>
          <p style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 700, color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            O que você acessa
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {BENEFITS.map((b) => (
              <div key={b} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <div style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "rgba(212,168,67,0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Check style={{ width: 12, height: 12, color: GOLD }} />
                </div>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.82)", lineHeight: 1.4 }}>{b}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Seleção de período */}
        <p style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Escolha o período
        </p>

        {statusLoading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 120, gap: 10 }}>
            <Loader style={{ width: 20, height: 20, color: GOLD }} className="animate-spin" />
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>Carregando preços...</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
            {CLIENT_PLANS.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                resolvedPrice={prices[plan.id] ?? plan.price}
                isFirstPurchase={isFirstPurchase}
                selected={selected.id === plan.id}
                onSelect={() => setSelected(plan)}
              />
            ))}
          </div>
        )}

        {/* Pagamento via Pix */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12,
          padding: "12px 16px",
          marginBottom: 32,
        }}>
          <QrCode style={{ width: 18, height: 18, color: GOLD, flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>Pagamento via Pix</p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
              Instantâneo · sem taxas · QR Code seguro
            </p>
          </div>
          <Shield style={{ width: 16, height: 16, color: "rgba(255,255,255,0.25)", marginLeft: "auto", flexShrink: 0 }} />
        </div>

        {/* Info sobre renovação */}
        <p style={{ margin: "0 0 32px", fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center", lineHeight: 1.5 }}>
          Pré-pago · sem cobrança automática · renovação manual ao vencer
        </p>

        {/* FAQ */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 18,
          padding: "20px 22px",
          marginBottom: 8,
        }}>
          <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Perguntas frequentes
          </p>
          <div>
            {FAQ.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </div>

      {/* CTA fixo */}
      {!showSuccess && !statusLoading && (
        <FixedCta
          plan={selected}
          resolvedPrice={resolvedPrice}
          onCheckout={() => setShowPix(true)}
        />
      )}

      {/* Modal de pagamento Pix */}
      {showPix && (
        <PixPaymentModal
          planId={selected.id}
          amount={resolvedPrice}
          onClose={() => setShowPix(false)}
          onSuccess={handleSuccess}
        />
      )}

      <style>{`
        .planos-cta-btn {
          flex-shrink: 0;
          padding: 13px 28px;
          background: #d4a843;
          color: #060e1b;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 900;
          cursor: pointer;
          letter-spacing: 0.02em;
          transition: opacity 0.15s;
        }
        .planos-cta-btn:active { opacity: 0.8; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

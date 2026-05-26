"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

const GOLD = "#d4a843";
const GOLD_DIM = "rgba(212,168,67,0.12)";
const GOLD_MID = "rgba(212,168,67,0.3)";

type Tab = "planos" | "assinaturas" | "trocas";
type PriceKey = "30min" | "hora" | "3d" | "7d" | "30d" | "mensal";
type CheckoutStage = "idle" | "creating" | "waiting" | "paid" | "failed";

type Plan = {
  id: string;
  name: string;
  icon: string;
  badge?: string;
  points: number;
  pointsColor: string;
  description: string;
  features: string[];
  pricePerDay?: number;
  prices: { label: string; key: PriceKey; value: number }[];
  cta: string;
  ctaColor: string;
  topColor: string;
  isOneTime?: boolean;
  note?: string;
};

const PLANS: Plan[] = [
  {
    id: "subir",
    name: "Subir Agora",
    icon: "Rocket",
    badge: "Exclusivo",
    points: 4000,
    pointsColor: "#ff6b35",
    description: "Impulso rapido para aparecer acima de perfis comuns por tempo limitado.",
    features: ["Perfil impulsionado", "Destaque temporario", "Mais prioridade na listagem", "Galeria em evidencia"],
    prices: [{ label: "1 hora", key: "hora", value: 6.9 }],
    cta: "Comprar ja",
    ctaColor: "#ff6b35",
    topColor: "#cc3300",
    isOneTime: true,
  },
  {
    id: "30min",
    name: "30min no Topo",
    icon: "Flash",
    badge: "Exclusivo",
    points: 4000,
    pointsColor: "#ff6b35",
    description: "Coloque seu anuncio em posicao de destaque por 30 minutos.",
    features: ["Topo temporario", "Impulso de contatos", "Destaque visual", "Prioridade imediata"],
    prices: [{ label: "30 minutos", key: "30min", value: 49.9 }],
    cta: "Contratar o Plano",
    ctaColor: "#ff6b35",
    topColor: "#cc3300",
    isOneTime: true,
  },
  {
    id: "super-top",
    name: "Super Top",
    icon: "Crown",
    badge: "Mais popular",
    points: 2000,
    pointsColor: GOLD,
    description: "Plano premium para aparecer melhor nas buscas e aumentar conversao.",
    features: ["Anuncio grande", "Perfil em destaque", "Telefone visivel", "Boost de listagem"],
    pricePerDay: 18.93,
    prices: [
      { label: "3 dias", key: "3d", value: 120.9 },
      { label: "7 dias", key: "7d", value: 196.9 },
      { label: "30 dias", key: "30d", value: 567.9 },
      { label: "Assinatura mensal", key: "mensal", value: 446 },
    ],
    cta: "Comprar ja",
    ctaColor: GOLD,
    topColor: GOLD,
  },
  {
    id: "top",
    name: "Top",
    icon: "Trophy",
    points: 1000,
    pointsColor: "#22c55e",
    description: "Aumente sua visibilidade com destaque moderado na listagem.",
    features: ["Anuncio medio", "Mais informacoes", "Telefone no perfil", "Pontuacao extra"],
    pricePerDay: 11.03,
    prices: [
      { label: "3 dias", key: "3d", value: 66.9 },
      { label: "7 dias", key: "7d", value: 105.9 },
      { label: "30 dias", key: "30d", value: 330.9 },
      { label: "Assinatura mensal", key: "mensal", value: 259.8 },
    ],
    cta: "Comprar ja",
    ctaColor: "#22c55e",
    topColor: "#22c55e",
  },
  {
    id: "diamante",
    name: "Diamante",
    icon: "Diamond",
    points: 500,
    pointsColor: "#818cf8",
    description: "Destaque de alto valor para fortalecer sua presenca premium.",
    features: ["Banners internos", "Destaque no perfil", "Sinal premium", "Mais exposicao"],
    pricePerDay: 12.66,
    prices: [
      { label: "3 dias", key: "3d", value: 80.9 },
      { label: "7 dias", key: "7d", value: 114.9 },
      { label: "30 dias", key: "30d", value: 379.9 },
      { label: "Assinatura mensal", key: "mensal", value: 342 },
    ],
    cta: "Comprar ja",
    ctaColor: "#818cf8",
    topColor: "#4f46e5",
  },
  {
    id: "black",
    name: "Black",
    icon: "Star",
    badge: "Novo",
    points: 200,
    pointsColor: "#94a3b8",
    description: "Visual mais chamativo para seu anuncio na listagem.",
    features: ["Visual escuro", "Sinal premium", "Mais contraste", "Destaque discreto"],
    pricePerDay: 3.83,
    prices: [
      { label: "3 dias", key: "3d", value: 34.9 },
      { label: "7 dias", key: "7d", value: 58.9 },
      { label: "30 dias", key: "30d", value: 114.9 },
      { label: "Assinatura mensal", key: "mensal", value: 103.5 },
    ],
    cta: "Comprar ja",
    ctaColor: "#94a3b8",
    topColor: "#334155",
  },
  {
    id: "telefone",
    name: "Telefone na Listagem",
    icon: "Phone",
    points: 200,
    pointsColor: "#22c55e",
    description: "Exiba seu contato na listagem para reduzir atrito de conversao.",
    features: ["Contato visivel", "Mais conversas", "Botao na listagem", "Valido pelo periodo comprado"],
    pricePerDay: 3.1,
    prices: [
      { label: "3 dias", key: "3d", value: 23.9 },
      { label: "7 dias", key: "7d", value: 34.9 },
      { label: "30 dias", key: "30d", value: 92.9 },
      { label: "Assinatura mensal", key: "mensal", value: 83.7 },
    ],
    cta: "Comprar ja",
    ctaColor: "#22c55e",
    topColor: "#166534",
    note: "Apos pagamento aprovado, o perfil fica com telefone liberado conforme regras da plataforma.",
  },
  {
    id: "ocultar-idade",
    name: "Ocultar Idade",
    icon: "Lock",
    points: 100,
    pointsColor: "#a78bfa",
    description: "Oculte sua idade no perfil publico e na listagem.",
    features: ["Idade oculta", "Mais privacidade", "Controle no perfil", "Valido pelo periodo comprado"],
    pricePerDay: 3.33,
    prices: [
      { label: "3 dias", key: "3d", value: 35.9 },
      { label: "7 dias", key: "7d", value: 49.9 },
      { label: "30 dias", key: "30d", value: 99.9 },
      { label: "Assinatura mensal", key: "mensal", value: 90 },
    ],
    cta: "Comprar ja",
    ctaColor: "#a78bfa",
    topColor: "#6d28d9",
  },
];

function fmt(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function PlanCheckout({ selection, onClose }: { selection: { plan: Plan; price: Plan["prices"][number] }; onClose: () => void }) {
  const [stage, setStage] = useState<CheckoutStage>("idle");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (!paymentId || stage !== "waiting") return;

    async function checkStatus() {
      try {
        const res = await fetch(`/api/payments/status/${paymentId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "PAID") {
          if (pollRef.current) clearInterval(pollRef.current);
          setStage("paid");
        } else if (data.status === "FAILED" || data.status === "REFUNDED") {
          if (pollRef.current) clearInterval(pollRef.current);
          setError("Pagamento nao confirmado.");
          setStage("failed");
        }
      } catch {}
    }

    pollRef.current = setInterval(() => {
      if (!document.hidden) void checkStatus();
    }, 6000);
    void checkStatus();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [paymentId, stage]);

  async function createPix() {
    if (stage === "creating") return;
    setStage("creating");
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/professional/plans/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selection.plan.id,
          priceKey: selection.price.key,
          activationMode: "agora",
          paymentMethod: "pix",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Nao foi possivel iniciar o checkout.");
        setStage("failed");
        return;
      }
      setPaymentId(data.localPaymentId);
      setQrCode(data.copyPaste || data.qrCode || null);
      setQrCodeBase64(data.qrCodeBase64 || null);
      setMessage(data.message || null);
      setStage("waiting");
    } catch {
      setError("Erro de conexao ao iniciar checkout.");
      setStage("failed");
    }
  }

  async function copyPix() {
    if (!qrCode) return;
    await navigator.clipboard.writeText(qrCode);
    setMessage("Codigo Pix copiado.");
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1400, background: "rgba(0,0,0,0.82)", display: "grid", placeItems: "center", padding: 18 }}>
      <div style={{ width: "100%", maxWidth: 430, background: "#090d12", border: `1px solid ${GOLD_MID}`, borderRadius: 18, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.65)" }}>
        <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 14, marginBottom: 14 }}>
            <div>
              <p style={{ margin: "0 0 5px", color: GOLD, fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 2 }}>Checkout seguro</p>
              <h2 style={{ margin: 0, color: "#f8fafc", fontSize: 22, fontWeight: 900 }}>{selection.plan.name}</h2>
              <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: 13 }}>{selection.price.label} - ativacao apos pagamento aprovado</p>
            </div>
            <button type="button" onClick={onClose} style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "#fff", cursor: "pointer" }}>x</button>
          </div>

          <div style={{ background: "#0f172a", border: "1px solid rgba(212,168,67,0.18)", borderRadius: 14, padding: 14, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: 13, marginBottom: 8 }}><span>Plano</span><strong style={{ color: "#f8fafc" }}>{selection.plan.name}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: 13, marginBottom: 8 }}><span>Duracao</span><strong style={{ color: "#f8fafc" }}>{selection.price.label}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: 13 }}><span>Total</span><strong style={{ color: GOLD, fontSize: 18 }}>R$ {fmt(selection.price.value)}</strong></div>
          </div>

          {stage === "idle" && (
            <>
              <button type="button" onClick={createPix} style={primaryButtonStyle}>Gerar Pix e criar pedido</button>
              <p style={{ margin: "12px 0 0", color: "#64748b", fontSize: 12, lineHeight: 1.6 }}>Cartao e boleto ficam ocultos enquanto nao houver captura homologada para planos profissionais.</p>
            </>
          )}
          {stage === "creating" && <p style={centerInfoStyle}>Criando pedido e gerando Pix...</p>}
          {stage === "waiting" && (
            <div style={{ textAlign: "center" }}>
              {message && <p style={{ margin: "0 0 12px", color: GOLD, fontSize: 13, lineHeight: 1.6 }}>{message}</p>}
              {qrCodeBase64 ? <img src={`data:image/png;base64,${qrCodeBase64}`} alt="QR Code Pix" width={190} height={190} style={{ background: "#fff", padding: 10, borderRadius: 12, margin: "0 auto 12px" }} /> : null}
              {qrCode ? (
                <>
                  <p style={{ margin: "0 0 10px", color: "#94a3b8", fontSize: 12 }}>Use o Pix copia e cola abaixo:</p>
                  <div style={{ wordBreak: "break-all", background: "#05070a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: 10, color: "#94a3b8", fontSize: 11, textAlign: "left" }}>{qrCode.length > 120 ? `${qrCode.slice(0, 120)}...` : qrCode}</div>
                  <button type="button" onClick={copyPix} style={{ ...primaryButtonStyle, marginTop: 12 }}>Copiar codigo Pix</button>
                </>
              ) : (
                <p style={{ margin: 0, color: "#94a3b8", fontSize: 13, lineHeight: 1.6 }}>Pedido criado como pendente. O financeiro pode acompanhar e ativar manualmente no admin.</p>
              )}
              <p style={{ margin: "12px 0 0", color: "#64748b", fontSize: 12 }}>A tela atualiza automaticamente quando o pagamento for aprovado.</p>
            </div>
          )}
          {stage === "paid" && (
            <div style={{ textAlign: "center" }}>
              <h3 style={{ color: "#22c55e", margin: "8px 0", fontSize: 22 }}>Pagamento confirmado</h3>
              <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.6 }}>Seu plano foi ativado no perfil profissional.</p>
              <button type="button" onClick={() => window.location.reload()} style={primaryButtonStyle}>Atualizar painel</button>
            </div>
          )}
          {stage === "failed" && (
            <div style={{ textAlign: "center" }}>
              <h3 style={{ color: "#ef4444", margin: "8px 0", fontSize: 20 }}>Nao foi possivel concluir</h3>
              <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.6 }}>{error || "Tente novamente ou revise as credenciais de pagamento."}</p>
              <button type="button" onClick={() => setStage("idle")} style={primaryButtonStyle}>Tentar novamente</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const primaryButtonStyle: CSSProperties = {
  width: "100%",
  padding: 14,
  border: "none",
  borderRadius: 12,
  background: GOLD,
  color: "#080704",
  fontSize: 15,
  fontWeight: 900,
  cursor: "pointer",
};

const centerInfoStyle: CSSProperties = {
  color: "#f8fafc",
  margin: 0,
  textAlign: "center",
  padding: 18,
};

function PlanCard({
  plan,
  selectedIndex,
  onSelectPrice,
  onBuy,
}: {
  plan: Plan;
  selectedIndex: number;
  onSelectPrice: (index: number) => void;
  onBuy: (price: Plan["prices"][number]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const price = plan.prices[selectedIndex] ?? plan.prices[0];

  return (
    <div style={{ background: "#0b1420", border: "1px solid rgba(212,168,67,0.18)", borderRadius: 16, overflow: "hidden" }}>
      <div style={{ height: 4, background: plan.topColor }} />
      <div style={{ padding: "20px 22px 22px" }}>
        {plan.badge && <span style={{ background: plan.topColor, color: "#fff", fontSize: 10, fontWeight: 900, padding: "4px 10px", borderRadius: 20, letterSpacing: 1, textTransform: "uppercase" }}>{plan.badge}</span>}
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 36, height: 36, display: "grid", placeItems: "center", borderRadius: 12, background: GOLD_DIM, color: GOLD, fontSize: 11, fontWeight: 900 }}>{plan.icon.slice(0, 2)}</span>
          <div>
            <h3 style={{ fontSize: 19, fontWeight: 900, color: "#f1f5f9", margin: 0 }}>{plan.name}</h3>
            <span style={{ fontSize: 12, color: plan.pointsColor, background: `${plan.pointsColor}22`, padding: "3px 10px", borderRadius: 20, fontWeight: 800 }}>
              +{plan.points.toLocaleString("pt-BR")} pontos de listagem
            </span>
          </div>
        </div>
        <p style={{ margin: "14px 0", color: "#94a3b8", lineHeight: 1.6, fontSize: 13 }}>{plan.description}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 16 }}>
          {plan.features.map((feature) => (
            <span key={feature} style={{ color: "#cbd5e1", fontSize: 12, lineHeight: 1.45 }}>✓ {feature}</span>
          ))}
        </div>

        <div style={{ marginBottom: 12 }}>
          {plan.pricePerDay ? (
            <>
              <span style={{ fontSize: 30, fontWeight: 900, color: "#f1f5f9" }}>R$ {fmt(plan.pricePerDay)}</span>
              <span style={{ fontSize: 13, color: "#64748b", marginLeft: 4 }}>/dia</span>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>total {price.label}: R$ {fmt(price.value)}</div>
            </>
          ) : (
            <>
              <span style={{ fontSize: 30, fontWeight: 900, color: "#f1f5f9" }}>R$ {fmt(price.value)}</span>
              <span style={{ fontSize: 13, color: "#64748b", marginLeft: 4 }}>por {price.label}</span>
            </>
          )}
        </div>

        {!plan.isOneTime && (
          <div style={{ position: "relative", marginBottom: 12 }}>
            <button type="button" onClick={() => setOpen(!open)} style={{ width: "100%", padding: "11px 14px", background: "#0f172a", border: `1px solid ${open ? GOLD : "#1e293b"}`, borderRadius: 10, color: "#cbd5e1", display: "flex", justifyContent: "space-between", cursor: "pointer" }}>
              <span>{price.label} - R$ {fmt(price.value)}</span>
              <span>{open ? "▲" : "▼"}</span>
            </button>
            {open && (
              <div style={{ position: "absolute", top: "calc(100% + 5px)", left: 0, right: 0, zIndex: 10, background: "#0f172a", border: `1px solid ${GOLD_MID}`, borderRadius: 10, overflow: "hidden" }}>
                {plan.prices.map((item, index) => (
                  <button key={item.key} type="button" onClick={() => { onSelectPrice(index); setOpen(false); }} style={{ width: "100%", padding: "11px 14px", background: index === selectedIndex ? GOLD_DIM : "transparent", border: "none", color: index === selectedIndex ? GOLD : "#94a3b8", textAlign: "left", cursor: "pointer" }}>
                    {item.label} - R$ {fmt(item.value)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ padding: "11px 12px", background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, borderRadius: 10, color: GOLD, fontSize: 12, lineHeight: 1.5, marginBottom: 12, fontWeight: 800 }}>
          Ativacao automatica apos confirmacao do pagamento.
        </div>
        {plan.note && <p style={{ margin: "0 0 12px", color: "#94a3b8", fontSize: 12, lineHeight: 1.6 }}>{plan.note}</p>}

        <button type="button" onClick={() => onBuy(price)} style={{ width: "100%", padding: 14, background: plan.ctaColor, color: plan.ctaColor === GOLD ? "#080704" : "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 900, cursor: "pointer" }}>
          {plan.cta}
        </button>

        <button type="button" onClick={() => setPreviewOpen(!previewOpen)} style={{ width: "100%", padding: "11px 0 0", marginTop: 10, background: "transparent", border: "none", borderTop: "1px solid rgba(212,168,67,0.08)", color: "#64748b", fontSize: 12, cursor: "pointer" }}>
          {previewOpen ? "Ocultar exemplo do anuncio" : "Veja um exemplo do anuncio"}
        </button>
        {previewOpen && (
          <div style={{ marginTop: 14, background: "#060e1b", borderRadius: 12, border: `1px solid ${GOLD_DIM}`, padding: 14 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ width: 72, height: 92, borderRadius: 10, background: "linear-gradient(135deg,#111827,#3b2f13)", display: "grid", placeItems: "center", color: GOLD, fontWeight: 900 }}>EM</div>
              <div>
                <strong style={{ color: "#f8fafc" }}>Seu perfil</strong>
                <p style={{ margin: "5px 0", color: "#64748b", fontSize: 12 }}>Itauna, MG · destaque ativo</p>
                <span style={{ color: GOLD, fontWeight: 800, fontSize: 13 }}>Mais visibilidade na listagem</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PlanosPage() {
  const [activeTab, setActiveTab] = useState<Tab>("planos");
  const [selectedDuration, setSelectedDuration] = useState<Record<string, number>>({});
  const [checkout, setCheckout] = useState<{ plan: Plan; price: Plan["prices"][number] } | null>(null);
  const [pointsAmount, setPointsAmount] = useState(10);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", paddingBottom: 24 }}>
      {checkout && <PlanCheckout selection={checkout} onClose={() => setCheckout(null)} />}

      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, fontWeight: 900, letterSpacing: 3, color: GOLD, textTransform: "uppercase", marginBottom: 8 }}>Painel da profissional</p>
        <h1 style={{ fontSize: "clamp(26px, 5vw, 40px)", fontWeight: 950, color: "#f8fafc", margin: 0, lineHeight: 1.05 }}>
          Planos, destaques e pagamentos
        </h1>
        <p style={{ color: "#94a3b8", lineHeight: 1.6, margin: "12px 0 0" }}>Todo botao de compra agora abre checkout real ou informa claramente o que falta configurar.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          ["Pedidos", "Pix real"],
          ["Provedor", "Asaas"],
          ["Carrinho", "Removido"],
        ].map(([label, value]) => (
          <div key={label} style={{ background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 12, padding: "14px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 5, fontWeight: 800, textTransform: "uppercase" }}>{label}</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: GOLD }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 0, marginBottom: 24, background: "#060e1b", borderRadius: 12, padding: 4, border: `1px solid ${GOLD_DIM}` }}>
        {(["planos", "assinaturas", "trocas"] as Tab[]).map((tab) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: "10px 0", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 900, fontSize: 13, background: activeTab === tab ? "#0b1420" : "transparent", color: activeTab === tab ? GOLD : "#64748b", textTransform: "capitalize" }}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "planos" && (
        <>
          <div style={{ background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 14, padding: "18px 20px", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 900, color: "#f1f5f9", margin: 0 }}>Meus planos e beneficios</h3>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>Sem toggles falsos</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PLANS.filter((plan) => !plan.isOneTime).map((plan) => (
                <div key={plan.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(212,168,67,0.08)" }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#f1f5f9" }}>{plan.name}</span>
                    <span style={{ marginLeft: 8, fontSize: 11, color: plan.pointsColor, background: `${plan.pointsColor}20`, padding: "2px 8px", borderRadius: 20, fontWeight: 800 }}>+{plan.points.toLocaleString("pt-BR")} pts</span>
                  </div>
                  <span style={{ fontSize: 11, color: "#94a3b8", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "4px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>Comprar abaixo</span>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => document.getElementById("professional-plan-cards")?.scrollIntoView({ behavior: "smooth", block: "start" })} style={{ ...primaryButtonStyle, marginTop: 14 }}>
              Comprar planos
            </button>
          </div>

          <div id="professional-plan-cards" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {PLANS.map((plan) => {
              const index = selectedDuration[plan.id] ?? (plan.prices.length > 2 ? 2 : 0);
              return (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  selectedIndex={index}
                  onSelectPrice={(nextIndex) => setSelectedDuration((prev) => ({ ...prev, [plan.id]: nextIndex }))}
                  onBuy={(price) => setCheckout({ plan, price })}
                />
              );
            })}
          </div>
        </>
      )}

      {activeTab === "assinaturas" && (
        <div style={{ background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 16, padding: 24, textAlign: "center" }}>
          <h2 style={{ margin: "0 0 8px", color: "#f8fafc", fontSize: 22, fontWeight: 900 }}>Assinaturas mensais</h2>
          <p style={{ color: "#94a3b8", lineHeight: 1.7 }}>As assinaturas usam o mesmo checkout Pix dos planos. Escolha um plano mensal abaixo para criar pedido real.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, marginTop: 20 }}>
            {PLANS.filter((plan) => !plan.isOneTime).map((plan) => {
              const monthly = plan.prices.find((price) => price.key === "mensal");
              if (!monthly) return null;
              return (
                <button key={plan.id} type="button" onClick={() => setCheckout({ plan, price: monthly })} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left", padding: 16, background: "#060e1b", border: `1px solid ${GOLD_DIM}`, borderRadius: 12, cursor: "pointer" }}>
                  <span style={{ color: "#f8fafc", fontWeight: 900 }}>{plan.name}</span>
                  <span style={{ color: GOLD, fontWeight: 900 }}>R$ {fmt(monthly.value)}/mes</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "trocas" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 16, padding: 22 }}>
            <h2 style={{ margin: "0 0 8px", color: "#f8fafc", fontSize: 20, fontWeight: 900 }}>Comprar pontos de listagem</h2>
            <p style={{ color: "#94a3b8", lineHeight: 1.7 }}>A compra avulsa de pontos ainda nao tem tabela de saldo dedicada no banco. Por isso o botao fica bloqueado, sem parecer uma compra ativa.</p>
            <div style={{ display: "flex", alignItems: "center", maxWidth: 230, border: `1px solid ${GOLD_MID}`, borderRadius: 10, overflow: "hidden", margin: "16px 0" }}>
              <button type="button" onClick={() => setPointsAmount(Math.max(10, pointsAmount - 10))} style={stepperButtonStyle}>-</button>
              <input value={pointsAmount} onChange={(event) => setPointsAmount(Math.min(15000, Math.max(10, Number(event.target.value) || 10)))} type="number" min={10} max={15000} style={{ flex: 1, height: 44, background: "#0f172a", border: "none", color: "#f1f5f9", fontSize: 16, fontWeight: 900, textAlign: "center", outline: "none" }} />
              <button type="button" onClick={() => setPointsAmount(Math.min(15000, pointsAmount + 10))} style={stepperButtonStyle}>+</button>
            </div>
            <div style={{ color: "#f8fafc", fontSize: 28, fontWeight: 900, marginBottom: 12 }}>R$ {fmt(pointsAmount * 1.15)}</div>
            <button type="button" disabled style={{ ...primaryButtonStyle, opacity: 0.55, cursor: "not-allowed" }}>Compra de pontos indisponivel</button>
          </div>
        </div>
      )}
    </div>
  );
}

const stepperButtonStyle: CSSProperties = {
  width: 44,
  height: 44,
  background: "#0f172a",
  border: "none",
  color: "#94a3b8",
  fontSize: 20,
  cursor: "pointer",
  flexShrink: 0,
};

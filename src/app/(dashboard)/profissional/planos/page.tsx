"use client";
import { useState } from "react";
import Image from "next/image";

const GOLD = "#d4a843";
const GOLD_DIM = "rgba(212,168,67,0.12)";
const GOLD_MID = "rgba(212,168,67,0.3)";

type Tab = "planos" | "assinaturas" | "trocas";
type Duration = "3d" | "7d" | "30d" | "mensal";

interface Plan {
  id: string;
  name: string;
  emoji: string;
  badge?: string;
  badgeColor?: string;
  points: number;
  pointsColor: string;
  description: string;
  features: string[];
  pricePerDay?: number;
  prices: { label: string; key: Duration | "hora" | "30min"; value: number }[];
  cta: string;
  ctaColor: string;
  topColor: string;
  isOneTime?: boolean;
  note?: string;
  activeInDemo?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "subir",
    name: "Subir Agora",
    emoji: "🚀",
    badge: "EXCLUSIVO",
    badgeColor: "#cc3300",
    points: 4000,
    pointsColor: "#ff6b35",
    description: "10x mais visitas e 5x mais contatos de clientes que outros perfis da sua cidade!",
    features: ["Seu anúncio acima dos outros planos", "Anúncio em tamanho grande", "Galeria de fotos exclusiva", "Informações adicionais visíveis", "Prioridade na Central de Atendimento Fatal Model"],
    prices: [{ label: "1 hora", key: "hora", value: 6.90 }],
    cta: "Comprar já",
    ctaColor: "#ff6b35",
    topColor: "#cc3300",
    isOneTime: true,
    note: "Este plano só pode ser ativado se você possuir todos os pontos necessários. Ocultar Idade ou nunca ter comprado um plano antes.",
  },
  {
    id: "30min",
    name: "30min no Topo",
    emoji: "⚡",
    badge: "EXCLUSIVO",
    badgeColor: "#cc3300",
    points: 4000,
    pointsColor: "#ff6b35",
    description: "Receba mais contatos de clientes, garantindo maior visibilidade com seu perfil no topo da sua cidade.",
    features: ["Anúncio em posição de destaque", "+ todos os benefícios de outros planos"],
    prices: [{ label: "30 minutos", key: "30min", value: 49.90 }],
    cta: "Contratar o Plano",
    ctaColor: "#ff6b35",
    topColor: "#cc3300",
    isOneTime: true,
  },
  {
    id: "super-top",
    name: "Super Top",
    emoji: "👑",
    badge: "MAIS POPULAR",
    badgeColor: "#d4a843",
    points: 2000,
    pointsColor: "#d4a843",
    description: "Apareça em destaque nas buscas e atraia muito mais clientes.",
    features: ["Anúncio grande", "Galeria de fotos", "Informações adicionais", "Telefone visível no perfil todos os dias"],
    pricePerDay: 18.93,
    prices: [
      { label: "3 dias", key: "3d", value: 120.90 },
      { label: "7 dias", key: "7d", value: 196.90 },
      { label: "30 dias", key: "30d", value: 567.90 },
      { label: "Assinatura mensal R$ 14,86/dia", key: "mensal", value: 446.00 },
    ],
    cta: "Comprar já",
    ctaColor: GOLD,
    topColor: "#d4a843",
    activeInDemo: true,
  },
  {
    id: "top",
    name: "Top",
    emoji: "🏆",
    points: 1000,
    pointsColor: "#22c55e",
    description: "Tenha uma foto maior no anúncio e mais visibilidade na listagem.",
    features: ["Anúncio médio", "Informações adicionais", "Telefone visível no perfil todos os dias"],
    pricePerDay: 11.03,
    prices: [
      { label: "3 dias", key: "3d", value: 66.90 },
      { label: "7 dias", key: "7d", value: 105.90 },
      { label: "30 dias", key: "30d", value: 330.90 },
      { label: "Assinatura mensal R$ 8,66/dia", key: "mensal", value: 259.80 },
    ],
    cta: "Comprar já",
    ctaColor: "#22c55e",
    topColor: "#22c55e",
  },
  {
    id: "diamante",
    name: "Diamante",
    emoji: "💎",
    points: 500,
    pointsColor: "#818cf8",
    description: "Apareça em banners dentro do perfil de outros anunciantes.",
    features: ["Apareça em banners dentro do perfil de outros anunciantes", "+ todos os benefícios de outros planos"],
    pricePerDay: 12.66,
    prices: [
      { label: "3 dias", key: "3d", value: 80.90 },
      { label: "7 dias", key: "7d", value: 114.90 },
      { label: "30 dias", key: "30d", value: 379.90 },
      { label: "Assinatura mensal R$ 11,40/dia", key: "mensal", value: 342.00 },
    ],
    cta: "Comprar já",
    ctaColor: "#818cf8",
    topColor: "#4f46e5",
  },
  {
    id: "black",
    name: "Black",
    emoji: "✦",
    badge: "NOVO",
    badgeColor: "#475569",
    points: 200,
    pointsColor: "#94a3b8",
    description: "Anúncio com cor escura e mais chamativa.",
    features: ["Anúncio com cor escura e mais chamativa"],
    pricePerDay: 3.83,
    prices: [
      { label: "3 dias", key: "3d", value: 34.90 },
      { label: "7 dias", key: "7d", value: 58.90 },
      { label: "30 dias", key: "30d", value: 114.90 },
      { label: "Assinatura mensal R$ 3,45/dia", key: "mensal", value: 103.50 },
    ],
    cta: "Comprar já",
    ctaColor: "#94a3b8",
    topColor: "#334155",
  },
  {
    id: "telefone",
    name: "Telefone na Listagem",
    emoji: "📞",
    badge: "VENCE EM 3 DIAS",
    badgeColor: "#cc3300",
    points: 200,
    pointsColor: "#22c55e",
    description: "Botão exclusivo exibindo seu contato na listagem Terça, Quinta, Sábado e Domingo.",
    features: ["Botão exclusivo exibindo seu contato na listagem Terça, Quinta, Sábado e Domingo"],
    pricePerDay: 3.10,
    prices: [
      { label: "3 dias", key: "3d", value: 23.90 },
      { label: "7 dias", key: "7d", value: 34.90 },
      { label: "30 dias", key: "30d", value: 92.90 },
      { label: "Assinatura mensal R$ 2,79/dia", key: "mensal", value: 83.70 },
    ],
    cta: "Comprar já",
    ctaColor: "#22c55e",
    topColor: "#166534",
    note: "Além do plano ativo, você precisa de 1000 pontos para que seu telefone seja visto todos os dias.",
    activeInDemo: true,
  },
  {
    id: "ocultar-idade",
    name: "Ocultar Idade",
    emoji: "🔒",
    badge: "VENCE EM 3 DIAS",
    badgeColor: "#cc3300",
    points: 100,
    pointsColor: "#a78bfa",
    description: "Apenas Clientes Premium poderão ver sua idade.",
    features: ["Esconda sua idade na plataforma", "Apenas Clientes Premium poderão ver sua idade"],
    pricePerDay: 3.33,
    prices: [
      { label: "3 dias", key: "3d", value: 35.90 },
      { label: "7 dias", key: "7d", value: 49.90 },
      { label: "30 dias", key: "30d", value: 99.90 },
      { label: "Assinatura mensal R$ 3,00/dia", key: "mensal", value: 90.00 },
    ],
    cta: "Comprar já",
    ctaColor: "#a78bfa",
    topColor: "#6d28d9",
  },
];

const FAQ_ITEMS = [
  { q: "O anúncio é gratuito?", a: "Sim. A Elite Modell não cobra nenhuma taxa de cadastro, nem nos atendimentos. O valor é 100% recebido pelas pessoas que anunciam na plataforma. Ou seja, o anunciante fica com todo o valor." },
  { q: "Como funciona a ordem dos anúncios na listagem?", a: "A posição dos anúncios é calculada por pontuação. Cada plano adquirido adiciona pontos e pode melhorar sua posição na listagem." },
  { q: "Qual a diferença entre plano e assinatura?", a: "O plano tem duração fixa (3, 7 ou 30 dias). A assinatura é renovada mensalmente com desconto de 10% a partir do segundo mês." },
  { q: "O que são pontos ao adquirir um plano?", a: "Os pontos de listagem determinam a posição do seu anúncio na busca. Quanto mais pontos, mais alto você aparece." },
  { q: "Quanto tempo meu anúncio fica ativo?", a: "O anúncio fica ativo enquanto você tiver pelo menos um plano ativo. Após o vencimento, o anúncio continua visível, porém sem destaque." },
  { q: "Cadastro é grátis, mas sou obrigada a comprar os planos para anunciar?", a: "Não. O cadastro e a listagem básica são gratuitos. Os planos aumentam sua visibilidade e posição na listagem." },
];

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PlanosPage() {
  const [activeTab, setActiveTab] = useState<Tab>("planos");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<Record<string, number>>({});
  const [activation, setActivation] = useState<Record<string, "agora" | "depois">>({});
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [simulateOpen, setSimulateOpen] = useState<string | null>(null);
  const [pontosQtd, setPontosQtd] = useState(10);
  const [activePlans, setActivePlans] = useState<Record<string, boolean>>({ "super-top": true, "telefone": true });

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: GOLD, textTransform: "uppercase", marginBottom: 8 }}>Painel da profissional</p>
        <h1 style={{ fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 900, color: "#f1f5f9", margin: 0, lineHeight: 1.1 }}>
          Impulsione seu sucesso<br />com os nossos Planos!
        </h1>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Sua posição", value: "12°", color: "#cc3300", bg: "rgba(204,51,0,0.12)" },
          { label: "Sua pontuação", value: "2.320", color: GOLD, bg: GOLD_DIM },
          { label: "Investimentos", value: "R$ 0,00", color: "#94a3b8", bg: "rgba(148,163,184,0.08)" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#0b1420", border: `1px solid rgba(212,168,67,0.15)`, borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#475569", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: s.color, background: s.bg, borderRadius: 8, padding: "4px 12px", display: "inline-block" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 24, background: "#060e1b", borderRadius: 10, padding: 4, border: `1px solid ${GOLD_DIM}` }}>
        {(["planos", "assinaturas", "trocas"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            flex: 1, padding: "9px 0", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 700, fontSize: 13,
            background: activeTab === t ? "#0b1420" : "transparent",
            color: activeTab === t ? GOLD : "#475569",
            transition: "all 0.2s",
            textTransform: "capitalize",
          }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── PLANOS TAB ── */}
      {activeTab === "planos" && (
        <>
          {/* Active plans summary */}
          <div style={{ background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 14, padding: "18px 20px", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>Meus planos ativos</h3>
              <span style={{ fontSize: 11, color: "#475569" }}>Ative ou desative abaixo</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PLANS.filter(p => !p.isOneTime).map(plan => (
                <div key={plan.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid rgba(212,168,67,0.08)` }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: activePlans[plan.id] ? "#f1f5f9" : "#475569" }}>{plan.emoji} {plan.name}</span>
                    <span style={{ marginLeft: 8, fontSize: 11, color: plan.pointsColor, background: `${plan.pointsColor}20`, padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>+{plan.points.toLocaleString("pt-BR")} pts</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {activePlans[plan.id] && plan.pricePerDay && (
                      <span style={{ fontSize: 11, color: "#475569" }}>R$ {fmt(plan.pricePerDay)}/dia</span>
                    )}
                    {!activePlans[plan.id] && plan.pricePerDay && (
                      <span style={{ fontSize: 11, color: "#475569" }}>R$ {fmt(plan.pricePerDay)}/dia</span>
                    )}
                    {/* Toggle */}
                    <button
                      onClick={() => setActivePlans(p => ({ ...p, [plan.id]: !p[plan.id] }))}
                      style={{
                        width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                        background: activePlans[plan.id] ? GOLD : "#1e293b",
                        position: "relative", transition: "background 0.2s", flexShrink: 0,
                      }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: "50%", background: "#fff",
                        position: "absolute", top: 3,
                        left: activePlans[plan.id] ? 23 : 3,
                        transition: "left 0.2s",
                      }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button style={{ marginTop: 14, width: "100%", padding: "11px", background: GOLD, color: "#060e1b", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
              Comprar planos
            </button>
          </div>

          {/* Plan cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {PLANS.map(plan => {
              const sel = selectedDuration[plan.id] ?? (plan.prices.length > 2 ? 2 : 0);
              const chosenPrice = plan.prices[sel];
              const act = activation[plan.id] ?? "agora";
              const isDropOpen = openDropdown === plan.id;
              const isSim = simulateOpen === plan.id;

              return (
                <div key={plan.id} style={{ background: "#0b1420", border: `1px solid rgba(212,168,67,0.18)`, borderRadius: 16, overflow: "hidden" }}>
                  {/* Top color bar */}
                  <div style={{ height: 4, background: plan.topColor }} />

                  <div style={{ padding: "20px 22px 22px" }}>
                    {/* Badge */}
                    {plan.badge && (
                      <div style={{ marginBottom: 10 }}>
                        <span style={{ background: plan.badgeColor, color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 20, letterSpacing: 1, textTransform: "uppercase" }}>
                          {plan.badge.includes("DIAS") ? "🔥 " : ""}{plan.badge}
                        </span>
                      </div>
                    )}

                    {/* Name & points */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: 20 }}>{plan.emoji}</span>
                      <h3 style={{ fontSize: 18, fontWeight: 900, color: "#f1f5f9", margin: 0 }}>{plan.name}</h3>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <span style={{ fontSize: 12, color: plan.pointsColor, background: `${plan.pointsColor}22`, padding: "3px 10px", borderRadius: 20, fontWeight: 700 }}>
                        +{plan.points.toLocaleString("pt-BR")} pontos de listagem
                      </span>
                    </div>

                    {/* Features grid */}
                    <div style={{ display: "grid", gridTemplateColumns: plan.features.length > 2 ? "1fr 1fr" : "1fr", gap: 6, marginBottom: 16 }}>
                      {plan.features.slice(0, 4).map(f => (
                        <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={plan.pointsColor} strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 1 }}><polyline points="20 6 9 17 4 12"/></svg>
                          <span style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.4 }}>{f}</span>
                        </div>
                      ))}
                    </div>

                    {/* Price */}
                    {plan.isOneTime ? (
                      <div style={{ marginBottom: 16 }}>
                        <span style={{ fontSize: 28, fontWeight: 900, color: "#f1f5f9" }}>R$ {fmt(plan.prices[0].value)}</span>
                        <span style={{ fontSize: 13, color: "#475569", marginLeft: 6 }}>por {plan.prices[0].label}</span>
                      </div>
                    ) : (
                      <div style={{ marginBottom: 4 }}>
                        {plan.pricePerDay && (
                          <>
                            <span style={{ fontSize: 28, fontWeight: 900, color: "#f1f5f9" }}>R$ {fmt(plan.pricePerDay)}</span>
                            <span style={{ fontSize: 13, color: "#475569", marginLeft: 4 }}>/dia</span>
                            <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>
                              total por {chosenPrice.label.startsWith("Assinatura") ? "30 dias" : chosenPrice.label} R$ {fmt(chosenPrice.value)}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Duration selector */}
                    {!plan.isOneTime && plan.prices.length > 0 && (
                      <div style={{ position: "relative", marginBottom: 14 }}>
                        <button
                          onClick={() => setOpenDropdown(isDropOpen ? null : plan.id)}
                          style={{ width: "100%", padding: "10px 14px", background: "#0f172a", border: `1px solid ${isDropOpen ? GOLD : "#1e293b"}`, borderRadius: 8, color: "#94a3b8", fontSize: 13, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "border-color 0.2s" }}
                        >
                          <span>{chosenPrice.label.startsWith("Assinatura") ? `${chosenPrice.label}` : `${chosenPrice.label} R$ ${fmt(chosenPrice.value)}`}</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: isDropOpen ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }}>
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </button>
                        {isDropOpen && (
                          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#0f172a", border: `1px solid ${GOLD_MID}`, borderRadius: 8, zIndex: 20, marginTop: 4, overflow: "hidden" }}>
                            {plan.prices.map((p, i) => (
                              <button
                                key={p.key}
                                onClick={() => { setSelectedDuration(d => ({ ...d, [plan.id]: i })); setOpenDropdown(null); }}
                                style={{ width: "100%", padding: "11px 14px", background: i === sel ? GOLD_DIM : "transparent", border: "none", borderBottom: i < plan.prices.length - 1 ? `1px solid rgba(212,168,67,0.08)` : "none", color: i === sel ? GOLD : "#94a3b8", fontSize: 13, cursor: "pointer", textAlign: "left", transition: "background 0.15s" }}
                              >
                                {p.label.startsWith("Assinatura") ? p.label : `${p.label} R$ ${fmt(p.value)}`}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Activation mode (for plans that need scheduling) */}
                    {(plan.id === "telefone" || plan.id === "30min" || plan.id === "subir") && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                        {(["agora", "depois"] as const).map(mode => (
                          <button
                            key={mode}
                            onClick={() => setActivation(a => ({ ...a, [plan.id]: mode }))}
                            style={{ padding: "12px 10px", background: act === mode ? GOLD_DIM : "#0f172a", border: `1.5px solid ${act === mode ? GOLD_MID : "#1e293b"}`, borderRadius: 8, color: act === mode ? GOLD : "#475569", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
                          >
                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>
                              {mode === "agora" ? "✓ Ativar agora" : "○ Ativar depois"}
                            </div>
                            <div style={{ fontSize: 11, color: "#334155", lineHeight: 1.4 }}>
                              {mode === "agora" ? "Ativa o plano imediatamente após a compra." : "Ativa o plano automaticamente quando o anterior vencer."}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Note */}
                    {plan.note && (
                      <div style={{ background: "rgba(212,168,67,0.06)", border: `1px solid ${GOLD_DIM}`, borderRadius: 8, padding: "10px 12px", marginBottom: 14, display: "flex", gap: 8 }}>
                        <span style={{ fontSize: 14, flexShrink: 0 }}>ℹ️</span>
                        <p style={{ margin: 0, fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>{plan.note}</p>
                      </div>
                    )}

                    {/* CTA */}
                    <button
                      style={{ width: "100%", padding: "13px", background: plan.ctaColor, color: plan.ctaColor === GOLD ? "#060e1b" : "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 800, cursor: "pointer", marginBottom: 8, transition: "opacity 0.2s" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.88")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
                    >
                      {plan.cta}
                    </button>

                    {!plan.isOneTime && (
                      <button style={{ width: "100%", padding: "8px", background: "transparent", border: "none", color: "#475569", fontSize: 13, cursor: "pointer" }}>
                        Adicionar no carrinho
                      </button>
                    )}

                    {/* Simulate toggle */}
                    <button
                      onClick={() => setSimulateOpen(isSim ? null : plan.id)}
                      style={{ width: "100%", padding: "8px 0 0", background: "transparent", border: "none", borderTop: `1px solid rgba(212,168,67,0.08)`, color: "#475569", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 8 }}
                    >
                      Veja um exemplo do anúncio
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: isSim ? "rotate(180deg)" : undefined }}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>

                    {isSim && (
                      <div style={{ marginTop: 14, background: "#060e1b", borderRadius: 12, overflow: "hidden", border: `1px solid ${GOLD_DIM}` }}>
                        <div style={{ padding: "10px 14px", borderBottom: `1px solid ${GOLD_DIM}`, background: "#0b1420" }}>
                          <span style={{ fontSize: 11, color: "#475569", fontWeight: 700, letterSpacing: 1 }}>SIMULAÇÃO DO ANÚNCIO</span>
                        </div>
                        <div style={{ display: "flex", gap: 12, padding: 14, alignItems: "flex-start" }}>
                          <div style={{ width: 70, height: 90, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "#0f172a" }}>
                            <Image src="/model.jpeg" alt="preview" width={140} height={180} sizes="70px" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "38% top" }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>Lora</span>
                              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                              <span style={{ fontSize: 11, color: "#22c55e" }}>Online</span>
                            </div>
                            <div style={{ fontSize: 11, color: "#475569", marginBottom: 6 }}>São Paulo, SP · 27 anos</div>
                            {plan.id === "super-top" && (
                              <span style={{ fontSize: 10, background: "rgba(212,168,67,0.15)", color: GOLD, padding: "2px 7px", borderRadius: 4, fontWeight: 700 }}>DESTAQUE</span>
                            )}
                            <div style={{ fontSize: 13, fontWeight: 700, color: GOLD, marginTop: 6 }}>R$ 800/hora</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mais vantagens */}
          <div style={{ marginTop: 32, background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 16, padding: "24px 22px" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", margin: "0 0 6px" }}>Mais vantagens que seu anúncio terá com planos da Elite Modell</h3>
            <p style={{ fontSize: 13, color: "#475569", margin: "0 0 16px" }}>Adquirindo qualquer plano você também terá os seguintes benefícios:</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {["Prioridade no atendimento", "Relatório de visitas", "Badge verificada", "Suporte prioritário", "Análise de desempenho"].map(v => (
                <span key={v} style={{ background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, borderRadius: 20, padding: "5px 14px", fontSize: 12, color: GOLD, fontWeight: 600 }}>{v}</span>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div style={{ marginTop: 32, marginBottom: 32 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", marginBottom: 20 }}>Ainda tem dúvidas?</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {FAQ_ITEMS.map((item, i) => (
                <div key={i} style={{ background: "#0b1420", border: `1px solid ${openFaq === i ? GOLD_MID : GOLD_DIM}`, borderRadius: 10, overflow: "hidden", transition: "border-color 0.2s" }}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    style={{ width: "100%", padding: "14px 18px", background: "transparent", border: "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", textAlign: "left" }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9" }}>{item.q}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.5" style={{ flexShrink: 0, transform: openFaq === i ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                  {openFaq === i && (
                    <div style={{ padding: "0 18px 14px" }}>
                      <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>{item.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── ASSINATURAS TAB ── */}
      {activeTab === "assinaturas" && (
        <div style={{ background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 16, padding: 28, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <h3 style={{ color: "#f1f5f9", fontSize: 18, fontWeight: 700, margin: "0 0 10px" }}>Assinando sai mais barato!</h3>
          <p style={{ color: "#475569", fontSize: 14, margin: "0 0 20px", lineHeight: 1.7 }}>
            Todas as assinaturas têm desconto de 10% a partir do segundo mês.<br />
            Ative um plano mensal e economize continuamente.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
            {PLANS.filter(p => !p.isOneTime).map(plan => {
              const mensal = plan.prices.find(p => p.key === "mensal");
              if (!mensal) return null;
              return (
                <div key={plan.id} style={{ background: "#060e1b", border: `1px solid ${GOLD_DIM}`, borderRadius: 12, padding: "14px 16px", textAlign: "left" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>{plan.emoji} {plan.name}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: GOLD }}>R$ {fmt(mensal.value)}<span style={{ fontSize: 12, color: "#475569", fontWeight: 400 }}>/mês</span></div>
                  <div style={{ fontSize: 11, color: "#334155", marginTop: 2 }}>{mensal.label.replace("Assinatura mensal ", "").replace("R$", "≈ R$")}/dia</div>
                </div>
              );
            })}
          </div>
          <button style={{ padding: "13px 32px", background: GOLD, color: "#060e1b", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
            Ver assinaturas disponíveis
          </button>
        </div>
      )}

      {/* ── TROCAS TAB ── */}
      {activeTab === "trocas" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 16, padding: "24px 22px" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", margin: "0 0 6px" }}>Comprar pontos de listagem</h3>
            <p style={{ fontSize: 13, color: "#475569", margin: "0 0 20px" }}>Aumente sua posição comprando pontos avulsos.</p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 8, fontWeight: 600 }}>Quantidade de pontos</label>
              <div style={{ display: "flex", alignItems: "center", gap: 0, border: `1px solid ${GOLD_MID}`, borderRadius: 8, overflow: "hidden", maxWidth: 220 }}>
                <button
                  onClick={() => setPontosQtd(Math.max(10, pontosQtd - 10))}
                  style={{ width: 44, height: 44, background: "#0f172a", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer", flexShrink: 0 }}
                >−</button>
                <input
                  type="number"
                  value={pontosQtd}
                  min={10} max={15000}
                  onChange={e => setPontosQtd(Math.min(15000, Math.max(10, parseInt(e.target.value) || 10)))}
                  style={{ flex: 1, height: 44, background: "#0f172a", border: "none", color: "#f1f5f9", fontSize: 16, fontWeight: 700, textAlign: "center", outline: "none" }}
                />
                <button
                  onClick={() => setPontosQtd(Math.min(15000, pontosQtd + 10))}
                  style={{ width: 44, height: 44, background: "#0f172a", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer", flexShrink: 0 }}
                >+</button>
              </div>
              <p style={{ fontSize: 11, color: "#334155", margin: "6px 0 0" }}>Mín. 10 pontos · Máx. 15.000 pontos</p>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}>Valor a pagar</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#f1f5f9" }}>R$ {fmt(pontosQtd * 1.15)}</div>
              <div style={{ fontSize: 12, color: "#475569" }}>total por 30 dias R$ {fmt(pontosQtd * 1.15)}</div>
            </div>

            {/* Duration options */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 20 }}>
              {[
                { label: `30 dias R$ ${fmt(pontosQtd * 1.15)}`, active: true },
                { label: `7 dias R$ ${fmt(pontosQtd * 0.55 / 10)}`, active: false },
                { label: `3 dias R$ ${fmt(pontosQtd * 0.30 / 10)}`, active: false },
              ].map((opt, i) => (
                <div key={i} style={{ padding: "10px 14px", background: opt.active ? GOLD_DIM : "#0f172a", border: `1px solid ${opt.active ? GOLD_MID : "#1e293b"}`, borderRadius: 8, fontSize: 13, color: opt.active ? GOLD : "#475569", fontWeight: opt.active ? 700 : 400, cursor: "pointer" }}>
                  {opt.label}
                </div>
              ))}
            </div>

            <button style={{ width: "100%", padding: "13px", background: GOLD, color: "#060e1b", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
              Comprar pontos
            </button>
          </div>

          <div style={{ background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 12, padding: "14px 18px" }}>
            <p style={{ margin: 0, fontSize: 12, color: "#475569", lineHeight: 1.7 }}>
              * A posição do seu anúncio é calculada com base nos pontos disponíveis. Esses pontos mudam ao longo do dia, então a posição pode subir ou descer a qualquer momento.
            </p>
          </div>

          {/* Simule */}
          <div style={{ background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${GOLD_DIM}` }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>Simule seu anúncio</h3>
            </div>
            <div style={{ padding: 18, display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 100, height: 130, borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
                <Image src="/model.jpeg" alt="sim" width={200} height={260} sizes="100px" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "38% top" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: "#f1f5f9" }}>Lora</span>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                  <span style={{ fontSize: 12, color: "#22c55e", fontWeight: 600 }}>Online</span>
                </div>
                <div style={{ fontSize: 12, color: "#475569", marginBottom: 8 }}>São Paulo · 27 anos</div>
                <div style={{ background: "rgba(212,168,67,0.15)", borderRadius: 6, padding: "4px 8px", display: "inline-block", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: GOLD, fontWeight: 700 }}>DESTAQUE PREMIUM</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: GOLD }}>R$ 800/h</div>
                <div style={{ fontSize: 11, color: "#334155", marginTop: 4 }}>Com local próprio</div>
                <button style={{ marginTop: 10, padding: "8px 16px", background: GOLD, color: "#060e1b", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
                  📞 Ver Telefone
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

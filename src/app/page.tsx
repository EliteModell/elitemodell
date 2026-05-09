"use client";
import { Suspense, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FiltersModal from "@/components/FiltersModal";
import Stories from "@/components/Stories";
import AgeGate from "@/components/AgeGate";

type MainTab = "acompanhantes" | "imoveis";
type SubTab = "mulheres" | "trans" | "homens";

const acompanhantes = {
  mulheres: [
    { id: 1, nome: "Amanda R.", cidade: "São Paulo, SP", preco: 150, foto: "/model1.jpg", online: true, avaliacao: 4.9, total: 87, servicos: ["Acompanhamento", "Viagens", "Jantar"] },
    { id: 2, nome: "Letícia M.", cidade: "Rio de Janeiro, RJ", preco: 250, foto: "/model2.jpg", online: false, avaliacao: 4.8, total: 63, servicos: ["Massagem", "Eventos", "Local próprio"] },
    { id: 3, nome: "Bruna S.", cidade: "Curitiba, PR", preco: 120, foto: "/model1.jpg", online: true, avaliacao: 5.0, total: 120, servicos: ["Acompanhamento", "Hotéis"] },
    { id: 4, nome: "Fernanda K.", cidade: "São Paulo, SP", preco: 800, foto: "/model2.jpg", online: true, avaliacao: 4.7, total: 45, servicos: ["VIP", "Viagens", "Eventos"] },
    { id: 5, nome: "Isabela C.", cidade: "Belo Horizonte, MG", preco: 320, foto: "/model1.jpg", online: false, avaliacao: 4.9, total: 92, servicos: ["Massagem tântrica", "Local próprio"] },
    { id: 16, nome: "Carolina V.", cidade: "São Paulo, SP", preco: 180, foto: "/model2.jpg", online: true, avaliacao: 4.7, total: 54, servicos: ["Acompanhamento", "Local próprio"] },
    { id: 17, nome: "Juliana T.", cidade: "Recife, PE", preco: 1200, foto: "/model1.jpg", online: true, avaliacao: 5.0, total: 31, servicos: ["VIP", "Viagens", "Eventos"] },
    { id: 18, nome: "Patricia L.", cidade: "Brasília, DF", preco: 200, foto: "/model2.jpg", online: false, avaliacao: 4.6, total: 77, servicos: ["Acompanhamento", "Jantar"] },
  ],
  trans: [
    { id: 6, nome: "Valentina G.", cidade: "São Paulo, SP", preco: 200, foto: "/model2.jpg", online: true, avaliacao: 4.9, total: 78, servicos: ["Acompanhamento", "Viagens"] },
    { id: 7, nome: "Melissa F.", cidade: "Rio de Janeiro, RJ", preco: 180, foto: "/model1.jpg", online: true, avaliacao: 4.8, total: 55, servicos: ["Eventos", "Hotéis"] },
    { id: 8, nome: "Sophia A.", cidade: "Curitiba, PR", preco: 600, foto: "/model2.jpg", online: false, avaliacao: 5.0, total: 101, servicos: ["Local próprio", "Massagem"] },
    { id: 9, nome: "Luna P.", cidade: "Salvador, BA", preco: 150, foto: "/model1.jpg", online: true, avaliacao: 4.7, total: 42, servicos: ["Acompanhamento"] },
    { id: 10, nome: "Bianca T.", cidade: "Florianópolis, SC", preco: 1500, foto: "/model2.jpg", online: true, avaliacao: 4.9, total: 67, servicos: ["VIP", "Viagens"] },
  ],
  homens: [
    { id: 11, nome: "Rafael M.", cidade: "São Paulo, SP", preco: 200, foto: "/model1.jpg", online: true, avaliacao: 4.8, total: 65, servicos: ["Acompanhamento", "Eventos"] },
    { id: 12, nome: "Gabriel T.", cidade: "Rio de Janeiro, RJ", preco: 350, foto: "/model2.jpg", online: false, avaliacao: 4.9, total: 48, servicos: ["Massagem", "Viagens"] },
    { id: 13, nome: "Lucas V.", cidade: "Florianópolis, SC", preco: 130, foto: "/model1.jpg", online: true, avaliacao: 4.7, total: 33, servicos: ["Acompanhamento"] },
    { id: 14, nome: "Diego S.", cidade: "Belo Horizonte, MG", preco: 900, foto: "/model2.jpg", online: true, avaliacao: 5.0, total: 89, servicos: ["VIP", "Eventos"] },
    { id: 15, nome: "Thiago N.", cidade: "São Paulo, SP", preco: 250, foto: "/model1.jpg", online: false, avaliacao: 4.8, total: 55, servicos: ["Viagens", "Hotéis"] },
  ],
};

const imoveis = [
  { id: 1, titulo: "Cobertura Premium", cidade: "São Paulo, SP", preco: 890, foto: "/hero-model.jpeg", quartos: 3, avaliacao: 4.9, tipo: "Cobertura", tags: ["Com piscina"] },
  { id: 2, titulo: "Flat Executivo", cidade: "Rio de Janeiro, RJ", preco: 650, foto: "/hero-model.jpeg", quartos: 1, avaliacao: 4.8, tipo: "Flat", tags: [] },
  { id: 3, titulo: "Studio Moderno", cidade: "Curitiba, PR", preco: 420, foto: "/hero-model.jpeg", quartos: 1, avaliacao: 4.7, tipo: "Studio", tags: ["Pet friendly"] },
  { id: 4, titulo: "Casa de Luxo", cidade: "Florianópolis, SC", preco: 1200, foto: "/hero-model.jpeg", quartos: 4, avaliacao: 5.0, tipo: "Casa", tags: ["Com piscina", "Pet friendly"] },
  { id: 5, titulo: "Apartamento Central", cidade: "Belo Horizonte, MG", preco: 380, foto: "/hero-model.jpeg", quartos: 2, avaliacao: 4.6, tipo: "Apartamento", tags: [] },
  { id: 6, titulo: "Loft Exclusivo", cidade: "Porto Alegre, RS", preco: 550, foto: "/hero-model.jpeg", quartos: 1, avaliacao: 4.9, tipo: "Apartamento", tags: ["Pet friendly"] },
];

const FILTROS_RAPIDOS = ["Online agora", "Com avaliações", "Com local", "Até R$300", "Fotos verificadas", "Exclusivas"] as const;
type FiltroRapido = typeof FILTROS_RAPIDOS[number];

const CATEGORIAS = [
  {
    label: "Acompanhantes Femininas",
    sub: "Mulheres",
    count: "+1.400 perfis",
    cidades: "São Paulo · Rio · Curitiba · BH · Brasília",
    tab: "acompanhantes" as MainTab,
    subTab: "mulheres" as SubTab,
    accent: "#cc0000",
  },
  {
    label: "Acompanhantes Trans",
    sub: "Trans",
    count: "+320 perfis",
    cidades: "São Paulo · Rio · Salvador · Florianópolis",
    tab: "acompanhantes" as MainTab,
    subTab: "trans" as SubTab,
    accent: "#9333ea",
  },
  {
    label: "Acompanhantes Masculinos",
    sub: "Homens",
    count: "+280 perfis",
    cidades: "São Paulo · Rio · BH · Porto Alegre",
    tab: "acompanhantes" as MainTab,
    subTab: "homens" as SubTab,
    accent: "#0ea5e9",
  },
  {
    label: "Imóveis de Luxo",
    sub: "Hospedagem",
    count: "+600 imóveis",
    cidades: "São Paulo · Rio · Florianópolis · Campos",
    tab: "imoveis" as MainTab,
    subTab: null,
    accent: "#c9a84c",
  },
];

const FEATURES = [
  {
    title: "100% Verificadas",
    desc: "Todos os perfis passam por verificação de documentos e fotos reais antes de serem publicados.",
  },
  {
    title: "Pagamento Seguro",
    desc: "Pix, cartão e boleto com ambiente criptografado. Reembolso garantido em casos de cancelamento.",
  },
  {
    title: "Discrição Total",
    desc: "Seus dados são protegidos com criptografia de ponta e nunca compartilhados com terceiros.",
  },
  {
    title: "Avaliações Reais",
    desc: "Só quem realizou o serviço pode avaliar. Transparência total para sua segurança.",
  },
];

const SERVICOS_POPULARES = [
  "Com local", "VIP", "Viagens", "Eventos", "Jantar", "Massagem",
  "Hotéis", "A domicílio", "Jovem", "Madura", "Dupla", "BDSM",
];

function StarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" style={{ flexShrink: 0 }}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as MainTab) ?? "acompanhantes";
  const [mainTab, setMainTab] = useState<MainTab>(initialTab);
  const [subTab, setSubTab] = useState<SubTab>("mulheres");
  const [busca, setBusca] = useState("");
  const [heroBusca, setHeroBusca] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filtrosAtivos, setFiltrosAtivos] = useState<Set<FiltroRapido>>(new Set());
  const [filtroImovel, setFiltroImovel] = useState<string | null>(null);
  const listingsRef = useRef<HTMLDivElement>(null);

  function goToListings(tab?: MainTab, sub?: SubTab) {
    if (tab) setMainTab(tab);
    if (sub) setSubTab(sub);
    setTimeout(() => {
      listingsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function handleHeroBusca() {
    setBusca(heroBusca);
    goToListings();
  }

  function toggleFiltro(f: FiltroRapido) {
    setFiltrosAtivos((prev) => {
      const next = new Set(prev);
      next.has(f) ? next.delete(f) : next.add(f);
      return next;
    });
  }

  const lista = acompanhantes[subTab].filter((a) => {
    if (busca && !a.cidade.toLowerCase().includes(busca.toLowerCase()) && !a.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtrosAtivos.has("Online agora") && !a.online) return false;
    if (filtrosAtivos.has("Com avaliações") && a.avaliacao < 4.8) return false;
    if (filtrosAtivos.has("Com local") && !a.servicos.some(s => s.toLowerCase().includes("local"))) return false;
    if (filtrosAtivos.has("Até R$300") && a.preco > 300) return false;
    if (filtrosAtivos.has("Exclusivas") && a.preco < 400) return false;
    return true;
  });

  return (
    <div style={{ background: "#060e1b", minHeight: "100vh", color: "#f1f5f9" }}>
      <AgeGate />
      {showFilters && <FiltersModal onClose={() => setShowFilters(false)} onApply={(f) => { setShowFilters(false); console.log(f); }} />}
      <Navbar />

      {/* ─── HERO ─── */}
      <section style={{ position: "relative", minHeight: "92vh", display: "flex", alignItems: "center", overflow: "hidden" }}>
        <img
          src="/model2.jpg"
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
        />
        {/* Overlay: escuro na esquerda, revela a modelo na direita */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(100deg, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.88) 40%, rgba(0,0,0,0.55) 65%, rgba(0,0,0,0.2) 100%)" }} />
        {/* Linha dourada no topo */}
        <div style={{ position: "absolute", top: 64, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.15), transparent)" }} />

        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 1280, margin: "0 auto", padding: "100px 24px 80px" }}>
          <div style={{ maxWidth: 580 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: "#c9a84c", textTransform: "uppercase", marginBottom: 20 }}>
              A plataforma premium do Brasil
            </p>

            <h1 style={{ fontSize: "clamp(34px, 6vw, 68px)", fontWeight: 900, color: "#fff", margin: "0 0 20px", letterSpacing: "-2px", lineHeight: 1.0 }}>
              Acompanhantes<br />
              <span style={{ color: "#cc0000" }}>de luxo.</span>
              <br />
              Imóveis exclusivos.
            </h1>

            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 16, margin: "0 0 40px", lineHeight: 1.7, maxWidth: 440 }}>
              Perfis verificados, experiências premium e total discrição.
              Conectamos você às melhores acompanhantes e imóveis do país.
            </p>

            {/* CTAs */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 52 }}>
              <button
                onClick={() => goToListings("acompanhantes")}
                style={{ padding: "15px 32px", background: "#cc0000", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: "pointer", letterSpacing: "0.2px", transition: "background 0.2s" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#e00000")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#cc0000")}
              >
                Ver Acompanhantes
              </button>
              <button
                onClick={() => goToListings("imoveis")}
                style={{ padding: "15px 32px", background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer", backdropFilter: "blur(8px)", transition: "border-color 0.2s, background 0.2s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(201,168,76,0.5)"; (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.05)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.2)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                Imóveis de Luxo
              </button>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: "clamp(20px, 4vw, 48px)", flexWrap: "wrap", paddingTop: 28, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              {[
                { num: "+2 mil", label: "acompanhantes" },
                { num: "+50", label: "cidades" },
                { num: "+8 mil", label: "avaliações" },
                { num: "100%", label: "verificadas" },
              ].map(({ num, label }) => (
                <div key={label}>
                  <div style={{ fontSize: "clamp(20px, 3vw, 26px)", fontWeight: 900, color: "#fff", lineHeight: 1 }}>{num}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 5 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── BUSCA ─── */}
      <section style={{ background: "#0b1420", borderTop: "1px solid #1e293b", borderBottom: "1px solid #1e293b" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "36px 24px" }}>
          <p style={{ textAlign: "center", color: "#64748b", fontSize: 13, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", marginBottom: 20 }}>
            Buscar na plataforma
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2"
                style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                value={heroBusca}
                onChange={(e) => setHeroBusca(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleHeroBusca()}
                placeholder="Cidade, nome ou tipo de serviço..."
                style={{ width: "100%", padding: "16px 18px 16px 50px", background: "#0f172a", border: "1px solid #334155", borderRadius: 12, color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box", height: "100%" }}
                onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "#cc0000")}
                onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "#2a2a2a")}
              />
            </div>
            <button
              onClick={handleHeroBusca}
              style={{ padding: "0 32px", background: "#cc0000", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap", transition: "background 0.2s" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#e00000")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#cc0000")}
            >
              Buscar
            </button>
          </div>

          {/* Serviços populares */}
          <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            {SERVICOS_POPULARES.map((s) => (
              <button
                key={s}
                onClick={() => { setHeroBusca(s); setBusca(s); goToListings(); }}
                style={{ padding: "5px 14px", background: "transparent", border: "1px solid #253550", borderRadius: 20, color: "#64748b", fontSize: 12, cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#cc000050"; (e.currentTarget as HTMLElement).style.color = "#ccc"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#222"; (e.currentTarget as HTMLElement).style.color = "#555"; }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CATEGORIAS ─── */}
      <section style={{ background: "#060e1b", padding: "72px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ marginBottom: 40, textAlign: "center" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 12 }}>
              Explore
            </p>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 900, color: "#fff", margin: 0, letterSpacing: "-1px" }}>
              Toda a plataforma em um só lugar
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {CATEGORIAS.map((cat) => (
              <button
                key={cat.label}
                onClick={() => goToListings(cat.tab, cat.subTab ?? undefined)}
                style={{ textAlign: "left", background: "#0b1420", border: "1px solid #1e293b", borderRadius: 16, padding: "28px 24px", cursor: "pointer", transition: "border-color 0.2s, transform 0.2s", display: "flex", flexDirection: "column", gap: 12 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = cat.accent + "60"; (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#1a1a1a"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: cat.accent, textTransform: "uppercase" }}>
                    {cat.sub}
                  </span>
                  <span style={{ fontSize: 12, color: "#333", fontWeight: 600 }}>{cat.count}</span>
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: 0, lineHeight: 1.2 }}>{cat.label}</h3>
                <p style={{ fontSize: 12, color: "#475569", margin: 0, lineHeight: 1.6 }}>{cat.cidades}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: cat.accent, fontSize: 13, fontWeight: 700, marginTop: 4 }}>
                  Ver todos
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section style={{ background: "#060e1b", borderTop: "1px solid #111", borderBottom: "1px solid #111", padding: "72px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ marginBottom: 48, textAlign: "center" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 12 }}>
              Por que escolher
            </p>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 900, color: "#fff", margin: "0 0 12px", letterSpacing: "-1px" }}>
              A experiência mais premium do Brasil
            </h2>
            <p style={{ color: "#475569", fontSize: 15, margin: 0, maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
              Construída para quem exige qualidade, segurança e discrição acima de tudo.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 1, border: "1px solid #151515", borderRadius: 20, overflow: "hidden" }}>
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                style={{ padding: "36px 28px", background: i % 2 === 0 ? "#0d0d0d" : "#090909", borderRight: "1px solid #151515", borderBottom: "1px solid #1e293b" }}
              >
                <div style={{ width: 40, height: 3, background: "#cc0000", borderRadius: 2, marginBottom: 20 }} />
                <h3 style={{ fontSize: 17, fontWeight: 800, color: "#fff", margin: "0 0 10px" }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CONCEITO AIRBNB ─── */}
      <section style={{ background: "#060e1b", padding: "72px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", gap: 48, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 16 }}>
              Módulo imóveis
            </p>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 42px)", fontWeight: 900, color: "#fff", margin: "0 0 16px", letterSpacing: "-1px", lineHeight: 1.1 }}>
              Reserve o imóvel<br />
              <span style={{ color: "#cc0000" }}>perfeito para</span><br />
              sua experiência
            </h2>
            <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.8, margin: "0 0 28px" }}>
              Coberturas, flats executivos, casas de temporada e studios modernos.
              Pague via Pix, cartão ou boleto. Check-in configurável, reserva instantânea.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 32 }}>
              {["Piscina", "Pet friendly", "Wi-Fi", "Churrasco", "Check-in flexível", "Estacionamento"].map((tag) => (
                <span key={tag} style={{ padding: "5px 14px", border: "1px solid #253550", borderRadius: 20, fontSize: 12, color: "#64748b" }}>
                  {tag}
                </span>
              ))}
            </div>
            <button
              onClick={() => goToListings("imoveis")}
              style={{ padding: "14px 28px", background: "transparent", color: "#c9a84c", border: "1px solid #c9a84c30", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "background 0.2s" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.07)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
            >
              Explorar Imóveis
            </button>
          </div>

          {/* Preview cards de imóveis */}
          <div style={{ flex: 1, minWidth: 280, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {imoveis.slice(0, 4).map((im) => (
              <div
                key={im.id}
                style={{ background: "#0b1420", border: "1px solid #1e293b", borderRadius: 12, overflow: "hidden", cursor: "pointer", transition: "border-color 0.2s" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#c9a84c40")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#1a1a1a")}
                onClick={() => goToListings("imoveis")}
              >
                <div style={{ height: 90, background: "linear-gradient(135deg, #1a0a0a, #111)", position: "relative", overflow: "hidden" }}>
                  <img src={im.foto} alt={im.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.5 }} />
                  <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.7)", padding: "2px 8px", borderRadius: 6, fontSize: 11, color: "#c9a84c", fontWeight: 700 }}>
                    R${im.preco}/noite
                  </div>
                </div>
                <div style={{ padding: "10px 12px" }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#cbd5e1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{im.titulo}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "#475569" }}>{im.cidade}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── LISTINGS ─── */}
      <div ref={listingsRef} id="buscar" style={{ background: "#060e1b", scrollMarginTop: 64 }}>
        {/* Barra de tabs */}
        <div style={{ background: "#0b1420", borderTop: "1px solid #1e293b", borderBottom: "1px solid #1e293b" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", gap: 4, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div style={{ display: "flex" }}>
              {([["acompanhantes", "Acompanhantes"], ["imoveis", "Imóveis"]] as const).map(([tab, label]) => (
                <button key={tab} onClick={() => setMainTab(tab)}
                  style={{ padding: "16px 22px", border: "none", background: "transparent", cursor: "pointer", fontWeight: 700, fontSize: 14, color: mainTab === tab ? "#fff" : "#444", borderBottom: `2px solid ${mainTab === tab ? "#cc0000" : "transparent"}`, transition: "all 0.2s" }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 0" }}>
              <div style={{ position: "relative" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2"
                  style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input value={busca} onChange={(e) => setBusca(e.target.value)}
                  placeholder={mainTab === "acompanhantes" ? "Filtrar por cidade ou nome..." : "Filtrar imóveis..."}
                  style={{ padding: "9px 14px 9px 36px", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#fff", fontSize: 13, outline: "none", width: 220 }} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 24px 80px" }}>

          {/* ACOMPANHANTES */}
          {mainTab === "acompanhantes" && (
            <>
              <Stories />

              <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid #1e1e1e" }}>
                {([["mulheres", "Mulheres"], ["trans", "Trans"], ["homens", "Homens"]] as const).map(([tab, label]) => (
                  <button key={tab} onClick={() => setSubTab(tab)}
                    style={{ padding: "11px 24px", border: "none", background: "transparent", cursor: "pointer", fontWeight: 700, fontSize: 14, color: subTab === tab ? "#fff" : "#555", borderBottom: `2px solid ${subTab === tab ? "#cc0000" : "transparent"}`, transition: "all 0.2s" }}>
                    {label}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 24, overflowX: "auto", paddingBottom: 4, alignItems: "center" }}>
                <button onClick={() => setShowFilters(true)}
                  style={{ padding: "7px 18px", background: "transparent", border: "1.5px solid #cc0000", borderRadius: 20, color: "#cc0000", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", letterSpacing: "0.5px", flexShrink: 0 }}>
                  Filtros
                </button>
                {FILTROS_RAPIDOS.map((f) => {
                  const ativo = filtrosAtivos.has(f);
                  return (
                    <button key={f} onClick={() => toggleFiltro(f)}
                      style={{ padding: "7px 16px", background: ativo ? "rgba(204,0,0,0.15)" : "#111", border: `1px solid ${ativo ? "#cc0000" : "#222"}`, borderRadius: 20, color: ativo ? "#fff" : "#888", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s", flexShrink: 0, fontWeight: ativo ? 700 : 400 }}>
                      {f === "Online agora" && <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: ativo ? "#22c55e" : "#555", marginRight: 6, verticalAlign: "middle" }} />}
                      {f}
                    </button>
                  );
                })}
              </div>

              <p style={{ fontSize: 12, color: "#64748b", marginBottom: 16, letterSpacing: "0.5px" }}>
                {lista.length} perfil{lista.length !== 1 ? "is" : ""} encontrado{lista.length !== 1 ? "s" : ""}
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                {lista.map((a) => (
                  <Link key={a.id} href={`/profissionais/${a.id}`} style={{ textDecoration: "none" }}>
                    <div style={{ borderRadius: 10, overflow: "hidden", background: "#0f172a", cursor: "pointer", transition: "transform 0.2s", position: "relative" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
                      <div style={{ position: "relative", paddingTop: "140%", background: "#1a2a40" }}>
                        <img src={a.foto} alt={a.nome} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 50%)" }} />
                        {a.online ? (
                          <div style={{ position: "absolute", top: 10, left: 10, background: "#22c55e", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, display: "flex", alignItems: "center", gap: 4 }}>
                            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff" }} /> Online
                          </div>
                        ) : (
                          <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,0.6)", color: "#94a3b8", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>
                            Offline
                          </div>
                        )}
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 14px" }}>
                          <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: "#fff" }}>{a.nome}</p>
                          <p style={{ margin: "2px 0 6px", fontSize: 12, color: "#cbd5e1" }}>{a.cidade}</p>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <StarIcon />
                              <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700 }}>{a.avaliacao}</span>
                              <span style={{ fontSize: 11, color: "#7b8fa8" }}>({a.total})</span>
                            </div>
                            <span style={{ fontSize: 13, color: "#cc0000", fontWeight: 800 }}>R${a.preco}/h</span>
                          </div>
                          <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
                            {a.servicos?.slice(0, 2).map((s: string) => (
                              <span key={s} style={{ fontSize: 10, background: "rgba(255,255,255,0.1)", color: "#ddd", padding: "2px 7px", borderRadius: 10 }}>{s}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {lista.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 20px", color: "#475569" }}>
                  <p style={{ fontSize: 16 }}>Nenhum perfil encontrado com os filtros selecionados.</p>
                  <button onClick={() => { setFiltrosAtivos(new Set()); setBusca(""); }} style={{ marginTop: 12, padding: "8px 20px", background: "#cc0000", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>
                    Limpar filtros
                  </button>
                </div>
              )}
            </>
          )}

          {/* IMÓVEIS */}
          {mainTab === "imoveis" && (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 24, overflowX: "auto", paddingBottom: 4 }}>
                {["Apartamento", "Casa", "Studio", "Cobertura", "Flat", "Com piscina", "Pet friendly"].map((f) => {
                  const ativo = filtroImovel === f;
                  return (
                    <button key={f} onClick={() => setFiltroImovel(ativo ? null : f)}
                      style={{ padding: "7px 16px", background: ativo ? "rgba(204,0,0,0.15)" : "#111", border: `1px solid ${ativo ? "#cc0000" : "#222"}`, borderRadius: 20, color: ativo ? "#fff" : "#888", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", fontWeight: ativo ? 700 : 400, transition: "all 0.2s", flexShrink: 0 }}>
                      {f}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
                {imoveis.filter((i) => {
                  if (busca && !i.cidade.toLowerCase().includes(busca.toLowerCase()) && !i.titulo.toLowerCase().includes(busca.toLowerCase())) return false;
                  if (filtroImovel === "Com piscina" || filtroImovel === "Pet friendly") return i.tags.includes(filtroImovel);
                  if (filtroImovel) return i.tipo === filtroImovel;
                  return true;
                }).map((im) => (
                  <Link key={im.id} href={`/imoveis/${im.id}`} style={{ textDecoration: "none" }}>
                    <div style={{ borderRadius: 14, overflow: "hidden", background: "#0f172a", border: "1px solid #253550", cursor: "pointer", transition: "transform 0.2s, border-color 0.2s" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLElement).style.borderColor = "#cc0000"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.borderColor = "#1e1e1e"; }}>
                      <div style={{ position: "relative", paddingTop: "65%", background: "#1a2a40" }}>
                        <img src={im.foto} alt={im.titulo} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                      <div style={{ padding: "14px 16px" }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "#fff" }}>{im.titulo}</p>
                        <p style={{ margin: "4px 0 10px", fontSize: 13, color: "#64748b" }}>{im.cidade} · {im.quartos} {im.quartos === 1 ? "quarto" : "quartos"}</p>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>R${im.preco}<span style={{ color: "#64748b", fontSize: 12, fontWeight: 400 }}>/noite</span></span>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <StarIcon />
                            <span style={{ fontSize: 13, color: "#f59e0b", fontWeight: 600 }}>{im.avaliacao}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}

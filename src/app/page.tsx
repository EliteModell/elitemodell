"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AgeGate from "@/components/AgeGate";

const GOLD = "#d4a843";
const GOLD_GRADIENT = "linear-gradient(135deg, #ffe5a0 0%, #d4a843 22%, #f5d78c 45%, #9e7b2a 72%, #d4a843 100%)";
const PEARL_GRADIENT = "linear-gradient(135deg, #ffffff 0%, #e8dfc8 20%, #ffffff 48%, #cfc5b5 72%, #ffffff 100%)";
const GOLD_DIM = "rgba(212,168,67,0.12)";
const GOLD_MID = "rgba(212,168,67,0.28)";

const imovelPreview = [
  { id: 1, titulo: "Cobertura Premium", cidade: "São Paulo, SP", preco: 890, foto: "/hero-model.jpeg" },
  { id: 2, titulo: "Flat Executivo", cidade: "Rio de Janeiro, RJ", preco: 650, foto: "/hero-model.jpeg" },
  { id: 3, titulo: "Studio Moderno", cidade: "Curitiba, PR", preco: 420, foto: "/hero-model.jpeg" },
  { id: 4, titulo: "Casa de Luxo", cidade: "Florianópolis, SC", preco: 1200, foto: "/hero-model.jpeg" },
];

const TRUST = [
  {
    title: "Discrição Garantida",
    desc: "Sua privacidade é nossa prioridade",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
  },
  {
    title: "Experiências Premium",
    desc: "Momentos únicos com os melhores perfis",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    title: "Perfis Verificados",
    desc: "Todos os perfis passam por verificação rigorosa",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" />
      </svg>
    ),
  },
  {
    title: "Suporte 24h",
    desc: "Atendimento humanizado sempre que precisar",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
      </svg>
    ),
  },
];

const CATEGORIAS = [
  { label: "Acompanhantes Femininas", sub: "Mulheres", count: "+1.400 perfis", cidades: "São Paulo · Rio · Curitiba · BH · Brasília", href: "/buscar?tab=acompanhantes&sub=mulheres" },
  { label: "Acompanhantes Trans", sub: "Trans", count: "+320 perfis", cidades: "São Paulo · Rio · Salvador · Florianópolis", href: "/buscar?tab=acompanhantes&sub=trans" },
  { label: "Acompanhantes Masculinos", sub: "Homens", count: "+280 perfis", cidades: "São Paulo · Rio · BH · Porto Alegre", href: "/buscar?tab=acompanhantes&sub=homens" },
  { label: "Imóveis de Luxo", sub: "Hospedagem", count: "+600 imóveis", cidades: "São Paulo · Rio · Florianópolis · Campos", href: "/buscar?tab=imoveis" },
];

const FEATURES = [
  { title: "100% Verificadas", desc: "Todos os perfis passam por verificação de documentos e fotos reais antes de serem publicados." },
  { title: "Pagamento Seguro", desc: "Pix, cartão e boleto com ambiente criptografado. Reembolso garantido em casos de cancelamento." },
  { title: "Discrição Total", desc: "Seus dados são protegidos com criptografia de ponta e nunca compartilhados com terceiros." },
  { title: "Avaliações Reais", desc: "Só quem realizou o serviço pode avaliar. Transparência total para sua segurança." },
];

export default function HomePage() {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("Acompanhantes");
  const [localizacao, setLocalizacao] = useState("");
  const [faixaEtaria, setFaixaEtaria] = useState("18 - 45+");

  function handleBuscar() {
    const tab = categoria === "Imóveis" ? "imoveis" : "acompanhantes";
    const q = [busca, localizacao].filter(Boolean).join(" ");
    router.push(`/buscar?tab=${tab}${q ? `&q=${encodeURIComponent(q)}` : ""}`);
  }

  return (
    <div style={{ background: "#060e1b", minHeight: "100vh", color: "#f1f5f9" }}>
      <AgeGate />
      <Navbar />

      {/* ── HERO ── */}
      <section style={{ position: "relative", minHeight: "90vh", display: "flex", alignItems: "center", overflow: "hidden" }}>
        <img src="/model2.jpg" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg, rgba(6,14,27,0.97) 0%, rgba(6,14,27,0.90) 40%, rgba(6,14,27,0.55) 65%, rgba(6,14,27,0.1) 100%)" }} />
        {/* linha dourada */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD_MID}, transparent)` }} />

        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 1280, margin: "0 auto", padding: "110px 24px 60px" }}>
          <div style={{ maxWidth: 560 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: GOLD, textTransform: "uppercase", marginBottom: 22 }}>
              A plataforma premium do Brasil
            </p>

            <h1 style={{ fontSize: "clamp(32px, 5.2vw, 66px)", fontWeight: 700, margin: "0 0 20px", letterSpacing: "-1px", lineHeight: 1.0, wordBreak: "keep-all", hyphens: "none", fontFamily: "var(--font-playfair), serif" }}>
              <span style={{ background: PEARL_GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", display: "inline-block" }}>
                Acompanhantes
              </span>
              <br />
              <span style={{ background: GOLD_GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", display: "inline-block" }}>
                de luxo.
              </span>
              <br />
              <span style={{ background: PEARL_GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", display: "inline-block" }}>
                Imóveis exclusivos.
              </span>
            </h1>

            <p style={{ color: "rgba(241,245,249,0.45)", fontSize: 16, margin: "0 0 44px", lineHeight: 1.75, maxWidth: 400 }}>
              Perfis verificados, experiências premium e total discrição.
              Conectamos você às melhores acompanhantes e imóveis do país.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link
                href="/buscar?tab=acompanhantes"
                style={{ padding: "14px 30px", background: GOLD, color: "#060e1b", textDecoration: "none", borderRadius: 10, fontSize: 15, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 10, transition: "background 0.2s" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#e8bb47")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = GOLD)}
              >
                Ver Acompanhantes
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </Link>
              <Link
                href="/buscar?tab=imoveis"
                style={{ padding: "14px 30px", background: "transparent", color: "#f1f5f9", textDecoration: "none", border: `1px solid ${GOLD_MID}`, borderRadius: 10, fontSize: 15, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 10, transition: "border-color 0.2s, background 0.2s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = GOLD_MID; (e.currentTarget as HTMLElement).style.background = GOLD_DIM; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = GOLD_MID; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" /><path d="M9 21V12h6v9" /></svg>
                Imóveis de Luxo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── SEARCH BAR ── */}
      <section style={{ background: "#060e1b", padding: "0 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", transform: "translateY(-32px)" }}>
          <div style={{ background: "#0b1420", border: `1px solid ${GOLD_MID}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", alignItems: "stretch" }}>

              {/* O que procura */}
              <div style={{ padding: "20px 24px", borderRight: `1px solid ${GOLD_DIM}` }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>O que você procura?</p>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  style={{ width: "100%", background: "transparent", border: "none", color: "#f1f5f9", fontSize: 15, fontWeight: 600, outline: "none", cursor: "pointer", appearance: "none", WebkitAppearance: "none" }}
                >
                  <option value="Acompanhantes" style={{ background: "#0b1420" }}>Acompanhantes</option>
                  <option value="Trans" style={{ background: "#0b1420" }}>Trans</option>
                  <option value="Homens" style={{ background: "#0b1420" }}>Homens</option>
                  <option value="Imóveis" style={{ background: "#0b1420" }}>Imóveis</option>
                </select>
              </div>

              {/* Localização */}
              <div style={{ padding: "20px 24px", borderRight: `1px solid ${GOLD_DIM}`, position: "relative" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>Localização</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                  <input
                    value={localizacao}
                    onChange={(e) => setLocalizacao(e.target.value)}
                    placeholder="Cidade, estado ou país"
                    style={{ background: "transparent", border: "none", color: "#f1f5f9", fontSize: 15, fontWeight: 600, outline: "none", width: "100%" }}
                  />
                </div>
              </div>

              {/* Categoria */}
              <div style={{ padding: "20px 24px", borderRight: `1px solid ${GOLD_DIM}` }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>Categoria</p>
                <select style={{ width: "100%", background: "transparent", border: "none", color: "#f1f5f9", fontSize: 15, fontWeight: 600, outline: "none", cursor: "pointer", appearance: "none", WebkitAppearance: "none" }}>
                  <option style={{ background: "#0b1420" }}>Todas as categorias</option>
                  <option style={{ background: "#0b1420" }}>VIP</option>
                  <option style={{ background: "#0b1420" }}>Com local</option>
                  <option style={{ background: "#0b1420" }}>Viagens</option>
                  <option style={{ background: "#0b1420" }}>Eventos</option>
                </select>
              </div>

              {/* Faixa etária */}
              <div style={{ padding: "20px 24px", borderRight: `1px solid ${GOLD_DIM}` }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>Faixa etária</p>
                <select
                  value={faixaEtaria}
                  onChange={(e) => setFaixaEtaria(e.target.value)}
                  style={{ width: "100%", background: "transparent", border: "none", color: "#f1f5f9", fontSize: 15, fontWeight: 600, outline: "none", cursor: "pointer", appearance: "none", WebkitAppearance: "none" }}
                >
                  {["18 - 45+", "18 - 25", "26 - 35", "36 - 45", "45+"].map(v => (
                    <option key={v} value={v} style={{ background: "#0b1420" }}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Buscar */}
              <button
                onClick={handleBuscar}
                style={{ padding: "0 32px", background: GOLD, color: "#060e1b", border: "none", fontSize: 15, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, transition: "background 0.2s", whiteSpace: "nowrap" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#e8bb47")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = GOLD)}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                Buscar
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST BADGES ── */}
      <section style={{ background: "#060e1b", padding: "0 24px 72px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", border: `1px solid ${GOLD_DIM}`, borderRadius: 14, overflow: "hidden" }}>
            {TRUST.map((t, i) => (
              <div
                key={t.title}
                style={{ padding: "28px 28px", display: "flex", alignItems: "flex-start", gap: 16, borderRight: i < TRUST.length - 1 ? `1px solid ${GOLD_DIM}` : "none", background: i % 2 === 0 ? "#060e1b" : "rgba(212,168,67,0.02)" }}
              >
                <div style={{ flexShrink: 0, marginTop: 2 }}>{t.icon}</div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: "#f1f5f9", margin: "0 0 5px" }}>{t.title}</p>
                  <p style={{ fontSize: 12, color: "#475569", margin: 0, lineHeight: 1.6 }}>{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATEGORIAS ── */}
      <section style={{ background: "#060e1b", borderTop: `1px solid ${GOLD_DIM}`, padding: "80px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 44, flexWrap: "wrap", gap: 12 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: GOLD, textTransform: "uppercase", marginBottom: 10 }}>Explore</p>
              <h2 style={{ fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 900, color: "#f1f5f9", margin: 0, letterSpacing: "-1px" }}>
                Categorias em destaque
              </h2>
            </div>
            <Link href="/buscar" style={{ display: "flex", alignItems: "center", gap: 6, color: GOLD, textDecoration: "none", fontSize: 14, fontWeight: 700 }}>
              Ver todas
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {CATEGORIAS.map((cat) => (
              <Link
                key={cat.label}
                href={cat.href}
                style={{ textDecoration: "none", display: "block", background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 16, overflow: "hidden", transition: "border-color 0.2s, transform 0.2s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = GOLD_MID; (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = GOLD_DIM; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
              >
                <div style={{ height: 3, background: GOLD, width: "36px", margin: "22px 22px 0" }} />
                <div style={{ padding: "14px 22px 26px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#475569", textTransform: "uppercase" }}>{cat.sub}</span>
                    <span style={{ fontSize: 12, color: "#334155", fontWeight: 600 }}>{cat.count}</span>
                  </div>
                  <h3 style={{ fontSize: 19, fontWeight: 800, color: "#f1f5f9", margin: "0 0 8px", lineHeight: 1.2 }}>{cat.label}</h3>
                  <p style={{ fontSize: 12, color: "#334155", margin: "0 0 16px", lineHeight: 1.7 }}>{cat.cidades}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: GOLD, fontSize: 13, fontWeight: 700 }}>
                    Ver todos
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ background: "#060e1b", borderTop: `1px solid ${GOLD_DIM}`, padding: "80px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ marginBottom: 52, textAlign: "center" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>Por que escolher</p>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 900, color: "#f1f5f9", margin: "0 0 14px", letterSpacing: "-1px" }}>A experiência mais premium do Brasil</h2>
            <p style={{ color: "#475569", fontSize: 15, margin: 0, maxWidth: 460, marginLeft: "auto", marginRight: "auto" }}>
              Construída para quem exige qualidade, segurança e discrição acima de tudo.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", border: `1px solid ${GOLD_DIM}`, borderRadius: 20, overflow: "hidden" }}>
            {FEATURES.map((f, i) => (
              <div key={f.title} style={{ padding: "36px 30px", background: i % 2 === 0 ? "#0b1420" : "#0a1323", borderRight: `1px solid ${GOLD_DIM}`, borderBottom: `1px solid ${GOLD_DIM}` }}>
                <div style={{ width: 36, height: 3, background: GOLD, borderRadius: 2, marginBottom: 20 }} />
                <h3 style={{ fontSize: 17, fontWeight: 800, color: "#f1f5f9", margin: "0 0 10px" }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.75, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MÓDULO IMÓVEIS ── */}
      <section style={{ background: "#060e1b", borderTop: `1px solid ${GOLD_DIM}`, padding: "80px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", gap: 56, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: GOLD, textTransform: "uppercase", marginBottom: 18 }}>Módulo imóveis</p>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 44px)", fontWeight: 900, color: "#f1f5f9", margin: "0 0 18px", letterSpacing: "-1px", lineHeight: 1.1 }}>
              Reserve o imóvel<br />
              <span style={{ color: GOLD }}>perfeito para</span><br />
              sua experiência
            </h2>
            <p style={{ color: "#475569", fontSize: 14, lineHeight: 1.85, margin: "0 0 30px" }}>
              Coberturas, flats executivos, casas de temporada e studios modernos.
              Pague via Pix, cartão ou boleto. Check-in configurável, reserva instantânea.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 36 }}>
              {["Piscina", "Pet friendly", "Wi-Fi", "Churrasqueira", "Check-in flexível", "Estacionamento"].map((tag) => (
                <span key={tag} style={{ padding: "5px 14px", border: `1px solid ${GOLD_DIM}`, borderRadius: 20, fontSize: 12, color: "#475569" }}>{tag}</span>
              ))}
            </div>
            <Link href="/buscar?tab=imoveis"
              style={{ padding: "14px 30px", background: "transparent", color: GOLD, border: `1px solid ${GOLD_MID}`, borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: "none", display: "inline-block", transition: "background 0.2s" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = GOLD_DIM)}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}>
              Explorar Imóveis
            </Link>
          </div>

          <div style={{ flex: 1, minWidth: 280, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {imovelPreview.map((im) => (
              <Link key={im.id} href="/buscar?tab=imoveis" style={{ textDecoration: "none", background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 12, overflow: "hidden", transition: "border-color 0.2s" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = GOLD_MID)}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = GOLD_DIM)}>
                <div style={{ height: 90, background: "#0f172a", position: "relative", overflow: "hidden" }}>
                  <img src={im.foto} alt={im.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.4 }} />
                  <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(6,14,27,0.9)", padding: "2px 8px", borderRadius: 6, fontSize: 11, color: GOLD, fontWeight: 700 }}>
                    R${im.preco}/noite
                  </div>
                </div>
                <div style={{ padding: "10px 12px" }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{im.titulo}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "#334155" }}>{im.cidade}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

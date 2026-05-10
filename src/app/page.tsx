"use client";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AgeGate from "@/components/AgeGate";

const GOLD = "#d4a843";
const GOLD_GRADIENT = "linear-gradient(135deg, #ffe5a0 0%, #d4a843 22%, #f5d78c 45%, #9e7b2a 72%, #d4a843 100%)";
const PEARL_GRADIENT = "linear-gradient(135deg, #ffffff 0%, #e8dfc8 20%, #ffffff 48%, #cfc5b5 72%, #ffffff 100%)";
const PLAYFAIR = "var(--font-playfair), serif";
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
    title: "Privacidade Garantida",
    desc: "Seus dados são protegidos com criptografia avançada. Nenhuma informação é compartilhada.",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" fill="rgba(212,168,67,0.12)" stroke={GOLD} strokeWidth="1.8"/>
        <path d="M7 11V7a5 5 0 0110 0v4" stroke={GOLD} strokeWidth="1.8"/>
      </svg>
    ),
  },
  {
    title: "Seleção Rigorosa",
    desc: "Cada perfil passa por verificação de documentos e fotos antes de ser publicado.",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
          fill="rgba(212,168,67,0.12)" stroke={GOLD} strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    title: "Atendimento Premium",
    desc: "Suporte dedicado para clientes e profissionais, com atendimento humanizado.",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" fill="rgba(212,168,67,0.12)" stroke={GOLD} strokeWidth="1.8"/>
      </svg>
    ),
  },
  {
    title: "Satisfação Garantida",
    desc: "Experiências únicas com acompanhantes verificadas e imóveis exclusivos.",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" fill="rgba(212,168,67,0.12)" stroke={GOLD} strokeWidth="1.8"/>
      </svg>
    ),
  },
];

const CATEGORIAS = [
  { label: "Acompanhantes Femininas", sub: "Mulheres", count: "+1.400 perfis", cidades: "São Paulo · Rio · Curitiba · BH · Brasília", href: "/buscar?tab=acompanhantes&sub=mulheres" },
  { label: "Acompanhantes Trans", sub: "Trans", count: "+320 perfis", cidades: "São Paulo · Rio · Salvador · Florianópolis", href: "/buscar?tab=acompanhantes&sub=trans" },
  { label: "Acompanhantes Masculinos", sub: "Homens", count: "+280 perfis", cidades: "São Paulo · Rio · BH · Porto Alegre", href: "/buscar?tab=acompanhantes&sub=homens" },
  { label: "Imóveis", sub: "Hospedagem", count: "+600 imóveis", cidades: "São Paulo · Rio · Florianópolis · Campos", href: "/buscar?tab=imoveis" },
];

const FEATURES = [
  { title: "100% Verificadas", desc: "Todos os perfis passam por verificação de documentos e fotos reais antes de serem publicados." },
  { title: "Pagamento Seguro", desc: "Pix, cartão e boleto com ambiente criptografado. Reembolso garantido em casos de cancelamento." },
  { title: "Discrição Total", desc: "Seus dados são protegidos com criptografia de ponta e nunca compartilhados com terceiros." },
  { title: "Avaliações Reais", desc: "Só quem realizou o serviço pode avaliar. Transparência total para sua segurança." },
];

export default function HomePage() {

  return (
    <div style={{ background: "#060e1b", minHeight: "100vh", color: "#f1f5f9" }}>
      <AgeGate />
      <Navbar />

      {/* ── HERO ── */}
      <style>{`
        @media (max-width: 640px) {
          .hero-section { min-height: 55vh !important; }
          .hero-content { padding: 76px 20px 28px !important; }
          .hero-badges-row { flex-direction: column !important; gap: 6px !important; }
          .hero-secure-card { display: none !important; }
          .hero-title { font-size: clamp(30px, 9.5vw, 42px) !important; letter-spacing: -1px !important; line-height: 1.05 !important; }
        }
      `}</style>
      <section className="hero-section" style={{ position: "relative", minHeight: "92vh", display: "flex", alignItems: "center", overflow: "hidden", marginTop: 64 }}>
        {/* Foto da Lora */}
        <img src="/model.jpeg" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "38% top" }} />
        {/* Overlay: escuro na esquerda, modelo visível na direita */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(100deg, rgba(6,14,27,0.97) 0%, rgba(6,14,27,0.90) 32%, rgba(6,14,27,0.50) 55%, rgba(6,14,27,0.05) 100%)" }} />
        {/* Linha dourada na base */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD_MID}, transparent)` }} />

        <div className="hero-content" style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 1280, margin: "0 auto", padding: "56px 32px 80px" }}>
          <div style={{ maxWidth: 600 }}>
            {/* Tag */}
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: GOLD, textTransform: "uppercase", marginBottom: 20 }}>
              A plataforma premium do Brasil
            </p>

            {/* Headline */}
            <h1 className="hero-title" style={{ fontSize: "clamp(36px, 5.5vw, 72px)", fontWeight: 700, margin: "0 0 18px", letterSpacing: "-2px", lineHeight: 1.0, fontFamily: PLAYFAIR }}>
              <span style={{ background: PEARL_GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", display: "inline-block" }}>
                Acompanhantes
              </span>
              <br />
              <span style={{ background: GOLD_GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", display: "inline-block" }}>
                de luxo.
              </span>
              <br />
              <span style={{ background: PEARL_GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", display: "inline-block" }}>
                Experiências inesquecíveis.
              </span>
            </h1>

            {/* Subtítulo curto e impactante */}
            <p style={{ color: GOLD, fontSize: 15, fontWeight: 600, letterSpacing: 1.5, marginBottom: 32 }}>
              Discrição. Elegância. Sofisticação.
            </p>

            {/* 3 badges inline */}
            <div className="hero-badges-row" style={{ display: "flex", gap: 20, marginBottom: 40, flexWrap: "wrap" }}>
              {[
                { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>, label: "Discrição total e segurança" },
                { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>, label: "Acompanhantes verificadas" },
                { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"/></svg>, label: "Experiências premium" },
              ].map((b) => (
                <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {b.icon}
                  <span style={{ fontSize: 13, color: "rgba(241,245,249,0.7)", fontWeight: 500 }}>{b.label}</span>
                </div>
              ))}
            </div>

            {/* CTA principal */}
            <Link
              href="/buscar?tab=acompanhantes"
              style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "15px 32px", background: "transparent", color: GOLD, border: `1.5px solid ${GOLD}`, borderRadius: 8, fontSize: 13, fontWeight: 800, textDecoration: "none", letterSpacing: 2, textTransform: "uppercase", transition: "all 0.2s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = GOLD; (e.currentTarget as HTMLElement).style.color = "#060e1b"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = GOLD; }}
            >
              Encontre sua companhia ideal
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
        </div>

        {/* Card 100% SEGURO — canto inferior direito */}
        <div className="hero-secure-card" style={{
          position: "absolute", bottom: 32, right: 32, zIndex: 2,
          background: "rgba(6,14,27,0.85)", backdropFilter: "blur(12px)",
          border: `1px solid ${GOLD_MID}`, borderRadius: 14,
          padding: "16px 20px", display: "flex", alignItems: "center", gap: 14,
          maxWidth: 280,
        }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          </div>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 800, color: GOLD, fontFamily: PLAYFAIR, letterSpacing: 0.5 }}>100% SEGURO</p>
            <p style={{ margin: 0, fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>Seus dados protegidos com criptografia avançada</p>
          </div>
        </div>
      </section>

      {/* ── O QUE VOCÊ PROCURA ── */}
      <section style={{ background: "#060e1b", padding: "0 16px 16px" }}>
        <style>{`
          .procura-grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid rgba(212,168,67,0.28); border-radius: 20px; overflow: hidden; box-shadow: 0 24px 64px rgba(0,0,0,0.4); }
          .procura-item { padding: 20px 16px 44px; display: flex; flex-direction: column; align-items: flex-start; gap: 10px; border-right: 1px solid rgba(212,168,67,0.12); border-bottom: 1px solid rgba(212,168,67,0.12); background: #0b1420; text-decoration: none; transition: all 0.18s; cursor: pointer; position: relative; -webkit-tap-highlight-color: rgba(212,168,67,0.15); }
          .procura-item:hover, .procura-item:active { background: rgba(212,168,67,0.08) !important; }
          .procura-cta { position: absolute; bottom: 0; left: 0; right: 0; padding: 9px 16px; background: rgba(212,168,67,0.08); border-top: 1px solid rgba(212,168,67,0.12); display: flex; align-items: center; justify-content: space-between; transition: background 0.18s; }
          .procura-item:hover .procura-cta, .procura-item:active .procura-cta { background: rgba(212,168,67,0.18); }
          .procura-cta span { font-size: 11px; font-weight: 700; color: #d4a843; letter-spacing: 0.5px; text-transform: uppercase; }
          .procura-cta svg { transition: transform 0.18s; }
          .procura-item:hover .procura-cta svg { transform: translateX(4px); }
        `}</style>
        <div style={{ maxWidth: 600, margin: "0 auto", transform: "translateY(-32px)" }}>
          <div className="procura-grid">
            {[
              {
                href: "/buscar?tab=acompanhantes",
                title: "Busco prazer",
                desc: "Encontre companhia para momentos especiais e discretos.",
                iconBg: "rgba(204,0,0,0.12)",
                iconBorder: "rgba(204,0,0,0.25)",
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="#cc0000"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
              },
              {
                href: "/anfitriao/imoveis/novo",
                title: "Anunciar imóvel",
                desc: "Cadastre seu imóvel e alcance mais clientes.",
                iconBg: GOLD_DIM,
                iconBorder: GOLD_MID,
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><line x1="12" y1="12" x2="12" y2="18"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
              },
              {
                href: "/buscar?tab=imoveis",
                title: "Alugar imóvel",
                desc: "Encontre o espaço perfeito para sua estadia.",
                iconBg: GOLD_DIM,
                iconBorder: GOLD_MID,
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
              },
              {
                href: "/cadastro",
                title: "Sou profissional",
                desc: "Cadastre seu perfil e alcance novos clientes.",
                iconBg: GOLD_DIM,
                iconBorder: GOLD_MID,
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
              },
            ].map((opt) => (
              <Link key={opt.title} href={opt.href} className="procura-item">
                <div style={{ width: 52, height: 52, borderRadius: 14, background: opt.iconBg, border: `1px solid ${opt.iconBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {opt.icon}
                </div>
                <div>
                  <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "#f1f5f9", fontFamily: PLAYFAIR, lineHeight: 1.2 }}>{opt.title}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#475569", lineHeight: 1.55 }}>{opt.desc}</p>
                </div>
                {/* Barra inferior clicável */}
                <div className="procura-cta">
                  <span>Acessar</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4a843" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── EXCLUSIVIDADE / TRUST ── */}
      <section style={{ background: "#060e1b", padding: "0 16px 72px" }}>
        <style>{`
          .trust-grid { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid rgba(212,168,67,0.12); border-radius: 20px; overflow: hidden; }
          @media (max-width: 700px) { .trust-grid { grid-template-columns: 1fr 1fr; } }
          @media (max-width: 400px) { .trust-grid { grid-template-columns: 1fr; } }
          .trust-item { padding: 28px 22px; display: flex; flex-direction: column; align-items: flex-start; gap: 14px; border-right: 1px solid rgba(212,168,67,0.12); border-bottom: 1px solid rgba(212,168,67,0.12); background: #0b1420; }
        `}</style>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          {/* Header estilo mockup */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: GOLD, textTransform: "uppercase", marginBottom: 10 }}>
              Exclusividade que você merece
            </p>
            <h2 style={{ fontSize: "clamp(22px, 4vw, 38px)", fontWeight: 700, color: "#f1f5f9", margin: 0, fontFamily: PLAYFAIR, letterSpacing: "-0.5px" }}>
              Mais que encontros, momentos únicos.
            </h2>
          </div>
          <div className="trust-grid">
            {TRUST.map((t) => (
              <div key={t.title} className="trust-item">
                {/* Ícone com halo dourado */}
                <div style={{
                  width: 54, height: 54, borderRadius: 14,
                  background: "rgba(212,168,67,0.08)",
                  border: `1px solid rgba(212,168,67,0.2)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 0 20px rgba(212,168,67,0.08)",
                }}>
                  {t.icon}
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", margin: "0 0 6px", fontFamily: PLAYFAIR, lineHeight: 1.3 }}>{t.title}</p>
                  <p style={{ fontSize: 12, color: "#475569", margin: 0, lineHeight: 1.65 }}>{t.desc}</p>
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
              <h2 style={{ fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 700, color: "#f1f5f9", margin: 0, letterSpacing: "-1px", fontFamily: PLAYFAIR }}>
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
                  <h3 style={{ fontSize: 19, fontWeight: 700, color: "#f1f5f9", margin: "0 0 8px", lineHeight: 1.2, fontFamily: PLAYFAIR }}>{cat.label}</h3>
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
            <h2 style={{ fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 700, color: "#f1f5f9", margin: "0 0 14px", letterSpacing: "-1px", fontFamily: PLAYFAIR }}>A experiência mais premium do Brasil</h2>
            <p style={{ color: "#475569", fontSize: 15, margin: 0, maxWidth: 460, marginLeft: "auto", marginRight: "auto" }}>
              Construída para quem exige qualidade, segurança e discrição acima de tudo.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", border: `1px solid ${GOLD_DIM}`, borderRadius: 20, overflow: "hidden" }}>
            {FEATURES.map((f, i) => (
              <div key={f.title} style={{ padding: "36px 30px", background: i % 2 === 0 ? "#0b1420" : "#0a1323", borderRight: `1px solid ${GOLD_DIM}`, borderBottom: `1px solid ${GOLD_DIM}` }}>
                <div style={{ width: 36, height: 3, background: GOLD, borderRadius: 2, marginBottom: 20 }} />
                <h3 style={{ fontSize: 17, fontWeight: 700, color: "#f1f5f9", margin: "0 0 10px", fontFamily: PLAYFAIR }}>{f.title}</h3>
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
            <h2 style={{ fontSize: "clamp(26px, 4vw, 44px)", fontWeight: 700, margin: "0 0 18px", letterSpacing: "-1px", lineHeight: 1.1, fontFamily: PLAYFAIR }}>
              <span style={{ background: PEARL_GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", display: "inline-block" }}>Reserve o imóvel</span>
              <br />
              <span style={{ background: GOLD_GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", display: "inline-block" }}>perfeito para</span>
              <br />
              <span style={{ background: PEARL_GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", display: "inline-block" }}>sua experiência</span>
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

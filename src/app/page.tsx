"use client";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AgeGate from "@/components/AgeGate";

const imovelPreview = [
  { id: 1, titulo: "Cobertura Premium", cidade: "São Paulo, SP", preco: 890, foto: "/hero-model.jpeg" },
  { id: 2, titulo: "Flat Executivo", cidade: "Rio de Janeiro, RJ", preco: 650, foto: "/hero-model.jpeg" },
  { id: 3, titulo: "Studio Moderno", cidade: "Curitiba, PR", preco: 420, foto: "/hero-model.jpeg" },
  { id: 4, titulo: "Casa de Luxo", cidade: "Florianópolis, SC", preco: 1200, foto: "/hero-model.jpeg" },
];

const CATEGORIAS = [
  {
    label: "Acompanhantes Femininas",
    sub: "Mulheres",
    count: "+1.400 perfis",
    cidades: "São Paulo · Rio · Curitiba · BH · Brasília",
    href: "/buscar?tab=acompanhantes&sub=mulheres",
  },
  {
    label: "Acompanhantes Trans",
    sub: "Trans",
    count: "+320 perfis",
    cidades: "São Paulo · Rio · Salvador · Florianópolis",
    href: "/buscar?tab=acompanhantes&sub=trans",
  },
  {
    label: "Acompanhantes Masculinos",
    sub: "Homens",
    count: "+280 perfis",
    cidades: "São Paulo · Rio · BH · Porto Alegre",
    href: "/buscar?tab=acompanhantes&sub=homens",
  },
  {
    label: "Imóveis de Luxo",
    sub: "Hospedagem",
    count: "+600 imóveis",
    cidades: "São Paulo · Rio · Florianópolis · Campos",
    href: "/buscar?tab=imoveis",
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

const SERVICOS = [
  "Com local", "VIP", "Viagens", "Eventos", "Jantar", "Massagem",
  "Hotéis", "A domicílio", "Jovem", "Madura", "Dupla", "BDSM",
];

export default function HomePage() {
  return (
    <div style={{ background: "#060e1b", minHeight: "100vh", color: "#f1f5f9" }}>
      <AgeGate />
      <Navbar />

      {/* ── HERO ── */}
      <section style={{ position: "relative", minHeight: "92vh", display: "flex", alignItems: "center", overflow: "hidden" }}>
        <img
          src="/model2.jpg"
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(100deg, rgba(6,14,27,0.97) 0%, rgba(6,14,27,0.88) 42%, rgba(6,14,27,0.55) 65%, rgba(6,14,27,0.15) 100%)" }} />

        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 1280, margin: "0 auto", padding: "110px 24px 80px" }}>
          <div style={{ maxWidth: 560 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: "#c9a84c", textTransform: "uppercase", marginBottom: 22 }}>
              A plataforma premium do Brasil
            </p>

            <h1 style={{ fontSize: "clamp(36px, 6vw, 70px)", fontWeight: 900, color: "#f1f5f9", margin: "0 0 22px", letterSpacing: "-2px", lineHeight: 1.0 }}>
              Acompanhantes<br />
              <span style={{ color: "#cc0000" }}>de luxo.</span>
              <br />
              Imóveis exclusivos.
            </h1>

            <p style={{ color: "rgba(241,245,249,0.45)", fontSize: 16, margin: "0 0 44px", lineHeight: 1.75, maxWidth: 420 }}>
              Perfis verificados, experiências premium e total discrição.
              Conectamos você às melhores acompanhantes e imóveis do país.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 56 }}>
              <Link
                href="/buscar?tab=acompanhantes"
                style={{ padding: "15px 34px", background: "#cc0000", color: "#fff", textDecoration: "none", borderRadius: 12, fontSize: 15, fontWeight: 800, letterSpacing: "0.2px", transition: "background 0.2s", display: "inline-block" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#e00000")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#cc0000")}
              >
                Ver Acompanhantes
              </Link>
              <Link
                href="/buscar?tab=imoveis"
                style={{ padding: "15px 34px", background: "transparent", color: "#f1f5f9", textDecoration: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, fontSize: 15, fontWeight: 600, display: "inline-block", transition: "border-color 0.2s" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(201,168,76,0.4)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)")}
              >
                Imóveis de Luxo
              </Link>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: "clamp(20px, 4vw, 52px)", flexWrap: "wrap", paddingTop: 28, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              {[
                { num: "+2 mil", label: "acompanhantes" },
                { num: "+50", label: "cidades" },
                { num: "+8 mil", label: "avaliações" },
                { num: "100%", label: "verificadas" },
              ].map(({ num, label }) => (
                <div key={label}>
                  <div style={{ fontSize: "clamp(20px, 3vw, 26px)", fontWeight: 900, color: "#f1f5f9", lineHeight: 1 }}>{num}</div>
                  <div style={{ fontSize: 12, color: "#475569", marginTop: 5 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── BUSCA ── */}
      <section style={{ background: "#0b1420", borderTop: "1px solid #1e293b", borderBottom: "1px solid #1e293b" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "36px 24px" }}>
          <p style={{ textAlign: "center", color: "#475569", fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", marginBottom: 20 }}>
            Buscar na plataforma
          </p>
          <Link
            href="/buscar"
            style={{ display: "flex", gap: 10, textDecoration: "none" }}
          >
            <div style={{ flex: 1, position: "relative" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2"
                style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <div style={{ width: "100%", padding: "15px 18px 15px 50px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, color: "#475569", fontSize: 15, cursor: "pointer" }}>
                Cidade, nome ou tipo de serviço...
              </div>
            </div>
            <div style={{ padding: "0 28px", background: "#cc0000", color: "#fff", borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center" }}>
              Buscar
            </div>
          </Link>

          {/* Tags de serviços */}
          <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            {SERVICOS.map((s) => (
              <Link
                key={s}
                href={`/buscar?q=${encodeURIComponent(s)}`}
                style={{ padding: "5px 14px", background: "transparent", border: "1px solid #1e293b", borderRadius: 20, color: "#475569", fontSize: 12, textDecoration: "none", transition: "all 0.2s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#cc000050"; (e.currentTarget as HTMLElement).style.color = "#94a3b8"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#1e293b"; (e.currentTarget as HTMLElement).style.color = "#475569"; }}
              >
                {s}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATEGORIAS ── */}
      <section style={{ background: "#060e1b", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ marginBottom: 44, textAlign: "center" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 14 }}>
              Explore
            </p>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 900, color: "#f1f5f9", margin: 0, letterSpacing: "-1px" }}>
              Toda a plataforma em um só lugar
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {CATEGORIAS.map((cat) => (
              <Link
                key={cat.label}
                href={cat.href}
                style={{ textDecoration: "none", display: "block", background: "#0b1420", border: "1px solid #1e293b", borderRadius: 16, overflow: "hidden", transition: "border-color 0.2s, transform 0.2s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#cc000040"; (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#1e293b"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
              >
                {/* Barra vermelha no topo */}
                <div style={{ height: 3, background: "#cc0000", width: "40px", margin: "24px 24px 0" }} />
                <div style={{ padding: "16px 24px 28px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#64748b", textTransform: "uppercase" }}>
                      {cat.sub}
                    </span>
                    <span style={{ fontSize: 12, color: "#334155", fontWeight: 600 }}>{cat.count}</span>
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9", margin: "0 0 10px", lineHeight: 1.2 }}>{cat.label}</h3>
                  <p style={{ fontSize: 12, color: "#334155", margin: "0 0 18px", lineHeight: 1.7 }}>{cat.cidades}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#cc0000", fontSize: 13, fontWeight: 700 }}>
                    Ver todos
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ background: "#060e1b", borderTop: "1px solid #1e293b", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ marginBottom: 52, textAlign: "center" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 14 }}>
              Por que escolher
            </p>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 900, color: "#f1f5f9", margin: "0 0 14px", letterSpacing: "-1px" }}>
              A experiência mais premium do Brasil
            </h2>
            <p style={{ color: "#475569", fontSize: 15, margin: 0, maxWidth: 460, marginLeft: "auto", marginRight: "auto" }}>
              Construída para quem exige qualidade, segurança e discrição acima de tudo.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 0, border: "1px solid #1e293b", borderRadius: 20, overflow: "hidden" }}>
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                style={{ padding: "36px 30px", background: i % 2 === 0 ? "#0b1420" : "#0a1323", borderRight: "1px solid #1e293b", borderBottom: "1px solid #1e293b" }}
              >
                <div style={{ width: 36, height: 3, background: "#cc0000", borderRadius: 2, marginBottom: 20 }} />
                <h3 style={{ fontSize: 17, fontWeight: 800, color: "#f1f5f9", margin: "0 0 10px" }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.75, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MÓDULO IMÓVEIS ── */}
      <section style={{ background: "#060e1b", borderTop: "1px solid #1e293b", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", gap: 56, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: "#c9a84c", textTransform: "uppercase", marginBottom: 18 }}>
              Módulo imóveis
            </p>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 44px)", fontWeight: 900, color: "#f1f5f9", margin: "0 0 18px", letterSpacing: "-1px", lineHeight: 1.1 }}>
              Reserve o imóvel<br />
              <span style={{ color: "#cc0000" }}>perfeito para</span><br />
              sua experiência
            </h2>
            <p style={{ color: "#475569", fontSize: 14, lineHeight: 1.85, margin: "0 0 30px" }}>
              Coberturas, flats executivos, casas de temporada e studios modernos.
              Pague via Pix, cartão ou boleto. Check-in configurável, reserva instantânea.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 36 }}>
              {["Piscina", "Pet friendly", "Wi-Fi", "Churrasqueira", "Check-in flexível", "Estacionamento"].map((tag) => (
                <span key={tag} style={{ padding: "5px 14px", border: "1px solid #1e293b", borderRadius: 20, fontSize: 12, color: "#475569" }}>
                  {tag}
                </span>
              ))}
            </div>
            <Link
              href="/buscar?tab=imoveis"
              style={{ padding: "14px 30px", background: "transparent", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: "none", display: "inline-block", transition: "background 0.2s" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.07)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
            >
              Explorar Imóveis
            </Link>
          </div>

          {/* Preview imóveis */}
          <div style={{ flex: 1, minWidth: 280, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {imovelPreview.map((im) => (
              <Link
                key={im.id}
                href="/buscar?tab=imoveis"
                style={{ textDecoration: "none", background: "#0b1420", border: "1px solid #1e293b", borderRadius: 12, overflow: "hidden", transition: "border-color 0.2s" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(201,168,76,0.3)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#1e293b")}
              >
                <div style={{ height: 90, background: "#0f172a", position: "relative", overflow: "hidden" }}>
                  <img src={im.foto} alt={im.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.45 }} />
                  <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(6,14,27,0.85)", padding: "2px 8px", borderRadius: 6, fontSize: 11, color: "#c9a84c", fontWeight: 700 }}>
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

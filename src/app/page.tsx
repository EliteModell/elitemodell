"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FiltersModal from "@/components/FiltersModal";

type MainTab = "acompanhantes" | "imoveis";
type SubTab = "mulheres" | "trans" | "homens";

const acompanhantes = {
  mulheres: [
    { id: 1, nome: "Amanda R.", cidade: "São Paulo, SP", preco: 350, foto: "/model1.jpg", online: true, avaliacao: 4.9, total: 87, servicos: ["Acompanhamento", "Viagens", "Jantar"] },
    { id: 2, nome: "Letícia M.", cidade: "Rio de Janeiro, RJ", preco: 400, foto: "/model2.jpg", online: false, avaliacao: 4.8, total: 63, servicos: ["Massagem", "Eventos", "Local próprio"] },
    { id: 3, nome: "Bruna S.", cidade: "Curitiba, PR", preco: 280, foto: "/model1.jpg", online: true, avaliacao: 5.0, total: 120, servicos: ["Acompanhamento", "Hotéis"] },
    { id: 4, nome: "Fernanda K.", cidade: "São Paulo, SP", preco: 500, foto: "/model2.jpg", online: true, avaliacao: 4.7, total: 45, servicos: ["VIP", "Viagens", "Eventos"] },
    { id: 5, nome: "Isabela C.", cidade: "Belo Horizonte, MG", preco: 320, foto: "/model1.jpg", online: false, avaliacao: 4.9, total: 92, servicos: ["Massagem tântrica", "Local próprio"] },
  ],
  trans: [
    { id: 6, nome: "Valentina G.", cidade: "São Paulo, SP", preco: 420, foto: "/model2.jpg", online: true, avaliacao: 4.9, total: 78, servicos: ["Acompanhamento", "Viagens"] },
    { id: 7, nome: "Melissa F.", cidade: "Rio de Janeiro, RJ", preco: 380, foto: "/model1.jpg", online: true, avaliacao: 4.8, total: 55, servicos: ["Eventos", "Hotéis"] },
    { id: 8, nome: "Sophia A.", cidade: "Curitiba, PR", preco: 300, foto: "/model2.jpg", online: false, avaliacao: 5.0, total: 101, servicos: ["Local próprio", "Massagem"] },
    { id: 9, nome: "Luna P.", cidade: "Salvador, BA", preco: 350, foto: "/model1.jpg", online: true, avaliacao: 4.7, total: 42, servicos: ["Acompanhamento"] },
    { id: 10, nome: "Bianca T.", cidade: "Florianópolis, SC", preco: 450, foto: "/model2.jpg", online: true, avaliacao: 4.9, total: 67, servicos: ["VIP", "Viagens"] },
  ],
  homens: [
    { id: 11, nome: "Rafael M.", cidade: "São Paulo, SP", preco: 300, foto: "/model1.jpg", online: true, avaliacao: 4.8, total: 65, servicos: ["Acompanhamento", "Eventos"] },
    { id: 12, nome: "Gabriel T.", cidade: "Rio de Janeiro, RJ", preco: 350, foto: "/model2.jpg", online: false, avaliacao: 4.9, total: 48, servicos: ["Massagem", "Viagens"] },
    { id: 13, nome: "Lucas V.", cidade: "Florianópolis, SC", preco: 280, foto: "/model1.jpg", online: true, avaliacao: 4.7, total: 33, servicos: ["Acompanhamento"] },
    { id: 14, nome: "Diego S.", cidade: "Belo Horizonte, MG", preco: 320, foto: "/model2.jpg", online: true, avaliacao: 5.0, total: 89, servicos: ["VIP", "Eventos"] },
    { id: 15, nome: "Thiago N.", cidade: "São Paulo, SP", preco: 400, foto: "/model1.jpg", online: false, avaliacao: 4.8, total: 55, servicos: ["Viagens", "Hotéis"] },
  ],
};

const imoveis = [
  { id: 1, titulo: "Cobertura Premium", cidade: "São Paulo, SP", preco: 890, foto: "/hero-model.jpeg", quartos: 3, avaliacao: 4.9 },
  { id: 2, titulo: "Flat Executivo", cidade: "Rio de Janeiro, RJ", preco: 650, foto: "/hero-model.jpeg", quartos: 1, avaliacao: 4.8 },
  { id: 3, titulo: "Studio Moderno", cidade: "Curitiba, PR", preco: 420, foto: "/hero-model.jpeg", quartos: 1, avaliacao: 4.7 },
  { id: 4, titulo: "Casa de Luxo", cidade: "Florianópolis, SC", preco: 1200, foto: "/hero-model.jpeg", quartos: 4, avaliacao: 5.0 },
  { id: 5, titulo: "Apartamento Central", cidade: "Belo Horizonte, MG", preco: 380, foto: "/hero-model.jpeg", quartos: 2, avaliacao: 4.6 },
  { id: 6, titulo: "Loft Exclusivo", cidade: "Porto Alegre, RS", preco: 550, foto: "/hero-model.jpeg", quartos: 1, avaliacao: 4.9 },
];

const FILTROS_RAPIDOS = ["Online agora", "Com avaliações", "Com local", "Até R$300", "Fotos verificadas", "Exclusivas"] as const;
type FiltroRapido = typeof FILTROS_RAPIDOS[number];

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
  const [showFilters, setShowFilters] = useState(false);
  const [filtrosAtivos, setFiltrosAtivos] = useState<Set<FiltroRapido>>(new Set());

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
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#fff" }}>
      {showFilters && <FiltersModal onClose={() => setShowFilters(false)} onApply={(f) => { setShowFilters(false); console.log(f); }} />}
      <Navbar />

      {/* Search hero — Premium */}
      <div style={{ paddingTop: 64, background: "#0d0d0d", borderBottom: "1px solid #1a1a1a", position: "relative", overflow: "hidden" }}>
        {/* Glow decorativo */}
        <div style={{ position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)", width: 700, height: 200, background: "radial-gradient(ellipse, rgba(204,0,0,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "36px 24px 24px", position: "relative" }}>

          {/* Label premium */}
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 4, color: "#c9963a", textTransform: "uppercase", marginBottom: 6 }}>
            ✦ Plataforma Exclusiva
          </p>

          {/* Main tabs + stats */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
            <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 4, border: "1px solid #1e1e1e" }}>
              {([["acompanhantes", "Acompanhantes"], ["imoveis", "Imóveis"]] as const).map(([tab, label]) => (
                <button key={tab} onClick={() => setMainTab(tab)}
                  style={{ padding: "9px 22px", borderRadius: 9, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14, background: mainTab === tab ? "#cc0000" : "transparent", color: mainTab === tab ? "#fff" : "#555", transition: "all 0.2s" }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: 24 }}>
              {[["1.2k+", "Perfis"], ["98%", "Verificados"], ["4.9★", "Avaliação"]].map(([val, label]) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{val}</div>
                  <div style={{ fontSize: 10, color: "#555", marginTop: 2, letterSpacing: 1 }}>{label.toUpperCase()}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Search bar premium */}
          <div style={{ display: "flex", gap: 10, maxWidth: 680, alignItems: "stretch" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input value={busca} onChange={(e) => setBusca(e.target.value)}
                placeholder={mainTab === "acompanhantes" ? "Cidade, nome ou serviço..." : "Cidade ou tipo de imóvel..."}
                style={{ width: "100%", padding: "14px 16px 14px 46px", background: "#111", border: "1px solid #2a2a2a", borderRadius: 12, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", letterSpacing: "0.2px" }} />
            </div>
            <button style={{ padding: "0 28px", background: "#cc0000", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", letterSpacing: "0.5px" }}>
              Buscar
            </button>
          </div>

          {/* Divisor */}
          <div style={{ marginTop: 28, borderTop: "1px solid #161616" }} />
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 24px 60px" }}>

        {/* ACOMPANHANTES */}
        {mainTab === "acompanhantes" && (
          <>
            {/* Sub tabs */}
            <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid #1e1e1e" }}>
              {([["mulheres", "Mulheres"], ["trans", "Trans"], ["homens", "Homens"]] as const).map(([tab, label]) => (
                <button key={tab} onClick={() => setSubTab(tab)}
                  style={{ padding: "11px 24px", border: "none", background: "transparent", cursor: "pointer", fontWeight: 700, fontSize: 14, color: subTab === tab ? "#fff" : "#555", borderBottom: `2px solid ${subTab === tab ? "#cc0000" : "transparent"}`, transition: "all 0.2s" }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Filtros rápidos */}
            <div style={{ display: "flex", gap: 8, marginBottom: 24, overflowX: "auto", paddingBottom: 4, alignItems: "center" }}>
              <button onClick={() => setShowFilters(true)}
                style={{ padding: "7px 18px", background: "transparent", border: "1.5px solid #cc0000", borderRadius: 20, color: "#cc0000", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", letterSpacing: "0.5px", flexShrink: 0 }}>
                ⚙ Filtros
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

            {/* Contador */}
            <p style={{ fontSize: 12, color: "#555", marginBottom: 16, letterSpacing: "0.5px" }}>
              {lista.length} perfil{lista.length !== 1 ? "is" : ""} encontrado{lista.length !== 1 ? "s" : ""}
            </p>

            {/* Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {lista.map((a) => (
                <Link key={a.id} href={`/profissionais/${a.id}`} style={{ textDecoration: "none" }}>
                  <div style={{ borderRadius: 10, overflow: "hidden", background: "#111", cursor: "pointer", transition: "transform 0.2s", position: "relative" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
                    <div style={{ position: "relative", paddingTop: "140%", background: "#1a1a1a" }}>
                      <img src={a.foto} alt={a.nome} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 50%)" }} />
                      {a.online ? (
                        <div style={{ position: "absolute", top: 10, left: 10, background: "#22c55e", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, display: "flex", alignItems: "center", gap: 4 }}>
                          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff" }} /> Online
                        </div>
                      ) : (
                        <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,0.6)", color: "#aaa", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>
                          Offline
                        </div>
                      )}
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 14px" }}>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: "#fff" }}>{a.nome}</p>
                        <p style={{ margin: "2px 0 6px", fontSize: 12, color: "#ccc" }}>{a.cidade}</p>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <StarIcon />
                            <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700 }}>{a.avaliacao}</span>
                            <span style={{ fontSize: 11, color: "#888" }}>({a.total})</span>
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
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#444" }}>
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
              {["Apartamento", "Casa", "Studio", "Cobertura", "Flat", "Com piscina", "Pet friendly"].map((f) => (
                <button key={f}
                  style={{ padding: "7px 16px", background: "#111", border: "1px solid #222", borderRadius: 20, color: "#888", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#cc0000"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#222"; (e.currentTarget as HTMLElement).style.color = "#888"; }}>
                  {f}
                </button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
              {imoveis.filter((i) => !busca || i.cidade.toLowerCase().includes(busca.toLowerCase()) || i.titulo.toLowerCase().includes(busca.toLowerCase())).map((im) => (
                <Link key={im.id} href={`/imoveis/${im.id}`} style={{ textDecoration: "none" }}>
                  <div style={{ borderRadius: 14, overflow: "hidden", background: "#111", border: "1px solid #1e1e1e", cursor: "pointer", transition: "transform 0.2s, border-color 0.2s" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLElement).style.borderColor = "#cc0000"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.borderColor = "#1e1e1e"; }}>
                    <div style={{ position: "relative", paddingTop: "65%", background: "#1a1a1a" }}>
                      <img src={im.foto} alt={im.titulo} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <div style={{ padding: "14px 16px" }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "#fff" }}>{im.titulo}</p>
                      <p style={{ margin: "4px 0 10px", fontSize: 13, color: "#666" }}>{im.cidade} · {im.quartos} {im.quartos === 1 ? "quarto" : "quartos"}</p>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>R${im.preco}<span style={{ color: "#666", fontSize: 12, fontWeight: 400 }}>/noite</span></span>
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

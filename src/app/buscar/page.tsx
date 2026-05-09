"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FiltersModal from "@/components/FiltersModal";
import Stories from "@/components/Stories";

type MainTab = "acompanhantes" | "imoveis";
type SubTab = "mulheres" | "trans" | "homens";

const acompanhantes = {
  mulheres: [
    { id: 1, nome: "Amanda R.", cidade: "São Paulo, SP", preco: 150, foto: "/model1.jpg", online: true, avaliacao: 4.9, total: 87, servicos: ["Acompanhamento", "Viagens", "Jantar"] },
    { id: 2, nome: "Letícia M.", cidade: "Rio de Janeiro, RJ", preco: 250, foto: "/model2.jpg", online: false, avaliacao: 4.8, total: 63, servicos: ["Massagem", "Eventos", "Local próprio"] },
    { id: 3, nome: "Bruna S.", cidade: "Curitiba, PR", preco: 120, foto: "/model1.jpg", online: true, avaliacao: 5.0, total: 120, servicos: ["Acompanhamento", "Hotéis"] },
    { id: 4, nome: "Fernanda K.", cidade: "São Paulo, SP", preco: 800, foto: "/model2.jpg", online: true, avaliacao: 4.7, total: 45, servicos: ["VIP", "Viagens", "Eventos"] },
    { id: 5, nome: "Isabela C.", cidade: "Belo Horizonte, MG", preco: 320, foto: "/model1.jpg", online: false, avaliacao: 4.9, total: 92, servicos: ["Massagem tântrica", "Local próprio"] },
    { id: 6, nome: "Carolina V.", cidade: "São Paulo, SP", preco: 180, foto: "/model2.jpg", online: true, avaliacao: 4.7, total: 54, servicos: ["Acompanhamento", "Local próprio"] },
    { id: 7, nome: "Juliana T.", cidade: "Recife, PE", preco: 1200, foto: "/model1.jpg", online: true, avaliacao: 5.0, total: 31, servicos: ["VIP", "Viagens", "Eventos"] },
    { id: 8, nome: "Patricia L.", cidade: "Brasília, DF", preco: 200, foto: "/model2.jpg", online: false, avaliacao: 4.6, total: 77, servicos: ["Acompanhamento", "Jantar"] },
  ],
  trans: [
    { id: 9, nome: "Valentina G.", cidade: "São Paulo, SP", preco: 200, foto: "/model2.jpg", online: true, avaliacao: 4.9, total: 78, servicos: ["Acompanhamento", "Viagens"] },
    { id: 10, nome: "Melissa F.", cidade: "Rio de Janeiro, RJ", preco: 180, foto: "/model1.jpg", online: true, avaliacao: 4.8, total: 55, servicos: ["Eventos", "Hotéis"] },
    { id: 11, nome: "Sophia A.", cidade: "Curitiba, PR", preco: 600, foto: "/model2.jpg", online: false, avaliacao: 5.0, total: 101, servicos: ["Local próprio", "Massagem"] },
    { id: 12, nome: "Luna P.", cidade: "Salvador, BA", preco: 150, foto: "/model1.jpg", online: true, avaliacao: 4.7, total: 42, servicos: ["Acompanhamento"] },
    { id: 13, nome: "Bianca T.", cidade: "Florianópolis, SC", preco: 1500, foto: "/model2.jpg", online: true, avaliacao: 4.9, total: 67, servicos: ["VIP", "Viagens"] },
  ],
  homens: [
    { id: 14, nome: "Rafael M.", cidade: "São Paulo, SP", preco: 200, foto: "/model1.jpg", online: true, avaliacao: 4.8, total: 65, servicos: ["Acompanhamento", "Eventos"] },
    { id: 15, nome: "Gabriel T.", cidade: "Rio de Janeiro, RJ", preco: 350, foto: "/model2.jpg", online: false, avaliacao: 4.9, total: 48, servicos: ["Massagem", "Viagens"] },
    { id: 16, nome: "Lucas V.", cidade: "Florianópolis, SC", preco: 130, foto: "/model1.jpg", online: true, avaliacao: 4.7, total: 33, servicos: ["Acompanhamento"] },
    { id: 17, nome: "Diego S.", cidade: "Belo Horizonte, MG", preco: 900, foto: "/model2.jpg", online: true, avaliacao: 5.0, total: 89, servicos: ["VIP", "Eventos"] },
    { id: 18, nome: "Thiago N.", cidade: "São Paulo, SP", preco: 250, foto: "/model1.jpg", online: false, avaliacao: 4.8, total: 55, servicos: ["Viagens", "Hotéis"] },
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

const FILTROS = ["Online agora", "Com avaliações", "Com local", "Até R$300", "Fotos verificadas", "Exclusivas"] as const;
type Filtro = typeof FILTROS[number];

function StarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" style={{ flexShrink: 0 }}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function BuscarContent() {
  const params = useSearchParams();
  const [mainTab, setMainTab] = useState<MainTab>((params.get("tab") as MainTab) ?? "acompanhantes");
  const [subTab, setSubTab] = useState<SubTab>((params.get("sub") as SubTab) ?? "mulheres");
  const [busca, setBusca] = useState(params.get("q") ?? "");
  const [showFilters, setShowFilters] = useState(false);
  const [filtros, setFiltros] = useState<Set<Filtro>>(new Set());
  const [filtroImovel, setFiltroImovel] = useState<string | null>(null);

  function toggleFiltro(f: Filtro) {
    setFiltros((prev) => {
      const next = new Set(prev);
      next.has(f) ? next.delete(f) : next.add(f);
      return next;
    });
  }

  const lista = acompanhantes[subTab].filter((a) => {
    if (busca && !a.cidade.toLowerCase().includes(busca.toLowerCase()) && !a.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtros.has("Online agora") && !a.online) return false;
    if (filtros.has("Com avaliações") && a.avaliacao < 4.8) return false;
    if (filtros.has("Com local") && !a.servicos.some(s => s.toLowerCase().includes("local"))) return false;
    if (filtros.has("Até R$300") && a.preco > 300) return false;
    if (filtros.has("Exclusivas") && a.preco < 400) return false;
    return true;
  });

  return (
    <div style={{ background: "#060e1b", minHeight: "100vh", color: "#f1f5f9" }}>
      {showFilters && <FiltersModal onClose={() => setShowFilters(false)} onApply={() => setShowFilters(false)} />}
      <Navbar />

      {/* Barra de busca + tabs */}
      <div style={{ paddingTop: 64, background: "#0b1420", borderBottom: "1px solid #1e293b" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 24px 0" }}>

          {/* Search + tabs inline */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 0 }}>
            <div style={{ display: "flex", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 3, flexShrink: 0 }}>
              {([["acompanhantes", "Acompanhantes"], ["imoveis", "Imóveis"]] as const).map(([tab, label]) => (
                <button key={tab} onClick={() => setMainTab(tab)}
                  style={{ padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, background: mainTab === tab ? "#cc0000" : "transparent", color: mainTab === tab ? "#fff" : "#475569", transition: "all 0.2s" }}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, display: "flex", gap: 8, minWidth: 200 }}>
              <div style={{ flex: 1, position: "relative" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2"
                  style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input value={busca} onChange={(e) => setBusca(e.target.value)}
                  placeholder={mainTab === "acompanhantes" ? "Cidade, nome ou serviço..." : "Cidade ou tipo de imóvel..."}
                  style={{ width: "100%", padding: "10px 14px 10px 40px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, color: "#f1f5f9", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "#cc0000")}
                  onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "#1e293b")} />
              </div>
              <button style={{ padding: "0 20px", background: "#cc0000", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                Buscar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 24px 80px" }}>

        {/* ACOMPANHANTES */}
        {mainTab === "acompanhantes" && (
          <>
            <Stories />

            <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid #1e293b" }}>
              {([["mulheres", "Mulheres"], ["trans", "Trans"], ["homens", "Homens"]] as const).map(([tab, label]) => (
                <button key={tab} onClick={() => setSubTab(tab)}
                  style={{ padding: "11px 24px", border: "none", background: "transparent", cursor: "pointer", fontWeight: 700, fontSize: 14, color: subTab === tab ? "#f1f5f9" : "#475569", borderBottom: `2px solid ${subTab === tab ? "#cc0000" : "transparent"}`, transition: "all 0.2s" }}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 24, overflowX: "auto", paddingBottom: 4, alignItems: "center" }}>
              <button onClick={() => setShowFilters(true)}
                style={{ padding: "7px 18px", background: "transparent", border: "1.5px solid #cc0000", borderRadius: 20, color: "#cc0000", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                Filtros
              </button>
              {FILTROS.map((f) => {
                const ativo = filtros.has(f);
                return (
                  <button key={f} onClick={() => toggleFiltro(f)}
                    style={{ padding: "7px 16px", background: ativo ? "rgba(204,0,0,0.15)" : "#0f172a", border: `1px solid ${ativo ? "#cc0000" : "#1e293b"}`, borderRadius: 20, color: ativo ? "#f1f5f9" : "#64748b", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s", flexShrink: 0, fontWeight: ativo ? 700 : 400 }}>
                    {f === "Online agora" && <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: ativo ? "#22c55e" : "#334155", marginRight: 6, verticalAlign: "middle" }} />}
                    {f}
                  </button>
                );
              })}
            </div>

            <p style={{ fontSize: 12, color: "#475569", marginBottom: 16 }}>
              {lista.length} perfil{lista.length !== 1 ? "is" : ""} encontrado{lista.length !== 1 ? "s" : ""}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {lista.map((a) => (
                <Link key={a.id} href={`/profissionais/${a.id}`} style={{ textDecoration: "none" }}>
                  <div style={{ borderRadius: 10, overflow: "hidden", background: "#0f172a", cursor: "pointer", transition: "transform 0.2s" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
                    <div style={{ position: "relative", paddingTop: "140%", background: "#1a2a40" }}>
                      <img src={a.foto} alt={a.nome} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(6,14,27,0.9) 0%, transparent 50%)" }} />
                      {a.online ? (
                        <div style={{ position: "absolute", top: 10, left: 10, background: "#22c55e", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, display: "flex", alignItems: "center", gap: 4 }}>
                          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff" }} /> Online
                        </div>
                      ) : (
                        <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(6,14,27,0.7)", color: "#64748b", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>
                          Offline
                        </div>
                      )}
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 14px" }}>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: "#f1f5f9" }}>{a.nome}</p>
                        <p style={{ margin: "2px 0 6px", fontSize: 12, color: "#94a3b8" }}>{a.cidade}</p>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <StarIcon />
                            <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700 }}>{a.avaliacao}</span>
                            <span style={{ fontSize: 11, color: "#475569" }}>({a.total})</span>
                          </div>
                          <span style={{ fontSize: 13, color: "#cc0000", fontWeight: 800 }}>R${a.preco}/h</span>
                        </div>
                        <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
                          {a.servicos?.slice(0, 2).map((s) => (
                            <span key={s} style={{ fontSize: 10, background: "rgba(255,255,255,0.07)", color: "#94a3b8", padding: "2px 7px", borderRadius: 10 }}>{s}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {lista.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <p style={{ fontSize: 16, color: "#475569" }}>Nenhum perfil encontrado com os filtros selecionados.</p>
                <button onClick={() => { setFiltros(new Set()); setBusca(""); }}
                  style={{ marginTop: 12, padding: "8px 20px", background: "#cc0000", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>
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
                    style={{ padding: "7px 16px", background: ativo ? "rgba(204,0,0,0.15)" : "#0f172a", border: `1px solid ${ativo ? "#cc0000" : "#1e293b"}`, borderRadius: 20, color: ativo ? "#f1f5f9" : "#64748b", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", fontWeight: ativo ? 700 : 400, transition: "all 0.2s", flexShrink: 0 }}>
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
                  <div style={{ borderRadius: 14, overflow: "hidden", background: "#0f172a", border: "1px solid #1e293b", cursor: "pointer", transition: "transform 0.2s, border-color 0.2s" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLElement).style.borderColor = "#cc0000"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.borderColor = "#1e293b"; }}>
                    <div style={{ position: "relative", paddingTop: "65%", background: "#1a2a40" }}>
                      <img src={im.foto} alt={im.titulo} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <div style={{ padding: "14px 16px" }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "#f1f5f9" }}>{im.titulo}</p>
                      <p style={{ margin: "4px 0 10px", fontSize: 13, color: "#475569" }}>{im.cidade} · {im.quartos} {im.quartos === 1 ? "quarto" : "quartos"}</p>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15 }}>R${im.preco}<span style={{ color: "#475569", fontSize: 12, fontWeight: 400 }}>/noite</span></span>
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

export default function BuscarPage() {
  return (
    <Suspense>
      <BuscarContent />
    </Suspense>
  );
}

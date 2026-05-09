"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FiltersModal from "@/components/FiltersModal";
import Stories from "@/components/Stories";

const GOLD = "#d4a843";
const GOLD_DIM = "rgba(212,168,67,0.12)";
const PLAYFAIR = "var(--font-playfair), serif";

type MainTab = "acompanhantes" | "imoveis";
type SubTab = "mulheres" | "trans" | "homens";

const acompanhantes = {
  mulheres: [
    { id: 1, nome: "Amanda R.", cidade: "São Paulo, SP", preco: 150, foto: "/model1.jpg", online: true, avaliacao: 4.9, total: 87, idade: 26, local: "Com local", servicos: ["Acompanhamento", "Viagens", "Jantar"], bio: "Morena sofisticada, discreta e elegante. Atendo em hotel ou local próprio. Experiências únicas com muito carinho." },
    { id: 2, nome: "Letícia M.", cidade: "Rio de Janeiro, RJ", preco: 250, foto: "/model2.jpg", online: false, avaliacao: 4.8, total: 63, idade: 24, local: "Com local", servicos: ["Massagem", "Eventos", "Local próprio"], bio: "Especialista em massagem relaxante e tântrica. Ambiente reservado e climatizado. Atendo com hora marcada." },
    { id: 3, nome: "Bruna S.", cidade: "Curitiba, PR", preco: 120, foto: "/model1.jpg", online: true, avaliacao: 5.0, total: 120, idade: 22, local: "A domicílio", servicos: ["Acompanhamento", "Hotéis"], bio: "Jovem e divertida, corpo sarado, muito carinhosa. Aceito hotéis e motéis. Discrição total garantida." },
    { id: 4, nome: "Fernanda K.", cidade: "São Paulo, SP", preco: 800, foto: "/model2.jpg", online: true, avaliacao: 4.7, total: 45, idade: 29, local: "Com local", servicos: ["VIP", "Viagens", "Eventos"], bio: "Perfil VIP para clientes exigentes. Disponível para viagens e eventos exclusivos. Fluente em inglês." },
    { id: 5, nome: "Isabela C.", cidade: "Belo Horizonte, MG", preco: 320, foto: "/model1.jpg", online: false, avaliacao: 4.9, total: 92, idade: 27, local: "Com local", servicos: ["Massagem tântrica", "Local próprio"], bio: "Especialista em massagem tântrica e relaxamento total. Ambiente luxuoso e sigiloso no centro da cidade." },
    { id: 6, nome: "Carolina V.", cidade: "São Paulo, SP", preco: 180, foto: "/model2.jpg", online: true, avaliacao: 4.7, total: 54, idade: 25, local: "Com local", servicos: ["Acompanhamento", "Local próprio"], bio: "Loira natural, olhos verdes, muito simpática. Local próprio na zona sul. Disponível todos os dias." },
    { id: 7, nome: "Juliana T.", cidade: "Recife, PE", preco: 1200, foto: "/model1.jpg", online: true, avaliacao: 5.0, total: 31, idade: 31, local: "Aceita viajar", servicos: ["VIP", "Viagens", "Eventos"], bio: "Executiva sofisticada, discreta e culta. Acompanho em viagens nacionais e internacionais." },
    { id: 8, nome: "Patricia L.", cidade: "Brasília, DF", preco: 200, foto: "/model2.jpg", online: false, avaliacao: 4.6, total: 77, idade: 28, local: "Com local", servicos: ["Acompanhamento", "Jantar"], bio: "Companhia para jantar, eventos e momentos especiais. Apresentável e bem relacionada." },
  ],
  trans: [
    { id: 9, nome: "Valentina G.", cidade: "São Paulo, SP", preco: 200, foto: "/model2.jpg", online: true, avaliacao: 4.9, total: 78, idade: 23, local: "Com local", servicos: ["Acompanhamento", "Viagens"], bio: "Trans feminina, corpo perfeito, muita simpatia. Local próprio no centro. Sigilo absoluto." },
    { id: 10, nome: "Melissa F.", cidade: "Rio de Janeiro, RJ", preco: 180, foto: "/model1.jpg", online: true, avaliacao: 4.8, total: 55, idade: 25, local: "Hotéis", servicos: ["Eventos", "Hotéis"], bio: "Elegante e sofisticada. Disponível para eventos, festas e hotéis de luxo no Rio." },
    { id: 11, nome: "Sophia A.", cidade: "Curitiba, PR", preco: 600, foto: "/model2.jpg", online: false, avaliacao: 5.0, total: 101, idade: 27, local: "Com local", servicos: ["Local próprio", "Massagem"], bio: "Premium, linda e siliconada. Local próprio climatizado. Massagem relaxante inclusa." },
    { id: 12, nome: "Luna P.", cidade: "Salvador, BA", preco: 150, foto: "/model1.jpg", online: true, avaliacao: 4.7, total: 42, idade: 22, local: "A domicílio", servicos: ["Acompanhamento"], bio: "Jovem e animada, atendo a domicílio e hotéis. Preço acessível, qualidade garantida." },
    { id: 13, nome: "Bianca T.", cidade: "Florianópolis, SC", preco: 1500, foto: "/model2.jpg", online: true, avaliacao: 4.9, total: 67, idade: 30, local: "Aceita viajar", servicos: ["VIP", "Viagens"], bio: "Perfil ultra VIP, disponível para viagens e experiências exclusivas pelo Brasil e exterior." },
  ],
  homens: [
    { id: 14, nome: "Rafael M.", cidade: "São Paulo, SP", preco: 200, foto: "/model1.jpg", online: true, avaliacao: 4.8, total: 65, idade: 28, local: "Hotéis", servicos: ["Acompanhamento", "Eventos"], bio: "Alto, moreno, bem humorado. Companhia para eventos e jantares. Discreto e bem apresentável." },
    { id: 15, nome: "Gabriel T.", cidade: "Rio de Janeiro, RJ", preco: 350, foto: "/model2.jpg", online: false, avaliacao: 4.9, total: 48, idade: 30, local: "Com local", servicos: ["Massagem", "Viagens"], bio: "Especialista em massagem relaxante e tântrica para mulheres e casais. Local próprio no Leblon." },
    { id: 16, nome: "Lucas V.", cidade: "Florianópolis, SC", preco: 130, foto: "/model1.jpg", online: true, avaliacao: 4.7, total: 33, idade: 24, local: "A domicílio", servicos: ["Acompanhamento"], bio: "Jovem, simpático e discreto. Atendo mulheres, casais e homens. Sem julgamentos." },
    { id: 17, nome: "Diego S.", cidade: "Belo Horizonte, MG", preco: 900, foto: "/model2.jpg", online: true, avaliacao: 5.0, total: 89, idade: 33, local: "Aceita viajar", servicos: ["VIP", "Eventos"], bio: "Executivo, culto e sofisticado. Disponível para viagens e eventos de alto padrão." },
    { id: 18, nome: "Thiago N.", cidade: "São Paulo, SP", preco: 250, foto: "/model1.jpg", online: false, avaliacao: 4.8, total: 55, idade: 27, local: "Hotéis", servicos: ["Viagens", "Hotéis"], bio: "Acompanho em viagens nacionais e estadias em hotéis de luxo. Inglês fluente." },
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

const FILTROS = ["Online agora", "Com avaliações", "Com local", "Até R$300", "Exclusivas"] as const;
type Filtro = typeof FILTROS[number];

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
      <style>{`
        .buscar-tabs-bar { display: flex; gap: 4px; }
        .perfil-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 14px;
        }
        .perfil-card { border-radius: 16px; overflow: hidden; background: #0b1420; border: 1px solid #1e293b; transition: transform 0.2s, border-color 0.2s; cursor: pointer; }
        .perfil-card:hover { transform: translateY(-3px); border-color: rgba(212,168,67,0.3); }
        .perfil-foto { position: relative; padding-top: 130%; }
        .perfil-info { padding: 14px 16px; }
        @media (max-width: 640px) {
          .perfil-grid { grid-template-columns: 1fr; gap: 14px; }
          .perfil-card { display: flex; flex-direction: column; }
          .perfil-foto { padding-top: 0; width: 100%; height: 320px; flex-shrink: 0; }
          .perfil-info { padding: 16px 18px; }
        }
        .imovel-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }
        @media (max-width: 640px) {
          .imovel-grid { grid-template-columns: 1fr; }
        }
        .filtros-scroll { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; align-items: center; -webkit-overflow-scrolling: touch; }
        .filtros-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      {showFilters && <FiltersModal onClose={() => setShowFilters(false)} onApply={() => setShowFilters(false)} />}
      <Navbar />

      {/* ── BARRA DE BUSCA PREMIUM ── */}
      <div style={{ position: "sticky", top: 64, zIndex: 50, background: "rgba(6,14,27,0.97)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${GOLD_DIM}` }}>
        {/* linha dourada */}
        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${GOLD}, rgba(212,168,67,0.3), transparent)` }} />
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "12px 16px" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>

            {/* Tipo toggle */}
            <div style={{ display: "flex", gap: 0, background: "#0f172a", border: `1px solid ${GOLD_DIM}`, borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
              {([["acompanhantes", "Acompanhantes"], ["imoveis", "Imóveis"]] as const).map(([tab, label]) => (
                <button key={tab} onClick={() => setMainTab(tab)}
                  style={{ padding: "9px 16px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, background: mainTab === tab ? GOLD : "transparent", color: mainTab === tab ? "#060e1b" : "#475569", transition: "all 0.2s", fontFamily: PLAYFAIR }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Input de busca */}
            <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2"
                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input value={busca} onChange={(e) => setBusca(e.target.value)}
                placeholder={mainTab === "acompanhantes" ? "Nome, serviço ou especialidade..." : "Cidade, tipo ou comodidade..."}
                style={{ width: "100%", padding: "10px 14px 10px 36px", background: "#0f172a", border: `1px solid ${GOLD_DIM}`, borderRadius: 10, color: "#f1f5f9", fontSize: 14, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }}
                onFocus={(e) => ((e.target as HTMLElement).style.borderColor = GOLD)}
                onBlur={(e) => ((e.target as HTMLElement).style.borderColor = GOLD_DIM)} />
            </div>

            {/* Botão buscar — círculo com ícone */}
            <button
              style={{ width: 42, height: 42, borderRadius: "50%", background: GOLD, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "background 0.2s, transform 0.15s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#e8bb47"; (e.currentTarget as HTMLElement).style.transform = "scale(1.08)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = GOLD; (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#060e1b" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 16px 80px" }}>

        {/* ── ACOMPANHANTES ── */}
        {mainTab === "acompanhantes" && (
          <>
            <Stories />

            {/* Sub-tabs */}
            <div style={{ display: "flex", marginBottom: 16, borderBottom: `1px solid ${GOLD_DIM}` }}>
              {([["mulheres", "Mulheres"], ["trans", "Trans"], ["homens", "Homens"]] as const).map(([tab, label]) => (
                <button key={tab} onClick={() => setSubTab(tab)}
                  style={{ padding: "11px 20px", border: "none", background: "transparent", cursor: "pointer", fontWeight: 700, fontSize: 14, color: subTab === tab ? "#f1f5f9" : "#475569", borderBottom: `2px solid ${subTab === tab ? GOLD : "transparent"}`, transition: "all 0.2s" }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Filtros */}
            <div className="filtros-scroll" style={{ marginBottom: 20 }}>
              <button onClick={() => setShowFilters(true)}
                style={{ padding: "7px 16px", background: "transparent", border: `1.5px solid ${GOLD}`, borderRadius: 20, color: GOLD, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                Filtros
              </button>
              {FILTROS.map((f) => {
                const ativo = filtros.has(f);
                return (
                  <button key={f} onClick={() => toggleFiltro(f)}
                    style={{ padding: "7px 14px", background: ativo ? "rgba(212,168,67,0.15)" : "#0f172a", border: `1px solid ${ativo ? GOLD : "#1e293b"}`, borderRadius: 20, color: ativo ? "#f1f5f9" : "#64748b", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s", flexShrink: 0, fontWeight: ativo ? 700 : 400 }}>
                    {f === "Online agora" && <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: ativo ? "#22c55e" : "#334155", marginRight: 6, verticalAlign: "middle" }} />}
                    {f}
                  </button>
                );
              })}
            </div>

            <p style={{ fontSize: 12, color: "#475569", marginBottom: 14 }}>
              {lista.length} perfil{lista.length !== 1 ? "is" : ""} encontrado{lista.length !== 1 ? "s" : ""}
            </p>

            {/* Grid de perfis */}
            <div className="perfil-grid">
              {lista.map((a) => (
                <Link key={a.id} href={`/profissionais/${a.id}`} style={{ textDecoration: "none" }}>
                  <div className="perfil-card">
                    {/* Foto */}
                    <div className="perfil-foto" style={{ background: "#1a2a40", position: "relative" }}>
                      <img src={a.foto} alt={a.nome}
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(6,14,27,0.92) 0%, rgba(6,14,27,0.2) 50%, transparent 100%)" }} />
                      {/* Badge online - visível só no desktop */}
                      <div className="desktop-badge" style={{ position: "absolute", top: 10, left: 10 }}>
                        {a.online
                          ? <span style={{ background: "#22c55e", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff", display: "inline-block" }} /> Online
                            </span>
                          : <span style={{ background: "rgba(6,14,27,0.75)", color: "#64748b", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>Offline</span>
                        }
                      </div>
                    </div>

                    {/* Info */}
                    <div className="perfil-info">
                      {/* Status + preço */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: a.online ? "#22c55e" : "#475569", display: "inline-block", flexShrink: 0 }} />
                          <span style={{ fontSize: 11, color: a.online ? "#22c55e" : "#475569", fontWeight: 600 }}>{a.online ? "Online agora" : "Offline"}</span>
                        </div>
                        <span style={{ fontSize: 14, color: GOLD, fontWeight: 800, fontFamily: PLAYFAIR }}>R${a.preco}/h</span>
                      </div>

                      {/* Nome */}
                      <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 18, color: "#f1f5f9", fontFamily: PLAYFAIR, lineHeight: 1.2 }}>{a.nome}</p>

                      {/* Cidade */}
                      <p style={{ margin: "0 0 6px", fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        {a.cidade}
                      </p>

                      {/* Bio */}
                      <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b", lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {(a as typeof a & { bio?: string }).bio}
                      </p>

                      {/* Rating */}
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                        <span style={{ fontSize: 13, color: "#f59e0b", fontWeight: 700 }}>{a.avaliacao}</span>
                        <span style={{ fontSize: 11, color: "#475569" }}>({a.total} avaliações)</span>
                      </div>

                      {/* Info chips: idade + local */}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                        {(a as typeof a & { idade?: number }).idade && (
                          <span style={{ fontSize: 10, background: "rgba(255,255,255,0.04)", border: "1px solid #1e293b", color: "#64748b", padding: "3px 8px", borderRadius: 8, display: "flex", alignItems: "center", gap: 4 }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                            {(a as typeof a & { idade?: number }).idade} anos
                          </span>
                        )}
                        {(a as typeof a & { local?: string }).local && (
                          <span style={{ fontSize: 10, background: "rgba(255,255,255,0.04)", border: "1px solid #1e293b", color: "#64748b", padding: "3px 8px", borderRadius: 8 }}>
                            {(a as typeof a & { local?: string }).local}
                          </span>
                        )}
                      </div>

                      {/* Serviços */}
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
                        {a.servicos.slice(0, 3).map((s) => (
                          <span key={s} style={{ fontSize: 10, background: GOLD_DIM, border: `1px solid rgba(212,168,67,0.15)`, color: "#94a3b8", padding: "3px 8px", borderRadius: 10 }}>{s}</span>
                        ))}
                      </div>

                      {/* CTA */}
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: GOLD, fontSize: 12, fontWeight: 700, fontFamily: PLAYFAIR }}>
                        Ver perfil
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
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
                  style={{ marginTop: 12, padding: "10px 24px", background: GOLD, color: "#060e1b", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
                  Limpar filtros
                </button>
              </div>
            )}
          </>
        )}

        {/* ── IMÓVEIS ── */}
        {mainTab === "imoveis" && (
          <>
            <div className="filtros-scroll" style={{ marginBottom: 20 }}>
              {["Apartamento", "Casa", "Studio", "Cobertura", "Flat", "Com piscina", "Pet friendly"].map((f) => {
                const ativo = filtroImovel === f;
                return (
                  <button key={f} onClick={() => setFiltroImovel(ativo ? null : f)}
                    style={{ padding: "7px 14px", background: ativo ? "rgba(212,168,67,0.15)" : "#0f172a", border: `1px solid ${ativo ? GOLD : "#1e293b"}`, borderRadius: 20, color: ativo ? "#f1f5f9" : "#64748b", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", fontWeight: ativo ? 700 : 400, transition: "all 0.2s", flexShrink: 0 }}>
                    {f}
                  </button>
                );
              })}
            </div>

            <div className="imovel-grid">
              {imoveis.filter((i) => {
                if (busca && !i.cidade.toLowerCase().includes(busca.toLowerCase()) && !i.titulo.toLowerCase().includes(busca.toLowerCase())) return false;
                if (filtroImovel === "Com piscina" || filtroImovel === "Pet friendly") return i.tags.includes(filtroImovel);
                if (filtroImovel) return i.tipo === filtroImovel;
                return true;
              }).map((im) => (
                <Link key={im.id} href={`/imoveis/${im.id}`} style={{ textDecoration: "none" }}>
                  <div style={{ borderRadius: 14, overflow: "hidden", background: "#0f172a", border: `1px solid ${GOLD_DIM}`, cursor: "pointer", transition: "transform 0.2s, border-color 0.2s" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,168,67,0.3)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.borderColor = GOLD_DIM; }}>
                    <div style={{ position: "relative", paddingTop: "60%", background: "#1a2a40" }}>
                      <img src={im.foto} alt={im.titulo} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }} />
                      <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(6,14,27,0.85)", padding: "4px 10px", borderRadius: 8, fontSize: 12, color: GOLD, fontWeight: 700 }}>
                        {im.tipo}
                      </div>
                    </div>
                    <div style={{ padding: "14px 16px" }}>
                      <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 16, color: "#f1f5f9", fontFamily: PLAYFAIR }}>{im.titulo}</p>
                      <p style={{ margin: "0 0 10px", fontSize: 13, color: "#475569" }}>{im.cidade} · {im.quartos} {im.quartos === 1 ? "quarto" : "quartos"}</p>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ color: GOLD, fontWeight: 800, fontSize: 16, fontFamily: PLAYFAIR }}>
                          R${im.preco}<span style={{ color: "#475569", fontSize: 12, fontWeight: 400, fontFamily: "var(--font-inter), sans-serif" }}>/noite</span>
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
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

"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FiltersModal from "@/components/FiltersModal";
import Stories from "@/components/Stories";
import BottomNav from "@/components/BottomNav";

const GOLD = "#d4a843";
const GOLD_DIM = "rgba(212,168,67,0.12)";
const PLAYFAIR = "var(--font-playfair), serif";

type MainTab = "acompanhantes" | "imoveis";
type SubTab = "mulheres" | "trans" | "homens";

const SUB_TO_CATEGORY: Record<SubTab, string> = {
  mulheres: "MULHER",
  trans: "TRANS",
  homens: "HOMEM",
};

function calcAge(birthDate?: string | null): number | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() - birth.getMonth() < 0 || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
  return age;
}

type CardPerfil = {
  id: string; slug: string; nome: string; cidade: string;
  preco: number | null; foto: string | null; online: boolean;
  avaliacao: number; total: number; idade: number | null;
  local: string | null; servicos: string[]; bio: string;
};

const imoveis = [
  { id: 1, titulo: "Suite reservada Lourdes", cidade: "Belo Horizonte, MG", preco: 890, foto: "/property-bh-luxury.png", quartos: 1, avaliacao: 4.9, tipo: "Espaco reservado", tags: ["Entrada privativa", "Uso profissional"] },
  { id: 2, titulo: "Ambiente discreto Itauna", cidade: "Itauna, MG", preco: 650, foto: "/property-itauna-country.png", quartos: 1, avaliacao: 4.9, tipo: "Quarto privativo", tags: ["Privacidade acustica", "Atendimento reservado"] },
  { id: 3, titulo: "Flat privativo Itauna", cidade: "Itauna, MG", preco: 420, foto: "/property-itauna-loft.png", quartos: 1, avaliacao: 4.8, tipo: "Flat discreto", tags: ["Entrada privativa"] },
  { id: 4, titulo: "Studio reservado Savassi", cidade: "Belo Horizonte, MG", preco: 720, foto: "/property-bh-luxury.png", quartos: 1, avaliacao: 4.8, tipo: "Studio reservado", tags: ["Uso profissional"] },
  { id: 5, titulo: "Espaco discreto Nova Lima", cidade: "Nova Lima, MG", preco: 980, foto: "/property-itauna-country.png", quartos: 1, avaliacao: 5.0, tipo: "Ambiente reservado", tags: ["Garagem privativa"] },
  { id: 6, titulo: "Quarto reservado centro", cidade: "Belo Horizonte, MG", preco: 380, foto: "/property-itauna-loft.png", quartos: 1, avaliacao: 4.7, tipo: "Quarto privativo", tags: ["Entrada privativa"] },
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
  const [perfis, setPerfis] = useState<CardPerfil[]>([]);
  const [loading, setLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPerfis = useCallback(async (category: string, search: string) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ category, sortBy: "rating" });
      if (search) qs.set("search", search);
      const res = await fetch(`/api/professionals?${qs}`);
      const data = await res.json();
      const list: CardPerfil[] = (data.professionals ?? []).map((p: any) => ({
        id: p.id,
        slug: p.slug,
        nome: p.displayName,
        cidade: `${p.city}, ${p.state}`,
        preco: p.priceMin ?? p.pricePerHour ?? null,
        foto: p.image ?? null,
        online: false,
        avaliacao: p.rating ?? 0,
        total: p.totalReviews ?? 0,
        idade: calcAge(p.birthDate),
        local: p.attendanceTypes?.[0] ?? null,
        servicos: (p.specialties ?? []).map((s: any) => s.name),
        bio: p.bio ?? "",
      }));
      setPerfis(list);
    } catch {
      setPerfis([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mainTab === "acompanhantes") {
      fetchPerfis(SUB_TO_CATEGORY[subTab], busca);
    }
  }, [subTab, mainTab, fetchPerfis]);

  useEffect(() => {
    if (mainTab !== "acompanhantes") return;
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchPerfis(SUB_TO_CATEGORY[subTab], busca);
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [busca]);

  function toggleFiltro(f: Filtro) {
    setFiltros((prev) => {
      const next = new Set(prev);
      next.has(f) ? next.delete(f) : next.add(f);
      return next;
    });
  }

  const lista = perfis.filter((a) => {
    if (filtros.has("Online agora") && !a.online) return false;
    if (filtros.has("Com avaliações") && a.avaliacao < 4.8) return false;
    if (filtros.has("Com local") && !a.servicos.some(s => s.toLowerCase().includes("local"))) return false;
    if (filtros.has("Até R$300") && (a.preco ?? 0) > 300) return false;
    if (filtros.has("Exclusivas") && (a.preco ?? 0) < 400) return false;
    return true;
  });

  return (
    <div style={{ background: "#050505", minHeight: "100vh", color: "#f4f1ea" }}>
      <style>{`
        .buscar-tabs-bar { display: flex; gap: 4px; }
        .perfil-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 14px;
        }
        .perfil-card { border-radius: 16px; overflow: hidden; background: #111; border: 1px solid #2a2620; transition: transform 0.2s, border-color 0.2s; cursor: pointer; }
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
      <div style={{ background: "#0a0a0a", borderBottom: `1px solid ${GOLD_DIM}` }}>
        {/* linha dourada */}
        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${GOLD}, rgba(212,168,67,0.3), transparent)` }} />
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "12px 16px" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>

            {/* Tipo toggle */}
            <div style={{ display: "flex", gap: 0, background: "#111", border: `1px solid ${GOLD_DIM}`, borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
              {([["acompanhantes", "Acompanhantes"], ["imoveis", "Quartos"]] as const).map(([tab, label]) => (
                <button key={tab} onClick={() => setMainTab(tab)}
                  style={{ padding: "9px 16px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, background: mainTab === tab ? GOLD : "transparent", color: mainTab === tab ? "#080704" : "#8d8578", transition: "all 0.2s", fontFamily: PLAYFAIR }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Input de busca */}
            <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#615b52" strokeWidth="2"
                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input value={busca} onChange={(e) => setBusca(e.target.value)}
                placeholder={mainTab === "acompanhantes" ? "Nome, serviço ou especialidade..." : "Cidade, bairro ou estrutura..."}
                style={{ width: "100%", padding: "10px 14px 10px 36px", background: "#111", border: `1px solid ${GOLD_DIM}`, borderRadius: 10, color: "#f4f1ea", fontSize: 14, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }}
                onFocus={(e) => ((e.target as HTMLElement).style.borderColor = GOLD)}
                onBlur={(e) => ((e.target as HTMLElement).style.borderColor = GOLD_DIM)} />
            </div>

            {/* Botão buscar — círculo com ícone */}
            <button
              style={{ width: 42, height: 42, borderRadius: "50%", background: GOLD, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "background 0.2s, transform 0.15s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#e8bb47"; (e.currentTarget as HTMLElement).style.transform = "scale(1.08)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = GOLD; (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#080704" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px 80px" }}>

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
              {loading ? "Buscando..." : `${lista.length} perfil${lista.length !== 1 ? "is" : ""} encontrado${lista.length !== 1 ? "s" : ""}`}
            </p>

            {/* Grid de perfis */}
            <div className="perfil-grid">
              {lista.map((a) => (
                <Link key={a.id} href={`/profissionais/${a.slug}`} style={{ textDecoration: "none" }}>
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

        {/* ── QUARTOS ── */}
        {mainTab === "imoveis" && (
          <>
            <div className="filtros-scroll" style={{ marginBottom: 20 }}>
              {["Quarto privativo", "Espaco reservado", "Flat discreto", "Studio reservado", "Ambiente reservado", "Entrada privativa"].map((f) => {
                const ativo = filtroImovel === f;
                return (
                  <button key={f} onClick={() => setFiltroImovel(ativo ? null : f)}
                    style={{ padding: "7px 14px", background: ativo ? "rgba(212,168,67,0.15)" : "#111", border: `1px solid ${ativo ? GOLD : "#2a2620"}`, borderRadius: 20, color: ativo ? "#f4f1ea" : "#8d8578", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", fontWeight: ativo ? 700 : 400, transition: "all 0.2s", flexShrink: 0 }}>
                    {f}
                  </button>
                );
              })}
            </div>

            <div className="imovel-grid">
              {imoveis.filter((i) => {
                if (busca && !i.cidade.toLowerCase().includes(busca.toLowerCase()) && !i.titulo.toLowerCase().includes(busca.toLowerCase())) return false;
                if (filtroImovel === "Entrada privativa") return i.tags.includes(filtroImovel);
                if (filtroImovel) return i.tipo === filtroImovel;
                return true;
              }).map((im) => (
                <Link key={im.id} href={`/imoveis/${im.id}`} style={{ textDecoration: "none" }}>
                  <div style={{ borderRadius: 12, overflow: "hidden", background: "#111", border: `1px solid ${GOLD_DIM}`, cursor: "pointer", transition: "transform 0.2s, border-color 0.2s" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,168,67,0.3)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.borderColor = GOLD_DIM; }}>
                    <div style={{ position: "relative", paddingTop: "60%", background: "#141414" }}>
                      <img src={im.foto} alt={im.titulo} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.82, filter: "saturate(0.76) contrast(1.04)" }} />
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(5,5,5,0.78), rgba(5,5,5,0.08) 58%, transparent)" }} />
                      <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(5,5,5,0.82)", border: `1px solid ${GOLD_DIM}`, padding: "4px 10px", borderRadius: 999, fontSize: 11, color: GOLD, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8 }}>
                        {im.tipo}
                      </div>
                    </div>
                    <div style={{ padding: "14px 16px" }}>
                      <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 16, color: "#f4f1ea", fontFamily: PLAYFAIR }}>{im.titulo}</p>
                      <p style={{ margin: "0 0 10px", fontSize: 13, color: "#8d8578" }}>{im.cidade} · atendimento reservado</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                        {im.tags.map((tag) => (
                          <span key={tag} style={{ fontSize: 10, background: "rgba(255,255,255,0.035)", border: `1px solid ${GOLD_DIM}`, color: "#b8b1a6", padding: "3px 8px", borderRadius: 999 }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ color: GOLD, fontWeight: 800, fontSize: 16, fontFamily: PLAYFAIR }}>
                          R${im.preco}<span style={{ color: "#8d8578", fontSize: 12, fontWeight: 400, fontFamily: "var(--font-inter), sans-serif" }}>/periodo</span>
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="#d4a843"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                          <span style={{ fontSize: 13, color: "#d4a843", fontWeight: 600 }}>{im.avaliacao}</span>
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

      <BottomNav />
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

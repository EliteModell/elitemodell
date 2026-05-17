"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FiltersModal from "@/components/FiltersModal";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

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

const FILTROS = ["Online agora", "Com avaliações", "Com local", "Até R$300", "Exclusivas"] as const;
type Filtro = typeof FILTROS[number];

function BuscarContent() {
  const params = useSearchParams();
  const [mainTab, setMainTab] = useState<MainTab>((params.get("tab") as MainTab) ?? "acompanhantes");
  const [subTab, setSubTab] = useState<SubTab>((params.get("sub") as SubTab) ?? "mulheres");
  const [busca, setBusca] = useState(params.get("q") ?? "");
  const [showFilters, setShowFilters] = useState(false);
  const [filtros, setFiltros] = useState<Set<Filtro>>(new Set());
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
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchPerfis(SUB_TO_CATEGORY[subTab], busca);
    }, 400);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
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
        .rooms-coming-soon {
          min-height: 420px;
          display: grid;
          place-items: center;
          text-align: center;
          border: 1px solid rgba(212,168,67,0.18);
          border-radius: 18px;
          background:
            radial-gradient(circle at 50% 0%, rgba(212,168,67,0.12), transparent 42%),
            linear-gradient(145deg, rgba(255,255,255,0.035), rgba(212,168,67,0.035)),
            #0b0b0b;
          padding: 48px 24px;
          box-shadow: 0 24px 70px rgba(0,0,0,0.28);
        }
        .rooms-coming-soon-inner { max-width: 620px; }
        .soon-kicker {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 12px;
          border: 1px solid rgba(212,168,67,0.28);
          border-radius: 999px;
          color: ${GOLD};
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          background: rgba(212,168,67,0.08);
        }
        .rooms-coming-soon h2 {
          margin: 18px 0 12px;
          color: #f4f1ea;
          font-family: ${PLAYFAIR};
          font-size: clamp(2rem, 6vw, 4rem);
          line-height: 0.95;
          letter-spacing: 0;
        }
        .rooms-coming-soon p {
          margin: 0 auto;
          color: #b8b1a6;
          font-size: 15px;
          line-height: 1.75;
          max-width: 520px;
        }
        .coming-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 10px;
          margin-top: 24px;
        }
        .coming-actions a {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 999px;
          padding: 0 18px;
          text-decoration: none;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          transition: transform 0.2s, border-color 0.2s, background 0.2s;
        }
        .coming-actions a:hover { transform: translateY(-2px); }
        .coming-actions .primary {
          border: 1px solid transparent;
          background: linear-gradient(135deg, #f6d979, #d4a843 48%, #a57920);
          color: #080704;
          box-shadow: 0 14px 36px rgba(212,168,67,0.18);
        }
        .coming-actions .secondary {
          border: 1px solid rgba(212,168,67,0.22);
          background: rgba(255,255,255,0.035);
          color: #f4f1ea;
        }
        .soon-note {
          display: block;
          margin-top: 20px;
          color: #716b62;
          font-size: 12px;
          line-height: 1.6;
        }
        @media (max-width: 640px) {
          .rooms-coming-soon {
            min-height: 360px;
            border-radius: 14px;
            padding: 38px 18px;
          }
          .coming-actions { flex-direction: column; }
          .coming-actions a { width: 100%; }
        }
        .filtros-scroll { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; align-items: center; -webkit-overflow-scrolling: touch; }
        .filtros-scroll::-webkit-scrollbar { display: none; }
        .profiles-empty {
          min-height: 330px;
          display: grid;
          place-items: center;
          text-align: center;
          border: 1px solid rgba(212,168,67,0.16);
          border-radius: 18px;
          background:
            radial-gradient(circle at 50% 0%, rgba(212,168,67,0.10), transparent 42%),
            linear-gradient(145deg, rgba(255,255,255,0.035), rgba(212,168,67,0.025)),
            #080808;
          padding: 42px 22px;
          margin-top: 18px;
        }
        .profiles-empty-inner { max-width: 560px; }
        .profiles-empty-kicker {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 12px;
          border: 1px solid rgba(212,168,67,0.26);
          border-radius: 999px;
          color: ${GOLD};
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          background: rgba(212,168,67,0.08);
        }
        .profiles-empty h2 {
          margin: 16px 0 10px;
          color: #f4f1ea;
          font-family: ${PLAYFAIR};
          font-size: clamp(1.9rem, 6vw, 3.5rem);
          line-height: 0.98;
          letter-spacing: 0;
        }
        .profiles-empty p {
          margin: 0 auto;
          max-width: 470px;
          color: #a9a297;
          font-size: 14px;
          line-height: 1.7;
        }
        .profiles-empty-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 10px;
          margin-top: 22px;
        }
        .profiles-empty-actions button,
        .profiles-empty-actions a {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 0 18px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-decoration: none;
          cursor: pointer;
        }
        .profiles-empty-actions button {
          border: 1px solid transparent;
          background: linear-gradient(135deg, #f6d979, #d4a843 50%, #a57920);
          color: #080704;
        }
        .profiles-empty-actions a {
          border: 1px solid rgba(212,168,67,0.22);
          background: rgba(255,255,255,0.035);
          color: #f4f1ea;
        }
        @media (max-width: 640px) {
          .profiles-empty {
            min-height: 300px;
            border-radius: 14px;
            padding: 36px 18px;
          }
          .profiles-empty-actions { flex-direction: column; }
          .profiles-empty-actions button,
          .profiles-empty-actions a { width: 100%; }
        }
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

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px 56px" }}>

        {/* ── ACOMPANHANTES ── */}
        {mainTab === "acompanhantes" && (
          <>
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
                      <img src={a.foto ?? "/android-chrome-512x512.png"} alt={a.nome}
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

            {!loading && lista.length === 0 && (
              <div className="profiles-empty">
                <div className="profiles-empty-inner">
                  <span className="profiles-empty-kicker">Curadoria em andamento</span>
                  <h2>Perfis premium em breve.</h2>
                  <p>
                    Estamos liberando apenas profissionais verificadas e alinhadas ao padrão Elite Modell.
                    Novas presenças entram no ar assim que a curadoria for concluída.
                  </p>
                  <div className="profiles-empty-actions">
                    <button type="button" onClick={() => { setFiltros(new Set()); setBusca(""); }}>
                      Limpar busca
                    </button>
                    <Link href={ACCOUNT_ROUTES.cadastroAcompanhante}>Ativar perfil profissional</Link>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── QUARTOS ── */}
        {mainTab === "imoveis" && (
          <>
            <section className="rooms-coming-soon" aria-labelledby="rooms-coming-title">
              <div className="rooms-coming-soon-inner">
                <span className="soon-kicker">Ambientes reservados</span>
                <h2 id="rooms-coming-title">Quartos discretos em breve.</h2>
                <p>
                  Estamos selecionando os primeiros espaços profissionais da Elite Modell.
                  As listagens públicas só entram no ar depois de curadoria e aprovação.
                </p>
                <div className="coming-actions">
                  <Link className="primary" href={ACCOUNT_ROUTES.onboardingAnfitriao}>
                    Cadastrar para anunciar
                    <span aria-hidden="true">→</span>
                  </Link>
                  <Link className="secondary" href={ACCOUNT_ROUTES.login}>
                    Já sou anfitrião
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
                <span className="soon-note">
                  Não exibimos fotos ou anúncios fictícios. O catálogo será liberado apenas com espaços reais e verificados.
                </span>
              </div>
            </section>
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

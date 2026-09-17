"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

type ApiProfessional = {
  id: string;
  slug: string;
  displayName: string;
  bio: string;
  city: string;
  state: string;
  image?: string | null;
  priceMin?: number | null;
  pricePerHour?: number | null;
  escortCategory?: string | null;
  rating: number;
  totalReviews: number;
  verified: boolean;
  featured: boolean;
  specialties: { id: string; name: string }[];
  services?: string[];
  photos: { id: string; url: string; cover: boolean }[];
  galleryUrls?: string[];
  user?: { image: string | null };
};

const CATEGORY_LABELS: Record<string, string> = {
  MULHER: "Mulher",
  HOMEM: "Homem",
  TRANS: "Trans",
};

export default function ProfissionaisPage() {
  const [professionals, setProfessionals] = useState<ApiProfessional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [priceMax, setPriceMax] = useState(6000);
  const [sortBy, setSortBy] = useState("rating");
  const [filterOpen, setFilterOpen] = useState(false);
  const [onlyVerified, setOnlyVerified] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams();
        if (search) qs.set("search", search);
        if (category) qs.set("category", category);
        if (priceMax < 6000) qs.set("priceMax", String(priceMax));
        if (sortBy) qs.set("sortBy", sortBy);
        if (page > 1) qs.set("page", String(page));

        const res = await fetch(`/api/professionals?${qs}`, { signal: controller.signal });
        if (!res.ok) throw new Error("Failed to load professionals");
        const data = await res.json();
        let list: ApiProfessional[] = data.professionals ?? [];
        if (onlyVerified) list = list.filter((p) => p.verified);

        setProfessionals(list);
        setTotal(data.total ?? 0);
        setPages(data.pages ?? 1);
      } catch {
        if (!controller.signal.aborted) {
          setProfessionals([]);
          setError("Não foi possível carregar os profissionais agora.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 260);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search, category, priceMax, sortBy, onlyVerified, page, reloadKey]);

  const featured = professionals.filter((p) => p.featured);
  const rest = professionals.filter((p) => !p.featured);

  return (
    <div className="public-listing-page" style={{ background: "#f7f7fa", minHeight: "100vh", color: "#141212" }}>
      <Navbar tone="light" />

      {/* Hero */}
      <div style={{ paddingTop: 88, background: "#fff", borderBottom: "1px solid #fcf7ff" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px 32px" }}>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 800, color: "#141212", marginBottom: 12, letterSpacing: "-1px" }}>
            Profissionais <span style={{ color: "#b72cff" }}>Elite Modell</span>
          </h1>
          <p style={{ color: "#686d7d", fontSize: 17, marginBottom: 32, maxWidth: 540 }}>
            Perfis verificados com documentos e biometria. Discreção e segurança em cada contato.
          </p>

          {/* Barra de busca */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
              <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#666" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Nome, cidade ou serviço..."
                style={{ width: "100%", padding: "12px 14px 12px 38px", background: "#fff", border: "1px solid #e1a6ff", borderRadius: 12, color: "#141212", fontSize: 15, outline: "none", boxSizing: "border-box" }}
                onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "#b72cff")}
                onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "#e1a6ff")}
              />
            </div>

            {/* Categoria */}
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              style={{ padding: "12px 14px", background: "#fff", border: "1px solid #e1a6ff", borderRadius: 12, color: category ? "#141212" : "#737684", fontSize: 14, outline: "none", cursor: "pointer" }}
            >
              <option value="">Todas as categorias</option>
              <option value="MULHER">Mulher</option>
              <option value="HOMEM">Homem</option>
              <option value="TRANS">Trans</option>
            </select>

            <button
              onClick={() => setFilterOpen(!filterOpen)}
              style={{ padding: "12px 16px", background: filterOpen ? "#fcf7ff" : "#fff", border: `1px solid ${filterOpen ? "#b72cff" : "#e1a6ff"}`, borderRadius: 12, color: filterOpen ? "#8f1fd1" : "#514b59", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
              </svg>
              Filtros
            </button>

            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              style={{ padding: "12px 14px", background: "#fff", border: "1px solid #e1a6ff", borderRadius: 12, color: "#514b59", fontSize: 14, outline: "none", cursor: "pointer" }}
            >
              <option value="rating">Mais avaliados</option>
              <option value="reviews">Mais avaliações</option>
              <option value="price_asc">Menor preço</option>
              <option value="price_desc">Maior preço</option>
            </select>
          </div>

          {/* Painel de filtros */}
          {filterOpen && (
            <div style={{ marginTop: 16, padding: "20px", background: "#faf9fc", border: "1px solid #fcf7ff", borderRadius: 16 }}>
              <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
                <div>
                  <label style={{ fontSize: 13, color: "#514b59", fontWeight: 600, display: "block", marginBottom: 12 }}>
                    Preço máximo: <span style={{ color: "#b72cff" }}>R$ {priceMax.toLocaleString("pt-BR")}</span>
                  </label>
                  <input type="range" min={200} max={6000} step={100} value={priceMax} onChange={(e) => { setPriceMax(Number(e.target.value)); setPage(1); }} style={{ accentColor: "#b72cff", width: 220 }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <label style={{ fontSize: 13, color: "#514b59", fontWeight: 600 }}>Outros</label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" checked={onlyVerified} onChange={(e) => { setOnlyVerified(e.target.checked); setPage(1); }} style={{ accentColor: "#b72cff" }} />
                    <span style={{ fontSize: 13, color: "#686270" }}>Apenas verificadas</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resultados */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>

        {loading ? <ProfessionalGridSkeleton /> : null}
        {!loading && error && (
          <div className="premium-empty-state premium-enter" style={{ textAlign: "center", padding: "46px 22px", borderRadius: 8 }}>
            <p style={{ margin: "0 0 8px", color: "#b72cff", fontSize: 11, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase" }}>Instabilidade temporaria</p>
            <h2 style={{ margin: "0 0 10px", color: "#f4f1ea", fontSize: 26, fontWeight: 850 }}>Não conseguimos atualizar a lista.</h2>
            <p style={{ margin: "0 auto 20px", maxWidth: 460, color: "#b8b1a6", lineHeight: 1.6 }}>{error}</p>
            <button
              type="button"
              className="premium-button premium-interactive"
              onClick={() => setReloadKey((key) => key + 1)}
              style={{ padding: "0 20px", cursor: "pointer" }}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Em destaque */}
            {featured.length > 0 && !search && !category && (
              <div style={{ marginBottom: 40 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#b72cff", textTransform: "uppercase", letterSpacing: 2 }}>Em destaque</span>
                  <div style={{ flex: 1, height: 1, background: "#fcf7ff" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
                  {featured.map((p) => <ProfCard key={p.id} pro={p} featured />)}
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <p style={{ color: "#666", fontSize: 14 }}>
                {total} profissional{total !== 1 ? "is" : ""} encontrado{total !== 1 ? "s" : ""}
              </p>
              <Link href={ACCOUNT_ROUTES.cadastroAcompanhante} style={{ fontSize: 14, color: "#b72cff", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                Anunciar como acompanhante
              </Link>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
              {(search || category ? professionals : rest).map((p) => (
                <ProfCard key={p.id} pro={p} />
              ))}
            </div>

            {/* Paginação */}
            {pages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 40 }}>
                {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${p === page ? "#b72cff" : "#e1a6ff"}`, background: p === page ? "#fcf7ff" : "#fff", color: p === page ? "#8f1fd1" : "#686270", fontSize: 14, fontWeight: p === page ? 700 : 400, cursor: "pointer" }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {professionals.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                <p style={{ color: "#666", fontSize: 16, marginBottom: 16 }}>Nenhum profissional encontrado com esses filtros.</p>
                <button
                  onClick={() => { setSearch(""); setCategory(""); setPriceMax(6000); setOnlyVerified(false); setPage(1); }}
                  style={{ padding: "10px 24px", background: "#b72cff", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 700 }}
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        .prof-card {
          border-color: #fcf7ff;
          transform: translateY(0);
          will-change: transform;
          box-shadow: 0 16px 42px rgba(37, 31, 32, 0.08);
          contain: layout paint;
        }
        .prof-card.featured {
          border-color: rgba(183, 44, 255,0.15);
        }
        @media (hover: hover) and (pointer: fine) {
          .prof-card:hover {
            border-color: rgba(183, 44, 255,0.4);
            transform: translateY(-3px);
            box-shadow: 0 20px 52px rgba(37, 31, 32, 0.14);
          }
        }
        .prof-card:active {
          transform: translateY(1px) scale(0.995);
        }
        @media (prefers-reduced-motion: reduce) {
          .prof-card {
            transition: none !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}

function ProfessionalGridSkeleton() {
  return (
    <div className="premium-enter" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="premium-card" style={{ borderRadius: 8, overflow: "hidden" }}>
          <div className="premium-skeleton" style={{ height: 180 }} />
          <div style={{ padding: 16 }}>
            <div className="premium-skeleton" style={{ height: 18, width: "58%", borderRadius: 999 }} />
            <div className="premium-skeleton" style={{ height: 12, width: "42%", borderRadius: 999, marginTop: 10 }} />
            <div className="premium-skeleton" style={{ height: 42, width: "100%", borderRadius: 8, marginTop: 16 }} />
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <div className="premium-skeleton" style={{ height: 24, width: 76, borderRadius: 999 }} />
              <div className="premium-skeleton" style={{ height: 24, width: 62, borderRadius: 999 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProfCard({ pro, featured = false }: { pro: ApiProfessional; featured?: boolean }) {
  const photoCount = (pro.galleryUrls?.length ?? 0) + (pro.photos?.length ?? 0);
  const coverPhoto = pro.photos?.find((p) => p.cover)?.url ?? pro.image;
  const profilePhoto = pro.user?.image ?? null;
  const specialtyNames = Array.from(new Set([...(pro.services ?? []), ...pro.specialties.map((s) => s.name)]));

  return (
    <Link href={`/profissionais/${pro.slug}`} style={{ textDecoration: "none", display: "block" }}>
      <div
        className={featured ? "prof-card featured" : "prof-card"}
        style={{
          background: "#fff",
          border: "1px solid",
          borderRadius: 14,
          overflow: "hidden",
          transition: "border-color 0.2s, transform 0.2s",
          position: "relative",
        }}
      >
        {featured && (
          <div style={{ position: "absolute", top: 12, left: 12, zIndex: 2, padding: "3px 10px", background: "#b72cff", color: "#fff", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
            ★ Destaque
          </div>
        )}

        {/* Foto de capa */}
        <div style={{ height: 180, background: "linear-gradient(135deg, #fcf7ff 0%, #fbfaff 60%, #fcf7ff 100%)", position: "relative", overflow: "hidden" }}>
          {coverPhoto ? (
            <Image
              src={coverPhoto}
              alt={pro.displayName}
              fill
              sizes={featured ? "(max-width: 768px) 100vw, 380px" : "(max-width: 768px) 100vw, 340px"}
              quality={70}
              style={{ objectFit: "cover", objectPosition: "top" }}
            />
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(183, 44, 255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800, color: "#b72cff", border: "3px solid rgba(183, 44, 255,0.3)" }}>
                {pro.displayName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
            </div>
          )}
          {photoCount > 0 && (
            <div style={{ position: "absolute", bottom: 10, right: 10, fontSize: 12, color: "#b4adb0", background: "rgba(0,0,0,0.6)", padding: "3px 8px", borderRadius: 6 }}>
              {photoCount} foto{photoCount !== 1 ? "s" : ""}
            </div>
          )}
          {pro.escortCategory && (
            <div style={{ position: "absolute", top: featured ? 40 : 12, right: 12, padding: "3px 10px", background: "rgba(6,14,27,0.8)", border: "1px solid rgba(183, 44, 255,0.3)", borderRadius: 20, fontSize: 11, color: "#b72cff", fontWeight: 600 }}>
              {CATEGORY_LABELS[pro.escortCategory] ?? pro.escortCategory}
            </div>
          )}
          <div style={{ position: "absolute", left: 14, bottom: -28, width: 64, height: 64, borderRadius: "50%", border: "3px solid #b72cff", overflow: "hidden", background: "#fff", boxShadow: "0 10px 26px rgba(37, 31, 32,0.18)" }}>
            {profilePhoto ? (
              <Image src={profilePhoto} alt={pro.displayName} fill sizes="64px" style={{ objectFit: "cover", objectPosition: "top" }} />
            ) : (
              <div style={{ display: "grid", placeItems: "center", width: "100%", height: "100%", color: "#b72cff", fontWeight: 900 }}>
                {pro.displayName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div style={{ padding: "34px 16px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#141212", margin: 0 }}>{pro.displayName}</h3>
                {pro.verified && (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="#b72cff"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                )}
              </div>
              <p style={{ fontSize: 13, color: "#666", margin: "2px 0 0" }}>{pro.city}, {pro.state}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                <span style={{ color: "#b72cff" }}>★</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#141212" }}>{(pro.rating ?? 0).toFixed(1)}</span>
              </div>
              <span style={{ fontSize: 12, color: "#555" }}>({pro.totalReviews ?? 0})</span>
            </div>
          </div>

          <p style={{ fontSize: 13, color: "#777", lineHeight: 1.5, marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {pro.bio}
          </p>

          {/* Especialidades */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {specialtyNames.slice(0, 2).map((s) => (
              <span key={s} style={{ padding: "3px 10px", background: "rgba(183, 44, 255,0.08)", border: "1px solid rgba(183, 44, 255,0.2)", borderRadius: 20, fontSize: 11, color: "#b72cff", fontWeight: 500 }}>
                {s}
              </span>
            ))}
            {specialtyNames.length > 2 && (
              <span style={{ padding: "3px 10px", background: "#fcf7ff", border: "1px solid #fcf7ff", borderRadius: 20, fontSize: 11, color: "#686270" }}>
                +{specialtyNames.length - 2}
              </span>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              {(pro.priceMin ?? pro.pricePerHour) && (
                <span style={{ fontSize: 14, color: "#888" }}>
                  A partir de <span style={{ color: "#b72cff", fontWeight: 700, fontSize: 16 }}>R$ {(pro.priceMin ?? pro.pricePerHour)!.toLocaleString("pt-BR")}</span>
                </span>
              )}
            </div>
            <div style={{ padding: "7px 14px", background: "#b72cff", color: "#fff", borderRadius: 9, fontSize: 13, fontWeight: 700 }}>
              Ver perfil
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

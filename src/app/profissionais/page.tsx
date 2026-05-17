"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

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
  photos: { id: string; url: string; cover: boolean }[];
  galleryUrls?: string[];
};

const CATEGORY_LABELS: Record<string, string> = {
  MULHER: "Mulher",
  HOMEM: "Homem",
  TRANS: "Trans",
};

export default function ProfissionaisPage() {
  const [professionals, setProfessionals] = useState<ApiProfessional[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [priceMax, setPriceMax] = useState(6000);
  const [sortBy, setSortBy] = useState("rating");
  const [filterOpen, setFilterOpen] = useState(false);
  const [onlyVerified, setOnlyVerified] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProfessionals = useCallback(async (params: {
    search?: string;
    category?: string;
    priceMax?: number;
    sortBy?: string;
    verified?: boolean;
    page?: number;
  }) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (params.search) qs.set("search", params.search);
      if (params.category) qs.set("category", params.category);
      if (params.priceMax && params.priceMax < 6000) qs.set("priceMax", String(params.priceMax));
      if (params.sortBy) qs.set("sortBy", params.sortBy);
      if (params.page && params.page > 1) qs.set("page", String(params.page));

      const res = await fetch(`/api/professionals?${qs}`);
      const data = await res.json();

      let list: ApiProfessional[] = data.professionals ?? [];
      if (params.verified) list = list.filter((p) => p.verified);

      setProfessionals(list);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
    } catch {
      setProfessionals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-busca quando sortBy, category ou page muda
  useEffect(() => {
    fetchProfessionals({ search, category, priceMax, sortBy, verified: onlyVerified, page });
  }, [sortBy, category, page, onlyVerified, fetchProfessionals]);

  // Debounce search + priceMax
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      fetchProfessionals({ search, category, priceMax, sortBy, verified: onlyVerified, page: 1 });
    }, 400);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search, priceMax]);

  const featured = professionals.filter((p) => p.featured);
  const rest = professionals.filter((p) => !p.featured);

  return (
    <div style={{ background: "#0d0d0d", minHeight: "100vh" }}>
      <Navbar />

      {/* Hero */}
      <div style={{ paddingTop: 80, background: "linear-gradient(180deg, #0a0a0a 0%, #0d0d0d 100%)", borderBottom: "1px solid #1a1a1a" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px 32px" }}>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 800, color: "#fff", marginBottom: 12, letterSpacing: "-1px" }}>
            Profissionais <span style={{ color: "#d4a843" }}>Elite Modell</span>
          </h1>
          <p style={{ color: "#777", fontSize: 17, marginBottom: 32, maxWidth: 540 }}>
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
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nome, cidade ou serviço..."
                style={{ width: "100%", padding: "12px 14px 12px 38px", background: "#111", border: "1px solid #222", borderRadius: 10, color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box" }}
                onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "#d4a843")}
                onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "#222")}
              />
            </div>

            {/* Categoria */}
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              style={{ padding: "12px 14px", background: "#111", border: "1px solid #222", borderRadius: 10, color: category ? "#fff" : "#666", fontSize: 14, outline: "none", cursor: "pointer" }}
            >
              <option value="">Todas as categorias</option>
              <option value="MULHER">Mulher</option>
              <option value="HOMEM">Homem</option>
              <option value="TRANS">Trans</option>
            </select>

            <button
              onClick={() => setFilterOpen(!filterOpen)}
              style={{ padding: "12px 16px", background: filterOpen ? "rgba(212,168,67,0.12)" : "#111", border: `1px solid ${filterOpen ? "#d4a843" : "#222"}`, borderRadius: 10, color: "#ccc", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
              </svg>
              Filtros
            </button>

            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              style={{ padding: "12px 14px", background: "#111", border: "1px solid #222", borderRadius: 10, color: "#ccc", fontSize: 14, outline: "none", cursor: "pointer" }}
            >
              <option value="rating">Mais avaliados</option>
              <option value="reviews">Mais avaliações</option>
              <option value="price_asc">Menor preço</option>
              <option value="price_desc">Maior preço</option>
            </select>
          </div>

          {/* Painel de filtros */}
          {filterOpen && (
            <div style={{ marginTop: 16, padding: "20px", background: "#111", border: "1px solid #222", borderRadius: 12 }}>
              <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
                <div>
                  <label style={{ fontSize: 13, color: "#aaa", fontWeight: 600, display: "block", marginBottom: 12 }}>
                    Preço máximo: <span style={{ color: "#d4a843" }}>R$ {priceMax.toLocaleString("pt-BR")}</span>
                  </label>
                  <input type="range" min={200} max={6000} step={100} value={priceMax} onChange={(e) => setPriceMax(Number(e.target.value))} style={{ accentColor: "#d4a843", width: 220 }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <label style={{ fontSize: 13, color: "#aaa", fontWeight: 600 }}>Outros</label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" checked={onlyVerified} onChange={(e) => { setOnlyVerified(e.target.checked); setPage(1); }} style={{ accentColor: "#d4a843" }} />
                    <span style={{ fontSize: 13, color: "#ccc" }}>Apenas verificadas</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resultados */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>

        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#555" }}>
            <div style={{ fontSize: 32, marginBottom: 12, animation: "spin 1s linear infinite" }}>⟳</div>
            Buscando profissionais...
          </div>
        )}

        {!loading && (
          <>
            {/* Em destaque */}
            {featured.length > 0 && !search && !category && (
              <div style={{ marginBottom: 40 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#d4a843", textTransform: "uppercase", letterSpacing: 2 }}>Em destaque</span>
                  <div style={{ flex: 1, height: 1, background: "#1e1e1e" }} />
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
              <Link href="/profissional/novo" style={{ fontSize: 14, color: "#d4a843", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                Anunciar meu perfil
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
                    style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${p === page ? "#d4a843" : "#222"}`, background: p === page ? "rgba(212,168,67,0.12)" : "#111", color: p === page ? "#d4a843" : "#666", fontSize: 14, fontWeight: p === page ? 700 : 400, cursor: "pointer" }}
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
                  style={{ padding: "10px 24px", background: "#d4a843", color: "#060e1b", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 700 }}
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ProfCard({ pro, featured = false }: { pro: ApiProfessional; featured?: boolean }) {
  const [hover, setHover] = useState(false);
  const photoCount = (pro.galleryUrls?.length ?? 0) + (pro.photos?.length ?? 0);
  const coverPhoto = pro.photos?.find((p) => p.cover)?.url ?? pro.image;
  const specialtyNames = pro.specialties.map((s) => s.name);

  return (
    <Link href={`/profissionais/${pro.slug}`} style={{ textDecoration: "none", display: "block" }}>
      <div
        style={{
          background: "#111",
          border: `1px solid ${hover ? "rgba(212,168,67,0.4)" : featured ? "rgba(212,168,67,0.15)" : "#1e1e1e"}`,
          borderRadius: 14,
          overflow: "hidden",
          transition: "border-color 0.2s, transform 0.2s",
          transform: hover ? "translateY(-3px)" : "none",
          position: "relative",
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {featured && (
          <div style={{ position: "absolute", top: 12, left: 12, zIndex: 2, padding: "3px 10px", background: "#d4a843", color: "#060e1b", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
            ★ Destaque
          </div>
        )}

        {/* Foto de capa */}
        <div style={{ height: 180, background: "linear-gradient(135deg, #0b1420 0%, #111 60%, #0d0d1a 100%)", position: "relative", overflow: "hidden" }}>
          {coverPhoto ? (
            <img src={coverPhoto} alt={pro.displayName} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(212,168,67,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800, color: "#d4a843", border: "3px solid rgba(212,168,67,0.3)" }}>
                {pro.displayName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
            </div>
          )}
          {photoCount > 0 && (
            <div style={{ position: "absolute", bottom: 10, right: 10, fontSize: 12, color: "#94a3b8", background: "rgba(0,0,0,0.6)", padding: "3px 8px", borderRadius: 6 }}>
              {photoCount} foto{photoCount !== 1 ? "s" : ""}
            </div>
          )}
          {pro.escortCategory && (
            <div style={{ position: "absolute", top: featured ? 40 : 12, right: 12, padding: "3px 10px", background: "rgba(6,14,27,0.8)", border: "1px solid rgba(212,168,67,0.3)", borderRadius: 20, fontSize: 11, color: "#d4a843", fontWeight: 600 }}>
              {CATEGORY_LABELS[pro.escortCategory] ?? pro.escortCategory}
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: 0 }}>{pro.displayName}</h3>
                {pro.verified && (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="#d4a843"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                )}
              </div>
              <p style={{ fontSize: 13, color: "#666", margin: "2px 0 0" }}>{pro.city}, {pro.state}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                <span style={{ color: "#d4a843" }}>★</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{(pro.rating ?? 0).toFixed(1)}</span>
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
              <span key={s} style={{ padding: "3px 10px", background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.2)", borderRadius: 20, fontSize: 11, color: "#d4a843", fontWeight: 500 }}>
                {s}
              </span>
            ))}
            {specialtyNames.length > 2 && (
              <span style={{ padding: "3px 10px", background: "#0d0d0d", border: "1px solid #222", borderRadius: 20, fontSize: 11, color: "#666" }}>
                +{specialtyNames.length - 2}
              </span>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              {(pro.priceMin ?? pro.pricePerHour) && (
                <span style={{ fontSize: 14, color: "#888" }}>
                  A partir de <span style={{ color: "#d4a843", fontWeight: 700, fontSize: 16 }}>R$ {(pro.priceMin ?? pro.pricePerHour)!.toLocaleString("pt-BR")}</span>
                </span>
              )}
            </div>
            <div style={{ padding: "7px 14px", background: "#d4a843", color: "#060e1b", borderRadius: 7, fontSize: 13, fontWeight: 700 }}>
              Ver perfil
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

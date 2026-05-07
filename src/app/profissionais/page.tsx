"use client";
import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

const specialtyOptions = [
  "Modelo Fotográfico", "Modelo Publicitário", "Modelo Fitness", "Modelo Plus Size",
  "Modelo Editorial", "Atriz/Ator", "Influencer", "Promoter",
  "Make Artist", "Stylist", "Fotógrafo", "Videomaker",
];

const mockProfessionals = [
  {
    slug: "juliana-oliveira",
    displayName: "Juliana Oliveira",
    bio: "Modelo fotográfica e publicitária com 6 anos de experiência. Especialista em moda, editorial e campanhas comerciais. Disponível para trabalhos em São Paulo e região.",
    city: "São Paulo", state: "SP",
    priceMin: 500, priceMax: 2000,
    specialties: ["Modelo Fotográfico", "Modelo Editorial", "Modelo Publicitário"],
    rating: 4.9, totalReviews: 38,
    verified: true, featured: true,
    whatsapp: "11999999999",
    photos: 12,
  },
  {
    slug: "carlos-mendes-foto",
    displayName: "Carlos Mendes",
    bio: "Fotógrafo especializado em moda, editorial e retratos artísticos. Estúdio próprio em São Paulo. Trabalho com marcas nacionais e internacionais.",
    city: "São Paulo", state: "SP",
    priceMin: 800, priceMax: 3500,
    specialties: ["Fotógrafo", "Stylist"],
    rating: 4.8, totalReviews: 61,
    verified: true, featured: false,
    whatsapp: "11988888888",
    photos: 24,
  },
  {
    slug: "fernanda-rocha",
    displayName: "Fernanda Rocha",
    bio: "Make artist premiada com mais de 8 anos de experiência. Especialista em maquiagem artística, noivas e editoriais de moda.",
    city: "Rio de Janeiro", state: "RJ",
    priceMin: 300, priceMax: 1500,
    specialties: ["Make Artist"],
    rating: 5.0, totalReviews: 47,
    verified: true, featured: true,
    whatsapp: "21977777777",
    photos: 18,
  },
  {
    slug: "pedro-lima",
    displayName: "Pedro Lima",
    bio: "Modelo fitness e comercial com corpo atlético. Experiência em campanhas de suplementos, academia e lifestyle saudável.",
    city: "Curitiba", state: "PR",
    priceMin: 400, priceMax: 1800,
    specialties: ["Modelo Fitness", "Modelo Publicitário"],
    rating: 4.7, totalReviews: 22,
    verified: false, featured: false,
    whatsapp: "41966666666",
    photos: 8,
  },
  {
    slug: "ana-beatriz",
    displayName: "Ana Beatriz Costa",
    bio: "Influencer digital e modelo com mais de 500k seguidores. Criação de conteúdo para marcas de moda, beleza e lifestyle.",
    city: "Belo Horizonte", state: "MG",
    priceMin: 1000, priceMax: 5000,
    specialties: ["Influencer", "Modelo Fotográfico"],
    rating: 4.9, totalReviews: 15,
    verified: true, featured: true,
    whatsapp: "31955555555",
    photos: 30,
  },
  {
    slug: "rafael-santos",
    displayName: "Rafael Santos",
    bio: "Videomaker especializado em fashion films e conteúdo digital. Equipamentos profissionais, edição incluída.",
    city: "São Paulo", state: "SP",
    priceMin: 1200, priceMax: 6000,
    specialties: ["Videomaker"],
    rating: 4.6, totalReviews: 19,
    verified: true, featured: false,
    whatsapp: "11944444444",
    photos: 6,
  },
];

export default function ProfissionaisPage() {
  const [search, setSearch] = useState("");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [priceMax, setPriceMax] = useState(6000);
  const [sortBy, setSortBy] = useState("rating");
  const [filterOpen, setFilterOpen] = useState(false);
  const [onlyVerified, setOnlyVerified] = useState(false);

  const toggleSpecialty = (s: string) =>
    setSelectedSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );

  const filtered = mockProfessionals
    .filter((p) => {
      if (search && !p.displayName.toLowerCase().includes(search.toLowerCase()) &&
        !p.city.toLowerCase().includes(search.toLowerCase()) &&
        !p.specialties.some((s) => s.toLowerCase().includes(search.toLowerCase()))) return false;
      if (onlyVerified && !p.verified) return false;
      if (selectedSpecialties.length > 0 && !selectedSpecialties.some((s) => p.specialties.includes(s))) return false;
      if (p.priceMin && p.priceMin > priceMax) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "price_asc") return (a.priceMin ?? 0) - (b.priceMin ?? 0);
      if (sortBy === "price_desc") return (b.priceMin ?? 0) - (a.priceMin ?? 0);
      if (sortBy === "reviews") return b.totalReviews - a.totalReviews;
      return b.rating - a.rating;
    });

  const featured = filtered.filter((p) => p.featured);
  const rest = filtered.filter((p) => !p.featured);

  return (
    <div style={{ background: "#0d0d0d", minHeight: "100vh" }}>
      <Navbar />

      {/* Hero section */}
      <div
        style={{
          paddingTop: 80,
          background: "linear-gradient(180deg, #0a0a0a 0%, #0d0d0d 100%)",
          borderBottom: "1px solid #1a1a1a",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px 32px" }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: 3, color: "#cc0000", textTransform: "uppercase", marginBottom: 12 }}>
            Módulo 2
          </p>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 800, color: "#fff", marginBottom: 12, letterSpacing: "-1px" }}>
            Marketplace de <span style={{ color: "#cc0000" }}>Profissionais</span>
          </h1>
          <p style={{ color: "#777", fontSize: 17, marginBottom: 32, maxWidth: 540 }}>
            Encontre modelos, fotógrafos, make artists e muito mais. Perfis verificados, avaliações reais.
          </p>

          {/* Search bar */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
              <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#666" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nome, especialidade ou cidade..."
                style={{ width: "100%", padding: "12px 14px 12px 38px", background: "#111", border: "1px solid #222", borderRadius: 10, color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box" }}
                onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "#cc0000")}
                onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "#222")}
              />
            </div>

            <button
              onClick={() => setFilterOpen(!filterOpen)}
              style={{ padding: "12px 16px", background: filterOpen ? "rgba(204,0,0,0.12)" : "#111", border: `1px solid ${filterOpen ? "#cc0000" : "#222"}`, borderRadius: 10, color: "#ccc", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
              </svg>
              Filtros {selectedSpecialties.length > 0 && <span style={{ background: "#cc0000", color: "#fff", borderRadius: "50%", width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{selectedSpecialties.length}</span>}
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ padding: "12px 14px", background: "#111", border: "1px solid #222", borderRadius: 10, color: "#ccc", fontSize: 14, outline: "none", cursor: "pointer" }}
            >
              <option value="rating" style={{ background: "#111" }}>Mais avaliados</option>
              <option value="reviews" style={{ background: "#111" }}>Mais avaliações</option>
              <option value="price_asc" style={{ background: "#111" }}>Menor preço</option>
              <option value="price_desc" style={{ background: "#111" }}>Maior preço</option>
            </select>
          </div>

          {/* Filter panel */}
          {filterOpen && (
            <div style={{ marginTop: 16, padding: "20px", background: "#111", border: "1px solid #222", borderRadius: 12 }}>
              <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
                <div>
                  <label style={{ fontSize: 13, color: "#aaa", fontWeight: 600, display: "block", marginBottom: 12 }}>
                    Preço máximo: <span style={{ color: "#cc0000" }}>R$ {priceMax.toLocaleString("pt-BR")}</span>
                  </label>
                  <input type="range" min={200} max={6000} step={100} value={priceMax} onChange={(e) => setPriceMax(Number(e.target.value))} style={{ accentColor: "#cc0000", width: 220 }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: "#aaa", fontWeight: 600, display: "block", marginBottom: 12 }}>Especialidades</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {specialtyOptions.map((s) => (
                      <button
                        key={s}
                        onClick={() => toggleSpecialty(s)}
                        style={{ padding: "5px 12px", background: selectedSpecialties.includes(s) ? "rgba(204,0,0,0.15)" : "#0d0d0d", border: `1px solid ${selectedSpecialties.includes(s) ? "#cc0000" : "#2a2a2a"}`, borderRadius: 20, color: selectedSpecialties.includes(s) ? "#fff" : "#888", fontSize: 13, cursor: "pointer" }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <label style={{ fontSize: 13, color: "#aaa", fontWeight: 600 }}>Outros</label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" checked={onlyVerified} onChange={(e) => setOnlyVerified(e.target.checked)} style={{ accentColor: "#cc0000" }} />
                    <span style={{ fontSize: 13, color: "#ccc" }}>Apenas verificados</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {/* Featured */}
        {featured.length > 0 && search === "" && selectedSpecialties.length === 0 && (
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#cc0000", textTransform: "uppercase", letterSpacing: 2 }}>Em destaque</span>
              <div style={{ flex: 1, height: 1, background: "#1e1e1e" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
              {featured.map((p) => <ProfCard key={p.slug} pro={p} featured />)}
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <p style={{ color: "#666", fontSize: 14 }}>
            {filtered.length} profissional{filtered.length !== 1 ? "is" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
          </p>
          <Link
            href="/profissional/novo"
            style={{ fontSize: 14, color: "#cc0000", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Cadastrar meu perfil
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
          {(search !== "" || selectedSpecialties.length > 0 ? filtered : rest).map((p) => (
            <ProfCard key={p.slug} pro={p} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <p style={{ color: "#666", fontSize: 16, marginBottom: 16 }}>Nenhum profissional encontrado com esses filtros.</p>
            <button
              onClick={() => { setSearch(""); setSelectedSpecialties([]); setPriceMax(6000); setOnlyVerified(false); }}
              style={{ padding: "10px 24px", background: "#cc0000", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfCard({ pro, featured = false }: { pro: typeof mockProfessionals[0]; featured?: boolean }) {
  const [hover, setHover] = useState(false);

  return (
    <Link
      href={`/profissionais/${pro.slug}`}
      style={{ textDecoration: "none", display: "block" }}
    >
      <div
        style={{
          background: "#111",
          border: `1px solid ${hover ? "#cc000060" : featured ? "#2a1a1a" : "#1e1e1e"}`,
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
          <div style={{ position: "absolute", top: 12, left: 12, zIndex: 2, padding: "3px 10px", background: "#cc0000", borderRadius: 20, fontSize: 11, color: "#fff", fontWeight: 700 }}>
            ★ Destaque
          </div>
        )}

        {/* Cover photo */}
        <div
          style={{
            height: 180,
            background: `linear-gradient(135deg, #1a0a0a 0%, #111 60%, #0d0d1a 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(204,0,0,0.06) 0%, transparent 70%)" }} />
          {/* Avatar */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "#cc0000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 800,
              color: "#fff",
              border: "3px solid #1a1a1a",
              position: "relative",
              zIndex: 1,
            }}
          >
            {pro.displayName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
          </div>
          <div style={{ position: "absolute", bottom: 10, right: 10, fontSize: 12, color: "#555", background: "rgba(0,0,0,0.6)", padding: "3px 8px", borderRadius: 6 }}>
            {pro.photos} fotos
          </div>
        </div>

        {/* Info */}
        <div style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{pro.displayName}</h3>
                {pro.verified && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#cc0000">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                )}
              </div>
              <p style={{ fontSize: 13, color: "#666" }}>{pro.city}, {pro.state}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                <span style={{ color: "#cc0000" }}>★</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{pro.rating.toFixed(1)}</span>
              </div>
              <span style={{ fontSize: 12, color: "#555" }}>({pro.totalReviews})</span>
            </div>
          </div>

          <p style={{ fontSize: 13, color: "#777", lineHeight: 1.5, marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {pro.bio}
          </p>

          {/* Specialties */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {pro.specialties.slice(0, 2).map((s) => (
              <span key={s} style={{ padding: "3px 10px", background: "rgba(204,0,0,0.08)", border: "1px solid rgba(204,0,0,0.2)", borderRadius: 20, fontSize: 11, color: "#cc4444", fontWeight: 500 }}>
                {s}
              </span>
            ))}
            {pro.specialties.length > 2 && (
              <span style={{ padding: "3px 10px", background: "#0d0d0d", border: "1px solid #222", borderRadius: 20, fontSize: 11, color: "#666" }}>
                +{pro.specialties.length - 2}
              </span>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              {pro.priceMin && (
                <span style={{ fontSize: 14, color: "#888" }}>
                  A partir de <span style={{ color: "#cc0000", fontWeight: 700, fontSize: 16 }}>R$ {pro.priceMin.toLocaleString("pt-BR")}</span>
                </span>
              )}
            </div>
            <div style={{ padding: "7px 14px", background: "#cc0000", color: "#fff", borderRadius: 7, fontSize: 13, fontWeight: 600 }}>
              Ver perfil
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

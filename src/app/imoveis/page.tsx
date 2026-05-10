"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

const amenityOptions = ["Wi-Fi", "Piscina", "Pet Friendly", "Estacionamento", "Ar-condicionado", "Cozinha", "Churrasqueira", "Academia"];

interface Property {
  id: string;
  title: string;
  city: string;
  state: string;
  type: string;
  pricePerNight: number;
  rating: number;
  totalReviews: number;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  allowPets: boolean;
  amenities: { name: string }[];
  photos: { url: string }[];
}

export default function ImoveisPage() {
  const [search, setSearch] = useState("");
  const [guests, setGuests] = useState(1);
  const [priceMax, setPriceMax] = useState(2000);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState("rating");
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  // Carrega imóveis da API com debounce nos filtros
  useEffect(() => {
    const t = setTimeout(() => {
      const qs = new URLSearchParams();
      if (search) qs.set("search", search);
      if (guests > 1) qs.set("guests", String(guests));
      if (priceMax < 2000) qs.set("priceMax", String(priceMax));
      qs.set("sortBy", sortBy);
      setLoading(true);
      fetch(`/api/properties?${qs}`)
        .then(r => r.json())
        .then(d => setProperties(d.properties ?? []))
        .catch(() => setProperties([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [search, guests, priceMax, sortBy]);

  const toggleAmenity = (a: string) =>
    setSelectedAmenities((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);

  // Filtros server-side já aplicados pela API; aqui filtramos apenas amenities
  const filtered = properties.filter((p) => {
    if (selectedAmenities.length === 0) return true;
    const propAmenities = p.amenities?.map(a => a.name) ?? [];
    return selectedAmenities.every(a => propAmenities.includes(a));
  });

  return (
    <div style={{ background: "#0d0d0d", minHeight: "100vh" }}>
      <Navbar />

      {/* Search bar */}
      <div style={{ paddingTop: 80, background: "#0a0a0a", borderBottom: "1px solid #1a1a1a" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 24px" }}>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
              <svg
                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#666" }}
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cidade, bairro ou nome..."
                style={{
                  width: "100%",
                  padding: "11px 14px 11px 38px",
                  background: "#111",
                  border: "1px solid #222",
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "#cc0000")}
                onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "#222")}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#111", border: "1px solid #222", borderRadius: 8, padding: "0 14px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
              <select
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                style={{ background: "transparent", border: "none", color: "#ccc", fontSize: 14, padding: "11px 0", outline: "none", cursor: "pointer" }}
              >
                {[1,2,3,4,5,6,8,10,12].map((n) => (
                  <option key={n} value={n} style={{ background: "#111" }}>{n} hóspede{n > 1 ? "s" : ""}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setFilterOpen(!filterOpen)}
              style={{
                padding: "11px 16px",
                background: filterOpen ? "rgba(204,0,0,0.1)" : "#111",
                border: `1px solid ${filterOpen ? "#cc0000" : "#222"}`,
                borderRadius: 8,
                color: "#ccc",
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
              </svg>
              Filtros
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: "11px 14px",
                background: "#111",
                border: "1px solid #222",
                borderRadius: 8,
                color: "#ccc",
                fontSize: 14,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="rating" style={{ background: "#111" }}>Mais avaliados</option>
              <option value="price_asc" style={{ background: "#111" }}>Menor preço</option>
              <option value="price_desc" style={{ background: "#111" }}>Maior preço</option>
            </select>
          </div>

          {/* Filter panel */}
          {filterOpen && (
            <div
              style={{
                marginTop: 16,
                padding: "20px",
                background: "#111",
                border: "1px solid #222",
                borderRadius: 10,
              }}
            >
              <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
                <div>
                  <label style={{ fontSize: 13, color: "#aaa", fontWeight: 600, display: "block", marginBottom: 12 }}>
                    Preço máximo: <span style={{ color: "#cc0000" }}>R$ {priceMax}</span>
                  </label>
                  <input
                    type="range"
                    min={100}
                    max={2000}
                    step={50}
                    value={priceMax}
                    onChange={(e) => setPriceMax(Number(e.target.value))}
                    style={{ accentColor: "#cc0000", width: 200 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: "#aaa", fontWeight: 600, display: "block", marginBottom: 12 }}>Comodidades</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {amenityOptions.map((a) => (
                      <button
                        key={a}
                        onClick={() => toggleAmenity(a)}
                        style={{
                          padding: "6px 12px",
                          background: selectedAmenities.includes(a) ? "rgba(204,0,0,0.15)" : "#0d0d0d",
                          border: `1px solid ${selectedAmenities.includes(a) ? "#cc0000" : "#2a2a2a"}`,
                          borderRadius: 6,
                          color: selectedAmenities.includes(a) ? "#fff" : "#888",
                          fontSize: 13,
                          cursor: "pointer",
                        }}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        <p style={{ color: "#666", fontSize: 14, marginBottom: 24 }}>
          {loading ? "Carregando..." : `${filtered.length} imóvel${filtered.length !== 1 ? "is" : ""} encontrado${filtered.length !== 1 ? "s" : ""}`}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 24,
          }}
        >
          {filtered.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
            <p style={{ color: "#666", fontSize: 16 }}>Nenhum imóvel encontrado com esses filtros.</p>
            <button
              onClick={() => { setSearch(""); setGuests(1); setPriceMax(2000); setSelectedAmenities([]); }}
              style={{ marginTop: 16, padding: "10px 24px", background: "#cc0000", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14 }}
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PropertyCard({ property: p }: { property: Property }) {
  const [hover, setHover] = useState(false);

  return (
    <Link
      href={`/imoveis/${p.id}`}
      style={{ textDecoration: "none", display: "block" }}
    >
      <div
        style={{
          background: "#111",
          border: `1px solid ${hover ? "#cc000050" : "#1e1e1e"}`,
          borderRadius: 14,
          overflow: "hidden",
          transition: "border-color 0.2s, transform 0.2s",
          transform: hover ? "translateY(-3px)" : "none",
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {/* Image */}
        <div
          style={{
            height: 200,
            background: "linear-gradient(135deg, #1a0000 0%, #111 50%, #0d0d1a 100%)",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(204,0,0,0.08) 0%, transparent 70%)" }} />
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" style={{ position: "relative", zIndex: 1 }}>
            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
            <path d="M9 21V12h6v9"/>
          </svg>
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              padding: "4px 8px",
              background: "rgba(0,0,0,0.7)",
              borderRadius: 6,
              fontSize: 12,
              color: "#ccc",
            }}
          >
            {p.type}
          </div>
          {p.allowPets && (
            <div
              style={{
                position: "absolute",
                top: 10,
                left: 10,
                padding: "4px 8px",
                background: "rgba(204,0,0,0.8)",
                borderRadius: 6,
                fontSize: 11,
                color: "#fff",
                fontWeight: 600,
              }}
            >
              🐾 Pet friendly
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", lineHeight: 1.3, flex: 1, marginRight: 8 }}>
              {p.title}
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <span style={{ color: "#cc0000", fontSize: 14 }}>★</span>
              <span style={{ fontSize: 13, color: "#ccc", fontWeight: 600 }}>{p.rating.toFixed(1)}</span>
              <span style={{ fontSize: 12, color: "#555" }}>({p.totalReviews})</span>
            </div>
          </div>

          <p style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
            {p.city}, {p.state}
          </p>

          <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#555", marginBottom: 14 }}>
            <span>{p.bedrooms} quarto{p.bedrooms > 1 ? "s" : ""}</span>
            <span>·</span>
            <span>{p.bathrooms} banheiro{p.bathrooms > 1 ? "s" : ""}</span>
            <span>·</span>
            <span>até {p.maxGuests} hóspedes</span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {(p.amenities ?? []).slice(0, 3).map((a: { name: string }) => (
              <span key={a.name} style={{ padding: "3px 8px", background: "#0d0d0d", border: "1px solid #222", borderRadius: 4, fontSize: 11, color: "#888" }}>
                {a.name}
              </span>
            ))}
            {(p.amenities ?? []).length > 3 && (
              <span style={{ padding: "3px 8px", background: "#0d0d0d", border: "1px solid #222", borderRadius: 4, fontSize: 11, color: "#666" }}>
                +{(p.amenities ?? []).length - 3}
              </span>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#cc0000" }}>
                R$ {p.pricePerNight.toLocaleString("pt-BR")}
              </span>
              <span style={{ fontSize: 13, color: "#666" }}>/noite</span>
            </div>
            <div
              style={{
                padding: "7px 14px",
                background: "#cc0000",
                color: "#fff",
                borderRadius: 7,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Ver detalhes
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

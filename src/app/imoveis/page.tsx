"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Building2, LockKeyhole, Search, SlidersHorizontal, Star } from "lucide-react";

const amenityOptions = ["Wi-Fi", "Garagem privativa", "Entrada privativa", "Ar-condicionado", "Espelho", "Portaria discreta", "Uso profissional", "Privacidade acustica"];

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

  // Carrega quartos/espaços da API com debounce nos filtros
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
    <div style={{ background: "#050505", minHeight: "100vh", color: "#f4f1ea" }}>
      <Navbar />

      {/* Search bar */}
      <div style={{ paddingTop: 80, background: "#070707", borderBottom: "1px solid rgba(212,168,67,0.14)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 24px" }}>
          <div style={{ marginBottom: 18 }}>
            <p style={{ margin: "0 0 8px", color: "#d4a843", fontSize: 11, fontWeight: 900, letterSpacing: 2.4, textTransform: "uppercase" }}>Espaços para profissionais</p>
            <h1 style={{ margin: 0, color: "#f4f1ea", fontFamily: "var(--font-playfair), serif", fontSize: "clamp(26px, 4vw, 42px)", lineHeight: 1.05 }}>
              Ambientes discretos para atendimento reservado
            </h1>
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
              <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#8d8578" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cidade, bairro ou ambiente reservado..."
                style={{
                  width: "100%",
                  padding: "11px 14px 11px 38px",
                  background: "#111",
                  border: "1px solid #2a2620",
                  borderRadius: 8,
                  color: "#f4f1ea",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "#d4a843")}
                onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "#2a2620")}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#111", border: "1px solid #2a2620", borderRadius: 8, padding: "0 14px" }}>
              <LockKeyhole size={16} color="#8d8578" />
              <select
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                style={{ background: "transparent", border: "none", color: "#cfc8ba", fontSize: 14, padding: "11px 0", outline: "none", cursor: "pointer" }}
              >
                {[1,2,3,4,5,6,8,10,12].map((n) => (
                  <option key={n} value={n} style={{ background: "#111" }}>até {n} pessoa{n > 1 ? "s" : ""}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setFilterOpen(!filterOpen)}
              style={{
                padding: "11px 16px",
                background: filterOpen ? "rgba(212,168,67,0.12)" : "#111",
                border: `1px solid ${filterOpen ? "#d4a843" : "#2a2620"}`,
                borderRadius: 8,
                color: "#cfc8ba",
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <SlidersHorizontal size={16} />
              Filtros
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: "11px 14px",
                background: "#111",
                border: "1px solid #2a2620",
                borderRadius: 8,
                color: "#cfc8ba",
                fontSize: 14,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="rating" style={{ background: "#111" }}>Mais confiaveis</option>
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
                border: "1px solid #2a2620",
                borderRadius: 10,
              }}
            >
              <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
                <div>
                  <label style={{ fontSize: 13, color: "#aaa", fontWeight: 600, display: "block", marginBottom: 12 }}>
                    Valor maximo: <span style={{ color: "#d4a843" }}>R$ {priceMax}</span>
                  </label>
                  <input
                    type="range"
                    min={100}
                    max={2000}
                    step={50}
                    value={priceMax}
                    onChange={(e) => setPriceMax(Number(e.target.value))}
                    style={{ accentColor: "#d4a843", width: 200 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: "#aaa", fontWeight: 600, display: "block", marginBottom: 12 }}>Estrutura</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {amenityOptions.map((a) => (
                      <button
                        key={a}
                        onClick={() => toggleAmenity(a)}
                        style={{
                          padding: "6px 12px",
                          background: selectedAmenities.includes(a) ? "rgba(212,168,67,0.14)" : "#0a0a0a",
                          border: `1px solid ${selectedAmenities.includes(a) ? "#d4a843" : "#2a2620"}`,
                          borderRadius: 6,
                          color: selectedAmenities.includes(a) ? "#f4f1ea" : "#8d8578",
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
        <p style={{ color: "#8d8578", fontSize: 14, marginBottom: 24 }}>
          {loading ? "Carregando..." : `${filtered.length} espaço${filtered.length !== 1 ? "s" : ""} reservado${filtered.length !== 1 ? "s" : ""} encontrado${filtered.length !== 1 ? "s" : ""}`}
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
            <p style={{ color: "#666", fontSize: 16 }}>Nenhum quarto encontrado com esses filtros.</p>
            <button
              onClick={() => { setSearch(""); setGuests(1); setPriceMax(2000); setSelectedAmenities([]); }}
              style={{ marginTop: 16, padding: "10px 24px", background: "#d4a843", color: "#080704", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 800 }}
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
          border: `1px solid ${hover ? "rgba(212,168,67,0.34)" : "#2a2620"}`,
          borderRadius: 12,
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
            background: "linear-gradient(135deg, #181613 0%, #101010 55%, #050505 100%)",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(212,168,67,0.10) 0%, transparent 70%)" }} />
          <Building2 size={44} color="#4a4030" strokeWidth={1.3} style={{ position: "relative", zIndex: 1 }} />
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              padding: "4px 8px",
              background: "rgba(0,0,0,0.72)",
              border: "1px solid rgba(212,168,67,0.18)",
              borderRadius: 999,
              fontSize: 12,
              color: "#d4a843",
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
                background: "rgba(212,168,67,0.14)",
                border: "1px solid rgba(212,168,67,0.28)",
                borderRadius: 999,
                fontSize: 11,
                color: "#f5d78c",
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
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#f4f1ea", lineHeight: 1.3, flex: 1, marginRight: 8 }}>
              {p.title}
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <Star size={13} fill="#d4a843" color="#d4a843" />
              <span style={{ fontSize: 13, color: "#d4a843", fontWeight: 700 }}>{p.rating.toFixed(1)}</span>
              <span style={{ fontSize: 12, color: "#615b52" }}>({p.totalReviews})</span>
            </div>
          </div>

          <p style={{ fontSize: 13, color: "#8d8578", marginBottom: 12 }}>
            {p.city}, {p.state}
          </p>

          <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#8d8578", marginBottom: 14 }}>
            <span>{p.bedrooms} quarto{p.bedrooms > 1 ? "s" : ""}</span>
            <span>·</span>
            <span>{p.bathrooms} banheiro{p.bathrooms > 1 ? "s" : ""}</span>
            <span>·</span>
            <span>uso profissional</span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {(p.amenities ?? []).slice(0, 3).map((a: { name: string }) => (
              <span key={a.name} style={{ padding: "3px 8px", background: "#0a0a0a", border: "1px solid rgba(212,168,67,0.14)", borderRadius: 999, fontSize: 11, color: "#b8b1a6" }}>
                {a.name}
              </span>
            ))}
            {(p.amenities ?? []).length > 3 && (
              <span style={{ padding: "3px 8px", background: "#0a0a0a", border: "1px solid rgba(212,168,67,0.14)", borderRadius: 999, fontSize: 11, color: "#8d8578" }}>
                +{(p.amenities ?? []).length - 3}
              </span>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#d4a843" }}>
                R$ {p.pricePerNight.toLocaleString("pt-BR")}
              </span>
              <span style={{ fontSize: 13, color: "#8d8578" }}>/período</span>
            </div>
            <div
              style={{
                padding: "7px 14px",
                background: "linear-gradient(135deg, #f5d78c, #d4a843)",
                color: "#080704",
                borderRadius: 7,
                fontSize: 13,
                fontWeight: 800,
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

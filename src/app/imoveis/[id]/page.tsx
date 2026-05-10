"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

const amenityIcons: Record<string, string> = {
  "Wi-Fi": "📶",
  "Piscina": "🏊",
  "Pet Friendly": "🐾",
  "Estacionamento": "🚗",
  "Ar-condicionado": "❄️",
  "Cozinha": "🍳",
  "Churrasqueira": "🔥",
  "Academia": "💪",
  "TV": "📺",
  "Lavanderia": "👕",
};

const mockProperty = {
  id: "1",
  title: "Cobertura de Luxo com Vista Panorâmica",
  city: "São Paulo",
  state: "SP",
  address: "Jardins, São Paulo - SP",
  type: "Cobertura",
  description: `Uma experiência única no coração de São Paulo. Esta deslumbrante cobertura oferece uma vista panorâmica de 360° da cidade, combinando design moderno com todo o conforto que você merece.

Com acabamentos de alto padrão, cozinha gourmet totalmente equipada e área de lazer privativa, é o espaço perfeito para casais, famílias ou grupos que buscam o melhor da cidade.

A localização privilegiada no bairro dos Jardins coloca você a poucos minutos dos melhores restaurantes, boutiques e pontos turísticos de São Paulo.`,
  pricePerNight: 850,
  cleaningFee: 150,
  serviceFee: 80,
  maxGuests: 6,
  bedrooms: 3,
  beds: 4,
  bathrooms: 2,
  checkInTime: "14:00",
  checkOutTime: "12:00",
  minNights: 2,
  rating: 4.9,
  totalReviews: 42,
  allowPets: false,
  allowSmoking: false,
  allowParties: false,
  instantBook: true,
  amenities: ["Wi-Fi", "Piscina", "Ar-condicionado", "Cozinha", "Estacionamento", "TV", "Lavanderia"],
  host: {
    name: "Carlos Mendes",
    image: null,
    rating: 4.9,
    totalReviews: 87,
    verified: true,
    memberSince: "2022",
  },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} style={{ color: n <= Math.round(rating) ? "#cc0000" : "#333", fontSize: 16 }}>★</span>
      ))}
    </div>
  );
}

function BookingCard({ property }: { property: typeof mockProperty }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);

  const nights = checkIn && checkOut
    ? Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
    : 0;
  const subtotal = nights * property.pricePerNight;
  const total = subtotal + (nights > 0 ? property.cleaningFee + property.serviceFee : 0);

  function handleReserve() {
    if (!session) {
      router.push("/login");
      return;
    }
    if (!checkIn || !checkOut || nights < property.minNights) return;
    router.push(`/imoveis/${property.id}/reservar?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`);
  }

  return (
    <div
      style={{
        background: "#111",
        border: "1px solid #222",
        borderRadius: 14,
        padding: "24px",
        position: "sticky",
        top: 90,
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: "#cc0000" }}>
          R$ {property.pricePerNight.toLocaleString("pt-BR")}
        </span>
        <span style={{ color: "#666", fontSize: 14 }}>/noite</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
          <span style={{ color: "#cc0000" }}>★</span>
          <span style={{ color: "#ccc", fontSize: 13, fontWeight: 600 }}>{property.rating}</span>
          <span style={{ color: "#555", fontSize: 13 }}>· {property.totalReviews} avaliações</span>
        </div>
      </div>

      {/* Date inputs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div>
          <label style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>Check-in</label>
          <input
            type="date"
            value={checkIn}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setCheckIn(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 8, color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box", colorScheme: "dark" }}
            onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "#cc0000")}
            onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "#2a2a2a")}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>Check-out</label>
          <input
            type="date"
            value={checkOut}
            min={checkIn || new Date().toISOString().split("T")[0]}
            onChange={(e) => setCheckOut(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 8, color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box", colorScheme: "dark" }}
            onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "#cc0000")}
            onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "#2a2a2a")}
          />
        </div>
      </div>

      {/* Guests */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>Hóspedes</label>
        <select
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
          style={{ width: "100%", padding: "10px 12px", background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 8, color: "#fff", fontSize: 13, outline: "none" }}
        >
          {Array.from({ length: property.maxGuests }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n} style={{ background: "#111" }}>{n} hóspede{n > 1 ? "s" : ""}</option>
          ))}
        </select>
      </div>

      {/* Price breakdown */}
      {nights > 0 && (
        <div style={{ marginBottom: 16, padding: "14px", background: "#0d0d0d", borderRadius: 8, border: "1px solid #1a1a1a" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#888", marginBottom: 8 }}>
            <span>R$ {property.pricePerNight.toLocaleString("pt-BR")} × {nights} noite{nights > 1 ? "s" : ""}</span>
            <span style={{ color: "#ccc" }}>R$ {subtotal.toLocaleString("pt-BR")}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#888", marginBottom: 8 }}>
            <span>Taxa de limpeza</span>
            <span style={{ color: "#ccc" }}>R$ {property.cleaningFee.toLocaleString("pt-BR")}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#888", marginBottom: 12 }}>
            <span>Taxa de serviço</span>
            <span style={{ color: "#ccc" }}>R$ {property.serviceFee.toLocaleString("pt-BR")}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, color: "#fff", borderTop: "1px solid #222", paddingTop: 12 }}>
            <span>Total</span>
            <span style={{ color: "#cc0000" }}>R$ {total.toLocaleString("pt-BR")}</span>
          </div>
        </div>
      )}

      {nights > 0 && nights < property.minNights && (
        <p style={{ fontSize: 12, color: "#cc4444", marginBottom: 12 }}>
          Mínimo de {property.minNights} noites para este imóvel.
        </p>
      )}

      <button
        onClick={handleReserve}
        disabled={!checkIn || !checkOut || nights < property.minNights}
        style={{
          width: "100%",
          padding: "14px",
          background: (!checkIn || !checkOut || nights < property.minNights) ? "#444" : "#cc0000",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontSize: 15,
          fontWeight: 700,
          cursor: (!checkIn || !checkOut || nights < property.minNights) ? "not-allowed" : "pointer",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => { if (checkIn && checkOut && nights >= property.minNights) (e.currentTarget as HTMLElement).style.background = "#e00000"; }}
        onMouseLeave={(e) => { if (checkIn && checkOut && nights >= property.minNights) (e.currentTarget as HTMLElement).style.background = "#cc0000"; }}
      >
        {property.instantBook ? "Reservar agora" : "Solicitar reserva"}
      </button>

      {property.instantBook && (
        <p style={{ textAlign: "center", fontSize: 12, color: "#666", marginTop: 10 }}>
          ⚡ Confirmação instantânea — sem espera
        </p>
      )}
    </div>
  );
}

export default function PropertyDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? "");
  const [fetched, setFetched] = useState<typeof mockProperty | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/properties/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        // Adapta dados do backend (amenities/photos vêm em arrays de objetos)
        setFetched({
          ...mockProperty,
          ...d,
          amenities: (d.amenities ?? []).map((a: any) => a.name),
          host: d.host ?? mockProperty.host,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const p = fetched ?? mockProperty;

  if (loading && !fetched) {
    return (
      <div style={{ background: "#0d0d0d", minHeight: "100vh" }}>
        <Navbar />
        <div style={{ color: "#94a3b8", padding: "120px 24px", textAlign: "center" }}>Carregando imóvel...</div>
      </div>
    );
  }

  return (
    <div style={{ background: "#0d0d0d", minHeight: "100vh" }}>
      <Navbar />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "96px 24px 60px" }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", gap: 8, fontSize: 13, color: "#666", marginBottom: 20, alignItems: "center" }}>
          <Link href="/imoveis" style={{ color: "#cc0000", textDecoration: "none" }}>Imóveis</Link>
          <span>›</span>
          <span>{p.city}, {p.state}</span>
          <span>›</span>
          <span style={{ color: "#aaa" }}>{p.title}</span>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: "clamp(22px, 3vw, 36px)", fontWeight: 800, color: "#fff", marginBottom: 12 }}>
          {p.title}
        </h1>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#cc0000" }}>★</span>
            <span style={{ color: "#fff", fontWeight: 700 }}>{p.rating}</span>
            <span style={{ color: "#666" }}>· {p.totalReviews} avaliações</span>
          </div>
          <span style={{ color: "#333" }}>·</span>
          <span style={{ color: "#666" }}>{p.address}</span>
          {p.instantBook && (
            <span style={{ padding: "3px 10px", background: "rgba(204,0,0,0.1)", border: "1px solid rgba(204,0,0,0.3)", borderRadius: 20, fontSize: 12, color: "#cc0000" }}>
              ⚡ Reserva instantânea
            </span>
          )}
        </div>

        {/* Photo gallery placeholder */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr",
            gridTemplateRows: "200px 200px",
            gap: 8,
            marginBottom: 40,
            borderRadius: 14,
            overflow: "hidden",
          }}
          className="photo-grid"
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                background: `linear-gradient(${135 + i * 30}deg, #1a0000 0%, #111 50%, #0d0d1a 100%)`,
                gridRow: i === 0 ? "1 / 3" : undefined,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              {i === 4 && (
                <div style={{ position: "absolute", bottom: 10, right: 10, padding: "4px 12px", background: "rgba(0,0,0,0.8)", borderRadius: 6, fontSize: 12, color: "#ccc", cursor: "pointer" }}>
                  Ver todas as fotos
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Content grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 48 }} className="detail-grid">
          {/* Left */}
          <div>
            {/* Host + specs */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 28, borderBottom: "1px solid #1a1a1a", marginBottom: 28 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
                  {p.type} em {p.city}
                </h2>
                <div style={{ display: "flex", gap: 12, fontSize: 14, color: "#888" }}>
                  <span>{p.maxGuests} hóspedes</span>
                  <span>·</span>
                  <span>{p.bedrooms} quarto{p.bedrooms > 1 ? "s" : ""}</span>
                  <span>·</span>
                  <span>{p.beds} cama{p.beds > 1 ? "s" : ""}</span>
                  <span>·</span>
                  <span>{p.bathrooms} banheiro{p.bathrooms > 1 ? "s" : ""}</span>
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    background: "#cc0000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    fontWeight: 800,
                    color: "#fff",
                    margin: "0 auto 4px",
                  }}
                >
                  {p.host.name[0]}
                </div>
                <div style={{ fontSize: 12, color: "#666" }}>Anfitrião</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#ccc" }}>{p.host.name}</div>
              </div>
            </div>

            {/* Highlights */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 28, borderBottom: "1px solid #1a1a1a", marginBottom: 28 }}>
              {[
                { icon: "⚡", title: "Reserva instantânea", desc: "Confirme sua reserva sem esperar aprovação." },
                { icon: "📅", title: `Check-in às ${p.checkInTime} · Check-out às ${p.checkOutTime}`, desc: `Mínimo de ${p.minNights} noites.` },
                { icon: "🔒", title: "Segurança e privacidade", desc: "Plataforma verificada com proteção total de dados." },
              ].map((h, i) => (
                <div key={i} style={{ display: "flex", gap: 14 }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{h.icon}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 2 }}>{h.title}</div>
                    <div style={{ fontSize: 13, color: "#666" }}>{h.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Description */}
            <div style={{ paddingBottom: 28, borderBottom: "1px solid #1a1a1a", marginBottom: 28 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 14 }}>Sobre o imóvel</h3>
              <p style={{ color: "#888", fontSize: 15, lineHeight: 1.8, whiteSpace: "pre-line" }}>{p.description}</p>
            </div>

            {/* Amenities */}
            <div style={{ paddingBottom: 28, borderBottom: "1px solid #1a1a1a", marginBottom: 28 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 18 }}>O que este lugar oferece</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {p.amenities.map((a) => (
                  <div key={a} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#ccc" }}>
                    <span style={{ fontSize: 18 }}>{amenityIcons[a] ?? "✓"}</span>
                    {a}
                  </div>
                ))}
              </div>
            </div>

            {/* Rules */}
            <div style={{ paddingBottom: 28, borderBottom: "1px solid #1a1a1a", marginBottom: 28 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 14 }}>Regras da casa</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "Pets permitidos", value: p.allowPets },
                  { label: "Fumar permitido", value: p.allowSmoking },
                  { label: "Festas permitidas", value: p.allowParties },
                ].map((r) => (
                  <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                    <span style={{ color: "#888" }}>{r.label}</span>
                    <span style={{ color: r.value ? "#66cc66" : "#cc4444", fontWeight: 600 }}>
                      {r.value ? "✓ Sim" : "✗ Não"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Rating breakdown */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <span style={{ fontSize: 36, fontWeight: 800, color: "#fff" }}>{p.rating}</span>
                <div>
                  <StarRating rating={p.rating} />
                  <span style={{ color: "#666", fontSize: 13 }}>{p.totalReviews} avaliações</span>
                </div>
              </div>
              {[
                { label: "Limpeza", value: 4.9 },
                { label: "Precisão", value: 4.8 },
                { label: "Comunicação", value: 5.0 },
                { label: "Localização", value: 4.9 },
                { label: "Check-in", value: 4.8 },
                { label: "Custo-benefício", value: 4.7 },
              ].map((r) => (
                <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: "#888", width: 120, flexShrink: 0 }}>{r.label}</span>
                  <div style={{ flex: 1, height: 4, background: "#222", borderRadius: 2 }}>
                    <div style={{ width: `${(r.value / 5) * 100}%`, height: "100%", background: "#cc0000", borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 13, color: "#ccc", width: 30, textAlign: "right" }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right - Booking card */}
          <div>
            <BookingCard property={p} />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .detail-grid { grid-template-columns: 1fr !important; }
          .photo-grid { grid-template-columns: 1fr 1fr !important; grid-template-rows: 160px 160px !important; }
          .photo-grid > *:first-child { grid-row: 1 !important; }
        }
        @media (max-width: 600px) {
          .photo-grid { grid-template-columns: 1fr !important; height: 220px !important; }
          .photo-grid > *:not(:first-child) { display: none !important; }
        }
      `}</style>
    </div>
  );
}

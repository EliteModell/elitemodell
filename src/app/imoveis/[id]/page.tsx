"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Star } from "lucide-react";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

const GOLD = "#d4a843";
const GOLD_SOFT = "#f5d78c";
const INK = "#050505";
const PANEL = "#111";
const LINE = "#2a2620";
const MUTED = "#8d8578";
const TEXT = "#f4f1ea";

type PropertyDetail = {
  id: string;
  title: string;
  description: string;
  type: string;
  address: string;
  bairro?: string | null;
  city: string;
  state: string;
  pricePerNight: number;
  cleaningFee: number;
  serviceFee: number;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  checkInTime: string;
  checkOutTime: string;
  minNights: number;
  instantBook: boolean;
  allowPets: boolean;
  allowSmoking: boolean;
  allowParties: boolean;
  rating: number;
  totalReviews: number;
  photos: { id: string; url: string; caption?: string | null }[];
  amenities: { id: string; name: string }[];
  host: { name: string | null; image: string | null; createdAt: string };
  reviews: {
    rating: number;
    cleanliness: number;
    accuracy: number;
    checkin: number;
    communication: number;
    location: number;
    value: number;
  }[];
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={15} fill={n <= Math.round(rating) ? GOLD : "transparent"} color={n <= Math.round(rating) ? GOLD : "#3a3328"} />
      ))}
    </div>
  );
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function BookingCard({ property }: { property: PropertyDetail }) {
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
      router.push(ACCOUNT_ROUTES.login);
      return;
    }
    if (!checkIn || !checkOut || nights < property.minNights) return;
    router.push(`/imoveis/${property.id}/reservar?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`);
  }

  return (
    <div
      style={{
        background: PANEL,
        border: `1px solid ${LINE}`,
        borderRadius: 14,
        padding: "24px",
        position: "sticky",
        top: 90,
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: GOLD }}>
          R$ {property.pricePerNight.toLocaleString("pt-BR")}
        </span>
        <span style={{ color: MUTED, fontSize: 14 }}>/periodo</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
          <Star size={14} fill={GOLD} color={GOLD} />
          <span style={{ color: "#ccc", fontSize: 13, fontWeight: 600 }}>{property.rating.toFixed(1)}</span>
          <span style={{ color: "#555", fontSize: 13 }}>- {property.totalReviews} avaliacoes</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div>
          <label style={{ fontSize: 11, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>Inicio</label>
          <input
            type="date"
            value={checkIn}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setCheckIn(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", background: INK, border: `1px solid ${LINE}`, borderRadius: 8, color: TEXT, fontSize: 13, outline: "none", boxSizing: "border-box", colorScheme: "dark" }}
            onFocus={(e) => ((e.target as HTMLElement).style.borderColor = GOLD)}
            onBlur={(e) => ((e.target as HTMLElement).style.borderColor = LINE)}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>Saida</label>
          <input
            type="date"
            value={checkOut}
            min={checkIn || new Date().toISOString().split("T")[0]}
            onChange={(e) => setCheckOut(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", background: INK, border: `1px solid ${LINE}`, borderRadius: 8, color: TEXT, fontSize: 13, outline: "none", boxSizing: "border-box", colorScheme: "dark" }}
            onFocus={(e) => ((e.target as HTMLElement).style.borderColor = GOLD)}
            onBlur={(e) => ((e.target as HTMLElement).style.borderColor = LINE)}
          />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>Pessoas</label>
        <select
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
          style={{ width: "100%", padding: "10px 12px", background: INK, border: `1px solid ${LINE}`, borderRadius: 8, color: TEXT, fontSize: 13, outline: "none" }}
        >
          {Array.from({ length: Math.max(1, property.maxGuests) }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n} style={{ background: "#111" }}>{n} pessoa{n > 1 ? "s" : ""}</option>
          ))}
        </select>
      </div>

      {nights > 0 && (
        <div style={{ marginBottom: 16, padding: "14px", background: INK, borderRadius: 8, border: `1px solid ${LINE}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#888", marginBottom: 8 }}>
            <span>R$ {property.pricePerNight.toLocaleString("pt-BR")} x {nights} periodo{nights > 1 ? "s" : ""}</span>
            <span style={{ color: "#ccc" }}>R$ {subtotal.toLocaleString("pt-BR")}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#888", marginBottom: 8 }}>
            <span>Taxa de limpeza</span>
            <span style={{ color: "#ccc" }}>R$ {property.cleaningFee.toLocaleString("pt-BR")}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#888", marginBottom: 12 }}>
            <span>Taxa de servico</span>
            <span style={{ color: "#ccc" }}>R$ {property.serviceFee.toLocaleString("pt-BR")}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, color: TEXT, borderTop: `1px solid ${LINE}`, paddingTop: 12 }}>
            <span>Total</span>
            <span style={{ color: GOLD }}>R$ {total.toLocaleString("pt-BR")}</span>
          </div>
        </div>
      )}

      {nights > 0 && nights < property.minNights && (
        <p style={{ fontSize: 12, color: "#cc4444", marginBottom: 12 }}>
          Minimo de {property.minNights} periodo para este espaco.
        </p>
      )}

      <button
        onClick={handleReserve}
        disabled={!checkIn || !checkOut || nights < property.minNights}
        style={{
          width: "100%",
          padding: "14px",
          background: (!checkIn || !checkOut || nights < property.minNights) ? "#2a2620" : "linear-gradient(135deg, #f5d78c, #d4a843)",
          color: (!checkIn || !checkOut || nights < property.minNights) ? "#8d8578" : "#080704",
          border: "none",
          borderRadius: 8,
          fontSize: 15,
          fontWeight: 700,
          cursor: (!checkIn || !checkOut || nights < property.minNights) ? "not-allowed" : "pointer",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => { if (checkIn && checkOut && nights >= property.minNights) (e.currentTarget as HTMLElement).style.background = GOLD_SOFT; }}
        onMouseLeave={(e) => { if (checkIn && checkOut && nights >= property.minNights) (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, #f5d78c, #d4a843)"; }}
      >
        {property.instantBook ? "Reservar ambiente" : "Solicitar reserva"}
      </button>

      {property.instantBook && (
        <p style={{ textAlign: "center", fontSize: 12, color: "#666", marginTop: 10 }}>
          Confirmacao instantanea
        </p>
      )}
    </div>
  );
}

function PhotoGallery({ photos }: { photos: PropertyDetail["photos"] }) {
  const visible = photos.slice(0, 5);
  if (visible.length === 0) {
    return (
      <div style={{ height: 340, borderRadius: 14, marginBottom: 40, background: "linear-gradient(135deg, #181613 0%, #111 55%, #050505 100%)", border: `1px solid ${LINE}`, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED }}>
        Nenhuma foto publicada para este ambiente.
      </div>
    );
  }

  return (
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
      {visible.map((photo, i) => (
        <div
          key={photo.id ?? photo.url}
          style={{
            gridRow: i === 0 ? "1 / 3" : undefined,
            position: "relative",
            background: "#111",
            minHeight: 0,
          }}
        >
          <Image
            src={photo.url}
            alt={photo.caption ?? ""}
            fill
            sizes={i === 0 ? "(max-width: 900px) 100vw, 600px" : "(max-width: 900px) 50vw, 300px"}
            quality={70}
            style={{ objectFit: "cover" }}
          />
          {i === 4 && photos.length > 5 && (
            <div style={{ position: "absolute", bottom: 10, right: 10, padding: "4px 12px", background: "rgba(0,0,0,0.82)", border: `1px solid ${LINE}`, borderRadius: 8, fontSize: 12, color: "#cfc8ba" }}>
              +{photos.length - 5} fotos
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function PropertyDetailPage() {
  const params = useParams();
  const { data: session, status } = useSession();
  const id = String(params?.id ?? "");
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const canSeeLocations =
    session?.user?.role === "ADMIN" ||
    session?.user?.accountType === "model" ||
    session?.user?.accountType === "professional" ||
    session?.user?.isProfessional === true;
  const blockedByRole = status !== "loading" && !canSeeLocations;

  useEffect(() => {
    if (status === "loading") return;
    if (!canSeeLocations) {
      return;
    }

    const controller = new AbortController();
    async function loadProperty() {
      setLoading(true);
      setBlocked(false);
      setNotFound(false);
      try {
        const res = await fetch(`/api/properties/${id}`, { signal: controller.signal });
        if (res.status === 403) { setBlocked(true); return; }
        if (res.status === 404) { setNotFound(true); return; }
        if (!res.ok) throw new Error("Failed to load property");
        const data: PropertyDetail = await res.json();
        setProperty(data);
      } catch {
        if (!controller.signal.aborted) setNotFound(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadProperty();
    return () => controller.abort();
  }, [id, status, canSeeLocations]);

  const ratingBreakdown = useMemo(() => {
    const reviews = property?.reviews ?? [];
    return [
      { label: "Limpeza", value: average(reviews.map((r) => r.cleanliness)) },
      { label: "Precisao", value: average(reviews.map((r) => r.accuracy)) },
      { label: "Comunicacao", value: average(reviews.map((r) => r.communication)) },
      { label: "Localizacao", value: average(reviews.map((r) => r.location)) },
      { label: "Check-in", value: average(reviews.map((r) => r.checkin)) },
      { label: "Custo-beneficio", value: average(reviews.map((r) => r.value)) },
    ].filter((row) => row.value > 0);
  }, [property?.reviews]);

  if (blockedByRole || blocked) {
    return (
      <div style={{ background: INK, minHeight: "100vh" }}>
        <Navbar />
        <div style={{ color: MUTED, padding: "120px 24px", textAlign: "center" }}>
          Locais disponiveis apenas para profissionais aprovadas.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ background: INK, minHeight: "100vh" }}>
        <Navbar />
        <div style={{ color: MUTED, padding: "120px 24px", textAlign: "center" }}>Carregando ambiente...</div>
      </div>
    );
  }

  if (notFound || !property) {
    return (
      <div style={{ background: INK, minHeight: "100vh" }}>
        <Navbar />
        <div style={{ color: MUTED, padding: "120px 24px", textAlign: "center" }}>
          Ambiente nao encontrado.
        </div>
      </div>
    );
  }

  const p = property;
  const amenityNames = p.amenities.map((a) => a.name);
  const hostName = p.host.name ?? "Anunciante";
  const hostInitial = hostName[0]?.toUpperCase() ?? "A";

  return (
    <div style={{ background: INK, minHeight: "100vh", color: TEXT }}>
      <Navbar />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "96px 24px 60px" }}>
        <div style={{ display: "flex", gap: 8, fontSize: 13, color: MUTED, marginBottom: 20, alignItems: "center" }}>
          <Link href="/imoveis" style={{ color: GOLD, textDecoration: "none" }}>Espacos</Link>
          <span>/</span>
          <span>{p.city}, {p.state}</span>
          <span>/</span>
          <span style={{ color: "#cfc8ba" }}>{p.title}</span>
        </div>

        <h1 style={{ fontSize: "clamp(22px, 3vw, 36px)", fontWeight: 800, color: TEXT, marginBottom: 12, fontFamily: "var(--font-playfair), serif" }}>
          {p.title}
        </h1>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Star size={14} fill={GOLD} color={GOLD} />
            <span style={{ color: "#fff", fontWeight: 700 }}>{p.rating.toFixed(1)}</span>
            <span style={{ color: "#666" }}>- {p.totalReviews} avaliacoes</span>
          </div>
          <span style={{ color: "#333" }}>-</span>
          <span style={{ color: "#666" }}>{p.address}</span>
          {p.instantBook && (
            <span style={{ padding: "3px 10px", background: "rgba(212,168,67,0.12)", border: "1px solid rgba(212,168,67,0.28)", borderRadius: 20, fontSize: 12, color: GOLD, fontWeight: 800 }}>
              Reserva instantanea
            </span>
          )}
        </div>

        <PhotoGallery photos={p.photos} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 48 }} className="detail-grid">
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 28, borderBottom: `1px solid ${LINE}`, marginBottom: 28 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, marginBottom: 8 }}>
                  {p.type} em {p.city}
                </h2>
                <div style={{ display: "flex", gap: 12, fontSize: 14, color: MUTED, flexWrap: "wrap" }}>
                  <span>{p.maxGuests} pessoas</span>
                  <span>-</span>
                  <span>{p.bedrooms} quarto{p.bedrooms > 1 ? "s" : ""}</span>
                  <span>-</span>
                  <span>{p.beds} cama{p.beds > 1 ? "s" : ""}</span>
                  <span>-</span>
                  <span>{p.bathrooms} banheiro{p.bathrooms > 1 ? "s" : ""}</span>
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    background: "rgba(212,168,67,0.12)",
                    border: "1px solid rgba(212,168,67,0.28)",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    fontWeight: 800,
                    color: GOLD,
                    margin: "0 auto 4px",
                  }}
                >
                  {p.host.image ? <Image src={p.host.image} alt="" width={52} height={52} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : hostInitial}
                </div>
                <div style={{ fontSize: 12, color: MUTED }}>Anunciante</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#cfc8ba" }}>{hostName}</div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 28, borderBottom: `1px solid ${LINE}`, marginBottom: 28 }}>
              {[
                { title: p.instantBook ? "Reserva instantanea" : "Solicitacao com aprovacao", desc: p.instantBook ? "Confirme sua reserva sem esperar aprovacao." : "O anfitriao confirma a disponibilidade antes da reserva." },
                { title: `Disponivel a partir de ${p.checkInTime}`, desc: `Uso minimo de ${p.minNights} periodo.` },
                { title: "Seguranca e privacidade", desc: "Endereco visivel apenas para contas autorizadas pela plataforma." },
              ].map((h, i) => (
                <div key={i} style={{ display: "flex", gap: 14 }}>
                  <span style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(212,168,67,0.12)", border: `1px solid ${LINE}`, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 2 }}>{h.title}</div>
                    <div style={{ fontSize: 13, color: MUTED }}>{h.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ paddingBottom: 28, borderBottom: `1px solid ${LINE}`, marginBottom: 28 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: TEXT, marginBottom: 14 }}>Sobre o ambiente</h3>
              <p style={{ color: "#b8b1a6", fontSize: 15, lineHeight: 1.8, whiteSpace: "pre-line" }}>{p.description}</p>
            </div>

            <div style={{ paddingBottom: 28, borderBottom: `1px solid ${LINE}`, marginBottom: 28 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: TEXT, marginBottom: 18 }}>Estrutura para atendimento</h3>
              {amenityNames.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {amenityNames.map((a) => (
                    <div key={a} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#cfc8ba" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: GOLD }} />
                      {a}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: MUTED }}>Nenhuma estrutura cadastrada.</p>
              )}
            </div>

            <div style={{ paddingBottom: 28, borderBottom: `1px solid ${LINE}`, marginBottom: 28 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: TEXT, marginBottom: 14 }}>Uso do espaco</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "Pets permitidos", value: p.allowPets },
                  { label: "Fumar permitido", value: p.allowSmoking },
                  { label: "Festas permitidas", value: p.allowParties },
                ].map((r) => (
                  <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                    <span style={{ color: MUTED }}>{r.label}</span>
                    <span style={{ color: r.value ? GOLD : "#8d8578", fontWeight: 600 }}>
                      {r.value ? "Sim" : "Nao"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <span style={{ fontSize: 36, fontWeight: 800, color: TEXT }}>{p.rating.toFixed(1)}</span>
                <div>
                  <StarRating rating={p.rating} />
                  <span style={{ color: "#666", fontSize: 13 }}>{p.totalReviews} avaliacoes</span>
                </div>
              </div>
              {ratingBreakdown.length > 0 ? ratingBreakdown.map((r) => (
                <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: MUTED, width: 120, flexShrink: 0 }}>{r.label}</span>
                  <div style={{ flex: 1, height: 4, background: "#24211d", borderRadius: 2 }}>
                    <div style={{ width: `${(r.value / 5) * 100}%`, height: "100%", background: `linear-gradient(90deg, ${GOLD}, ${GOLD_SOFT})`, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 13, color: "#cfc8ba", width: 34, textAlign: "right" }}>{r.value.toFixed(1)}</span>
                </div>
              )) : (
                <p style={{ color: MUTED, fontSize: 14 }}>Ainda sem avaliacoes detalhadas.</p>
              )}
            </div>
          </div>

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
          .photo-grid { grid-template-columns: 1fr !important; grid-template-rows: 220px !important; }
          .photo-grid > *:not(:first-child) { display: none !important; }
        }
      `}</style>
    </div>
  );
}

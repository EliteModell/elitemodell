import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireHostPanel } from "@/lib/account-access";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  DRAFT: "Rascunho",
  PENDING_REVIEW: "Pendente aprovação",
  ACTIVE: "Aprovado",
  INACTIVE: "Oculto/Suspenso",
  REJECTED: "Reprovado",
};

function label(value: string | null | undefined) {
  return value?.trim() || "Não informado";
}

function money(value: number | null | undefined) {
  return `R$ ${(value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ border: "1px solid #222", borderRadius: 12, background: "#111", padding: 18 }}>
      <h2 style={{ margin: "0 0 14px", color: "#fff", fontSize: 16, fontWeight: 850 }}>{title}</h2>
      {children}
    </section>
  );
}

function Info({ label: itemLabel, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, padding: 12, background: "rgba(255,255,255,.025)" }}>
      <p style={{ margin: "0 0 5px", color: "#d4a843", fontSize: 10, fontWeight: 900, letterSpacing: 1.2, textTransform: "uppercase" }}>{itemLabel}</p>
      <div style={{ color: "#eee", fontSize: 14, lineHeight: 1.45 }}>{value}</div>
    </div>
  );
}

export default async function ImovelAnfitriaoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const access = await requireHostPanel();
  const { id } = await params;
  const userId = access.user.id;

  const property = await prisma.property.findFirst({
    where: access.isAdmin ? { id } : { id, hostId: userId },
    include: {
      photos: { orderBy: { order: "asc" } },
      amenities: true,
      bookings: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { guest: { select: { name: true, email: true } } },
      },
    },
  });

  if (!property) notFound();

  const rules = [
    property.instantBook ? "Reserva instantânea permitida" : "Reserva instantânea desativada",
    property.allowPets ? "Aceita pets" : "Não aceita pets",
    property.allowSmoking ? "Permite fumar" : "Não permite fumar",
    property.allowParties ? "Permite festas/eventos" : "Não permite festas/eventos",
    `Check-in ${property.checkInTime}`,
    `Check-out ${property.checkOutTime}`,
    `Mínimo ${property.minNights} período(s)`,
    property.maxNights ? `Máximo ${property.maxNights} período(s)` : "Sem máximo definido",
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <Link href="/anfitriao/imoveis" style={{ color: "#d4a843", textDecoration: "none", fontSize: 13, fontWeight: 800 }}>← Voltar para meus espaços</Link>
          <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 850, margin: "10px 0 6px" }}>{property.title || "Imóvel sem título"}</h1>
          <p style={{ color: "#777", margin: 0 }}>Status do imóvel: {statusLabel[property.status] ?? property.status}</p>
        </div>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        <Section title="Fotos">
          {property.photos.length ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
              {property.photos.map((photo, index) => (
                <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" style={{ color: "#aaa", textDecoration: "none", fontSize: 12 }}>
                  <div style={{ aspectRatio: "4 / 3", borderRadius: 8, border: "1px solid #2a2620", background: `url(${photo.url}) center / cover` }} />
                  Foto {index + 1}
                </a>
              ))}
            </div>
          ) : (
            <p style={{ color: "#777", margin: 0 }}>Nenhuma foto cadastrada.</p>
          )}
        </Section>

        <Section title="Dados do espaço">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <Info label="Cidade/Bairro" value={`${label(property.city)} / ${label(property.bairro)}`} />
            <Info label="Estado" value={label(property.state)} />
            <Info label="Endereço interno" value={label(property.address)} />
            <Info label="Preço" value={`${money(property.pricePerNight)}/período`} />
            <Info label="Quartos" value={property.bedrooms} />
            <Info label="Banheiros" value={property.bathrooms} />
            <Info label="Camas" value={property.beds} />
            <Info label="Capacidade" value={`${property.maxGuests} pessoa(s)`} />
          </div>
          <div style={{ marginTop: 14 }}>
            <p style={{ color: "#d4a843", fontSize: 10, fontWeight: 900, letterSpacing: 1.2, textTransform: "uppercase", margin: "0 0 6px" }}>Descrição</p>
            <p style={{ color: "#ccc", margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.65 }}>{property.description || "Não informado"}</p>
          </div>
        </Section>

        <Section title="Comodidades e regras">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {property.amenities.length ? property.amenities.map((amenity) => (
              <span key={amenity.id} style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 999, padding: "6px 9px", color: "#e5e7eb", fontSize: 12 }}>{amenity.name}</span>
            )) : <span style={{ color: "#777" }}>Nenhuma comodidade cadastrada.</span>}
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, color: "#ccc", lineHeight: 1.8 }}>
            {rules.map((rule) => <li key={rule}>{rule}</li>)}
          </ul>
        </Section>

        <Section title="Reservas recentes">
          {property.bookings.length === 0 ? (
            <p style={{ color: "#777", margin: 0 }}>Nenhuma reserva encontrada ainda.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {property.bookings.map((booking) => (
                <div key={booking.id} style={{ border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, padding: 12 }}>
                  <strong style={{ color: "#fff" }}>{booking.guest.name ?? booking.guest.email ?? "Cliente"}</strong>
                  <p style={{ color: "#aaa", margin: "6px 0" }}>
                    {booking.checkIn.toLocaleDateString("pt-BR")} - {booking.checkOut.toLocaleDateString("pt-BR")} · {money(booking.totalPrice)}
                  </p>
                  <p style={{ color: "#d4a843", margin: 0, fontSize: 12 }}>{booking.status} / {booking.paymentStatus}</p>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

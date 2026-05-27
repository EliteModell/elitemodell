import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireHostPanel } from "@/lib/account-access";
import { pauseProperty, submitPropertyForReview } from "@/lib/host-property-actions";
import { PROPERTY_STATUS_DESCRIPTION, PROPERTY_STATUS_LABEL, propertyStatusTone } from "@/lib/property-status";

export const dynamic = "force-dynamic";

const GOLD = "#d4a843";

function label(value: string | null | undefined) {
  return value?.trim() || "Não informado";
}

function money(value: number | null | undefined) {
  return `R$ ${(value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

function statusColor(status: string) {
  const tone = propertyStatusTone(status);
  if (tone === "success") return "#22c55e";
  if (tone === "danger") return "#ef4444";
  if (tone === "paused") return "#60a5fa";
  if (tone === "warning") return GOLD;
  return "#94a3b8";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ border: "1px solid rgba(212,168,67,0.18)", borderRadius: 8, background: "rgba(255,255,255,0.035)", padding: 18 }}>
      <h2 style={{ margin: "0 0 14px", color: "#fff", fontSize: 17, fontWeight: 950 }}>{title}</h2>
      {children}
    </section>
  );
}

function Info({ label: itemLabel, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid rgba(212,168,67,0.14)", borderRadius: 8, padding: 12, background: "rgba(0,0,0,0.18)" }}>
      <p style={{ margin: "0 0 5px", color: GOLD, fontSize: 10, fontWeight: 950, letterSpacing: 1.2, textTransform: "uppercase" }}>{itemLabel}</p>
      <div style={{ color: "#f5f5f5", fontSize: 14, lineHeight: 1.45 }}>{value}</div>
    </div>
  );
}

function ActionButton({ children }: { children: React.ReactNode }) {
  return (
    <button style={{ minHeight: 42, borderRadius: 8, border: "1px solid rgba(212,168,67,0.28)", background: "rgba(212,168,67,0.10)", color: "#f5d78c", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "0 14px", fontWeight: 950, cursor: "pointer" }}>
      {children}
    </button>
  );
}

function IconMark({ children }: { children: React.ReactNode }) {
  return <span aria-hidden="true" style={{ fontSize: 15, fontWeight: 950, lineHeight: 1 }}>{children}</span>;
}

export default async function ImovelAnfitriaoDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ salvo?: string }>;
}) {
  const access = await requireHostPanel();
  const { id } = await params;
  const query = await searchParams;
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

  const auditLogs = await prisma.auditLog.findMany({
    where: { targetType: "PROPERTY", targetId: property.id },
    orderBy: { timestamp: "desc" },
    take: 8,
    include: { admin: { select: { name: true, email: true } } },
  });
  const rejection = auditLogs.find((audit) => audit.action === "PROPERTY_REJECTED");
  const color = statusColor(property.status);
  const canSendReview = ["DRAFT", "REJECTED", "INACTIVE"].includes(property.status);
  const canPause = property.status === "ACTIVE";

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
    <div style={{ display: "grid", gap: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <Link href="/anfitriao/imoveis" style={{ color: GOLD, textDecoration: "none", fontSize: 13, fontWeight: 900 }}>Voltar para meus imóveis</Link>
          <h1 style={{ color: "#fff", fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 950, margin: "10px 0 8px", lineHeight: 1.05 }}>{property.title || "Imóvel sem título"}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ border: `1px solid ${color}66`, background: `${color}14`, color, borderRadius: 999, padding: "7px 11px", fontSize: 12, fontWeight: 950 }}>
              {PROPERTY_STATUS_LABEL[property.status] ?? property.status}
            </span>
            <span style={{ color: "#9ca3af", fontSize: 13 }}>{PROPERTY_STATUS_DESCRIPTION[property.status]}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href={`/anfitriao/imoveis/${property.id}/editar`} style={{ minHeight: 42, borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid rgba(212,168,67,0.28)", color: "#f5d78c", padding: "0 14px", textDecoration: "none", fontWeight: 950 }}>
            <IconMark>Ed</IconMark> Editar
          </Link>
          {canSendReview ? (
            <form action={submitPropertyForReview}>
              <input type="hidden" name="id" value={property.id} />
              <ActionButton><IconMark>→</IconMark> Enviar para análise</ActionButton>
            </form>
          ) : null}
          {canPause ? (
            <form action={pauseProperty}>
              <input type="hidden" name="id" value={property.id} />
              <ActionButton><IconMark>||</IconMark> Pausar</ActionButton>
            </form>
          ) : null}
        </div>
      </header>

      {query?.salvo ? (
        <div style={{ border: "1px solid rgba(34,197,94,0.35)", background: "rgba(34,197,94,0.10)", color: "#86efac", borderRadius: 8, padding: 12, fontSize: 13, fontWeight: 850 }}>
          Alterações salvas. {query.salvo === "analise" ? "O imóvel voltou para análise." : "O imóvel foi salvo como rascunho."}
        </div>
      ) : null}

      {property.status === "REJECTED" && rejection?.reason ? (
        <div style={{ border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.10)", color: "#fecaca", borderRadius: 8, padding: 14, lineHeight: 1.6 }}>
          <strong style={{ display: "block", color: "#fff", marginBottom: 4 }}>Motivo da reprovação</strong>
          {rejection.reason}
        </div>
      ) : null}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <div style={{ display: "grid", gap: 16 }}>
          <Section title="Fotos">
            {property.photos.length ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                {property.photos.map((photo, index) => (
                  <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" style={{ color: "#aaa", textDecoration: "none", fontSize: 12 }}>
                    <div style={{ aspectRatio: "4 / 3", borderRadius: 8, border: "1px solid rgba(212,168,67,0.18)", background: `url(${photo.url}) center / cover` }} />
                    <span style={{ display: "block", marginTop: 6 }}>Foto {index + 1}</span>
                  </a>
                ))}
              </div>
            ) : (
              <p style={{ color: "#9ca3af", margin: 0 }}>Nenhuma foto cadastrada.</p>
            )}
          </Section>

          <Section title="Informações principais">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <Info label="Cidade/Bairro" value={`${label(property.city)} / ${label(property.bairro)}`} />
              <Info label="Estado" value={label(property.state)} />
              <Info label="Endereço" value={label(property.address)} />
              <Info label="Preço" value={`${money(property.pricePerNight)}/período`} />
              <Info label="Quartos" value={property.bedrooms} />
              <Info label="Banheiros" value={property.bathrooms} />
              <Info label="Camas" value={property.beds} />
              <Info label="Capacidade" value={`${property.maxGuests} pessoa(s)`} />
            </div>
            <div style={{ marginTop: 14 }}>
              <p style={{ color: GOLD, fontSize: 10, fontWeight: 950, letterSpacing: 1.2, textTransform: "uppercase", margin: "0 0 6px" }}>Descrição</p>
              <p style={{ color: "#d1d5db", margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{property.description || "Não informado"}</p>
            </div>
          </Section>

          <Section title="Comodidades e regras">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              {property.amenities.length ? property.amenities.map((amenity) => (
                <span key={amenity.id} style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 999, padding: "6px 9px", color: "#e5e7eb", fontSize: 12 }}>{amenity.name}</span>
              )) : <span style={{ color: "#9ca3af" }}>Nenhuma comodidade cadastrada.</span>}
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, color: "#d1d5db", lineHeight: 1.8 }}>
              {rules.map((rule) => <li key={rule}>{rule}</li>)}
            </ul>
          </Section>
        </div>

        <div style={{ display: "grid", gap: 16, alignSelf: "start" }}>
          <Section title="Reservas recentes">
            {property.bookings.length === 0 ? (
              <p style={{ color: "#9ca3af", margin: 0 }}>Nenhuma reserva encontrada ainda.</p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {property.bookings.map((booking) => (
                  <article key={booking.id} style={{ border: "1px solid rgba(212,168,67,0.14)", borderRadius: 8, padding: 12 }}>
                    <strong style={{ color: "#fff" }}>{booking.guest.name ?? booking.guest.email ?? "Cliente"}</strong>
                    <p style={{ color: "#b8b8b8", margin: "6px 0" }}>
                      {booking.checkIn.toLocaleDateString("pt-BR")} até {booking.checkOut.toLocaleDateString("pt-BR")} · {money(booking.totalPrice)}
                    </p>
                    <p style={{ color: GOLD, margin: 0, fontSize: 12 }}>{booking.status} / {booking.paymentStatus}</p>
                  </article>
                ))}
              </div>
            )}
          </Section>

          <Section title="Histórico de análise">
            {auditLogs.length ? (
              <div style={{ display: "grid", gap: 10 }}>
                {auditLogs.map((audit) => (
                  <article key={audit.id} style={{ border: "1px solid rgba(212,168,67,0.14)", borderRadius: 8, padding: 12 }}>
                    <strong style={{ color: "#fff", fontSize: 13 }}>{audit.action === "PROPERTY_APPROVED" ? "Aprovado" : "Revisado"}</strong>
                    <p style={{ color: "#9ca3af", margin: "5px 0 0", fontSize: 12 }}>{audit.timestamp.toLocaleString("pt-BR")}</p>
                    {audit.reason ? <p style={{ color: "#d1d5db", margin: "7px 0 0", fontSize: 13 }}>{audit.reason}</p> : null}
                  </article>
                ))}
              </div>
            ) : (
              <p style={{ color: "#9ca3af", margin: 0 }}>Nenhum registro administrativo para este imóvel.</p>
            )}
          </Section>
        </div>
      </section>
    </div>
  );
}

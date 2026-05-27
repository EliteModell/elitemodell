import { prisma } from "@/lib/prisma";
import { requireHostPanel } from "@/lib/account-access";
import { acceptBooking, completeBooking, rejectBooking } from "@/lib/host-booking-actions";

export const dynamic = "force-dynamic";

const GOLD = "#d4a843";

const bookingLabel: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  COMPLETED: "Concluída",
  REJECTED: "Recusada",
};

const paymentLabel: Record<string, string> = {
  PENDING: "Pagamento pendente",
  PAID: "Pago",
  REFUNDED: "Reembolsado",
  FAILED: "Pagamento falhou",
};

function money(value: number | null | undefined) {
  return `R$ ${(value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

function statusColor(status: string) {
  if (status === "CONFIRMED" || status === "COMPLETED" || status === "PAID") return "#22c55e";
  if (status === "REJECTED" || status === "CANCELLED" || status === "FAILED") return "#ef4444";
  return GOLD;
}

function Pill({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{ border: `1px solid ${color}66`, background: `${color}14`, color, borderRadius: 999, padding: "6px 10px", fontSize: 11, fontWeight: 950 }}>
      {children}
    </span>
  );
}

function BookingButton({ children }: { children: React.ReactNode }) {
  return (
    <button style={{ minHeight: 38, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 8, border: "1px solid rgba(212,168,67,0.25)", background: "rgba(212,168,67,0.08)", color: "#f5d78c", padding: "0 12px", fontSize: 12, fontWeight: 900, cursor: "pointer" }}>
      {children}
    </button>
  );
}

function IconMark({ children }: { children: React.ReactNode }) {
  return <span aria-hidden="true" style={{ fontSize: 15, fontWeight: 950, lineHeight: 1 }}>{children}</span>;
}

export default async function ReservasAnfitriaoPage() {
  const access = await requireHostPanel();
  const userId = access.user.id;
  const isAdmin = access.isAdmin;

  const bookings = await prisma.booking.findMany({
    where: isAdmin ? {} : { property: { hostId: userId } },
    include: {
      property: { select: { title: true, city: true, state: true, photos: { take: 1, orderBy: { order: "asc" } } } },
      guest: { select: { name: true, email: true, image: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <header>
        <p style={{ margin: "0 0 8px", color: GOLD, fontSize: 11, fontWeight: 950, letterSpacing: 2.2, textTransform: "uppercase" }}>Agenda dos imóveis</p>
        <h1 style={{ color: "#fff", fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 950, margin: 0, lineHeight: 1.05 }}>Reservas</h1>
        <p style={{ color: "#b8b8b8", margin: "12px 0 0", maxWidth: 760 }}>Acompanhe solicitações de uso, status de pagamento, valores e dados da cliente/profissional.</p>
      </header>

      {bookings.length === 0 ? (
        <section style={{ border: "1px dashed rgba(212,168,67,0.32)", borderRadius: 8, background: "rgba(255,255,255,0.03)", padding: 28, textAlign: "center" }}>
          <div style={{ color: GOLD, fontSize: 36, fontWeight: 950 }}>0</div>
          <h2 style={{ color: "#fff", margin: "12px 0 8px" }}>Nenhuma reserva ainda</h2>
          <p style={{ margin: 0, color: "#9ca3af", lineHeight: 1.7 }}>Quando um imóvel aprovado receber solicitação, ela aparecerá aqui com status e ações.</p>
        </section>
      ) : (
        <section style={{ display: "grid", gap: 14 }}>
          {bookings.map((booking) => {
            const photo = booking.property.photos[0]?.url;
            const canAccept = booking.status === "PENDING";
            const canComplete = booking.status === "CONFIRMED";
            return (
              <article key={booking.id} style={{ display: "grid", gridTemplateColumns: "118px minmax(0,1fr)", gap: 14, border: "1px solid rgba(212,168,67,0.18)", borderRadius: 8, background: "rgba(255,255,255,0.035)", padding: 14 }}>
                <div role="img" aria-label={`Foto de ${booking.property.title}`} style={{ aspectRatio: "4 / 3", borderRadius: 8, background: photo ? `url(${photo}) center / cover` : "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
                <div style={{ minWidth: 0, display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <h2 style={{ color: "#fff", fontSize: 18, margin: 0, lineHeight: 1.25 }}>{booking.property.title}</h2>
                      <p style={{ color: "#9ca3af", margin: "5px 0 0", fontSize: 13 }}>{booking.property.city}, {booking.property.state}</p>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Pill color={statusColor(booking.status)}>{bookingLabel[booking.status] ?? booking.status}</Pill>
                      <Pill color={statusColor(booking.paymentStatus)}>{paymentLabel[booking.paymentStatus] ?? booking.paymentStatus}</Pill>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                    <div><span style={{ color: GOLD, fontSize: 11, fontWeight: 900 }}>Cliente</span><strong style={{ display: "block", color: "#fff", fontSize: 13 }}>{booking.guest.name ?? booking.guest.email ?? "Cliente"}</strong></div>
                    <div><span style={{ color: GOLD, fontSize: 11, fontWeight: 900 }}>Período</span><strong style={{ display: "block", color: "#fff", fontSize: 13 }}>{booking.checkIn.toLocaleDateString("pt-BR")} até {booking.checkOut.toLocaleDateString("pt-BR")}</strong></div>
                    <div><span style={{ color: GOLD, fontSize: 11, fontWeight: 900 }}>Valor</span><strong style={{ display: "block", color: "#fff", fontSize: 13 }}>{money(booking.totalPrice)}</strong></div>
                    <div><span style={{ color: GOLD, fontSize: 11, fontWeight: 900 }}>Repasse</span><strong style={{ display: "block", color: "#fff", fontSize: 13 }}>{money(booking.hostPayout)}</strong></div>
                  </div>

                  {booking.notes ? <p style={{ color: "#b8b8b8", margin: 0, fontSize: 13, lineHeight: 1.6 }}>{booking.notes}</p> : null}

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {canAccept ? (
                      <>
                        <form action={acceptBooking}>
                          <input type="hidden" name="id" value={booking.id} />
                          <BookingButton><IconMark>✓</IconMark> Aceitar</BookingButton>
                        </form>
                        <form action={rejectBooking}>
                          <input type="hidden" name="id" value={booking.id} />
                          <BookingButton><IconMark>x</IconMark> Recusar</BookingButton>
                        </form>
                      </>
                    ) : null}
                    {canComplete ? (
                      <form action={completeBooking}>
                        <input type="hidden" name="id" value={booking.id} />
                        <BookingButton><IconMark>OK</IconMark> Concluir</BookingButton>
                      </form>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

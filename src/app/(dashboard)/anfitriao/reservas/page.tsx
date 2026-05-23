import { prisma } from "@/lib/prisma";
import { requireHostPanel } from "@/lib/account-access";

export const dynamic = "force-dynamic";

export default async function ReservasAnfitriaoPage() {
  const access = await requireHostPanel();
  const userId = access.user.id;
  const isAdmin = access.isAdmin;

  const bookings = await prisma.booking.findMany({
    where: isAdmin ? {} : { property: { hostId: userId } },
    include: {
      property: { select: { title: true, city: true } },
      guest: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Reservas dos espacos</h1>
      <p style={{ color: "#777", marginBottom: 24 }}>Reservas vinculadas aos seus locais de atendimento aprovados.</p>
      {bookings.length === 0 ? <p style={{ color: "#777" }}>Nenhuma reserva encontrada.</p> : null}
      <div style={{ display: "grid", gap: 12 }}>
        {bookings.map((booking) => (
          <div key={booking.id} style={{ background: "#111", border: "1px solid #222", borderRadius: 10, padding: 16 }}>
            <strong style={{ color: "#fff" }}>{booking.property?.title ?? "Reserva"}</strong>
            <p style={{ color: "#aaa", margin: "6px 0" }}>{booking.guest?.name ?? booking.guest?.email ?? "Hospede"}</p>
            <p style={{ color: "#777", margin: 0 }}>
              {new Date(booking.checkIn).toLocaleDateString("pt-BR")} - {new Date(booking.checkOut).toLocaleDateString("pt-BR")} | R$ {booking.totalPrice.toLocaleString("pt-BR")}
            </p>
            <p style={{ color: "#d4a843", margin: "8px 0 0", fontSize: 13 }}>{booking.status} / {booking.paymentStatus}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

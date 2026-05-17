import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const cardStyle: React.CSSProperties = {
  background: "#111",
  border: "1px solid #1e1e1e",
  borderRadius: 12,
  padding: 18,
};

export default async function AnfitriaoPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "HOST" && session.user.role !== "ADMIN") redirect("/dashboard");

  const [properties, bookings, paid] = await Promise.all([
    prisma.property.findMany({
      where: session.user.role === "ADMIN" ? {} : { hostId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { photos: { take: 1, orderBy: { order: "asc" } } },
    }),
    prisma.booking.findMany({
      where: session.user.role === "ADMIN" ? {} : { property: { hostId: session.user.id } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        property: { select: { title: true } },
        guest: { select: { name: true, email: true } },
      },
    }),
    prisma.booking.aggregate({
      where: {
        paymentStatus: "PAID",
        ...(session.user.role === "ADMIN" ? {} : { property: { hostId: session.user.id } }),
      },
      _sum: { hostPayout: true },
    }),
  ]);

  const activeProperties = properties.filter((property) => property.status === "ACTIVE").length;
  const pendingProperties = properties.filter((property) => property.status === "PENDING_REVIEW").length;
  const pendingBookings = bookings.filter((booking) => booking.status === "PENDING").length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Painel do anunciante</h1>
          <p style={{ color: "#777", fontSize: 14 }}>Dados reais dos seus espaços, reservas e repasses.</p>
        </div>
        <Link href="/anfitriao/imoveis/novo" style={{ padding: "10px 20px", background: "#d4a843", color: "#060e1b", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 800 }}>
          Novo anúncio
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Espaços ativos", value: activeProperties },
          { label: "Em análise", value: pendingProperties },
          { label: "Reservas pendentes", value: pendingBookings },
          { label: "Repasses pagos", value: `R$ ${(paid._sum.hostPayout ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
        ].map((stat) => (
          <div key={stat.label} style={cardStyle}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 3 }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: "#777" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Reservas recentes</h2>
          <Link href="/anfitriao/reservas" style={{ fontSize: 13, color: "#d4a843", textDecoration: "none" }}>Ver todas</Link>
        </div>
        {bookings.length === 0 ? (
          <div style={cardStyle}><p style={{ color: "#777", margin: 0 }}>Nenhuma reserva encontrada.</p></div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {bookings.map((booking) => (
              <div key={booking.id} style={cardStyle}>
                <strong style={{ color: "#fff" }}>{booking.property.title}</strong>
                <p style={{ color: "#aaa", margin: "6px 0" }}>{booking.guest.name ?? booking.guest.email ?? "Hospede"}</p>
                <p style={{ color: "#777", margin: 0 }}>
                  {new Date(booking.checkIn).toLocaleDateString("pt-BR")} - {new Date(booking.checkOut).toLocaleDateString("pt-BR")} | R$ {booking.totalPrice.toLocaleString("pt-BR")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 14 }}>Espaços recentes</h2>
        {properties.length === 0 ? (
          <div style={cardStyle}>
            <p style={{ color: "#777", marginBottom: 12 }}>Você ainda não cadastrou espaços.</p>
            <Link href="/anfitriao/imoveis/novo" style={{ color: "#d4a843", textDecoration: "none", fontWeight: 700 }}>Cadastrar primeiro espaço</Link>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {properties.map((property) => (
              <Link key={property.id} href={`/imoveis/${property.id}`} style={{ ...cardStyle, display: "block", textDecoration: "none" }}>
                <strong style={{ color: "#fff" }}>{property.title}</strong>
                <p style={{ color: "#777", margin: "6px 0 0" }}>{property.city}, {property.state} - {property.status}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

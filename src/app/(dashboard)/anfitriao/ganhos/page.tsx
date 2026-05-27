import { prisma } from "@/lib/prisma";
import { requireHostPanel } from "@/lib/account-access";

export const dynamic = "force-dynamic";

const GOLD = "#d4a843";

function money(value: number | null | undefined) {
  return `R$ ${(value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

function Stat({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <article style={{ border: "1px solid rgba(212,168,67,0.18)", borderRadius: 8, background: "rgba(255,255,255,0.035)", padding: 16 }}>
      <div style={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 8, color: GOLD, background: "rgba(212,168,67,0.10)", border: "1px solid rgba(212,168,67,0.20)", marginBottom: 12 }}>
        {icon}
      </div>
      <strong style={{ display: "block", color: "#fff", fontSize: 24 }}>{value}</strong>
      <span style={{ color: "#9ca3af", fontSize: 12 }}>{label}</span>
    </article>
  );
}

function IconMark({ children }: { children: React.ReactNode }) {
  return <span aria-hidden="true" style={{ fontSize: 17, fontWeight: 950, lineHeight: 1 }}>{children}</span>;
}

export default async function GanhosAnfitriaoPage() {
  const access = await requireHostPanel();
  const userId = access.user.id;
  const isAdmin = access.isAdmin;

  const where = isAdmin ? {} : { property: { hostId: userId } };
  const [paid, pending, recent] = await Promise.all([
    prisma.booking.aggregate({ where: { ...where, paymentStatus: "PAID" }, _sum: { hostPayout: true }, _count: true }),
    prisma.booking.aggregate({ where: { ...where, paymentStatus: "PENDING" }, _sum: { hostPayout: true }, _count: true }),
    prisma.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { property: { select: { title: true } }, guest: { select: { name: true, email: true } } },
    }),
  ]);

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <header>
        <p style={{ margin: "0 0 8px", color: GOLD, fontSize: 11, fontWeight: 950, letterSpacing: 2.2, textTransform: "uppercase" }}>Financeiro do anfitrião</p>
        <h1 style={{ color: "#fff", fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 950, margin: 0, lineHeight: 1.05 }}>Ganhos</h1>
        <p style={{ color: "#b8b8b8", margin: "12px 0 0", maxWidth: 760 }}>Resumo de reservas pagas, valores pendentes e repasses estimados dos seus imóveis.</p>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        <Stat label="Repasse pago" value={money(paid._sum.hostPayout)} icon={<IconMark>R$</IconMark>} />
        <Stat label="Reservas pagas" value={paid._count} icon={<IconMark>✓</IconMark>} />
        <Stat label="Repasse pendente" value={money(pending._sum.hostPayout)} icon={<IconMark>...</IconMark>} />
      </section>

      <section style={{ border: "1px solid rgba(212,168,67,0.18)", borderRadius: 8, background: "rgba(255,255,255,0.035)", padding: 18 }}>
        <h2 style={{ margin: "0 0 14px", color: "#fff", fontSize: 18, fontWeight: 950 }}>Movimentações recentes</h2>
        {recent.length === 0 ? (
          <p style={{ margin: 0, color: "#9ca3af" }}>Nenhuma movimentação financeira ainda.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {recent.map((booking) => (
              <article key={booking.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", border: "1px solid rgba(212,168,67,0.14)", borderRadius: 8, padding: 12 }}>
                <div>
                  <strong style={{ color: "#fff" }}>{booking.property.title}</strong>
                  <p style={{ color: "#9ca3af", margin: "5px 0 0", fontSize: 13 }}>{booking.guest.name ?? booking.guest.email ?? "Cliente"} · {booking.status}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <strong style={{ color: GOLD }}>{money(booking.hostPayout)}</strong>
                  <p style={{ color: "#9ca3af", margin: "5px 0 0", fontSize: 12 }}>{booking.paymentStatus}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

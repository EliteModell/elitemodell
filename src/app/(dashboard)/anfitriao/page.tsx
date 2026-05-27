import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireHostPanel } from "@/lib/account-access";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";
import { PROPERTY_STATUS_LABEL, propertyStatusTone } from "@/lib/property-status";

export const dynamic = "force-dynamic";

const GOLD = "#d4a843";

function money(value: number | null | undefined) {
  return `R$ ${(value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

function dateRange(checkIn: Date, checkOut: Date) {
  return `${checkIn.toLocaleDateString("pt-BR")} até ${checkOut.toLocaleDateString("pt-BR")}`;
}

function StatusBadge({ status }: { status: string }) {
  const tone = propertyStatusTone(status);
  const color =
    tone === "success" ? "#22c55e" :
    tone === "danger" ? "#ef4444" :
    tone === "paused" ? "#60a5fa" :
    tone === "warning" ? GOLD :
    "#94a3b8";

  return (
    <span style={{ border: `1px solid ${color}66`, color, borderRadius: 999, padding: "6px 10px", fontSize: 11, fontWeight: 900 }}>
      {PROPERTY_STATUS_LABEL[status] ?? status}
    </span>
  );
}

function StatCard({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <article style={{ border: "1px solid rgba(212,168,67,0.18)", borderRadius: 8, background: "rgba(255,255,255,0.035)", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ color: "#fff", fontSize: 24, fontWeight: 950 }}>{value}</div>
          <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 4 }}>{label}</div>
        </div>
        <div style={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 8, color: GOLD, background: "rgba(212,168,67,0.10)", border: "1px solid rgba(212,168,67,0.20)" }}>
          {icon}
        </div>
      </div>
    </article>
  );
}

function IconMark({ children }: { children: React.ReactNode }) {
  return <span aria-hidden="true" style={{ fontSize: 18, fontWeight: 950, lineHeight: 1 }}>{children}</span>;
}

export default async function AnfitriaoPage() {
  const access = await requireHostPanel();
  const userId = access.user.id;
  const isAdmin = access.isAdmin;

  const where = isAdmin ? {} : { hostId: userId };
  const [properties, bookings, paid] = await Promise.all([
    prisma.property.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { photos: { take: 1, orderBy: { order: "asc" } } },
    }),
    prisma.booking.findMany({
      where: isAdmin ? {} : { property: { hostId: userId } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        property: { select: { title: true, city: true } },
        guest: { select: { name: true, email: true } },
      },
    }),
    prisma.booking.aggregate({
      where: {
        paymentStatus: "PAID",
        ...(isAdmin ? {} : { property: { hostId: userId } }),
      },
      _sum: { hostPayout: true },
    }),
  ]);

  const activeProperties = properties.filter((property) => property.status === "ACTIVE").length;
  const pendingProperties = properties.filter((property) => property.status === "PENDING_REVIEW").length;
  const draftProperties = properties.filter((property) => property.status === "DRAFT").length;
  const rejectedProperties = properties.filter((property) => property.status === "REJECTED").length;
  const pendingBookings = bookings.filter((booking) => booking.status === "PENDING").length;

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18, alignItems: "stretch" }}>
        <div style={{ border: "1px solid rgba(212,168,67,0.22)", borderRadius: 8, background: "linear-gradient(145deg, rgba(20,20,20,0.98), rgba(7,7,8,0.98))", padding: 22 }}>
          <p style={{ margin: "0 0 10px", color: GOLD, fontSize: 11, fontWeight: 950, letterSpacing: 2.2, textTransform: "uppercase" }}>Área do anfitrião</p>
          <h1 style={{ margin: 0, color: "#fff", fontSize: "clamp(28px, 5vw, 42px)", lineHeight: 1.05, fontWeight: 950 }}>Controle seus imóveis com clareza.</h1>
          <p style={{ margin: "14px 0 0", color: "#b8b8b8", maxWidth: 720, lineHeight: 1.7 }}>
            Acompanhe cadastros, análise administrativa, reservas e repasses em um painel preparado para uso real.
          </p>
          {!access.hostApproved ? (
            <div style={{ marginTop: 18, border: `1px solid ${GOLD}55`, borderRadius: 8, background: "rgba(212,168,67,0.10)", padding: 14, color: "#f5d78c", fontSize: 13, lineHeight: 1.6 }}>
              Seu acesso está aberto para acompanhamento. Imóveis só aparecem para profissionais depois de aprovação administrativa.
            </div>
          ) : null}
        </div>

        <div style={{ border: "1px solid rgba(212,168,67,0.18)", borderRadius: 8, background: "rgba(255,255,255,0.035)", padding: 18, display: "grid", alignContent: "space-between", gap: 16 }}>
          <div>
            <p style={{ margin: "0 0 6px", color: "#9ca3af", fontSize: 12 }}>Próxima ação</p>
            <strong style={{ display: "block", color: "#fff", fontSize: 20, lineHeight: 1.25 }}>
              {properties.length ? "Revise seus imóveis" : "Cadastre seu primeiro imóvel"}
            </strong>
          </div>
          <Link href={ACCOUNT_ROUTES.onboardingAnfitriao} style={{ minHeight: 46, borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, background: GOLD, color: "#070707", textDecoration: "none", fontWeight: 950 }}>
            <IconMark>+</IconMark> Cadastrar imóvel
          </Link>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        <StatCard label="Aprovados" value={activeProperties} icon={<IconMark>✓</IconMark>} />
        <StatCard label="Em análise" value={pendingProperties} icon={<IconMark>...</IconMark>} />
        <StatCard label="Rascunhos" value={draftProperties} icon={<IconMark>R</IconMark>} />
        <StatCard label="Reprovados" value={rejectedProperties} icon={<IconMark>!</IconMark>} />
        <StatCard label="Reservas pendentes" value={pendingBookings} icon={<IconMark>0</IconMark>} />
        <StatCard label="Repasses pagos" value={money(paid._sum.hostPayout)} icon={<IconMark>R$</IconMark>} />
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <h2 style={{ margin: 0, color: "#fff", fontSize: 18, fontWeight: 900 }}>Imóveis recentes</h2>
            <Link href="/anfitriao/imoveis" style={{ color: GOLD, textDecoration: "none", fontWeight: 850, fontSize: 13 }}>Ver todos</Link>
          </div>

          {properties.length === 0 ? (
            <div style={{ border: "1px dashed rgba(212,168,67,0.28)", borderRadius: 8, padding: 24, textAlign: "center", background: "rgba(255,255,255,0.025)" }}>
              <div style={{ color: GOLD, fontSize: 34, fontWeight: 950 }}>+</div>
              <h3 style={{ color: "#fff", margin: "12px 0 6px" }}>Nenhum imóvel cadastrado</h3>
              <p style={{ margin: "0 0 16px", color: "#9ca3af" }}>Comece pelo cadastro guiado. Você pode salvar rascunho e continuar depois.</p>
              <Link href={ACCOUNT_ROUTES.onboardingAnfitriao} style={{ color: GOLD, fontWeight: 900, textDecoration: "none" }}>Cadastrar imóvel</Link>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {properties.map((property) => {
                const photo = property.photos[0]?.url;
                return (
                  <Link key={property.id} href={`/anfitriao/imoveis/${property.id}`} style={{ display: "grid", gridTemplateColumns: "96px minmax(0,1fr)", gap: 14, padding: 12, border: "1px solid rgba(212,168,67,0.16)", borderRadius: 8, background: "rgba(255,255,255,0.035)", textDecoration: "none" }}>
                    <div aria-label={`Foto de ${property.title}`} role="img" style={{ aspectRatio: "4 / 3", borderRadius: 8, background: photo ? `url(${photo}) center / cover` : "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <strong style={{ color: "#fff", fontSize: 15 }}>{property.title}</strong>
                        <StatusBadge status={property.status} />
                      </div>
                      <p style={{ margin: "7px 0 0", color: "#9ca3af", fontSize: 13 }}>{[property.bairro, property.city, property.state].filter(Boolean).join(", ")}</p>
                      <p style={{ margin: "3px 0 0", color: GOLD, fontSize: 13, fontWeight: 850 }}>{money(property.pricePerNight)}/período</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gap: 12, alignSelf: "start" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <h2 style={{ margin: 0, color: "#fff", fontSize: 18, fontWeight: 900 }}>Reservas recentes</h2>
            <Link href="/anfitriao/reservas" style={{ color: GOLD, textDecoration: "none", fontWeight: 850, fontSize: 13 }}>Ver todas</Link>
          </div>

          {bookings.length === 0 ? (
            <div style={{ border: "1px solid rgba(212,168,67,0.16)", borderRadius: 8, background: "rgba(255,255,255,0.035)", padding: 18 }}>
              <p style={{ color: "#9ca3af", margin: 0 }}>Ainda não há reservas para seus imóveis.</p>
            </div>
          ) : (
            bookings.map((booking) => (
              <article key={booking.id} style={{ border: "1px solid rgba(212,168,67,0.16)", borderRadius: 8, background: "rgba(255,255,255,0.035)", padding: 14 }}>
                <strong style={{ color: "#fff" }}>{booking.property.title}</strong>
                <p style={{ color: "#b8b8b8", margin: "6px 0" }}>{booking.guest.name ?? booking.guest.email ?? "Cliente"}</p>
                <p style={{ color: "#9ca3af", margin: 0, fontSize: 13 }}>{dateRange(booking.checkIn, booking.checkOut)} · {money(booking.totalPrice)}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

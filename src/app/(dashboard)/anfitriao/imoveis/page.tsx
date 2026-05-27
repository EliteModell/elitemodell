import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireHostPanel } from "@/lib/account-access";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";
import { pauseProperty, submitPropertyForReview } from "@/lib/host-property-actions";
import { PROPERTY_STATUS_DESCRIPTION, PROPERTY_STATUS_LABEL, propertyStatusTone } from "@/lib/property-status";

export const dynamic = "force-dynamic";

const GOLD = "#d4a843";

function money(value: number | null | undefined) {
  return `R$ ${(value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

function badgeColor(status: string) {
  const tone = propertyStatusTone(status);
  if (tone === "success") return "#22c55e";
  if (tone === "danger") return "#ef4444";
  if (tone === "paused") return "#60a5fa";
  if (tone === "warning") return GOLD;
  return "#94a3b8";
}

function StatusBadge({ status }: { status: string }) {
  const color = badgeColor(status);
  return (
    <span style={{ border: `1px solid ${color}66`, background: `${color}14`, color, borderRadius: 999, padding: "6px 10px", fontSize: 11, fontWeight: 950 }}>
      {PROPERTY_STATUS_LABEL[status] ?? status}
    </span>
  );
}

function ActionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} style={{ minHeight: 38, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 8, border: "1px solid rgba(212,168,67,0.24)", padding: "0 12px", color: "#f5d78c", textDecoration: "none", fontSize: 12, fontWeight: 900 }}>
      {children}
    </Link>
  );
}

function ActionButton({ children }: { children: React.ReactNode }) {
  return (
    <button style={{ minHeight: 38, borderRadius: 8, border: "1px solid rgba(212,168,67,0.24)", background: "rgba(212,168,67,0.08)", color: "#f5d78c", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "0 12px", fontSize: 12, fontWeight: 900, cursor: "pointer" }}>
      {children}
    </button>
  );
}

function IconMark({ children }: { children: React.ReactNode }) {
  return <span aria-hidden="true" style={{ fontSize: 15, fontWeight: 950, lineHeight: 1 }}>{children}</span>;
}

export default async function ImoveisAnfitriaoPage() {
  const access = await requireHostPanel();
  const userId = access.user.id;
  const isAdmin = access.isAdmin;

  const properties = await prisma.property.findMany({
    where: isAdmin ? {} : { hostId: userId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      photos: { take: 1, orderBy: { order: "asc" } },
      amenities: true,
      _count: { select: { bookings: true } },
    },
  });

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: "0 0 8px", color: GOLD, fontSize: 11, fontWeight: 950, letterSpacing: 2.2, textTransform: "uppercase" }}>Portfólio de imóveis</p>
          <h1 style={{ color: "#fff", fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 950, margin: 0, lineHeight: 1.05 }}>Meus imóveis</h1>
          <p style={{ color: "#b8b8b8", margin: "12px 0 0", maxWidth: 760 }}>Veja rascunhos, pendências, imóveis aprovados e pontos que precisam de correção.</p>
        </div>
        <Link href={ACCOUNT_ROUTES.onboardingAnfitriao} style={{ minHeight: 46, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 8, background: GOLD, color: "#070707", padding: "0 16px", textDecoration: "none", fontWeight: 950 }}>
          <IconMark>+</IconMark> Cadastrar imóvel
        </Link>
      </header>

      {properties.length === 0 ? (
        <section style={{ border: "1px dashed rgba(212,168,67,0.32)", borderRadius: 8, background: "rgba(255,255,255,0.03)", padding: 28, textAlign: "center" }}>
          <div style={{ width: 58, height: 58, display: "grid", placeItems: "center", margin: "0 auto 14px", borderRadius: 8, color: GOLD, background: "rgba(212,168,67,0.10)", border: "1px solid rgba(212,168,67,0.22)" }}>
            <IconMark>+</IconMark>
          </div>
          <h2 style={{ color: "#fff", margin: "0 0 8px", fontSize: 22 }}>Nenhum imóvel cadastrado ainda</h2>
          <p style={{ color: "#9ca3af", margin: "0 auto 18px", maxWidth: 520, lineHeight: 1.7 }}>
            Cadastre seu primeiro imóvel com fotos, endereço, regras e disponibilidade. Você pode salvar rascunho e continuar depois.
          </p>
          <Link href={ACCOUNT_ROUTES.onboardingAnfitriao} style={{ minHeight: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 8, background: GOLD, color: "#070707", padding: "0 16px", textDecoration: "none", fontWeight: 950 }}>
            Cadastrar imóvel
          </Link>
        </section>
      ) : (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
          {properties.map((property) => {
            const photo = property.photos[0]?.url;
            const canSendReview = ["DRAFT", "REJECTED", "INACTIVE"].includes(property.status);
            const canPause = property.status === "ACTIVE";
            return (
              <article key={property.id} style={{ overflow: "hidden", border: "1px solid rgba(212,168,67,0.18)", borderRadius: 8, background: "linear-gradient(180deg, rgba(20,20,20,0.98), rgba(11,11,13,0.98))" }}>
                <div
                  role="img"
                  aria-label={`Foto de ${property.title}`}
                  style={{
                    aspectRatio: "16 / 9",
                    background: photo ? `url(${photo}) center / cover` : "linear-gradient(135deg, rgba(212,168,67,0.12), rgba(255,255,255,0.04))",
                    display: "grid",
                    placeItems: "center",
                    color: GOLD,
                    borderBottom: "1px solid rgba(212,168,67,0.16)",
                  }}
                >
                  {photo ? null : <IconMark>+</IconMark>}
                </div>

                <div style={{ padding: 16, display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <h2 style={{ margin: 0, color: "#fff", fontSize: 19, lineHeight: 1.25, fontWeight: 950 }}>{property.title || "Imóvel sem título"}</h2>
                      <p style={{ color: "#9ca3af", margin: "7px 0 0", fontSize: 13 }}>{[property.bairro, property.city, property.state].filter(Boolean).join(", ") || "Localização não informada"}</p>
                    </div>
                    <StatusBadge status={property.status} />
                  </div>

                  <p style={{ color: "#b8b8b8", margin: 0, fontSize: 13, lineHeight: 1.6 }}>
                    {PROPERTY_STATUS_DESCRIPTION[property.status] ?? "Acompanhe o status deste imóvel."}
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    <div><span style={{ color: GOLD, fontSize: 11, fontWeight: 900 }}>Preço</span><strong style={{ display: "block", color: "#fff", fontSize: 13 }}>{money(property.pricePerNight)}</strong></div>
                    <div><span style={{ color: GOLD, fontSize: 11, fontWeight: 900 }}>Fotos</span><strong style={{ display: "block", color: "#fff", fontSize: 13 }}>{property.photos.length}</strong></div>
                    <div><span style={{ color: GOLD, fontSize: 11, fontWeight: 900 }}>Reservas</span><strong style={{ display: "block", color: "#fff", fontSize: 13 }}>{property._count.bookings}</strong></div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <ActionLink href={`/anfitriao/imoveis/${property.id}`}><IconMark>Ver</IconMark> Detalhes</ActionLink>
                    <ActionLink href={`/anfitriao/imoveis/${property.id}/editar`}><IconMark>Ed</IconMark> Editar imóvel</ActionLink>
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
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireHostPanel } from "@/lib/account-access";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  DRAFT: "Rascunho",
  PENDING_REVIEW: "Pendente aprovação",
  ACTIVE: "Aprovado",
  INACTIVE: "Oculto/Suspenso",
  REJECTED: "Reprovado",
};

function statusColor(status: string) {
  if (status === "ACTIVE") return "#22c55e";
  if (status === "REJECTED" || status === "INACTIVE") return "#ef4444";
  if (status === "PENDING_REVIEW") return "#d4a843";
  return "#94a3b8";
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
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Meus espaços</h1>
          <p style={{ color: "#777", margin: 0 }}>Acompanhe o status de aprovação de cada imóvel, quarto ou espaço reservado.</p>
        </div>
        <Link href={ACCOUNT_ROUTES.onboardingAnfitriao} style={{ minHeight: 42, display: "inline-flex", alignItems: "center", padding: "0 16px", borderRadius: 8, background: "#d4a843", color: "#060e1b", textDecoration: "none", fontWeight: 900 }}>
          Cadastrar novo espaço
        </Link>
      </div>

      {properties.length === 0 ? (
        <div style={{ border: "1px solid #222", borderRadius: 12, background: "#111", padding: 20 }}>
          <p style={{ color: "#aaa", margin: "0 0 12px" }}>Nenhum imóvel cadastrado ainda.</p>
          <Link href={ACCOUNT_ROUTES.onboardingAnfitriao} style={{ color: "#d4a843", textDecoration: "none", fontWeight: 800 }}>Cadastrar primeiro espaço</Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {properties.map((property) => {
            const photo = property.photos[0]?.url;
            const color = statusColor(property.status);
            return (
              <article key={property.id} style={{ display: "grid", gridTemplateColumns: "112px minmax(0, 1fr)", gap: 14, border: "1px solid #222", borderRadius: 12, background: "#111", padding: 12 }}>
                <div
                  role="img"
                  aria-label={`Foto de ${property.title}`}
                  style={{
                    width: 112,
                    aspectRatio: "4 / 3",
                    borderRadius: 8,
                    background: photo ? `url(${photo}) center / cover` : "#0b0b0b",
                    border: photo ? "1px solid #2a2620" : "1px dashed rgba(255,255,255,.18)",
                    display: photo ? "block" : "grid",
                    placeItems: "center",
                    color: "#777",
                    fontSize: 11,
                  }}
                >
                  {photo ? null : "Sem foto"}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                    <h2 style={{ margin: 0, color: "#fff", fontSize: 17, lineHeight: 1.25 }}>{property.title || "Imóvel sem título"}</h2>
                    <span style={{ border: `1px solid ${color}66`, color, borderRadius: 999, padding: "4px 8px", fontSize: 11, fontWeight: 900 }}>
                      {statusLabel[property.status] ?? property.status}
                    </span>
                  </div>
                  <p style={{ color: "#aaa", margin: "0 0 8px", fontSize: 13 }}>
                    {[property.bairro, property.city, property.state].filter(Boolean).join(", ") || "Localização não informada"}
                  </p>
                  <p style={{ color: "#777", margin: "0 0 12px", fontSize: 13 }}>
                    R$ {property.pricePerNight.toLocaleString("pt-BR")}/período · {property.bedrooms} quarto(s) · {property.bathrooms} banheiro(s) · {property._count.bookings} reserva(s)
                  </p>
                  {property.status === "REJECTED" ? (
                    <p style={{ color: "#ef4444", margin: "0 0 12px", fontSize: 12 }}>Seu espaço foi reprovado. Revise os dados e entre em contato com o suporte para reenviar.</p>
                  ) : null}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Link href={`/anfitriao/imoveis/${property.id}`} style={{ color: "#d4a843", textDecoration: "none", fontWeight: 800, fontSize: 13 }}>Ver detalhes</Link>
                    {property.status !== "ACTIVE" ? <Link href={ACCOUNT_ROUTES.onboardingAnfitriao} style={{ color: "#aaa", textDecoration: "none", fontWeight: 700, fontSize: 13 }}>Cadastrar/editar novo envio</Link> : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

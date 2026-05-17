import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  DRAFT: "Rascunho",
  PENDING_REVIEW: "Pendente",
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  REJECTED: "Rejeitado",
};

export default async function AdminImoveisPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");

  const properties = await prisma.property.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 50,
    include: {
      host: { select: { name: true, email: true } },
      photos: { take: 1, orderBy: { order: "asc" } },
    },
  });

  return (
    <div>
      <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Espacos</h1>
      <p style={{ color: "#777", marginBottom: 24 }}>Ultimos locais cadastrados para auditoria e moderacao.</p>

      {properties.length === 0 ? (
        <div style={{ background: "#111", border: "1px solid #222", borderRadius: 10, padding: 24, color: "#777" }}>
          Nenhum espaco cadastrado.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {properties.map((property) => (
            <Link
              key={property.id}
              href={`/imoveis/${property.id}`}
              style={{ background: "#111", border: "1px solid #222", borderRadius: 10, padding: 16, textDecoration: "none", display: "block" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <strong style={{ color: "#fff" }}>{property.title}</strong>
                  <p style={{ color: "#777", margin: "6px 0" }}>{property.city}, {property.state}</p>
                  <p style={{ color: "#777", margin: 0, fontSize: 13 }}>
                    Anunciante: {property.host.name ?? property.host.email ?? "Sem nome"}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ color: property.status === "PENDING_REVIEW" ? "#d4a843" : "#aaa", fontSize: 13, fontWeight: 700 }}>
                    {statusLabel[property.status] ?? property.status}
                  </span>
                  <p style={{ color: "#aaa", margin: "8px 0 0", fontSize: 13 }}>
                    R$ {property.pricePerNight.toLocaleString("pt-BR")}/periodo
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

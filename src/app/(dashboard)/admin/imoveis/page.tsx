import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  DRAFT: "Rascunho",
  PENDING_REVIEW: "Pendente",
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  REJECTED: "Rejeitado",
};

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect(ACCOUNT_ROUTES.painelCliente);
  return session;
}

async function approveProperty(formData: FormData) {
  "use server";
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const property = await prisma.property.findUnique({
    where: { id },
    select: { id: true, hostId: true },
  });

  if (!property) return;

  await prisma.$transaction(async (tx) => {
    await tx.property.update({
      where: { id: property.id },
      data: { status: "ACTIVE" },
      select: { id: true },
    });

    await tx.user.update({
      where: { id: property.hostId },
      data: { role: "HOST", accountType: "host" },
      select: { id: true },
    });

    await tx.hostProfile.upsert({
      where: { userId: property.hostId },
      create: { userId: property.hostId },
      update: {},
    });
  });

  revalidatePath("/admin/imoveis");
}

async function rejectProperty(formData: FormData) {
  "use server";
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.property.update({
    where: { id },
    data: { status: "REJECTED" },
    select: { id: true },
  });

  revalidatePath("/admin/imoveis");
}

export default async function AdminImoveisPage() {
  await requireAdmin();

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
      <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Espaços</h1>
      <p style={{ color: "#777", marginBottom: 24 }}>Últimos locais cadastrados para auditoria e moderação.</p>

      {properties.length === 0 ? (
        <div style={{ background: "#111", border: "1px solid #222", borderRadius: 10, padding: 24, color: "#777" }}>
          Nenhum espaço cadastrado.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {properties.map((property) => {
            const pending = property.status === "PENDING_REVIEW";
            const active = property.status === "ACTIVE";

            return (
              <div
                key={property.id}
                style={{ background: "#111", border: "1px solid #222", borderRadius: 10, padding: 16 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <Link href={`/imoveis/${property.id}`} style={{ color: "#fff", textDecoration: "none" }}>
                      <strong>{property.title}</strong>
                    </Link>
                    <p style={{ color: "#777", margin: "6px 0" }}>{property.city}, {property.state}</p>
                    <p style={{ color: "#777", margin: 0, fontSize: 13 }}>
                      Anunciante: {property.host.name ?? property.host.email ?? "Sem nome"}
                    </p>
                  </div>
                  <div style={{ minWidth: 220, textAlign: "right" }}>
                    <span style={{ color: pending ? "#d4a843" : "#aaa", fontSize: 13, fontWeight: 800 }}>
                      {statusLabel[property.status] ?? property.status}
                    </span>
                    <p style={{ color: "#aaa", margin: "8px 0 12px", fontSize: 13 }}>
                      R$ {property.pricePerNight.toLocaleString("pt-BR")}/periodo
                    </p>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                      <form action={approveProperty}>
                        <input type="hidden" name="id" value={property.id} />
                        <button
                          type="submit"
                          disabled={active}
                          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #22c55e", background: active ? "#151515" : "rgba(34,197,94,0.1)", color: active ? "#555" : "#22c55e", cursor: active ? "not-allowed" : "pointer" }}
                        >
                          Aprovar
                        </button>
                      </form>
                      <form action={rejectProperty}>
                        <input type="hidden" name="id" value={property.id} />
                        <button
                          type="submit"
                          disabled={property.status === "REJECTED"}
                          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ef4444", background: "rgba(239,68,68,0.1)", color: "#ef4444", cursor: property.status === "REJECTED" ? "not-allowed" : "pointer" }}
                        >
                          Rejeitar
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

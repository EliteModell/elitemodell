import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-access";
import { logAudit } from "@/lib/audit";
import { AdminHeader, AdminPanel, AdminTable, StatusPill, buttonStyle, tdStyle, thStyle } from "../_components/AdminPrimitives";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  DRAFT: "Rascunho",
  PENDING_REVIEW: "Pendente aprovacao",
  ACTIVE: "Aprovado",
  INACTIVE: "Oculto/Suspenso",
  REJECTED: "Reprovado",
};

async function reviewProperty(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("properties:review");
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "");
  const reason = String(formData.get("reason") ?? "");
  if (!id || !["approve", "reject", "hide", "suspend"].includes(action)) return;

  const property = await prisma.property.findUnique({ where: { id }, select: { id: true, hostId: true } });
  if (!property) return;

  await prisma.$transaction(async (tx) => {
    await tx.property.update({
      where: { id },
      data: {
        status: action === "approve" ? "ACTIVE" : action === "reject" ? "REJECTED" : "INACTIVE",
      },
    });
    if (action === "approve") {
      await tx.user.update({ where: { id: property.hostId }, data: { role: "HOST", accountType: "host" } });
      await tx.hostProfile.upsert({ where: { userId: property.hostId }, create: { userId: property.hostId }, update: {} });
    }
  });

  await logAudit({
    adminId: session.user.id,
    action: action === "approve" ? "PROPERTY_APPROVED" : "PROPERTY_REJECTED",
    targetType: "PROPERTY",
    targetId: id,
    reason: reason || `property:${action}`,
  });
  revalidatePath("/admin/imoveis");
}

export default async function AdminImoveisPage({ searchParams }: { searchParams?: Promise<{ status?: string }> }) {
  await requireAdmin("properties:review");
  const params = await searchParams;
  const status = params?.status;
  const where = status && status !== "ALL" ? { status: status as "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "INACTIVE" | "REJECTED" } : {};

  const properties = await prisma.property.findMany({
    where,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      host: { select: { id: true, name: true, email: true, phone: true, blocked: true } },
      photos: { take: 3, orderBy: { order: "asc" } },
      amenities: true,
    },
  });

  return (
    <div>
      <AdminHeader title="Imoveis e quartos" subtitle="Aprovacao de locais, fotos, endereco, regras, comodidades, precos e anfitriao responsavel." />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {["ALL", "DRAFT", "PENDING_REVIEW", "ACTIVE", "REJECTED", "INACTIVE"].map((item) => (
          <Link key={item} href={item === "ALL" ? "/admin/imoveis" : `/admin/imoveis?status=${item}`} style={{ ...buttonStyle, textDecoration: "none", background: item === (status ?? "ALL") ? "rgba(212,168,67,.22)" : "rgba(255,255,255,.03)" }}>
            {item === "ALL" ? "Todos" : statusLabel[item] ?? item}
          </Link>
        ))}
      </div>
      <AdminPanel>
        <AdminTable>
          <thead>
            <tr>
              <th style={thStyle}>Local</th>
              <th style={thStyle}>Anfitriao</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Dados</th>
              <th style={thStyle}>Acao</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((property) => (
              <tr key={property.id}>
                <td style={tdStyle}>
                  <Link href={`/imoveis/${property.id}`} style={{ color: "#fff", fontWeight: 900 }}>{property.title}</Link><br />
                  {property.type} - {property.city}, {property.bairro ?? property.state}<br />
                  <span style={{ color: "#94a3b8" }}>{property.photos.length} foto(s) cadastrada(s)</span>
                </td>
                <td style={tdStyle}>{property.host.name ?? "Sem nome"}<br />{property.host.email}<br />{property.host.phone ?? "-"}</td>
                <td style={tdStyle}><StatusPill tone={property.status === "ACTIVE" ? "success" : property.status === "REJECTED" ? "danger" : "warning"}>{statusLabel[property.status] ?? property.status}</StatusPill></td>
                <td style={tdStyle}>
                  R$ {property.pricePerNight.toLocaleString("pt-BR")}/periodo<br />
                  {property.bedrooms} quarto(s), {property.bathrooms} banheiro(s)<br />
                  {property.amenities.length} comodidade(s)
                </td>
                <td style={tdStyle}>
                  <form action={reviewProperty} style={{ display: "grid", gap: 8 }}>
                    <input type="hidden" name="id" value={property.id} />
                    <input name="reason" placeholder="Motivo/observacao" style={{ background: "#050506", border: "1px solid rgba(255,255,255,.14)", borderRadius: 8, color: "#fff", padding: 8 }} />
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button name="action" value="approve" style={buttonStyle}>Aprovar</button>
                      <button name="action" value="reject" style={{ ...buttonStyle, color: "#ef4444" }}>Reprovar</button>
                      <button name="action" value="hide" style={{ ...buttonStyle, color: "#f97316" }}>Ocultar</button>
                    </div>
                  </form>
                </td>
              </tr>
            ))}
            {!properties.length ? <tr><td style={tdStyle} colSpan={5}>Nenhum imovel encontrado.</td></tr> : null}
          </tbody>
        </AdminTable>
      </AdminPanel>
    </div>
  );
}

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-access";
import { AdminHeader, AdminPanel, AdminTable, StatusPill, adminColors, buttonStyle, tdStyle, thStyle } from "../_components/AdminPrimitives";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  DRAFT: "Rascunho",
  PENDING_REVIEW: "Pendente aprovacao",
  ACTIVE: "Aprovado",
  INACTIVE: "Oculto/Suspenso",
  REJECTED: "Reprovado",
};

function hostStatus(host: { blocked: boolean; hostProfile: { id: string } | null }) {
  if (host.blocked) return "SUSPENSO";
  if (host.hostProfile) return "APROVADO";
  return "PENDENTE_APROVACAO";
}

function statusTone(status: string): "neutral" | "warning" | "success" | "danger" {
  if (status === "ACTIVE") return "success";
  if (status === "REJECTED" || status === "INACTIVE") return "danger";
  return "warning";
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
      host: { select: { id: true, name: true, email: true, phone: true, blocked: true, hostProfile: { select: { id: true } } } },
      photos: { orderBy: { order: "asc" } },
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
              <th style={thStyle}>Foto</th>
              <th style={thStyle}>Local</th>
              <th style={thStyle}>Anfitriao</th>
              <th style={thStyle}>Status anfitriao</th>
              <th style={thStyle}>Status imovel</th>
              <th style={thStyle}>Dados</th>
              <th style={thStyle}>Revisao</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((property) => {
              const firstPhoto = property.photos[0]?.url;
              const currentHostStatus = hostStatus(property.host);
              return (
                <tr key={property.id}>
                  <td style={tdStyle}>
                    {firstPhoto ? (
                      <div
                        aria-label={`Miniatura de ${property.title}`}
                        role="img"
                        style={{
                          width: 86,
                          aspectRatio: "4 / 3",
                          borderRadius: 8,
                          border: `1px solid ${adminColors.border}`,
                          backgroundImage: `url(${firstPhoto})`,
                          backgroundPosition: "center",
                          backgroundSize: "cover",
                        }}
                      />
                    ) : (
                      <div style={{ width: 86, aspectRatio: "4 / 3", borderRadius: 8, border: "1px dashed rgba(255,255,255,.18)", display: "grid", placeItems: "center", color: "#94a3b8", fontSize: 11 }}>
                        Sem foto
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <Link href={`/admin/imoveis/${property.id}`} style={{ color: "#fff", fontWeight: 900 }}>{property.title}</Link><br />
                    {property.type} - {property.city}, {property.bairro ?? property.state}<br />
                    <span style={{ color: "#94a3b8" }}>{property.photos.length} foto(s) cadastrada(s)</span>
                  </td>
                  <td style={tdStyle}>{property.host.name ?? "Sem nome"}<br />{property.host.email}<br />{property.host.phone ?? "-"}</td>
                  <td style={tdStyle}>
                    <StatusPill tone={currentHostStatus === "APROVADO" ? "success" : currentHostStatus === "SUSPENSO" ? "danger" : "warning"}>
                      {currentHostStatus}
                    </StatusPill>
                  </td>
                  <td style={tdStyle}><StatusPill tone={statusTone(property.status)}>{statusLabel[property.status] ?? property.status}</StatusPill></td>
                  <td style={tdStyle}>
                    R$ {property.pricePerNight.toLocaleString("pt-BR")}/periodo<br />
                    {property.bedrooms} quarto(s), {property.bathrooms} banheiro(s)<br />
                    {property.amenities.length} comodidade(s)
                  </td>
                  <td style={tdStyle}>
                    <Link href={`/admin/imoveis/${property.id}`} style={{ ...buttonStyle, display: "inline-flex", textDecoration: "none" }}>
                      Ver detalhes
                    </Link>
                  </td>
                </tr>
              );
            })}
            {!properties.length ? <tr><td style={tdStyle} colSpan={7}>Nenhum imovel encontrado.</td></tr> : null}
          </tbody>
        </AdminTable>
      </AdminPanel>
    </div>
  );
}

import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-access";
import { logAudit } from "@/lib/audit";
import { AdminHeader, AdminPanel, StatusPill, adminColors, buttonStyle, tdStyle, thStyle } from "../../_components/AdminPrimitives";

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

function pillTone(status: string): "neutral" | "warning" | "success" | "danger" {
  if (status === "ACTIVE" || status === "APROVADO") return "success";
  if (status === "REJECTED" || status === "INACTIVE" || status === "SUSPENSO") return "danger";
  return "warning";
}

function actionToStatus(action: string) {
  if (action === "approve") return "ACTIVE";
  if (action === "reject") return "REJECTED";
  if (action === "hide" || action === "suspend") return "INACTIVE";
  return null;
}

function actionLabel(action: string) {
  if (action === "approve") return "Aprovado";
  if (action === "reject") return "Reprovado";
  if (action === "hide") return "Oculto";
  if (action === "suspend") return "Suspenso";
  return action;
}

async function reviewProperty(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("properties:review");
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const nextStatus = actionToStatus(action);

  if (!id || !nextStatus) return;
  if ((action === "reject" || action === "hide" || action === "suspend") && reason.length < 3) {
    redirect(`/admin/imoveis/${id}?erro=motivo-obrigatorio`);
  }

  const property = await prisma.property.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      host: { select: { blocked: true, hostProfile: { select: { id: true } } } },
      photos: { select: { id: true } },
    },
  });

  if (!property) return;

  const previousStatus = property.status;
  const currentHostStatus = hostStatus(property.host);
  if (action === "approve" && currentHostStatus !== "APROVADO") {
    redirect(`/admin/imoveis/${id}?erro=anfitriao-pendente`);
  }

  await prisma.property.update({
    where: { id },
    data: { status: nextStatus },
  });

  await logAudit({
    adminId: session.user.id,
    action: action === "approve" ? "PROPERTY_APPROVED" : "PROPERTY_REJECTED",
    targetType: "PROPERTY",
    targetId: id,
    reason: reason || `property:${action}`,
    changes: {
      targetKind: "IMOVEL",
      adminId: session.user.id,
      propertyId: id,
      previousStatus,
      newStatus: nextStatus,
      action,
      reason: reason || null,
      photoCountAtReview: property.photos.length,
      hostStatusAtReview: currentHostStatus,
    },
  });

  revalidatePath("/admin/imoveis");
  revalidatePath(`/admin/imoveis/${id}`);
  redirect(`/admin/imoveis/${id}?salvo=${action}`);
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ border: `1px solid ${adminColors.border}`, borderRadius: 8, padding: 12, background: "rgba(255,255,255,0.025)" }}>
      <p style={{ margin: "0 0 6px", color: adminColors.gold, fontSize: 10, fontWeight: 900, letterSpacing: 1.4, textTransform: "uppercase" }}>{label}</p>
      <div style={{ color: "#fff", fontSize: 14, lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}

function Alert({ tone, children }: { tone: "warning" | "danger" | "success"; children: React.ReactNode }) {
  const color = tone === "success" ? "#22c55e" : tone === "danger" ? "#ef4444" : adminColors.gold;
  return (
    <div style={{ border: `1px solid ${color}55`, background: `${color}14`, color, borderRadius: 8, padding: 12, fontSize: 13, fontWeight: 800 }}>
      {children}
    </div>
  );
}

export default async function AdminImovelDetalhesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ erro?: string; salvo?: string }>;
}) {
  await requireAdmin("properties:review");
  const { id } = await params;
  const query = await searchParams;

  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      host: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          blocked: true,
          blockReason: true,
          role: true,
          accountType: true,
          hostProfile: { select: { id: true, createdAt: true } },
        },
      },
      photos: { orderBy: { order: "asc" } },
      amenities: true,
    },
  });

  if (!property) notFound();

  const auditLogs = await prisma.auditLog.findMany({
    where: { targetType: "PROPERTY", targetId: property.id },
    orderBy: { timestamp: "desc" },
    take: 20,
    include: { admin: { select: { name: true, email: true } } },
  });

  const currentHostStatus = hostStatus(property.host);
  const canApproveSafely = currentHostStatus === "APROVADO";
  const rules = [
    property.instantBook ? "Reserva instantanea permitida" : "Reserva instantanea desativada",
    property.allowPets ? "Aceita pets" : "Não aceita pets",
    property.allowSmoking ? "Permite fumar" : "Não permite fumar",
    property.allowParties ? "Permite festas/eventos" : "Não permite festas/eventos",
    `Check-in ${property.checkInTime}`,
    `Check-out ${property.checkOutTime}`,
    `Minimo ${property.minNights} noite(s)`,
    property.maxNights ? `Maximo ${property.maxNights} noite(s)` : "Sem maximo de noites definido",
  ];

  return (
    <div>
      <AdminHeader
        title={property.title}
        subtitle="Revisao administrativa completa do imovel antes de qualquer aprovacao."
        action={<Link href="/admin/imoveis" style={{ ...buttonStyle, textDecoration: "none" }}>Voltar para imoveis</Link>}
      />

      <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
        {query?.salvo ? <Alert tone="success">Acao registrada: {actionLabel(query.salvo)}.</Alert> : null}
        {query?.erro === "motivo-obrigatorio" ? <Alert tone="danger">Informe um motivo para reprovar, ocultar ou suspender.</Alert> : null}
        {query?.erro === "anfitriao-pendente" ? <Alert tone="danger">Anfitrião ainda não aprovado. Revise o anfitrião antes de aprovar o imóvel.</Alert> : null}
        {!property.photos.length ? <Alert tone="warning">Imóvel sem fotos cadastradas. Não recomendado aprovar.</Alert> : null}
        {!canApproveSafely ? <Alert tone="warning">Anfitrião ainda não aprovado. Revise o anfitrião antes de aprovar o imóvel.</Alert> : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.15fr) minmax(320px, .85fr)", gap: 16 }}>
        <div style={{ display: "grid", gap: 16 }}>
          <AdminPanel>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, color: "#fff", fontSize: 16 }}>Dados do imovel</h2>
              <StatusPill tone={pillTone(property.status)}>{statusLabel[property.status] ?? property.status}</StatusPill>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <InfoItem label="Tipo" value={property.type} />
              <InfoItem label="Cidade/Bairro" value={`${property.city}${property.bairro ? ` / ${property.bairro}` : ""}`} />
              <InfoItem label="Endereco" value={`${property.address}, ${property.state} - ${property.country}${property.zipCode ? `, ${property.zipCode}` : ""}`} />
              <InfoItem label="Preço" value={`R$ ${property.pricePerNight.toLocaleString("pt-BR")}/período`} />
              <InfoItem label="Quartos" value={property.bedrooms} />
              <InfoItem label="Banheiros" value={property.bathrooms} />
              <InfoItem label="Camas" value={property.beds} />
              <InfoItem label="Hospedes" value={property.maxGuests} />
              <InfoItem label="Data de envio" value={property.createdAt.toLocaleString("pt-BR")} />
            </div>
            <div style={{ marginTop: 16 }}>
              <p style={{ margin: "0 0 8px", color: adminColors.gold, fontSize: 11, fontWeight: 900, letterSpacing: 1.6, textTransform: "uppercase" }}>Descricao</p>
              <p style={{ margin: 0, color: "#d1d5db", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{property.description}</p>
            </div>
          </AdminPanel>

          <AdminPanel>
            <h2 style={{ margin: "0 0 14px", color: "#fff", fontSize: 16 }}>Fotos cadastradas</h2>
            {property.photos.length ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
                {property.photos.map((photo, index) => (
                  <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none", color: "#fff" }}>
                    <div
                      aria-label={`Foto ${index + 1} de ${property.title}`}
                      role="img"
                      style={{
                        aspectRatio: "4 / 3",
                        borderRadius: 8,
                        border: `1px solid ${adminColors.border}`,
                        backgroundImage: `url(${photo.url})`,
                        backgroundPosition: "center",
                        backgroundSize: "cover",
                      }}
                    />
                    <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: 12, wordBreak: "break-all" }}>Foto {index + 1}</p>
                  </a>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, color: "#94a3b8" }}>Nenhuma foto salva para este imovel.</p>
            )}
          </AdminPanel>

          <AdminPanel>
            <h2 style={{ margin: "0 0 14px", color: "#fff", fontSize: 16 }}>Comodidades e regras</h2>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <p style={{ margin: "0 0 8px", color: adminColors.gold, fontSize: 11, fontWeight: 900, letterSpacing: 1.6, textTransform: "uppercase" }}>Comodidades</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {property.amenities.length ? property.amenities.map((amenity) => (
                    <span key={amenity.id} style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 999, padding: "6px 9px", color: "#e5e7eb", fontSize: 12 }}>
                      {amenity.name}
                    </span>
                  )) : <span style={{ color: "#94a3b8" }}>Nenhuma comodidade cadastrada.</span>}
                </div>
              </div>
              <div>
                <p style={{ margin: "0 0 8px", color: adminColors.gold, fontSize: 11, fontWeight: 900, letterSpacing: 1.6, textTransform: "uppercase" }}>Regras</p>
                <ul style={{ margin: 0, paddingLeft: 18, color: "#d1d5db", lineHeight: 1.8 }}>
                  {rules.map((rule) => <li key={rule}>{rule}</li>)}
                </ul>
              </div>
            </div>
          </AdminPanel>
        </div>

        <div style={{ display: "grid", gap: 16, alignSelf: "start" }}>
          <AdminPanel>
            <h2 style={{ margin: "0 0 14px", color: "#fff", fontSize: 16 }}>Anfitriao responsavel</h2>
            <div style={{ display: "grid", gap: 10 }}>
              <InfoItem label="Nome" value={property.host.name ?? "Sem nome"} />
              <InfoItem label="E-mail" value={property.host.email} />
              <InfoItem label="Telefone" value={property.host.phone ?? "-"} />
              <InfoItem label="Role / Tipo" value={`${property.host.role} / ${property.host.accountType}`} />
              <InfoItem label="Status anfitriao" value={<StatusPill tone={pillTone(currentHostStatus)}>{currentHostStatus}</StatusPill>} />
              {property.host.blockReason ? <InfoItem label="Motivo de bloqueio" value={property.host.blockReason} /> : null}
            </div>
          </AdminPanel>

          <AdminPanel>
            <h2 style={{ margin: "0 0 14px", color: "#fff", fontSize: 16 }}>Acoes de moderacao</h2>
            <form action={reviewProperty} style={{ display: "grid", gap: 10 }}>
              <input type="hidden" name="id" value={property.id} />
              <textarea
                name="reason"
                placeholder="Motivo obrigatorio para reprovar, ocultar ou suspender"
                style={{ minHeight: 92, background: "#050506", border: "1px solid rgba(255,255,255,.14)", borderRadius: 8, color: "#fff", padding: 10, resize: "vertical" }}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button name="action" value="approve" style={{ ...buttonStyle, opacity: canApproveSafely ? 1 : 0.55 }}>Aprovar</button>
                <button name="action" value="reject" style={{ ...buttonStyle, color: "#ef4444" }}>Reprovar</button>
                <button name="action" value="hide" style={{ ...buttonStyle, color: "#f97316" }}>Ocultar</button>
                <button name="action" value="suspend" style={{ ...buttonStyle, color: "#f97316" }}>Suspender</button>
              </div>
            </form>
          </AdminPanel>

          <AdminPanel>
            <h2 style={{ margin: "0 0 14px", color: "#fff", fontSize: 16 }}>Historico de auditoria</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Quando</th>
                    <th style={thStyle}>Acao</th>
                    <th style={thStyle}>Admin</th>
                    <th style={thStyle}>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length ? auditLogs.map((audit) => (
                    <tr key={audit.id}>
                      <td style={tdStyle}>{audit.timestamp.toLocaleString("pt-BR")}</td>
                      <td style={tdStyle}>{audit.action}</td>
                      <td style={tdStyle}>{audit.admin.name ?? audit.admin.email ?? audit.adminId}</td>
                      <td style={tdStyle}>{audit.reason ?? "-"}</td>
                    </tr>
                  )) : (
                    <tr><td style={tdStyle} colSpan={4}>Nenhum registro de auditoria para este imovel.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </AdminPanel>
        </div>
      </div>
    </div>
  );
}

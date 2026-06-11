import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-access";
import { logAudit } from "@/lib/audit";
import { personaProviderLabel } from "@/lib/persona";
import { professionalApprovalAccessData } from "@/lib/professional-access";
import { AdminHeader, AdminPanel, AdminTable, StatusPill, buttonStyle, tdStyle, thStyle } from "../_components/AdminPrimitives";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  DRAFT: "Cadastro incompleto",
  PENDING_REVIEW: "Pendente aprovacao",
  ACTIVE: "Aprovada",
  PAUSED: "Pausada",
  SUSPENDED: "Suspensa",
  REJECTED: "Reprovada",
};

async function reviewProfessional(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("professionals:review");
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const supportedActions = ["approve", "reject", "correction", "suspend", "block", "resume", "approveVideo", "rejectVideo", "disableBoost"];
  if (!id || !supportedActions.includes(action)) return;
  if (["reject", "correction", "suspend", "block", "rejectVideo"].includes(action) && reason.trim().length < 4) return;

  if (action === "approveVideo" || action === "rejectVideo") {
    await prisma.professional.update({
      where: { id },
      data: action === "approveVideo"
        ? { presentationVideoStatus: "APPROVED", presentationVideoRejectReason: null }
        : { presentationVideoStatus: "REJECTED", presentationVideoRejectReason: reason },
    });
    await logAudit({
      adminId: session.user.id,
      action: "SETTINGS_CHANGED",
      targetType: "CONTENT",
      targetId: id,
      reason: reason || `presentation-video:${action}`,
    });
    revalidatePath("/admin/profissionais");
    return;
  }

  if (action === "disableBoost") {
    await prisma.professional.update({
      where: { id },
      data: { boostActive: false, boostStartedAt: null, boostUntil: null, boostSource: null },
    });
    await logAudit({
      adminId: session.user.id,
      action: "SETTINGS_CHANGED",
      targetType: "PROFESSIONAL",
      targetId: id,
      reason: "boost:disabled-by-admin",
    });
    revalidatePath("/admin/profissionais");
    return;
  }

  const data =
    action === "resume"
        ? { status: "ACTIVE" as const, pauseStartedAt: null, pauseUntil: null, pauseReason: null }
      : action === "suspend"
        ? { status: "SUSPENDED" as const, verified: false, rejectReason: reason }
        : { status: "REJECTED" as const, verified: false, docStatus: "REJECTED", verifStatus: "REJECTED", kycStatus: "REJECTED", rejectReason: reason };

  const professional = action === "approve"
    ? await prisma.$transaction(async (tx) => {
        const current = await tx.professional.findUniqueOrThrow({
          where: { id },
          select: {
            accessGrandfathered: true,
            freeAccessStartedAt: true,
            freeAccessEndsAt: true,
          },
        });
        const accessData = await professionalApprovalAccessData(tx, current);
        return tx.professional.update({
          where: { id },
          data: {
            status: "ACTIVE",
            verified: true,
            docStatus: "APPROVED",
            verifStatus: "APPROVED",
            kycStatus: "APPROVED",
            rejectReason: null,
            ...accessData,
          },
          select: { id: true, userId: true },
        });
      })
    : await prisma.professional.update({ where: { id }, data, select: { id: true, userId: true } });
  if (action === "block") {
    await prisma.user.update({ where: { id: professional.userId }, data: { blocked: true, blockReason: reason, blockedAt: new Date() } });
  }

  await logAudit({
    adminId: session.user.id,
    action: action === "approve" ? "PROFESSIONAL_APPROVED" : action === "resume" ? "SETTINGS_CHANGED" : "PROFESSIONAL_REJECTED",
    targetType: "PROFESSIONAL",
    targetId: id,
    reason: reason || `professional:${action}`,
  });
  revalidatePath("/admin/profissionais");
}

export default async function AdminProfissionaisPage({ searchParams }: { searchParams?: Promise<{ status?: string }> }) {
  await requireAdmin("professionals:review");
  const params = await searchParams;
  const status = params?.status;
  const where = status && status !== "ALL" ? { status: status as "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "PAUSED" | "SUSPENDED" | "REJECTED" } : {};

  const professionals = await prisma.professional.findMany({
    where,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      slug: true,
      displayName: true,
      city: true,
      state: true,
      escortCategory: true,
      whatsapp: true,
      hidePhone: true,
      listingPhoneUntil: true,
      hideAge: true,
      status: true,
      verified: true,
      docStatus: true,
      verifStatus: true,
      verificationCode: true,
      verificationUrl: true,
      verificationType: true,
      kycProvider: true,
      kycSessionId: true,
      kycStatus: true,
      rejectReason: true,
      pauseUntil: true,
      pauseReason: true,
      boostActive: true,
      boostUntil: true,
      boostSource: true,
      freeAccessStartedAt: true,
      freeAccessEndsAt: true,
      accessGrandfathered: true,
      presentationVideoUrl: true,
      presentationVideoStatus: true,
      presentationVideoRejectReason: true,
      profileViews: true,
      contactClicks: true,
      rating: true,
      totalReviews: true,
      bio: true,
      createdAt: true,
      user: { select: { name: true, email: true, phone: true, blocked: true } },
      photos: { take: 3, orderBy: { order: "asc" } },
      specialties: true,
    },
  });

  return (
    <div>
      <AdminHeader title="Acompanhantes e profissionais" subtitle="Analise cadastro, documentos, selfie/vídeo, KYC, fotos públicas, descrição, serviços, cidade e histórico de moderação." />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {["ALL", "DRAFT", "PENDING_REVIEW", "ACTIVE", "PAUSED", "REJECTED", "SUSPENDED"].map((item) => (
          <Link key={item} href={item === "ALL" ? "/admin/profissionais" : `/admin/profissionais?status=${item}`} style={{ ...buttonStyle, textDecoration: "none", background: item === (status ?? "ALL") ? "rgba(212,168,67,.22)" : "rgba(255,255,255,.03)" }}>
            {item === "ALL" ? "Todos" : statusLabel[item] ?? item}
          </Link>
        ))}
      </div>
      <AdminPanel>
        <AdminTable>
          <thead>
            <tr>
              <th style={thStyle}>Profissional</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>KYC e arquivos</th>
              <th style={thStyle}>Perfil</th>
              <th style={thStyle}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {professionals.map((pro) => (
              <tr key={pro.id}>
                <td style={tdStyle}>
                  <Link href={`/profissionais/${pro.slug}`} style={{ color: "#fff", fontWeight: 900 }}>{pro.displayName}</Link><br />
                  {pro.city}, {pro.state} - {pro.escortCategory ?? "sem categoria"}<br />
                  <span style={{ color: "#94a3b8" }}>{pro.user.email} / {pro.whatsapp ?? pro.user.phone ?? "-"}</span>
                </td>
                <td style={tdStyle}>
                  <StatusPill tone={pro.status === "ACTIVE" ? "success" : pro.status === "REJECTED" || pro.status === "SUSPENDED" ? "danger" : "warning"}>{statusLabel[pro.status] ?? pro.status}</StatusPill>
                  {pro.pauseUntil ? <p style={{ color: "#f5d78c", margin: "8px 0 0" }}>Pausada até {pro.pauseUntil.toLocaleDateString("pt-BR")}</p> : null}
                  {pro.rejectReason ? <p style={{ color: "#ef4444", margin: "8px 0 0" }}>{pro.rejectReason}</p> : null}
                </td>
                <td style={tdStyle}>
                  KYC: {personaProviderLabel(pro.kycProvider, pro.kycSessionId)} / {pro.kycStatus}<br />
                  Inquiry: {pro.kycSessionId ?? "-"}<br />
                  Doc: {pro.docStatus} | Face: {pro.verifStatus}<br />
                  Código: {pro.verificationCode ?? "-"}<br />
                  Verificação: {pro.verificationUrl ? pro.verificationType ?? "arquivo" : "não enviada"}<br />
                  Vídeo do perfil: {pro.presentationVideoUrl ? pro.presentationVideoStatus : "não enviado"}
                  {pro.presentationVideoRejectReason ? <p style={{ color: "#ef4444", margin: "8px 0 0" }}>{pro.presentationVideoRejectReason}</p> : null}
                </td>
                <td style={tdStyle}>
                  {pro.photos.length} mídia(s), {pro.specialties.length} serviço(s)<br />
                  Bio: {pro.bio.length} caracteres<br />
                  Privacidade: {pro.hidePhone ? "telefone oculto" : "telefone permitido"} / {pro.hideAge ? "idade oculta" : "idade pública"}<br />
                  Telefone listagem: {pro.listingPhoneUntil && pro.listingPhoneUntil > new Date() ? `ativo até ${pro.listingPhoneUntil.toLocaleDateString("pt-BR")}` : "sem benefício ativo"}<br />
                  Métricas: {pro.profileViews} views, {pro.contactClicks} contatos, nota {pro.rating.toFixed(1)} ({pro.totalReviews})<br />
                  Boost: {pro.boostActive ? `ativo até ${pro.boostUntil ? pro.boostUntil.toLocaleDateString("pt-BR") : "data não informada"}` : "inativo"}<br />
                  Acesso: {pro.accessGrandfathered
                    ? "legado, sem bloqueio"
                    : pro.freeAccessEndsAt
                      ? `gratuito até ${pro.freeAccessEndsAt.toLocaleDateString("pt-BR")}`
                      : "inicia na aprovação"}<br />
                  Enviado em {pro.createdAt.toLocaleDateString("pt-BR")}
                </td>
                <td style={tdStyle}>
                  <form action={reviewProfessional} style={{ display: "grid", gap: 8 }}>
                    <input type="hidden" name="id" value={pro.id} />
                    <textarea name="reason" placeholder="Motivo obrigatório para reprovar/corrigir/suspender" style={{ background: "#050506", border: "1px solid rgba(255,255,255,.14)", borderRadius: 8, color: "#fff", padding: 8, minHeight: 58 }} />
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button name="action" value="approve" style={buttonStyle}>Aprovar</button>
                      {pro.status === "PAUSED" ? <button name="action" value="resume" style={buttonStyle}>Reativar</button> : null}
                      <button name="action" value="reject" style={{ ...buttonStyle, color: "#ef4444" }}>Reprovar</button>
                      <button name="action" value="correction" style={{ ...buttonStyle, color: "#f97316" }}>Solicitar correção</button>
                      <button name="action" value="suspend" style={{ ...buttonStyle, color: "#f97316" }}>Suspender</button>
                      <button name="action" value="block" style={{ ...buttonStyle, color: "#ef4444" }}>Bloquear</button>
                      {pro.presentationVideoUrl ? (
                        <>
                          <button name="action" value="approveVideo" style={buttonStyle}>Aprovar vídeo</button>
                          <button name="action" value="rejectVideo" style={{ ...buttonStyle, color: "#ef4444" }}>Reprovar vídeo</button>
                        </>
                      ) : null}
                      {pro.boostActive ? <button name="action" value="disableBoost" style={{ ...buttonStyle, color: "#f97316" }}>Desativar boost</button> : null}
                    </div>
                  </form>
                </td>
              </tr>
            ))}
            {!professionals.length ? <tr><td style={tdStyle} colSpan={5}>Nenhuma profissional encontrada.</td></tr> : null}
          </tbody>
        </AdminTable>
      </AdminPanel>
    </div>
  );
}

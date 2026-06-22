import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-access";
import { logAudit } from "@/lib/audit";
import { personaProviderLabel } from "@/lib/persona";
import { professionalApprovalAccessData } from "@/lib/professional-access";
import { filterApprovedProfilePhotos, type PublicProfileAsset } from "@/lib/public-professional-media";
import { AdminHeader, AdminPagination, AdminPanel, AdminTable, StatusPill, buttonStyle, tdStyle, thStyle } from "../_components/AdminPrimitives";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;

function pageNumber(value?: string) {
  const parsed = Number(value ?? "1");
  return Number.isFinite(parsed) ? Math.max(1, Math.floor(parsed)) : 1;
}

const statusLabel: Record<string, string> = {
  DRAFT: "Cadastro incompleto",
  PENDING_REVIEW: "Pendente de aprovação",
  ACTIVE: "Aprovada",
  PAUSED: "Pausada",
  SUSPENDED: "Suspensa",
  REJECTED: "Reprovada",
};

const technicalStatusLabel: Record<string, string> = {
  NOT_STARTED: "Não iniciada",
  NOT_SENT: "Não enviado",
  PENDING: "Pendente",
  PERSONA_PENDING: "Pendente na Persona",
  KYC_MANUAL_PENDENTE: "Pendente de análise manual",
  NEEDS_REVIEW: "Revisão necessária",
  APPROVED: "Aprovado",
  REJECTED: "Reprovado",
  NONE: "Não enviado",
};

type ProfessionalApprovalReview = {
  userId: string;
  status: string;
  bio: string;
  city: string;
  state: string;
  escortCategory: string | null;
  birthDate: Date | null;
  attendanceTypes: string[];
  servesGenders: string[];
  diasDisponiveis: string[];
  services: string[];
  pricePerHour: number | null;
  price30min: number | null;
  price2h: number | null;
  priceOvernight: number | null;
  priceWebcam: number | null;
  paymentMethods: string[];
  whatsapp: string | null;
  kycSessionId: string | null;
  photos: Array<{ id?: string; url: string; cover?: boolean; order?: number }>;
  specialties: unknown[];
  user: { blocked: boolean; uploadedAssets: PublicProfileAsset[] };
};

function translatedTechnicalStatus(status?: string | null) {
  if (!status) return "Não informado";
  const normalized = status.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return technicalStatusLabel[normalized] ?? status;
}

function kycProviderLabel(provider?: string | null, sessionId?: string | null) {
  if (provider?.toUpperCase() === "DIDIT") return "Didit";
  return personaProviderLabel(provider, sessionId) === "PERSONA" ? "Persona" : "Manual";
}

function verificationTypeLabel(type?: string | null) {
  if (!type) return "Arquivo";
  return ({ foto: "Foto", video: "Vídeo", biometria: "Biometria" } as Record<string, string>)[type.toLowerCase()] ?? type;
}

function reviewReasonLabel(reason: string) {
  const diditStatus = reason.match(/^Didit status:\s*(.+)$/i);
  return diditStatus ? `Status Didit: ${translatedTechnicalStatus(diditStatus[1])}` : reason;
}

function professionalApprovalIssues(professional: ProfessionalApprovalReview) {
  const issues: string[] = [];
  if (professional.status !== "PENDING_REVIEW") issues.push("cadastro ainda não enviado para análise");
  if (professional.user.blocked) issues.push("conta bloqueada");
  if (professional.bio.trim().length < 80) issues.push("biografia incompleta");
  if (!professional.city.trim() || !professional.state.trim()) issues.push("localização incompleta");
  if (!professional.escortCategory) issues.push("categoria não informada");
  if (!professional.birthDate) issues.push("data de nascimento não informada");
  if (!professional.attendanceTypes.length) issues.push("tipo de atendimento não informado");
  if (!professional.servesGenders.length) issues.push("público atendido não informado");
  if (!professional.diasDisponiveis.length) issues.push("dias disponíveis não informados");
  if (!professional.services.length && !professional.specialties.length) issues.push("serviços não informados");
  if (![professional.pricePerHour, professional.price30min, professional.price2h, professional.priceOvernight, professional.priceWebcam].some(Boolean)) issues.push("valores não informados");
  if (!professional.paymentMethods.length) issues.push("forma de pagamento não informada");
  if (!professional.whatsapp || professional.whatsapp.replace(/\D/g, "").length < 10) issues.push("WhatsApp inválido");
  if (!professional.photos.length) issues.push("foto principal não enviada");
  if (
    professional.photos.length &&
    filterApprovedProfilePhotos(
      professional.photos,
      professional.user.uploadedAssets,
      professional.userId,
    ).length !== professional.photos.length
  ) issues.push("há mídia pendente, privada ou indisponível");
  if (!professional.kycSessionId) issues.push("verificação de identidade não iniciada");
  return issues;
}

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
            userId: true,
            status: true,
            bio: true,
            city: true,
            state: true,
            escortCategory: true,
            birthDate: true,
            attendanceTypes: true,
            servesGenders: true,
            diasDisponiveis: true,
            services: true,
            pricePerHour: true,
            price30min: true,
            price2h: true,
            priceOvernight: true,
            priceWebcam: true,
            paymentMethods: true,
            whatsapp: true,
            kycSessionId: true,
            photos: { select: { id: true, url: true, cover: true, order: true } },
            specialties: { take: 1, select: { id: true } },
            user: {
              select: {
                blocked: true,
                uploadedAssets: {
                  where: { folder: { startsWith: "profiles" } },
                  select: {
                    id: true, userId: true, folder: true, category: true, status: true,
                    moderationStatus: true, approvedBucket: true, approvedPath: true,
                  },
                },
              },
            },
            accessGrandfathered: true,
            freeAccessStartedAt: true,
            freeAccessEndsAt: true,
          },
        });
        if (professionalApprovalIssues(current).length) return null;
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
  if (!professional) return;
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

export default async function AdminProfissionaisPage({ searchParams }: { searchParams?: Promise<{ status?: string; page?: string }> }) {
  await requireAdmin("professionals:review");
  const params = await searchParams;
  const status = params?.status;
  const page = pageNumber(params?.page);
  const where = status && status !== "ALL" ? { status: status as "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "PAUSED" | "SUSPENDED" | "REJECTED" } : {};

  const [total, professionals] = await Promise.all([prisma.professional.count({ where }), prisma.professional.findMany({
    where,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      userId: true,
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
      birthDate: true,
      attendanceTypes: true,
      servesGenders: true,
      diasDisponiveis: true,
      services: true,
      pricePerHour: true,
      price30min: true,
      price2h: true,
      priceOvernight: true,
      priceWebcam: true,
      paymentMethods: true,
      createdAt: true,
      user: {
        select: {
          name: true, email: true, phone: true, blocked: true,
          uploadedAssets: {
            where: { folder: { startsWith: "profiles" } },
            select: {
              id: true, userId: true, folder: true, category: true, status: true,
              moderationStatus: true, approvedBucket: true, approvedPath: true,
            },
          },
        },
      },
      photos: { orderBy: { order: "asc" }, select: { id: true, url: true, cover: true, order: true } },
      specialties: true,
    },
  })]);
  const now = new Date();

  return (
    <div>
      <AdminHeader title="Acompanhantes e profissionais" subtitle="Analise cadastro, documentos, selfie/vídeo, KYC, fotos públicas, descrição, serviços, cidade e histórico de moderação." />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {["ALL", "DRAFT", "PENDING_REVIEW", "ACTIVE", "PAUSED", "REJECTED", "SUSPENDED"].map((item) => (
          <Link prefetch={false} key={item} href={item === "ALL" ? "/admin/profissionais" : `/admin/profissionais?status=${item}`} style={{ ...buttonStyle, textDecoration: "none", background: item === (status ?? "ALL") ? "rgba(212,168,67,.22)" : "rgba(255,255,255,.03)" }}>
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
            {professionals.map((pro) => {
              const approvalIssues = professionalApprovalIssues(pro);
              const canApprove = approvalIssues.length === 0;
              return <tr key={pro.id}>
                <td style={tdStyle}>
                  <Link href={`/profissionais/${pro.slug}`} style={{ color: "#fff", fontWeight: 900 }}>{pro.displayName}</Link><br />
                  {pro.city}, {pro.state} - {pro.escortCategory ?? "sem categoria"}<br />
                  <span style={{ color: "#94a3b8" }}>{pro.user.email} / {pro.whatsapp ?? pro.user.phone ?? "-"}</span>
                </td>
                <td style={tdStyle}>
                  <StatusPill tone={pro.status === "ACTIVE" ? "success" : pro.status === "REJECTED" || pro.status === "SUSPENDED" ? "danger" : "warning"}>{statusLabel[pro.status] ?? pro.status}</StatusPill>
                  {pro.pauseUntil ? <p style={{ color: "#f5d78c", margin: "8px 0 0" }}>Pausada até {pro.pauseUntil.toLocaleDateString("pt-BR")}</p> : null}
                  {pro.rejectReason ? <p style={{ color: "#ef4444", margin: "8px 0 0" }}>{reviewReasonLabel(pro.rejectReason)}</p> : null}
                </td>
                <td style={tdStyle}>
                  KYC: {kycProviderLabel(pro.kycProvider, pro.kycSessionId)} / {translatedTechnicalStatus(pro.kycStatus)}<br />
                  Inquiry: {pro.kycSessionId ?? "-"}<br />
                  Documento: {translatedTechnicalStatus(pro.docStatus)} | Face: {translatedTechnicalStatus(pro.verifStatus)}<br />
                  Código: {pro.verificationCode ?? "-"}<br />
                  Verificação: {pro.verificationUrl ? verificationTypeLabel(pro.verificationType) : "Não enviada"}<br />
                  Vídeo do perfil: {pro.presentationVideoUrl ? translatedTechnicalStatus(pro.presentationVideoStatus) : "Não enviado"}
                  {pro.presentationVideoRejectReason ? <p style={{ color: "#ef4444", margin: "8px 0 0" }}>{pro.presentationVideoRejectReason}</p> : null}
                </td>
                <td style={tdStyle}>
                  {pro.photos.length} mídia(s), {pro.specialties.length} serviço(s)<br />
                  Bio: {pro.bio.length} caracteres<br />
                  Privacidade: {pro.hidePhone ? "telefone oculto" : "telefone permitido"} / {pro.hideAge ? "idade oculta" : "idade pública"}<br />
                  Telefone listagem: {pro.listingPhoneUntil && pro.listingPhoneUntil > now ? `ativo até ${pro.listingPhoneUntil.toLocaleDateString("pt-BR")}` : "sem benefício ativo"}<br />
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
                    <textarea name="reason" placeholder="Motivo obrigatório para reprovar, corrigir, suspender ou bloquear" style={{ background: "#050506", border: "1px solid rgba(255,255,255,.14)", borderRadius: 8, color: "#fff", padding: 8, minHeight: 58 }} />
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        name="action"
                        value="approve"
                        disabled={!canApprove}
                        title={!canApprove ? `Aprovação indisponível: ${approvalIssues.join(", ")}.` : "Aprovar profissional"}
                        style={{ ...buttonStyle, cursor: canApprove ? "pointer" : "not-allowed", opacity: canApprove ? 1 : 0.45 }}
                      >
                        Aprovar
                      </button>
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
                    {!canApprove ? <small style={{ color: "#f5d78c", lineHeight: 1.45 }}>Aprovação indisponível: {approvalIssues.join(", ")}.</small> : null}
                  </form>
                </td>
              </tr>
            })}
            {!professionals.length ? <tr><td style={tdStyle} colSpan={5}>Nenhuma profissional encontrada.</td></tr> : null}
          </tbody>
        </AdminTable>
        <AdminPagination basePath="/admin/profissionais" page={page} pageSize={PAGE_SIZE} total={total} query={{ status }} />
      </AdminPanel>
    </div>
  );
}

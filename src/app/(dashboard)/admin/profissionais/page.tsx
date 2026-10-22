import Link from "next/link";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-access";
import { logAudit } from "@/lib/audit";
import { getProfessionalBillingSettings, professionalApprovalAccessData } from "@/lib/professional-access";
import { type PublicProfileAsset } from "@/lib/public-professional-media";
import { sendProfessionalApprovalEmail } from "@/lib/auth-email";
import { sendProfessionalCorrectionEmail, sendProfessionalRejectionEmail } from "@/lib/professional-review-email";
import { digitVendorDataBelongsToUser, fetchDigitSessionDecision } from "@/lib/didit";
import { assessProfessionalDiditDecision } from "@/lib/professional-didit";
import { AdminHeader, buttonStyle } from "../_components/AdminPrimitives";
import { AdminProfessionalsInfiniteList, type AdminProfessionalListItem } from "./AdminProfessionalsInfiniteList";
import { professionalAdministrativeApprovalIssues, professionalCompletion } from "@/lib/professional-completeness";
import { deliverProfessionalApprovalSms, deliverProfessionalCommunication } from "@/lib/professional-communications";
import { sendProfessionalLocationEmail, sendProfessionalReminderEmail } from "@/lib/professional-extra-email";
import { resumeProfessionalProfileAssetsAfterApproval } from "@/lib/upload-quarantine";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 12;
const CORRECTION_FIELD_LABELS: Record<string, string> = {
  mainPhoto: "Foto principal", bio: "Biografia", services: "Serviços", location: "Localização",
  prices: "Valores", kyc: "Documento/KYC", contact: "Contato", availability: "Disponibilidade", other: "Outro",
};

const statusLabel: Record<string, string> = {
  DRAFT: "Cadastro incompleto",
  PENDING_REVIEW: "Pendente de aprovação",
  CORRECTION_REQUIRED: "Correção solicitada",
  ACTIVE: "Aprovada",
  PAUSED: "Pausada",
  SUSPENDED: "Suspensa",
  REJECTED: "Reprovada",
};

type ProfessionalApprovalReview = {
  userId: string; displayName: string; status: string; image?: string | null; registrationSubmittedAt?: Date | null; bio: string; city: string; state: string; escortCategory: string | null;
  birthDate: Date | null; attendanceTypes: string[]; servesGenders: string[]; diasDisponiveis: string[];
  services: string[]; price15min: number | null; pricePerHour: number | null; price30min: number | null; price2h: number | null;
  priceOvernight: number | null; priceWebcam: number | null; paymentMethods: string[]; whatsapp: string | null;
  kycSessionId: string | null; kycProvider?: string | null; kycStatus: string; verifStatus: string;
  photos: Array<{ id?: string; url: string; cover?: boolean; order?: number }>; specialties: unknown[];
  user: { blocked: boolean; email: string | null; emailVerified: Date | null; termsConsent: boolean; lgpdConsent: boolean; uploadedAssets: PublicProfileAsset[] };
};

function professionalProfileIssues(professional: ProfessionalApprovalReview) {
  return professionalCompletion({ ...professional, emailVerified: Boolean(professional.user.emailVerified) }).issues.map((issue) => issue.label);
}

function professionalApprovalIssues(professional: ProfessionalApprovalReview) {
  const issues = professionalAdministrativeApprovalIssues({
    ...professional,
    termsConsent: professional.user.termsConsent,
    lgpdConsent: professional.user.lgpdConsent,
  }).map((issue) => issue.label);
  if (professional.status === "DRAFT") issues.unshift("cadastro ainda não enviado para análise");
  else if (professional.status !== "PENDING_REVIEW") issues.unshift(`status ${statusLabel[professional.status] ?? professional.status} não permite aprovação`);
  if (professional.user.blocked) issues.push("conta bloqueada");
  const kycInitiated = Boolean(professional.kycSessionId) ||
    !["NOT_STARTED", "NOT_SENT", ""].includes((professional.kycStatus ?? "").trim().toUpperCase()) ||
    !["NOT_STARTED", "NOT_SENT", ""].includes((professional.verifStatus ?? "").trim().toUpperCase());
  if (!kycInitiated) issues.push("verificação de identidade não iniciada");
  if (professional.kycProvider === "DIDIT" && professional.kycStatus !== "APPROVED") {
    issues.push("verificação de identidade ainda não aprovada pela Didit");
  }
  return issues;
}

async function reviewProfessional(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("professionals:review");
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const correctionFields = formData.getAll("correctionFields").map(String).filter((field) => field in CORRECTION_FIELD_LABELS);
  const moderationReason = reason.trim() || (action === "correction"
    ? "Corrija: " + correctionFields.map((field) => CORRECTION_FIELD_LABELS[field]).join(", ")
    : "");
  const supportedActions = ["approve", "reject", "correction", "suspend", "block", "resume", "approveVideo", "rejectVideo", "disableBoost", "reminder", "approveLocation", "rejectLocation"];
  if (!id || !supportedActions.includes(action)) return;
  if (action === "reminder" && formData.get("confirmReminder") !== "yes") return;
  if (action === "correction" && correctionFields.length === 0) return;
  if (["reject", "suspend", "block", "rejectVideo", "rejectLocation"].includes(action) && moderationReason.length < 4) return;

  if (action === "reminder") {
    const target = await prisma.professional.findUnique({
      where: { id },
      include: { photos: { select: { url: true, cover: true } }, specialties: { select: { name: true } }, user: { select: { id: true, email: true, name: true, emailVerified: true } } },
    });
    if (!target) return;
    const missing = professionalCompletion({ ...target, specialties: target.specialties, emailVerified: target.user.emailVerified }).issues;
    if (!missing.length) return;
    const duplicate = await prisma.auditLog.findFirst({ where: {
      targetType: "PROFESSIONAL", targetId: id, reason: { startsWith: "professional:reminder:" },
      timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    } });
    if (duplicate) return;
    const labels = missing.map((issue) => issue.label + " - etapa " + (issue.step + 1));
    await deliverProfessionalCommunication({
      professionalId: id, userId: target.user.id, email: target.user.email, adminId: session.user.id,
      type: "REGISTRATION_REMINDER", notificationTitle: "Complete seu cadastro", notificationBody: labels.join("; "),
      link: "/profissional/novo", send: () => sendProfessionalReminderEmail(target.user.email!, target.user.name, labels),
    });
    await logAudit({ adminId: session.user.id, action: "SETTINGS_CHANGED", targetType: "PROFESSIONAL", targetId: id,
      changes: { moderationAction: "reminder", missingFields: missing.map((issue) => issue.code) }, reason: "professional:reminder:" + missing.map((issue) => issue.code).join(",") });
    revalidatePath("/admin/profissionais");
    return;
  }

  if (action === "approveLocation" || action === "rejectLocation") {
    const target = await prisma.professional.findUnique({
      where: { id },
      select: { id: true, userId: true, city: true, state: true, bairro: true, currentServiceCity: true, currentServiceState: true, currentServiceNeighborhood: true, user: { select: { email: true, name: true } }, locationChanges: { where: { verificationStatus: "LOCATION_REVIEW_REQUIRED" }, orderBy: { createdAt: "desc" }, take: 1 } },
    });
    const change = target?.locationChanges[0];
    if (!target || !change) return;
    const approved = action === "approveLocation";
    const temporary = change.changeType === "TEMPORARY";
    const from = change.effectiveFrom ?? new Date();
    const appliesNow = !temporary || from <= new Date();
    await prisma.$transaction([
      prisma.professionalLocationChange.update({ where: { id: change.id }, data: { verificationStatus: approved ? "VERIFIED" : "REJECTED", riskReason: approved ? change.riskReason : moderationReason } }),
      prisma.professional.update({ where: { id }, data: approved ? {
        city: appliesNow ? change.toCity : target.city, state: appliesNow ? change.toState : target.state, bairro: appliesNow ? change.toNeighborhood : target.bairro,
        currentServiceCity: appliesNow ? change.toCity : target.currentServiceCity, currentServiceState: appliesNow ? change.toState : target.currentServiceState, currentServiceNeighborhood: appliesNow ? change.toNeighborhood : target.currentServiceNeighborhood,
        locationVerificationStatus: "VERIFIED", locationUpdatedAt: appliesNow ? new Date() : undefined,
        temporaryLocationFrom: temporary ? change.effectiveFrom : null, temporaryLocationUntil: temporary ? change.effectiveUntil : null,
        previousServiceLocation: temporary ? { city: target.currentServiceCity || target.city, state: target.currentServiceState || target.state, neighborhood: target.currentServiceNeighborhood || target.bairro } : Prisma.DbNull,
      } : { locationVerificationStatus: "VERIFIED" } }),
    ]);
    await deliverProfessionalCommunication({
      professionalId: id, userId: target.userId, email: target.user.email, adminId: session.user.id,
      type: approved ? "LOCATION_APPROVED" : "LOCATION_REJECTED",
      notificationTitle: approved ? "Mudança de cidade aprovada" : "Mudança de cidade não aprovada",
      notificationBody: approved ? `Sua localização de atendimento em ${change.toCity}/${change.toState} foi aprovada.` : moderationReason,
      link: "/profissional/localizacao",
      send: () => sendProfessionalLocationEmail(target.user.email!, target.user.name, { city: change.toCity, state: change.toState, approved, rejected: !approved }),
    });
    await logAudit({ adminId: session.user.id, action: "SETTINGS_CHANGED", targetType: "PROFESSIONAL", targetId: id, changes: { moderationAction: action, locationChangeId: change.id }, reason: moderationReason || `professional:${action}` });
    revalidatePath("/admin/profissionais");
    return;
  }

  if (action === "approveVideo" || action === "rejectVideo") {
    await prisma.professional.update({
      where: { id },
      data: action === "approveVideo"
        ? { presentationVideoStatus: "APPROVED", presentationVideoRejectReason: null }
        : { presentationVideoStatus: "REJECTED", presentationVideoRejectReason: moderationReason },
    });
    await logAudit({
      adminId: session.user.id,
      action: "SETTINGS_CHANGED",
      targetType: "CONTENT",
      targetId: id,
      changes: { moderationAction: action },
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
      changes: { moderationAction: action },
      reason: "boost:disabled-by-admin",
    });
    revalidatePath("/admin/profissionais");
    return;
  }

  const data =
    action === "resume"
      ? { status: "ACTIVE" as const, pauseStartedAt: null, pauseUntil: null, pauseReason: null }
      : action === "suspend"
        ? { status: "SUSPENDED" as const, verified: false, rejectReason: moderationReason }
        : action === "correction"
          ? { status: "CORRECTION_REQUIRED" as const, verified: false, rejectReason: moderationReason }
          : { status: "REJECTED" as const, verified: false, rejectReason: moderationReason };

  const professional = action === "approve"
    ? await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`professional-approval:${id}`}))`;
        const current = await tx.professional.findUniqueOrThrow({
          where: { id },
          select: {
            userId: true,
            displayName: true,
            status: true,
            image: true,
            registrationSubmittedAt: true,
            bio: true,
            city: true,
            state: true,
            escortCategory: true,
            birthDate: true,
            attendanceTypes: true,
            servesGenders: true,
            diasDisponiveis: true,
            services: true,
            price15min: true,
            pricePerHour: true,
            price30min: true,
            price2h: true,
            priceOvernight: true,
            priceWebcam: true,
            paymentMethods: true,
            whatsapp: true,
            kycSessionId: true,
            kycProvider: true,
            kycStatus: true,
            verifStatus: true,
            photos: { select: { id: true, url: true, cover: true, order: true } },
            specialties: { take: 1, select: { id: true } },
            user: {
              select: {
                blocked: true,
                email: true,
                emailVerified: true,
                termsConsent: true,
                lgpdConsent: true,
                name: true,
                uploadedAssets: {
                  where: { folder: { startsWith: "profiles" } },
                  select: {
                    id: true, userId: true, folder: true, category: true, status: true, visibility: true,
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
        if (current.status === "ACTIVE") return null;
        if (professionalApprovalIssues(current).length) return null;
        if (current.kycProvider === "DIDIT") {
          const active = await tx.professional.findUnique({ where: { id }, select: { kycSessionId: true, status: true } });
          if (!current.kycSessionId || active?.kycSessionId !== current.kycSessionId || active.status !== "PENDING_REVIEW") return null;
          try {
            const decision = await fetchDigitSessionDecision(current.kycSessionId);
            if (decision.session_id !== current.kycSessionId || !digitVendorDataBelongsToUser(decision.vendor_data, current.userId) || !assessProfessionalDiditDecision(decision).approved) return null;
          } catch {
            // A provider outage must not become a manual identity approval.
            return null;
          }
        }
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
          select: { id: true, userId: true, user: { select: { email: true, name: true } } },
        });
      }, { maxWait: 5_000, timeout: 15_000 })
    : await prisma.professional.update({ where: { id }, data, select: { id: true, userId: true, user: { select: { email: true, name: true } } } });
  if (!professional) return;

  if (action === "approve") {
    const resumedMedia = await resumeProfessionalProfileAssetsAfterApproval({
      professionalId: professional.id,
      userId: professional.userId,
      actorId: session.user.id,
    }).catch((cause) => {
      console.error("[professional-approval] falha ao retomar midias do perfil", {
        professionalId: professional.id,
        error: cause instanceof Error ? cause.message : "Falha desconhecida",
      });
      return [];
    });
    const failedMedia = resumedMedia.filter((result) => result.status === "rejected");
    await logAudit({
      adminId: session.user.id,
      action: "SETTINGS_CHANGED",
      targetType: "PROFESSIONAL",
      targetId: professional.id,
      changes: {
        moderationAction: "resume-profile-media-after-approval",
        attempted: resumedMedia.length,
        failed: failedMedia.length,
        failedAssetIds: failedMedia.map((result) => result.assetId),
      },
      reason: failedMedia.length
        ? "Fotos retomadas parcialmente; falhas permanecem privadas para nova tentativa."
        : "Fotos pendentes retomadas apos aprovacao profissional.",
    });
    await deliverProfessionalCommunication({
      professionalId: id, userId: professional.userId, email: professional.user?.email, adminId: session.user.id,
      type: "PROFILE_APPROVED", notificationTitle: "Cadastro aprovado", notificationBody: "Seu cadastro foi aprovado. Complete informações opcionais no painel; a publicação continua sujeita à moderação.",
      link: "/profissional", send: () => sendProfessionalApprovalEmail(professional.user!.email!, professional.user!.name, professional.id),
    });
    await deliverProfessionalApprovalSms({ professionalId: id, userId: professional.userId, adminId: session.user.id });
  } else if (action === "correction") {
    await deliverProfessionalCommunication({
      professionalId: id, userId: professional.userId, email: professional.user?.email, adminId: session.user.id,
      type: "PROFILE_CORRECTION_REQUIRED", notificationTitle: "Seu cadastro precisa de " + correctionFields.length + " correcao(oes)",
      notificationBody: moderationReason, link: "/profissional/novo?correction=1",
      send: () => sendProfessionalCorrectionEmail(professional.user!.email!, professional.user!.name, moderationReason),
    });
  } else if (action === "reject" || action === "block") {
    await deliverProfessionalCommunication({
      professionalId: id, userId: professional.userId, email: professional.user?.email, adminId: session.user.id,
      type: "PROFILE_REJECTED", notificationTitle: "Atualização sobre seu cadastro", notificationBody: moderationReason,
      link: "/profissional/analise", send: () => sendProfessionalRejectionEmail(professional.user!.email!, professional.user!.name, moderationReason),
    });
  }
  if (action === "block") {
    await prisma.user.update({ where: { id: professional.userId }, data: { blocked: true, blockReason: moderationReason, blockedAt: new Date() } });
  }

  await logAudit({
    adminId: session.user.id,
    action: action === "approve" ? "PROFESSIONAL_APPROVED" : action === "reject" || action === "block" ? "PROFESSIONAL_REJECTED" : "SETTINGS_CHANGED",
    targetType: "PROFESSIONAL",
    targetId: id,
    changes: { moderationAction: action, correctionFields, resultingStatus: action === "approve" || action === "resume" ? "ACTIVE" : action === "suspend" ? "SUSPENDED" : action === "correction" ? "CORRECTION_REQUIRED" : "REJECTED" },
    reason: moderationReason || `professional:${action}`,
  });
  revalidatePath("/admin/profissionais");
}

type AdminProfessionalFilters = {
  status?: string;
  access?: string;
  kyc?: string;
  query?: string;
  professionalId?: string;
  snapshotAt: string;
};

function professionalWhere(filters: AdminProfessionalFilters): Prisma.ProfessionalWhereInput {
  const now = new Date();
  const clauses: Prisma.ProfessionalWhereInput[] = [{ createdAt: { lte: new Date(filters.snapshotAt) } }];
  if (filters.professionalId) clauses.push({ id: filters.professionalId });
  if (filters.status && filters.status !== "ALL") {
    clauses.push({ status: filters.status as "DRAFT" | "PENDING_REVIEW" | "CORRECTION_REQUIRED" | "ACTIVE" | "PAUSED" | "SUSPENDED" | "REJECTED" });
  }
  if (filters.kyc && filters.kyc !== "ALL") clauses.push({ kycStatus: filters.kyc });
  if (filters.query) {
    clauses.push({ OR: [
      { displayName: { contains: filters.query, mode: "insensitive" } },
      { user: { name: { contains: filters.query, mode: "insensitive" } } },
    ] });
  }
  if (filters.access === "TRIAL") clauses.push({ accessGrandfathered: false, freeAccessEndsAt: { gt: now } });
  if (filters.access === "TRIAL_EXPIRED") clauses.push({ accessGrandfathered: false, freeAccessEndsAt: { lte: now }, billingStatus: "TRIAL_EXPIRED" });
  if (filters.access === "ACTIVE") clauses.push({ billingStatus: "ACTIVE" });
  if (filters.access === "GRANDFATHERED") clauses.push({ accessGrandfathered: true });
  return clauses.length === 1 ? clauses[0] : { AND: clauses };
}

async function professionalListItems(where: Prisma.ProfessionalWhereInput, offset: number) {
  const professionals = await prisma.professional.findMany({
    where,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }, { id: "desc" }],
    skip: offset,
    take: PAGE_SIZE,
    include: {
      submissionReceipt: { select: { status: true, sentAt: true, createdAt: true, updatedAt: true } },
      user: {
        select: {
          name: true, email: true, phone: true, city: true, state: true, birthDate: true, category: true,
          emailVerified: true,
          termsConsent: true, lgpdConsent: true,
          blocked: true, blockReason: true, blockedAt: true, kycSubmittedAt: true, kycReviewedAt: true,
          kycRejectionReason: true, premiumUntil: true, createdAt: true, updatedAt: true,
          uploadedAssets: {
            where: { folder: { startsWith: "profiles" } },
            select: {
              id: true, userId: true, folder: true, category: true, status: true, visibility: true,
              moderationStatus: true, approvedBucket: true, approvedPath: true,
            },
          },
        },
      },
      photos: { orderBy: { order: "asc" }, select: { id: true, url: true, cover: true, order: true, caption: true, createdAt: true } },
      specialties: { select: { id: true, name: true } },
      locationChanges: { orderBy: { createdAt: "desc" }, take: 3, select: {
        id: true, fromCity: true, fromState: true, fromNeighborhood: true, toCity: true, toState: true,
        toNeighborhood: true, changeType: true, effectiveFrom: true, effectiveUntil: true,
        verificationStatus: true, riskReason: true, createdAt: true,
      } },
    },
  });
  const auditEntries = professionals.length ? await prisma.auditLog.findMany({
    where: { targetType: { in: ["PROFESSIONAL", "CONTENT"] }, targetId: { in: professionals.map((professional) => professional.id) } },
    orderBy: { timestamp: "desc" },
    take: PAGE_SIZE * 6,
    select: {
      id: true, targetId: true, action: true, reason: true, changes: true, actorIdentifier: true, timestamp: true,
      admin: { select: { name: true, email: true } },
    },
  }) : [];
  const auditsByProfessional = new Map<string, typeof auditEntries>();
  for (const entry of auditEntries) {
    const entries = auditsByProfessional.get(entry.targetId) ?? [];
    if (entries.length < 6) entries.push(entry);
    auditsByProfessional.set(entry.targetId, entries);
  }
  return professionals.map((professional) => ({
    professional,
    profileIssues: professionalProfileIssues(professional),
    approvalIssues: professionalApprovalIssues(professional),
    audits: auditsByProfessional.get(professional.id) ?? [],
  })) as unknown as AdminProfessionalListItem[];
}

async function loadMoreProfessionals(input: AdminProfessionalFilters & { offset: number }) {
  "use server";
  await requireAdmin("professionals:review");
  const filters: AdminProfessionalFilters = {
    status: input.status?.slice(0, 40),
    access: input.access?.slice(0, 40),
    kyc: input.kyc?.slice(0, 40),
    query: input.query?.trim().slice(0, 100),
    professionalId: input.professionalId?.trim().slice(0, 100),
    snapshotAt: Number.isNaN(Date.parse(input.snapshotAt)) ? new Date().toISOString() : input.snapshotAt,
  };
  const offset = Math.max(0, Math.min(10_000, Math.floor(Number(input.offset) || 0)));
  const where = professionalWhere(filters);
  const [items, total] = await Promise.all([
    professionalListItems(where, offset),
    prisma.professional.count({ where }),
  ]);
  return { items, hasMore: offset + items.length < total };
}

export default async function AdminProfissionaisPage({ searchParams }: { searchParams?: Promise<{ status?: string; access?: string; kyc?: string; q?: string; professionalId?: string }> }) {
  await requireAdmin("professionals:review");
  const params = await searchParams;
  const status = params?.status;
  const accessFilter = params?.access;
  const kycFilter = params?.kyc;
  const query = params?.q?.trim().slice(0, 100);
  const professionalId = params?.professionalId?.trim();
  const snapshotAt = new Date().toISOString();
  const filters: AdminProfessionalFilters = { status, access: accessFilter, kyc: kycFilter, query, professionalId, snapshotAt };
  const where = professionalWhere(filters);
  const billingSettings = await getProfessionalBillingSettings();
  const [total, initialItems] = await Promise.all([
    prisma.professional.count({ where }),
    professionalListItems(where, 0),
  ]);

  return (
    <div>
      <AdminHeader
        title="Acompanhantes e profissionais"
        subtitle="Analise cadastro, documentos, selfie/vídeo, KYC, fotos públicas, descrição, serviços, cidade e histórico de moderação."
      />

      {/* ── Filtros ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {["ALL", "DRAFT", "PENDING_REVIEW", "CORRECTION_REQUIRED", "ACTIVE", "PAUSED", "REJECTED", "SUSPENDED"].map((item) => {
          const active = item === (status ?? "ALL");
          return (
            <Link
              prefetch={false}
              key={item}
              href={(() => {
                const query = new URLSearchParams();
                if (item !== "ALL") query.set("status", item);
                if (accessFilter) query.set("access", accessFilter);
                if (kycFilter) query.set("kyc", kycFilter);
                if (params?.q) query.set("q", params.q);
                return `/admin/profissionais${query.size ? `?${query}` : ""}`;
              })()}
              style={{
                ...buttonStyle,
                textDecoration: "none",
                background: active ? "#f3dcff" : "#ffffff",
                border: active ? "1px solid #c96aff" : "1px solid #e5dce9",
                color: active ? "#8f1fd1" : "#676170",
              }}
            >
              {item === "ALL" ? "Todos" : statusLabel[item] ?? item}
            </Link>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "-8px 0 20px" }} aria-label="Filtros de acesso profissional">
        {[{ key: "", label: "Todos os acessos" }, { key: "TRIAL", label: "Trial ativo" }, { key: "TRIAL_EXPIRED", label: "Trial encerrado" }, { key: "ACTIVE", label: "Assinatura ativa" }, { key: "GRANDFATHERED", label: "Conta legada" }].map((item) => {
          const active = item.key === (accessFilter ?? "");
          const query = new URLSearchParams();
          if (status && status !== "ALL") query.set("status", status);
          if (item.key) query.set("access", item.key);
          if (kycFilter) query.set("kyc", kycFilter);
          if (params?.q) query.set("q", params.q);
          return <Link prefetch={false} key={item.key || "all-access"} href={`/admin/profissionais${query.size ? `?${query}` : ""}`} style={{ ...buttonStyle, textDecoration: "none", background: active ? "#f3dcff" : "#fff", color: active ? "#8f1fd1" : "#676170" }}>{item.label}</Link>;
        })}
      </div>

      <form method="get" className="admin-professional-search">
        {status && status !== "ALL" ? <input type="hidden" name="status" value={status} /> : null}
        {accessFilter ? <input type="hidden" name="access" value={accessFilter} /> : null}
        <label>
          <span>Busca por nome</span>
          <input name="q" type="search" defaultValue={params?.q ?? ""} placeholder="Nome profissional ou nome da conta" />
        </label>
        <label>
          <span>Status KYC</span>
          <select name="kyc" defaultValue={kycFilter ?? "ALL"}>
            <option value="ALL">Todos</option>
            <option value="NOT_STARTED">Não iniciada</option>
            <option value="PENDING">Pendente</option>
            <option value="APPROVED">Aprovada</option>
            <option value="REJECTED">Reprovada</option>
            <option value="KYC_MANUAL_PENDENTE">Análise manual</option>
          </select>
        </label>
        <button type="submit">Aplicar filtros</button>
        {(params?.q || kycFilter) ? <Link href="/admin/profissionais" prefetch={false}>Limpar busca</Link> : null}
      </form>

      <p className="admin-professional-total"><strong>{total.toLocaleString("pt-BR")}</strong> profissionais encontradas</p>

      {/* ── Lista contínua ── */}
      <AdminProfessionalsInfiniteList
        key={`${status ?? "ALL"}:${accessFilter ?? "ALL"}:${kycFilter ?? "ALL"}:${query ?? ""}:${professionalId ?? ""}`}
        initialItems={initialItems}
        total={total}
        filters={filters}
        billingEnabled={billingSettings.billingEnabled}
        loadMoreAction={loadMoreProfessionals}
        reviewAction={reviewProfessional}
      />
      <style>{`
        .admin-professional-search { display:grid; grid-template-columns:minmax(220px,1fr) minmax(170px,240px) auto auto; align-items:end; gap:10px; margin:0 0 14px; padding:14px; border:1px solid #e7dfe9; border-radius:12px; background:#fff; }
        .admin-professional-search label { display:grid; gap:5px; color:#625a67; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.5px; }
        .admin-professional-search input,.admin-professional-search select { min-height:42px; padding:9px 11px; border:1px solid #dcd3df; border-radius:9px; background:#fff; color:#29242d; font:inherit; font-size:14px; text-transform:none; letter-spacing:0; }
        .admin-professional-search button,.admin-professional-search>a { min-height:42px; display:grid; place-items:center; padding:9px 14px; border:1px solid #8f1fd1; border-radius:9px; background:#8f1fd1; color:#fff; font-size:12px; font-weight:900; text-decoration:none; }
        .admin-professional-search>a { border-color:#dcd3df; background:#fff; color:#625a67; }
        .admin-professional-total { margin:0 0 14px; color:#625a67; font-size:14px; }
        .pro-card { background:#fff; border:1px solid #e7dfe9; border-left:4px solid; border-radius:14px; overflow:hidden; content-visibility:auto; contain-intrinsic-size:720px; color:#27232c; }
        .pro-card-head { display:flex; justify-content:space-between; align-items:center; gap:14px; padding:14px 18px; background:#fcf9fd; }
        .pro-identity,.pro-head-status { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .pro-identity img,.pro-identity>span { width:44px; height:44px; border-radius:50%; object-fit:cover; background:#f4e9f8; display:grid; place-items:center; font-weight:900; }
        .pro-identity a { color:#18151b; font-weight:900; text-decoration:none; } .pro-identity p { margin:3px 0 0; color:#756e79; font-size:12px; }
        .pro-head-status { justify-content:flex-end; } .pro-head-status small { color:#756e79; }
        .pro-kyc { font-size:11px; font-weight:800; padding:5px 9px; border-radius:999px; border:1px solid; } .pro-kyc.ok { color:#168544; background:#edf9f1; border-color:#a9e6bf; } .pro-kyc.bad { color:#c52b2b; background:#fff1f1; border-color:#f2b5b5; } .pro-kyc.pending { color:#8620b8; background:#faf0ff; border-color:#dfb3f5; }
        .admin-professional-details>summary { cursor:pointer; list-style:none; padding:11px 18px; border-top:1px solid #eee8f1; color:#8f1fd1; font-size:12px; font-weight:900; }
        .admin-professional-details>summary::-webkit-details-marker { display:none; } .admin-professional-details>summary::after { content:"＋"; float:right; } .admin-professional-details[open]>summary::after { content:"−"; }
        .pro-detail-layout { display:grid; grid-template-columns:minmax(0,1fr) 290px; border-top:1px solid #eee8f1; }
        .pro-sections { padding:16px; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; background:#faf9fb; }
        .pro-section { min-width:0; padding:16px; border:1px solid #e8e0eb; border-radius:12px; background:#fff; } .pro-section h3,.pro-actions h3 { margin:0 0 13px; color:#6f247f; font-size:11px; letter-spacing:1.3px; }
        .pro-row { display:grid; grid-template-columns:minmax(105px,42%) minmax(0,1fr); gap:8px; padding:5px 0; border-bottom:1px solid #f2edf4; font-size:12px; } .pro-row>span { color:#77707c; } .pro-row>strong { overflow-wrap:anywhere; color:#29242d; font-weight:700; }
        .pro-subtitle { margin:14px 0 7px; color:#716978; font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:1px; } .pro-subtitle.danger { color:#c52b2b; } .pro-empty { color:#8b838f; font-size:12px; margin:6px 0; }
        .pro-tags { display:flex; gap:5px; flex-wrap:wrap; } .pro-tags span { background:#f6ecfa; border:1px solid #ead6f2; color:#68207c; padding:4px 7px; border-radius:6px; font-size:11px; font-weight:700; }
        .pro-metrics { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; margin-bottom:10px; } .pro-metrics b { text-align:center; padding:8px 3px; background:#faf5fc; border-radius:8px; color:#7d2097; } .pro-metrics span { display:block; font-size:9px; color:#7c747f; font-weight:600; margin-top:2px; }
        .pro-cover { display:flex; align-items:center; gap:9px; font-size:11px; color:#6d6671; } .pro-cover img { width:58px; height:58px; border-radius:8px; object-fit:cover; } .pro-bio { color:#4d4651; font-size:12px; line-height:1.55; max-height:96px; overflow:auto; white-space:pre-wrap; }
        .pro-alert { display:flex; flex-direction:column; gap:3px; margin-top:10px; padding:9px 10px; border:1px solid; border-radius:8px; font-size:11px; } .pro-alert.ok { color:#167440; background:#effaf3; border-color:#b7e7c8; } .pro-alert.bad { color:#b32626; background:#fff2f2; border-color:#f2bcbc; } .pro-alert.warn { color:#995515; background:#fff8eb; border-color:#f0d39d; } .pro-alert.neutral { color:#57505c; background:#f8f5f9; border-color:#dfd7e2; }
        .pro-lifecycle,.pro-issues { display:flex; flex-wrap:wrap; gap:5px; } .pro-lifecycle span,.pro-issues span { padding:5px 7px; border-radius:6px; font-size:10px; border:1px solid #e2dce4; color:#908792; } .pro-lifecycle span.active { color:#15733d; border-color:#afe0c0; background:#effaf3; font-weight:800; } .pro-issues span { color:#bd2929; background:#fff2f2; border-color:#f1bbbb; }
        .pro-history { margin:7px 0 0; padding-left:18px; } .pro-history li { padding:5px 0; font-size:11px; } .pro-history li span,.pro-history li small { display:block; color:#756e79; margin-top:2px; }
        .pro-actions { padding:18px; border-left:1px solid #e8e0eb; } .pro-actions form { display:flex; flex-direction:column; gap:10px; position:sticky; top:16px; } .pro-actions textarea { width:100%; box-sizing:border-box; min-height:76px; resize:vertical; padding:10px; color:#29242d; background:#faf9fb; border:1px solid #dcd3df; border-radius:8px; }
        .pro-approve { padding:12px; border:0; border-radius:9px; background:linear-gradient(135deg,#15803d,#22c55e); color:#fff; font-weight:900; } .pro-approve:disabled { background:#eee9f0; color:#8b838f; cursor:not-allowed; }
        .pro-action-grid { display:grid; grid-template-columns:1fr 1fr; gap:7px; } .pro-action-grid button { padding:9px 7px; border-radius:8px; background:#fff; border:1px solid #dcd3df; color:#4b4450; font-weight:800; } .pro-action-grid .danger-button { color:#c52b2b; border-color:#f0b8b8; background:#fff6f6; } .pro-action-grid .warn-button { color:#b45d11; border-color:#efc897; background:#fff9f1; } .pro-action-grid .full { grid-column:1/-1; }
        .pro-admin-meta { margin-top:18px; } code { font-size:10px; overflow-wrap:anywhere; }
        .pro-gallery { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:7px; margin-top:8px; } .pro-gallery a { position:relative; min-width:0; aspect-ratio:1; overflow:hidden; border:1px solid #e6dbe9; border-radius:9px; background:#f5eef7; } .pro-gallery a.cover { grid-column:span 2; grid-row:span 2; } .pro-gallery img { width:100%; height:100%; object-fit:cover; display:block; } .pro-gallery span { position:absolute; inset:auto 4px 4px; padding:3px 5px; border-radius:5px; background:rgba(20,14,23,.78); color:#fff; font-size:9px; text-align:center; }
        .pro-admin-video { width:100%; max-height:260px; margin-top:8px; border-radius:9px; background:#161218; }
        .admin-kyc-evidence { margin-top:12px; display:grid; gap:8px; } .admin-evidence-actions { display:flex; flex-wrap:wrap; gap:7px; } .admin-evidence-actions button,.admin-didit-load { padding:8px 10px; border:1px solid #d7c7dd; border-radius:8px; background:#faf5fc; color:#72218a; font-size:11px; font-weight:800; cursor:pointer; } .admin-evidence-actions button:disabled,.admin-didit-load:disabled { cursor:wait; opacity:.65; }
        .admin-didit-result { display:grid; gap:7px; padding:10px; border:1px solid #e6dcea; border-radius:9px; background:#fcf9fd; } .didit-decision,.didit-block { display:grid; gap:3px; padding:8px; border-radius:7px; background:#fff; border:1px solid #eee7f0; font-size:10px; overflow-wrap:anywhere; } .didit-decision.ok { border-color:#afe0c0; background:#effaf3; } .didit-decision.bad { border-color:#f1bbbb; background:#fff2f2; } .didit-block span { color:#746c78; } .didit-block em,.admin-evidence-error { color:#bd2929; font-style:normal; }
        .admin-evidence-modal { position:fixed; z-index:10000; inset:0; display:grid; place-items:center; padding:24px; background:rgba(13,9,15,.88); } .admin-evidence-modal>div { width:min(920px,100%); max-height:92dvh; overflow:auto; padding:14px; border-radius:14px; background:#fff; box-shadow:0 28px 90px rgba(0,0,0,.45); } .admin-evidence-modal header { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:10px; } .admin-evidence-modal button { border:0; border-radius:8px; padding:8px 11px; background:#761d91; color:#fff; font-weight:800; } .admin-evidence-modal img { display:block; width:100%; max-height:75dvh; object-fit:contain; background:#151217; border-radius:9px; }
        @media (max-width:1150px) { .pro-detail-layout { grid-template-columns:1fr; } .pro-actions { border-left:0; border-top:1px solid #e8e0eb; } .pro-actions form { position:static; } }
        @media (max-width:760px) { .admin-professional-search { grid-template-columns:1fr; } .pro-card-head { align-items:flex-start; } .pro-head-status { justify-content:flex-start; } .pro-sections { grid-template-columns:1fr; padding:10px; } .pro-section { padding:13px; } .pro-detail-layout { display:block; } .pro-row { grid-template-columns:1fr; gap:2px; } .pro-metrics { grid-template-columns:repeat(2,1fr); } }
      `}</style>
    </div>
  );
}

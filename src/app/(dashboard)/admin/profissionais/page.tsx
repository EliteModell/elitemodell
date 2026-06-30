import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-access";
import { logAudit } from "@/lib/audit";
import { personaProviderLabel } from "@/lib/persona";
import { professionalApprovalAccessData } from "@/lib/professional-access";
import { filterApprovedProfilePhotos, type PublicProfileAsset } from "@/lib/public-professional-media";
import { sendProfessionalApprovalEmail } from "@/lib/auth-email";
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
  kycStatus: string;
  verifStatus: string;
  photos: Array<{ id?: string; url: string; cover?: boolean; order?: number }>;
  specialties: unknown[];
  user: { blocked: boolean; email: string | null; uploadedAssets: PublicProfileAsset[] };
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
  const kycInitiated = Boolean(professional.kycSessionId) ||
    !["NOT_STARTED", "NOT_SENT", ""].includes((professional.kycStatus ?? "").trim().toUpperCase()) ||
    !["NOT_STARTED", "NOT_SENT", ""].includes((professional.verifStatus ?? "").trim().toUpperCase());
  if (!kycInitiated) issues.push("verificação de identidade não iniciada");
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
            kycStatus: true,
            verifStatus: true,
            photos: { select: { id: true, url: true, cover: true, order: true } },
            specialties: { take: 1, select: { id: true } },
            user: {
              select: {
                blocked: true,
                email: true,
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
          select: { id: true, userId: true, user: { select: { email: true } } },
        });
      })
    : await prisma.professional.update({ where: { id }, data, select: { id: true, userId: true, user: { select: { email: true } } } });
  if (!professional) return;

  if (action === "approve" && professional.user?.email) {
    sendProfessionalApprovalEmail(professional.user.email).catch((err) => {
      console.error("[admin-approve] falha ao enviar e-mail de aprovação:", err);
    });
  }
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
      <AdminHeader
        title="Acompanhantes e profissionais"
        subtitle="Analise cadastro, documentos, selfie/vídeo, KYC, fotos públicas, descrição, serviços, cidade e histórico de moderação."
      />

      {/* ── Filtros ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {["ALL", "DRAFT", "PENDING_REVIEW", "ACTIVE", "PAUSED", "REJECTED", "SUSPENDED"].map((item) => {
          const active = item === (status ?? "ALL");
          return (
            <Link
              prefetch={false}
              key={item}
              href={item === "ALL" ? "/admin/profissionais" : `/admin/profissionais?status=${item}`}
              style={{
                ...buttonStyle,
                textDecoration: "none",
                background: active ? "rgba(212,168,67,0.22)" : "rgba(255,255,255,0.03)",
                border: active ? "1px solid rgba(212,168,67,0.5)" : "1px solid rgba(255,255,255,0.08)",
                color: active ? "#f5d78c" : "#94a3b8",
              }}
            >
              {item === "ALL" ? "Todos" : statusLabel[item] ?? item}
            </Link>
          );
        })}
      </div>

      {/* ── Cards ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {professionals.map((pro) => {
          const approvalIssues = professionalApprovalIssues(pro);
          const canApprove = approvalIssues.length === 0;

          const statusTone: "success" | "danger" | "warning" | "neutral" =
            pro.status === "ACTIVE" ? "success" :
            pro.status === "REJECTED" || pro.status === "SUSPENDED" ? "danger" :
            pro.status === "PENDING_REVIEW" ? "warning" : "neutral";

          const accent =
            pro.status === "ACTIVE" ? "#22c55e" :
            pro.status === "REJECTED" || pro.status === "SUSPENDED" ? "#ef4444" :
            pro.status === "PENDING_REVIEW" ? "#d4a843" : "#475569";

          const kycColor =
            (pro.kycStatus ?? "").toUpperCase() === "APPROVED" ? "#22c55e" :
            (pro.kycStatus ?? "").toUpperCase() === "REJECTED" ? "#ef4444" :
            pro.kycSessionId ? "#d4a843" : "#475569";

          const label = (text: string) => (
            <span style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 2, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>{text}</span>
          );

          return (
            <div
              key={pro.id}
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderLeft: `3px solid ${accent}`,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              {/* ── Cabeçalho do card ── */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                flexWrap: "wrap", gap: 10,
                padding: "13px 20px",
                background: "rgba(255,255,255,0.02)",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                    background: `${accent}18`, border: `2px solid ${accent}44`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 17, fontWeight: 900, color: accent,
                  }}>
                    {(pro.displayName || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <Link href={`/profissionais/${pro.slug}`} style={{ color: "#fff", fontWeight: 900, fontSize: 15, textDecoration: "none" }}>
                      {pro.displayName || "(sem nome)"}
                    </Link>
                    <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>
                      {[pro.city, pro.state].filter(Boolean).join(", ") || "—"} · {pro.escortCategory ?? "sem categoria"}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <StatusPill tone={statusTone}>{statusLabel[pro.status] ?? pro.status}</StatusPill>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "4px 9px", borderRadius: 999,
                    background: `${kycColor}14`, color: kycColor, border: `1px solid ${kycColor}44`,
                  }}>
                    KYC: {kycProviderLabel(pro.kycProvider, pro.kycSessionId)} · {translatedTechnicalStatus(pro.kycStatus)}
                  </span>
                  <span style={{ fontSize: 11, color: "#475569" }}>
                    Cadastro: {pro.createdAt.toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>

              {/* ── Corpo: info à esquerda, ações à direita ── */}
              <div style={{ display: "flex", gap: 0 }}>

                {/* ── Área de info (flex 1) ── */}
                <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", borderRight: "1px solid rgba(255,255,255,0.06)" }}>

                  {/* Contato + KYC + Pendências */}
                  <div style={{ padding: "20px 24px", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
                    <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 900, letterSpacing: 1.8, color: "#475569", textTransform: "uppercase" }}>Contato</p>
                    <div style={{ fontSize: 14, color: "#e2e8f0", marginBottom: 16, lineHeight: 1.7 }}>
                      <div>{pro.user.email || "—"}</div>
                      <div style={{ color: "#94a3b8" }}>{pro.whatsapp ?? pro.user.phone ?? "—"}</div>
                    </div>

                    <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 900, letterSpacing: 1.8, color: "#475569", textTransform: "uppercase" }}>KYC</p>
                    <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 16, lineHeight: 1.7 }}>
                      {pro.kycSessionId && (
                        <div style={{ fontFamily: "monospace", fontSize: 11, color: "#475569" }}>
                          {pro.kycSessionId.slice(0, 20)}…
                        </div>
                      )}
                      <div>Doc: {translatedTechnicalStatus(pro.docStatus)} · Face: {translatedTechnicalStatus(pro.verifStatus)}</div>
                      {pro.verificationUrl && <div>Verificação: {verificationTypeLabel(pro.verificationType)}</div>}
                      {pro.presentationVideoUrl && (
                        <div style={{ color: pro.presentationVideoStatus === "APPROVED" ? "#22c55e" : "#d4a843" }}>
                          Vídeo: {translatedTechnicalStatus(pro.presentationVideoStatus)}
                        </div>
                      )}
                    </div>

                    {/* Pendências */}
                    {approvalIssues.length > 0 ? (
                      <>
                        <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 900, letterSpacing: 1.8, color: "#ef4444", textTransform: "uppercase" }}>
                          {approvalIssues.length} Pendência{approvalIssues.length > 1 ? "s" : ""}
                        </p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                          {approvalIssues.map((issue, i) => (
                            <span key={i} style={{
                              fontSize: 12, color: "#fca5a5",
                              padding: "5px 10px", borderRadius: 6,
                              background: "rgba(239,68,68,0.10)",
                              border: "1px solid rgba(239,68,68,0.22)",
                              lineHeight: 1.4,
                            }}>
                              {issue}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)" }}>
                        <span style={{ fontSize: 13, color: "#4ade80", fontWeight: 700 }}>✓ Sem pendências — pronta para aprovar</span>
                      </div>
                    )}

                    {pro.rejectReason && (
                      <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)" }}>
                        <span style={{ fontSize: 12, color: "#fca5a5" }}>Motivo: {reviewReasonLabel(pro.rejectReason)}</span>
                      </div>
                    )}
                    {pro.pauseUntil && (
                      <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.22)" }}>
                        <span style={{ fontSize: 12, color: "#f5d78c" }}>Pausada até {pro.pauseUntil.toLocaleDateString("pt-BR")}</span>
                      </div>
                    )}
                  </div>

                  {/* Métricas + Bio + Acesso */}
                  <div style={{ padding: "20px 24px" }}>
                    <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 900, letterSpacing: 1.8, color: "#475569", textTransform: "uppercase" }}>Perfil & Métricas</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", fontSize: 13, marginBottom: 18 }}>
                      {([
                        ["Fotos", pro.photos.length, pro.photos.length === 0],
                        ["Uploads", pro.user.uploadedAssets.length, false],
                        ["Serviços", pro.services.length, pro.services.length === 0],
                        ["Especialidades", pro.specialties.length, false],
                        ["Views", pro.profileViews, false],
                        ["Contatos", pro.contactClicks, false],
                        ["Nota", `${pro.rating.toFixed(1)} (${pro.totalReviews})`, false],
                        ["Boost", pro.boostActive ? "Ativo" : "Off", false],
                      ] as [string, string | number, boolean][]).map(([lbl, val, warn]) => (
                        <div key={lbl}>
                          <span style={{ color: "#64748b", fontSize: 12 }}>{lbl} </span>
                          <span style={{ fontWeight: 800, color: warn ? "#ef4444" : lbl === "Boost" && pro.boostActive ? "#d4a843" : "#e2e8f0" }}>
                            {String(val)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 900, letterSpacing: 1.8, color: "#475569", textTransform: "uppercase" }}>Bio</p>
                    <div style={{ fontSize: 13, marginBottom: 16 }}>
                      <span style={{ color: "#64748b" }}>{pro.bio.length} caracteres</span>
                      {pro.bio.trim().length > 0 ? (
                        <p style={{ margin: "4px 0 0", color: "#94a3b8", lineHeight: 1.6, fontSize: 13 }}>
                          "{pro.bio.trim().slice(0, 120)}{pro.bio.trim().length > 120 ? "…" : ""}"
                        </p>
                      ) : (
                        <p style={{ margin: "4px 0 0", color: "#ef4444", fontSize: 13 }}>Vazia</p>
                      )}
                    </div>

                    <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 900, letterSpacing: 1.8, color: "#475569", textTransform: "uppercase" }}>Acesso</p>
                    <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>
                      {pro.accessGrandfathered
                        ? "Legado — sem bloqueio"
                        : pro.freeAccessEndsAt
                          ? `Gratuito até ${pro.freeAccessEndsAt.toLocaleDateString("pt-BR")}`
                          : "Inicia na aprovação"}
                      <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
                        {pro.hidePhone ? "Tel oculto" : "Tel visível"} · {pro.hideAge ? "Idade oculta" : "Idade visível"}
                        {pro.listingPhoneUntil && pro.listingPhoneUntil > now
                          ? ` · Listagem ativa até ${pro.listingPhoneUntil.toLocaleDateString("pt-BR")}`
                          : ""}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Painel de Ações (largura fixa) ── */}
                <div style={{ width: 280, flexShrink: 0, padding: "20px 20px" }}>
                  <p style={{ margin: "0 0 14px", fontSize: 10, fontWeight: 900, letterSpacing: 1.8, color: "#475569", textTransform: "uppercase" }}>Ações</p>
                  <form action={reviewProfessional} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <input type="hidden" name="id" value={pro.id} />

                    {/* Aprovar — destaque máximo */}
                    <button
                      name="action"
                      value="approve"
                      disabled={!canApprove}
                      title={!canApprove ? `Pendências: ${approvalIssues.join(", ")}` : "Aprovar profissional"}
                      style={{
                        width: "100%", padding: "13px 16px",
                        borderRadius: 10, border: "none",
                        fontSize: 15, fontWeight: 900, letterSpacing: 0.3,
                        cursor: canApprove ? "pointer" : "not-allowed",
                        background: canApprove
                          ? "linear-gradient(135deg, #15803d, #22c55e)"
                          : "rgba(255,255,255,0.05)",
                        color: canApprove ? "#fff" : "#475569",
                        boxShadow: canApprove ? "0 4px 16px rgba(34,197,94,0.25)" : "none",
                      }}
                    >
                      {canApprove ? "✓ Aprovar agora" : "Aprovar (bloqueado)"}
                    </button>

                    {/* Textarea */}
                    <textarea
                      name="reason"
                      placeholder="Motivo (obrigatório para reprovar, corrigir, suspender ou bloquear)"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 8, color: "#e2e8f0",
                        padding: "10px 12px", fontSize: 13,
                        minHeight: 64, resize: "vertical",
                        width: "100%", boxSizing: "border-box",
                        lineHeight: 1.5,
                      }}
                    />

                    {/* Ações secundárias */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                      {pro.status === "PAUSED" && (
                        <button name="action" value="resume" style={{ ...buttonStyle, fontSize: 13, padding: "9px 12px", gridColumn: "1/-1" }}>
                          Reativar
                        </button>
                      )}
                      <button name="action" value="reject" style={{ ...buttonStyle, fontSize: 13, padding: "9px 12px", color: "#ef4444", borderColor: "rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.07)" }}>
                        Reprovar
                      </button>
                      <button name="action" value="correction" style={{ ...buttonStyle, fontSize: 13, padding: "9px 12px", color: "#fb923c", borderColor: "rgba(251,146,60,0.35)", background: "rgba(251,146,60,0.07)" }}>
                        Corrigir
                      </button>
                      <button name="action" value="suspend" style={{ ...buttonStyle, fontSize: 13, padding: "9px 12px", color: "#fb923c", borderColor: "rgba(251,146,60,0.35)", background: "rgba(251,146,60,0.07)" }}>
                        Suspender
                      </button>
                      <button name="action" value="block" style={{ ...buttonStyle, fontSize: 13, padding: "9px 12px", color: "#ef4444", borderColor: "rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.07)" }}>
                        Bloquear
                      </button>
                      {pro.presentationVideoUrl ? (
                        <>
                          <button name="action" value="approveVideo" style={{ ...buttonStyle, fontSize: 13, padding: "9px 12px" }}>✓ Vídeo</button>
                          <button name="action" value="rejectVideo" style={{ ...buttonStyle, fontSize: 13, padding: "9px 12px", color: "#ef4444", borderColor: "rgba(239,68,68,0.35)" }}>✗ Vídeo</button>
                        </>
                      ) : null}
                      {pro.boostActive ? (
                        <button name="action" value="disableBoost" style={{ ...buttonStyle, fontSize: 13, padding: "9px 12px", color: "#fb923c", borderColor: "rgba(251,146,60,0.35)", gridColumn: "1/-1" }}>
                          Desativar boost
                        </button>
                      ) : null}
                    </div>
                  </form>
                </div>

              </div>
            </div>
          );
        })}

        {!professionals.length && (
          <div style={{ textAlign: "center", padding: "48px 20px", color: "#475569", fontSize: 14 }}>
            Nenhuma profissional encontrada para este filtro.
          </div>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <AdminPagination basePath="/admin/profissionais" page={page} pageSize={PAGE_SIZE} total={total} query={{ status }} />
      </div>
    </div>
  );
}

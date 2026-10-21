/* eslint-disable @next/next/no-img-element -- Admin preview is a protected dynamic endpoint. */

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { isReadyForHumanContentReview, manualMediaReviewBlockers } from "@/lib/manual-media-review";
import {
  approveUploadAsset,
  escalateUploadAsset,
  processUploadAsset,
  rejectUploadAsset,
} from "@/lib/upload-quarantine";
import { AdminHeader, AdminPanel, StatusPill } from "../../_components/AdminPrimitives";

export const dynamic = "force-dynamic";

async function reviewUpload(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("reports:manage");
  const assetId = String(formData.get("assetId") || "");
  const action = String(formData.get("action") || "");
  const reason = String(formData.get("reason") || "").trim();
  if (!assetId || reason.length < 4) return;

  if (action === "APPROVE") {
    await approveUploadAsset(assetId, session.user.id, reason);
  } else if (action === "REJECT") {
    await rejectUploadAsset(assetId, session.user.id, reason);
  } else if (action === "REPROCESS") {
    await processUploadAsset(assetId);
  } else if (action === "ESCALATE") {
    await escalateUploadAsset(assetId, session.user.id, reason);
  }
  revalidatePath("/admin/moderacao/uploads");
}

async function batchApproveUploads(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("reports:manage");
  const reason = String(formData.get("reason") || "").trim();
  const assetIds = Array.from(new Set(formData.getAll("assetIds").map(String).filter(Boolean))).slice(0, 50);
  if (!assetIds.length || reason.length < 8) return;

  for (const assetId of assetIds) {
    try {
      await approveUploadAsset(assetId, session.user.id, reason);
    } catch (cause) {
      console.error("[batch-media-review] ativo permaneceu privado", {
        assetId,
        error: cause instanceof Error ? cause.message : "Falha desconhecida",
      });
    }
  }
  revalidatePath("/");
  revalidatePath("/profissionais");
  revalidatePath("/buscar");
  revalidatePath("/cidade/[slug]", "page");
  revalidatePath("/profissionais/[slug]", "page");
  revalidatePath("/admin/moderacao/uploads");
}

function tone(status: string) {
  if (status === "APPROVED" || status === "CLEAN") return "success" as const;
  if (status === "REJECTED" || status === "INFECTED" || status === "ERROR") return "danger" as const;
  return "warning" as const;
}

export default async function AdminUploadModerationPage() {
  await requireAdmin("reports:manage");
  const assets = await prisma.uploadAsset.findMany({
    where: { status: { not: "APPROVED" } },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: {
      owner: { select: { id: true, name: true, email: true, blocked: true, professional: { select: { id: true, displayName: true, slug: true, status: true, verified: true, kycStatus: true } } } },
      reviewer: { select: { id: true, name: true, email: true } },
      malwareScanJob: true,
      depictedPeople: { select: { ageStatus: true, consentStatus: true, revokedAt: true } },
    },
  });
  const reportTargets = assets.flatMap((asset) => [asset.id, asset.controlledUrl, asset.userId, asset.owner.professional?.id]).filter((value): value is string => Boolean(value));
  const openReports = reportTargets.length ? await prisma.report.findMany({
    where: { status: { in: ["PENDING", "REVIEWING"] }, targetId: { in: reportTargets } },
    select: { targetId: true },
  }) : [];
  const reportedTargets = new Set(openReports.map((report) => report.targetId));
  const blockersFor = (asset: typeof assets[number]) => manualMediaReviewBlockers({
    category: asset.category,
    folder: asset.folder,
    uploadCompletedAt: asset.uploadCompletedAt,
    malwareStatus: asset.malwareStatus,
    ageIdentityStatus: asset.ageIdentityStatus,
    consentStatus: asset.consentStatus,
    takedownStatus: asset.takedownStatus,
    ownerBlocked: asset.owner.blocked,
    professionalStatus: asset.owner.professional?.status,
    professionalVerified: asset.owner.professional?.verified,
    professionalKycStatus: asset.owner.professional?.kycStatus,
    depictedPeople: asset.depictedPeople,
    hasOpenReport: [asset.id, asset.controlledUrl, asset.userId, asset.owner.professional?.id].some((target) => target ? reportedTargets.has(target) : false),
  });
  const priorityNames = ["alice félix", "gabriella", "lyvia soares", "agynnes silva", "bella", "juliana"];
  const reviewableAssets = assets.filter((asset) => isReadyForHumanContentReview({
    category: asset.category,
    folder: asset.folder,
    uploadCompletedAt: asset.uploadCompletedAt,
    malwareStatus: asset.malwareStatus,
    ageIdentityStatus: asset.ageIdentityStatus,
    consentStatus: asset.consentStatus,
    takedownStatus: asset.takedownStatus,
    ownerBlocked: asset.owner.blocked,
    professionalStatus: asset.owner.professional?.status,
    professionalVerified: asset.owner.professional?.verified,
    professionalKycStatus: asset.owner.professional?.kycStatus,
    depictedPeople: asset.depictedPeople,
    hasOpenReport: [asset.id, asset.controlledUrl, asset.userId, asset.owner.professional?.id].some((target) => target ? reportedTargets.has(target) : false),
  })).sort((left, right) => {
    const leftRank = priorityNames.indexOf((left.owner.professional?.displayName ?? "").trim().toLocaleLowerCase("pt-BR"));
    const rightRank = priorityNames.indexOf((right.owner.professional?.displayName ?? "").trim().toLocaleLowerCase("pt-BR"));
    return (leftRank < 0 ? priorityNames.length : leftRank) - (rightRank < 0 ? priorityNames.length : rightRank);
  });
  const now = new Date();
  const overdueQueueCutoff = new Date(now.getTime() - 5 * 60_000);
  const stuckAssets = assets.filter((asset) => asset.status === "QUARANTINED" && (
    !asset.malwareScanJob
    || asset.malwareScanJob.status === "FAILED"
    || (asset.malwareScanJob.status === "PROCESSING"
      && Boolean(asset.malwareScanJob.leaseExpiresAt && asset.malwareScanJob.leaseExpiresAt < now))
    || (["QUEUED", "RETRY"].includes(asset.malwareScanJob.status)
      && asset.malwareScanJob.availableAt < overdueQueueCutoff)
  ));

  return (
    <div>
      <AdminHeader
        title="Uploads em quarentena"
        subtitle="Nenhum arquivo desta fila possui URL pública. Aprovação humana exige antimalware limpo."
      />
      {stuckAssets.length > 0 ? (
        <AdminPanel>
          <p role="alert" style={{ margin: 0, color: "#fde68a", fontWeight: 800 }}>
            Atenção: {stuckAssets.length} arquivo(s) estão em quarentena sem worker ativo, com lease vencido, fila atrasada ou tentativas esgotadas. Nenhum foi publicado automaticamente.
          </p>
        </AdminPanel>
      ) : null}
      <AdminPanel>
        <h2 style={{ margin: "0 0 8px", color: "#fff", fontSize: 20 }}>Aprovação humana em lote</h2>
        <p style={{ margin: "0 0 16px", color: "#b4adb0", lineHeight: 1.5 }}>
          {reviewableAssets.length} foto(s) passaram pelos controles obrigatórios e estão prontas para inspeção visual. Selecione somente as imagens realmente revisadas; a decisão será revalidada no servidor antes da promoção.
        </p>
        <form action={batchApproveUploads} style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            {reviewableAssets.map((asset) => (
              <label key={asset.id} style={{ display: "grid", gap: 8, padding: 10, border: "1px solid rgba(183,44,255,.35)", borderRadius: 10, background: "#09080a", cursor: "pointer" }}>
                <img src={`/api/admin/uploads/${asset.id}/preview`} alt={`Revisar foto de ${asset.owner.professional?.displayName ?? asset.owner.name ?? "profissional"}`} style={{ width: "100%", height: 190, objectFit: "contain", background: "#050506", borderRadius: 7 }} />
                <span style={{ color: "#fff", fontWeight: 850 }}>{asset.owner.professional?.displayName ?? asset.owner.name ?? "Profissional"}</span>
                <span style={{ color: "#b4adb0", fontSize: 12 }}>AV {asset.malwareStatus} · idade {asset.ageIdentityStatus} · consentimento {asset.consentStatus}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8, color: "#e9d5ff", fontWeight: 800 }}>
                  <input type="checkbox" name="assetIds" value={asset.id} /> Revisada e aprovada
                </span>
              </label>
            ))}
          </div>
          <input name="reason" minLength={8} required placeholder="Justificativa da revisão humana em lote" style={{ border: "1px solid rgba(255,255,255,.14)", borderRadius: 8, background: "#050506", color: "#fff", padding: 11 }} />
          <button type="submit" disabled={!reviewableAssets.length} style={{ border: 0, borderRadius: 8, background: "#b72cff", color: "#080704", padding: "11px 14px", fontWeight: 950, opacity: reviewableAssets.length ? 1 : 0.45 }}>
            Aprovar fotos selecionadas
          </button>
        </form>
      </AdminPanel>
      <div style={{ display: "grid", gap: 14 }}>
        {assets.length === 0 ? (
          <AdminPanel>
            <p style={{ margin: 0, color: "#b4adb0" }}>Nenhum upload aguardando análise.</p>
          </AdminPanel>
        ) : assets.map((asset) => (
          <AdminPanel key={asset.id}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 260px) 1fr", gap: 18 }}>
              <div style={{ minHeight: 180, border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, overflow: "hidden", background: "#050506" }}>
                {asset.category === "image" ? (
                  <img src={`/api/admin/uploads/${asset.id}/preview`} alt="" style={{ width: "100%", height: 220, objectFit: "contain" }} />
                ) : asset.category === "video" ? (
                  <video src={`/api/admin/uploads/${asset.id}/preview`} controls preload="metadata" style={{ width: "100%", height: 220 }} />
                ) : (
                  <a href={`/api/admin/uploads/${asset.id}/preview`} target="_blank" rel="noreferrer" style={{ color: "#e1a6ff", display: "grid", minHeight: 180, placeItems: "center" }}>
                    Abrir documento privado
                  </a>
                )}
              </div>
              <div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                  <StatusPill tone={tone(asset.status)}>{asset.status}</StatusPill>
                  <StatusPill tone={tone(asset.malwareStatus)}>AV: {asset.malwareStatus}</StatusPill>
                  <StatusPill tone={tone(asset.moderationStatus)}>Conteúdo: {asset.moderationStatus}</StatusPill>
                  <StatusPill tone={tone(asset.ageIdentityStatus)}>Idade: {asset.ageIdentityStatus}</StatusPill>
                  <StatusPill tone={tone(asset.consentStatus)}>Consentimento: {asset.consentStatus}</StatusPill>
                </div>
                <h2 style={{ color: "#fff", fontSize: 16, margin: "0 0 8px", overflowWrap: "anywhere" }}>{asset.originalName}</h2>
                <p style={{ color: "#b4adb0", fontSize: 13, lineHeight: 1.6, margin: "0 0 12px" }}>
                  {asset.folder} · {asset.detectedMimeType} · {(asset.sizeBytes / 1024 / 1024).toFixed(2)} MB
                  <br />
                  AV: {asset.malwareProvider || "pendente"} · Moderação: {asset.moderationProvider || "pendente"}
                  <br />Owner: {asset.owner.name ?? asset.owner.email ?? asset.owner.id}
                  <br />Upload: {asset.createdAt.toLocaleString("pt-BR")}
                  <br />Revisor: {asset.reviewer?.name ?? asset.reviewer?.email ?? "pendente"}
                  <br />Decisão: {asset.reviewedById && asset.lastProcessedAt ? asset.lastProcessedAt.toLocaleString("pt-BR") : "pendente"}
                  <br />Fila AV: {asset.malwareScanJob?.status ?? "sem job"} · tentativas {asset.malwareScanJob?.attempts ?? 0}/{asset.malwareScanJob?.maxAttempts ?? 5}
                </p>
                {asset.reviewReason ? <p style={{ color: "#e9d5ff", fontSize: 13 }}>Motivo da revisão: {asset.reviewReason}</p> : null}
                {asset.failureReason ? <p style={{ color: "#fca5a5", fontSize: 13 }}>{asset.failureReason}</p> : null}
                <form action={reviewUpload} style={{ display: "grid", gap: 9 }}>
                  <input type="hidden" name="assetId" value={asset.id} />
                  <input
                    name="reason"
                    minLength={4}
                    required
                    placeholder="Justificativa obrigatória"
                    style={{ border: "1px solid rgba(255,255,255,.14)", borderRadius: 8, background: "#050506", color: "#fff", padding: 10 }}
                  />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <button name="action" value="REPROCESS" style={{ border: "1px solid rgba(255,255,255,.16)", borderRadius: 8, background: "transparent", color: "#fff", padding: "9px 12px", fontWeight: 800 }}>
                      Reprocessar
                    </button>
                    <button name="action" value="REJECT" style={{ border: "1px solid rgba(239,68,68,.4)", borderRadius: 8, background: "rgba(239,68,68,.12)", color: "#fca5a5", padding: "9px 12px", fontWeight: 800 }}>
                      Rejeitar
                    </button>
                    <button name="action" value="ESCALATE" style={{ border: "1px solid rgba(250,204,21,.4)", borderRadius: 8, background: "rgba(250,204,21,.12)", color: "#fde68a", padding: "9px 12px", fontWeight: 800 }}>
                      Escalar
                    </button>
                    <button name="action" value="APPROVE" disabled={blockersFor(asset).length > 0} title={blockersFor(asset).join(", ")} style={{ border: 0, borderRadius: 8, background: "#b72cff", color: "#080704", padding: "9px 12px", fontWeight: 950, opacity: blockersFor(asset).length === 0 ? 1 : 0.45 }}>
                      Aprovar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </AdminPanel>
        ))}
      </div>
    </div>
  );
}

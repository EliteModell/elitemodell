/* eslint-disable @next/next/no-img-element -- Admin preview is a protected dynamic endpoint. */

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import {
  approveUploadAsset,
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
  }
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
  });

  return (
    <div>
      <AdminHeader
        title="Uploads em quarentena"
        subtitle="Nenhum arquivo desta fila possui URL pública. Aprovação humana exige antimalware limpo."
      />
      <div style={{ display: "grid", gap: 14 }}>
        {assets.length === 0 ? (
          <AdminPanel>
            <p style={{ margin: 0, color: "#94a3b8" }}>Nenhum upload aguardando análise.</p>
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
                  <a href={`/api/admin/uploads/${asset.id}/preview`} target="_blank" rel="noreferrer" style={{ color: "#f5d78c", display: "grid", minHeight: 180, placeItems: "center" }}>
                    Abrir documento privado
                  </a>
                )}
              </div>
              <div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                  <StatusPill tone={tone(asset.status)}>{asset.status}</StatusPill>
                  <StatusPill tone={tone(asset.malwareStatus)}>AV: {asset.malwareStatus}</StatusPill>
                  <StatusPill tone={tone(asset.moderationStatus)}>Conteúdo: {asset.moderationStatus}</StatusPill>
                </div>
                <h2 style={{ color: "#fff", fontSize: 16, margin: "0 0 8px", overflowWrap: "anywhere" }}>{asset.originalName}</h2>
                <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.6, margin: "0 0 12px" }}>
                  {asset.folder} · {asset.detectedMimeType} · {(asset.sizeBytes / 1024 / 1024).toFixed(2)} MB
                  <br />
                  AV: {asset.malwareProvider || "pendente"} · Moderação: {asset.moderationProvider || "pendente"}
                </p>
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
                    <button name="action" value="APPROVE" disabled={asset.malwareStatus !== "CLEAN"} style={{ border: 0, borderRadius: 8, background: "#d4a843", color: "#080704", padding: "9px 12px", fontWeight: 950, opacity: asset.malwareStatus === "CLEAN" ? 1 : 0.45 }}>
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

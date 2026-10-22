/* eslint-disable @next/next/no-img-element -- Admin preview is a protected dynamic endpoint. */

import { revalidatePath } from "next/cache";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-access";
import { reconcileProfessionalDidit } from "@/lib/didit-reconciliation";
import { prisma } from "@/lib/prisma";
import { manualMediaReviewBlockers } from "@/lib/manual-media-review";
import { isProfessionalDisplayNameReady } from "@/lib/professional-display-name";
import {
  approveUploadAsset,
  escalateUploadAsset,
  processUploadAsset,
  rejectUploadAsset,
} from "@/lib/upload-quarantine";
import { AdminHeader, AdminPanel, StatusPill } from "../../_components/AdminPrimitives";
import { CohortBatchApproval } from "./CohortBatchApproval";

export const dynamic = "force-dynamic";

const ACCOUNT_COHORT_START = new Date("2026-10-19T03:00:00.000Z");
const ACCOUNT_COHORT_END = new Date("2026-10-23T03:00:00.000Z");
const OPERATIONAL_DAY_START = new Date("2026-10-21T03:00:00.000Z");
const OPERATIONAL_DAY_END = new Date("2026-10-22T03:00:00.000Z");

async function reviewUpload(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("reports:manage");
  const assetId = String(formData.get("assetId") || "");
  const action = String(formData.get("action") || "");
  const reason = String(formData.get("reason") || "").trim();
  if (!assetId || !["APPROVE", "REJECT", "REPROCESS", "ESCALATE"].includes(action)) return;
  if (["REJECT", "ESCALATE"].includes(action) && reason.length < 4) return;
  const effectiveReason = reason || (action === "APPROVE"
    ? "Revisao visual administrativa concluida: conteudo aprovado."
    : "Reprocessamento administrativo solicitado.");
  const scopedAsset = await prisma.uploadAsset.findFirst({
    where: {
      id: assetId,
      category: "image",
      folder: { startsWith: "profiles" },
      owner: { createdAt: { gte: ACCOUNT_COHORT_START, lt: ACCOUNT_COHORT_END } },
    },
    select: { id: true },
  });
  if (!scopedAsset) throw new Error("A mídia não pertence ao recorte de contas de 19 a 22/10/2026.");

  if (action === "APPROVE") {
    await approveUploadAsset(assetId, session.user.id, effectiveReason);
  } else if (action === "REJECT") {
    await rejectUploadAsset(assetId, session.user.id, effectiveReason);
  } else if (action === "REPROCESS") {
    await processUploadAsset(assetId);
  } else if (action === "ESCALATE") {
    await escalateUploadAsset(assetId, session.user.id, effectiveReason);
  }
  revalidateModerationPaths();
}

async function batchApproveUploads(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("reports:manage");
  const reason = "Revisao visual administrativa em lote concluida: conteudo aprovado.";
  const assetIds = Array.from(new Set(formData.getAll("assetIds").map(String).filter(Boolean))).slice(0, 50);
  if (!assetIds.length) return;

  const ownedAssets = await prisma.uploadAsset.findMany({
    where: {
      id: { in: assetIds },
      category: "image",
      folder: { startsWith: "profiles" },
      owner: { createdAt: { gte: ACCOUNT_COHORT_START, lt: ACCOUNT_COHORT_END } },
    },
    select: { id: true },
  });
  if (ownedAssets.length !== assetIds.length) {
    throw new Error("O lote deve conter somente fotos de contas criadas entre 19 e 22/10/2026.");
  }

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
  revalidateModerationPaths();
}

async function synchronizeDiditAge(formData: FormData) {
  "use server";
  await requireAdmin("kyc:review");
  const professionalId = String(formData.get("professionalId") || "");
  if (!professionalId) return;

  const professional = await prisma.professional.findUnique({
    where: { id: professionalId },
    select: { userId: true, kycProvider: true, kycSessionId: true, user: { select: { createdAt: true } } },
  });
  if (
    !professional ||
    professional.user.createdAt < ACCOUNT_COHORT_START ||
    professional.user.createdAt >= ACCOUNT_COHORT_END ||
    professional.kycProvider !== "DIDIT" ||
    !professional.kycSessionId
  ) return;

  try {
    await reconcileProfessionalDidit(professional.userId, professional.kycSessionId);
  } catch (cause) {
    console.error("[media-age-sync] decisão Didit não pôde ser reconciliada", {
      professionalId,
      error: cause instanceof Error ? cause.message : "Falha desconhecida",
    });
  }
  revalidatePath("/admin/moderacao/uploads");
}

function revalidateModerationPaths() {
  revalidatePath("/");
  revalidatePath("/profissionais");
  revalidatePath("/buscar");
  revalidatePath("/cidade/[slug]", "page");
  revalidatePath("/profissionais/[slug]", "page");
  revalidatePath("/admin/moderacao/uploads");
}

function tone(status: string) {
  if (["APPROVED", "CLEAN", "PASS", "ACTIVE", "VERIFIED", "CLEAR"].includes(status)) return "success" as const;
  if (["REJECTED", "INFECTED", "ERROR", "BLOCKED", "SUSPENDED"].includes(status)) return "danger" as const;
  return "warning" as const;
}

function summarizeStatuses(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Array.from(counts, ([status, count]) => `${status} (${count})`).join(" · ") || "sem fotos";
}

function isOperationalDay(date: Date) {
  return date >= OPERATIONAL_DAY_START && date < OPERATIONAL_DAY_END;
}

function blockerReason(code: string, asset: {
  malwareStatus: string;
  ageIdentityStatus: string;
  consentStatus: string;
  takedownStatus: string;
  owner: { blocked: boolean; professional: {
    status: string;
    verified: boolean;
    kycStatus: string;
    displayName: string;
    rejectReason: string | null;
    registrationSubmittedAt: Date | null;
  } | null };
}) {
  const professional = asset.owner.professional;
  const professionalIssues = professional ? [
    professional.status === "DRAFT" || !professional.registrationSubmittedAt ? "cadastro ainda não concluído e enviado para análise" : null,
    !isProfessionalDisplayNameReady(professional.displayName) ? "nome profissional ainda precisa ser informado" : null,
    professional.kycStatus !== "APPROVED" ? `identidade e maioridade oficial ainda não aprovadas (Didit ${professional.kycStatus})` : null,
    professional.status === "CORRECTION_REQUIRED" && professional.rejectReason ? `correção solicitada: ${professional.rejectReason}` : null,
    !["DRAFT", "CORRECTION_REQUIRED"].includes(professional.status) && professional.status !== "ACTIVE" ? `cadastro com status ${professional.status}` : null,
    professional.status === "ACTIVE" && !professional.verified ? "cadastro ativo ainda sem verificação administrativa" : null,
  ].filter((reason): reason is string => Boolean(reason)) : [];
  const reasons: Record<string, string> = {
    NOT_PROFILE_IMAGE: "não é uma imagem da pasta de perfil",
    UPLOAD_INCOMPLETE: "upload ainda não foi concluído",
    MALWARE_SCAN: `antivírus ainda não aprovou o arquivo (atual: ${asset.malwareStatus})`,
    AGE_IDENTITY: `maioridade/identidade da titular ainda não está confirmada para a mídia (atual: ${asset.ageIdentityStatus})`,
    CONSENT: `declaração de autoria e consentimento da mídia não está aprovada (atual: ${asset.consentStatus})`,
    TAKEDOWN: `mídia possui restrição ou retirada ativa (atual: ${asset.takedownStatus})`,
    OWNER_BLOCKED: `conta proprietária está bloqueada: ${asset.owner.blocked ? "sim" : "não"}`,
    PROFESSIONAL_NOT_ELIGIBLE: professional
      ? professionalIssues.join("; ") || `cadastro ainda não elegível (status ${professional.status}, verificada ${professional.verified ? "sim" : "não"})`
      : "arquivo não pertence a um cadastro profissional",
    DEPICTED_PEOPLE: "uma ou mais pessoas retratadas não têm maioridade e consentimento próprios confirmados, ou houve revogação",
    OPEN_REPORT: "existe denúncia aberta relacionada à mídia, à conta ou à profissional",
  };
  return reasons[code] ?? "controle obrigatório pendente";
}

export default async function AdminUploadModerationPage() {
  const { permissions } = await requireAdmin("reports:manage");
  const assets = await prisma.uploadAsset.findMany({
    where: {
      status: { not: "APPROVED" },
      category: "image",
      folder: { startsWith: "profiles" },
      owner: { createdAt: { gte: ACCOUNT_COHORT_START, lt: ACCOUNT_COHORT_END } },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: {
      owner: {
        select: {
          id: true,
          createdAt: true,
          name: true,
          email: true,
          blocked: true,
          professional: {
            select: {
              id: true,
              displayName: true,
              slug: true,
              city: true,
              state: true,
              currentServiceCity: true,
              currentServiceState: true,
              status: true,
              verified: true,
              kycProvider: true,
              kycSessionId: true,
              kycStatus: true,
              rejectReason: true,
              registrationSubmittedAt: true,
            },
          },
        },
      },
      reviewer: { select: { id: true, name: true, email: true } },
      malwareScanJob: true,
      depictedPeople: { select: { ageStatus: true, consentStatus: true, revokedAt: true } },
    },
  });
  const reportTargets = assets
    .flatMap((asset) => [asset.id, asset.controlledUrl, asset.userId, asset.owner.professional?.id])
    .filter((value): value is string => Boolean(value));
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
    hasOpenReport: [asset.id, asset.controlledUrl, asset.userId, asset.owner.professional?.id]
      .some((target) => target ? reportedTargets.has(target) : false),
  });
  const reviewedAssets = assets.map((asset) => ({ asset, blockers: blockersFor(asset) }));
  const grouped = new Map<string, typeof reviewedAssets>();
  for (const item of reviewedAssets) {
    const key = item.asset.owner.professional?.id ?? `owner:${item.asset.owner.id}`;
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }
  const groups = Array.from(grouped, ([key, items]) => ({ key, items })).sort((left, right) => {
    const leftName = left.items[0]?.asset.owner.professional?.displayName ?? left.items[0]?.asset.owner.name ?? "";
    const rightName = right.items[0]?.asset.owner.professional?.displayName ?? right.items[0]?.asset.owner.name ?? "";
    return leftName.localeCompare(rightName, "pt-BR");
  });
  const reviewableCount = reviewedAssets.filter(({ blockers }) => blockers.length === 0).length;
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
  const canReviewKyc = permissions.includes("kyc:review");

  return (
    <div>
      <AdminHeader
        title="Fotos das contas criadas de 19 a 22/10/2026"
        subtitle="Recorte pelo horário de Brasília e pela criação da conta. Fotos enviadas depois também entram; cadastros anteriores ficam fora de todas as ações."
      />
      {stuckAssets.length > 0 ? (
        <AdminPanel>
          <p role="alert" style={{ margin: 0, color: "#fde68a", fontWeight: 800 }}>
            Atenção: {stuckAssets.length} arquivo(s) estão sem worker ativo, com lease vencido, fila atrasada ou tentativas esgotadas. Nenhum foi publicado automaticamente.
          </p>
        </AdminPanel>
      ) : null}
      <AdminPanel>
        <h2 style={{ margin: "0 0 8px", color: "#fff", fontSize: 20 }}>Resumo da fila</h2>
        <p style={{ margin: 0, color: "#b4adb0", lineHeight: 1.6 }}>
          {assets.length} foto(s) pendente(s), agrupadas em {groups.length} profissional(is) deste recorte. {reviewableCount} foto(s) dependem somente de revisão visual e podem entrar na aprovação administrativa em lote.
        </p>
      </AdminPanel>
      <AdminPanel>
        <h2 style={{ margin: "0 0 10px", color: "#fff", fontSize: 20 }}>Aprovação administrativa única do recorte</h2>
        <CohortBatchApproval
          action={batchApproveUploads}
          assets={reviewedAssets.filter(({ blockers }) => blockers.length === 0).map(({ asset }) => ({
            id: asset.id,
            originalName: asset.originalName,
            professionalName: asset.owner.professional?.displayName ?? asset.owner.name ?? "Sem nome profissional",
            previewUrl: `/api/admin/uploads/${asset.id}/preview`,
            malwareStatus: asset.malwareStatus,
            ageIdentityStatus: asset.ageIdentityStatus,
            consentStatus: asset.consentStatus,
          }))}
        />
      </AdminPanel>

      <div style={{ display: "grid", gap: 18 }}>
        {groups.length === 0 ? (
          <AdminPanel>
            <p style={{ margin: 0, color: "#b4adb0" }}>Nenhum upload aguardando análise.</p>
          </AdminPanel>
        ) : groups.map(({ key, items }) => {
          const sample = items[0].asset;
          const professional = sample.owner.professional;
          const professionalName = professional?.displayName ?? sample.owner.name ?? "Sem nome profissional";
          const photos = items.filter(({ asset }) => asset.category === "image");
          const operationalDay = items.filter(({ asset }) => isOperationalDay(asset.createdAt));
          const old = items.filter(({ asset }) => asset.createdAt < OPERATIONAL_DAY_START);
          const otherDates = items.filter(({ asset }) => asset.createdAt >= OPERATIONAL_DAY_END);
          const city = professional?.currentServiceCity ?? professional?.city ?? "não informada";
          const state = professional?.currentServiceState ?? professional?.state ?? "";
          const diditCanSync = Boolean(professional?.kycProvider === "DIDIT" && professional.kycSessionId);
          const dateSections = [
            { key: "day", title: "Enviadas em 21/10/2026", entries: operationalDay },
            { key: "old", title: "Fotos antigas (antes de 21/10/2026)", entries: old },
            { key: "other", title: "Outras datas", entries: otherDates },
          ].filter((section) => section.entries.length > 0);

          return (
            <AdminPanel key={key}>
              <div style={{ display: "grid", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <h2 style={{ color: "#fff", fontSize: 22, margin: "0 0 7px" }}>{professionalName}</h2>
                    <p style={{ color: "#b4adb0", margin: 0, lineHeight: 1.6, overflowWrap: "anywhere" }}>
                      ID profissional: {professional?.id ?? "sem cadastro"}<br />
                      ID da proprietária: {sample.owner.id}<br />
                      Cadastro: {sample.owner.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}<br />
                      Cidade: {city}{state ? `/${state}` : ""}<br />
                      Quantidade de fotos: {photos.length}
                    </p>
                    {professional ? (
                      <Link
                        href={`/admin/profissionais?professionalId=${professional.id}#professional-${professional.id}`}
                        style={{ display: "inline-block", marginTop: 8, color: "#e1a6ff", fontSize: 13, fontWeight: 850 }}
                      >
                        Abrir cadastro e corrigir pendências
                      </Link>
                    ) : null}
                  </div>
                  <div style={{ display: "grid", gap: 8, minWidth: 260 }}>
                    <StatusPill tone={tone(professional?.status ?? "SEM CADASTRO")}>Cadastro: {professional?.status ?? "SEM CADASTRO"}</StatusPill>
                    <StatusPill tone={tone(professional?.kycStatus ?? "NOT_STARTED")}>Didit: {professional?.kycStatus ?? "SEM CADASTRO"}</StatusPill>
                    <span style={{ color: "#b4adb0", fontSize: 13 }}>Antivírus: {summarizeStatuses(photos.map(({ asset }) => asset.malwareStatus))}</span>
                    <span style={{ color: "#b4adb0", fontSize: 13 }}>Maioridade: {summarizeStatuses(photos.map(({ asset }) => asset.ageIdentityStatus))}</span>
                  </div>
                </div>

                {diditCanSync ? (
                  <form action={synchronizeDiditAge} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <input type="hidden" name="professionalId" value={professional!.id} />
                    <button
                      type="submit"
                      disabled={!canReviewKyc}
                      title={canReviewKyc
                        ? "Consulta novamente a decisão oficial da sessão ativa e sincroniza somente a maioridade da titular quando todos os checks passarem."
                        : "Requer a permissão kyc:review."}
                      style={{ border: "1px solid rgba(183,44,255,.5)", borderRadius: 8, background: "rgba(183,44,255,.12)", color: "#e9d5ff", padding: "9px 12px", fontWeight: 900, opacity: canReviewKyc ? 1 : 0.45 }}
                    >
                      Consultar Didit e sincronizar maioridade
                    </button>
                    <span style={{ color: "#b4adb0", fontSize: 12 }}>
                      Não altera consentimento, outras pessoas retratadas nem o status de moderação.
                    </span>
                  </form>
                ) : (
                  <p style={{ margin: 0, color: "#fde68a", fontSize: 13 }}>
                    Sincronização Didit indisponível: cadastro sem sessão Didit ativa vinculada.
                  </p>
                )}

                {dateSections.map((section) => (
                  <section key={section.key} aria-labelledby={`${key}-${section.key}`} style={{ display: "grid", gap: 12 }}>
                    <h3 id={`${key}-${section.key}`} style={{ color: "#fff", margin: "6px 0 0", fontSize: 18 }}>
                      {section.title} ({section.entries.length})
                    </h3>
                    {section.entries.map(({ asset, blockers }) => (
                      <div key={asset.id} style={{ display: "grid", gridTemplateColumns: "minmax(180px, 260px) minmax(0, 1fr)", gap: 18, padding: 14, border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, background: "#09080a" }}>
                        <div style={{ minHeight: 180, border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, overflow: "hidden", background: "#050506" }}>
                          {asset.category === "image" ? (
                            <img src={`/api/admin/uploads/${asset.id}/preview`} alt={`Foto ${asset.originalName} de ${professionalName}`} style={{ width: "100%", height: 220, objectFit: "contain" }} />
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
                          <h4 style={{ color: "#fff", fontSize: 16, margin: "0 0 8px", overflowWrap: "anywhere" }}>{asset.originalName}</h4>
                          <p style={{ color: "#b4adb0", fontSize: 13, lineHeight: 1.6, margin: "0 0 12px" }}>
                            ID da mídia: {asset.id}<br />
                            {asset.folder} · {asset.detectedMimeType} · {(asset.sizeBytes / 1024 / 1024).toFixed(2)} MB<br />
                            Upload: {asset.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}<br />
                            Revisor: {asset.reviewer?.name ?? asset.reviewer?.email ?? "pendente"}<br />
                            Fila AV: {asset.malwareScanJob?.status ?? "sem job"} · tentativas {asset.malwareScanJob?.attempts ?? 0}/{asset.malwareScanJob?.maxAttempts ?? 5}
                          </p>
                          <div role={blockers.length ? "alert" : undefined} style={{ padding: 10, borderRadius: 8, background: blockers.length ? "rgba(239,68,68,.1)" : "rgba(34,197,94,.1)", color: blockers.length ? "#fca5a5" : "#86efac", fontSize: 13, lineHeight: 1.55 }}>
                            {blockers.length ? (
                              <>
                                <strong>Bloqueada por:</strong>
                                <ul style={{ margin: "6px 0 0", paddingLeft: 20 }}>
                                  {blockers.map((blocker) => <li key={blocker}>{blockerReason(blocker, asset)}</li>)}
                                </ul>
                              </>
                            ) : (
                              <strong>Elegível: todos os controles automáticos passaram; ainda exige revisão visual e decisão humana.</strong>
                            )}
                          </div>
                          {asset.reviewReason ? <p style={{ color: "#e9d5ff", fontSize: 13 }}>Motivo da revisão: {asset.reviewReason}</p> : null}
                          {asset.failureReason ? <p style={{ color: "#fca5a5", fontSize: 13 }}>Falha registrada: {asset.failureReason}</p> : null}
                          <form action={reviewUpload} style={{ display: "grid", gap: 9, marginTop: 12 }}>
                            <input type="hidden" name="assetId" value={asset.id} />
                            <input
                              name="reason"
                              minLength={4}
                              placeholder="Motivo (obrigatório somente para rejeitar ou escalar)"
                              style={{ border: "1px solid rgba(255,255,255,.14)", borderRadius: 8, background: "#050506", color: "#fff", padding: 10 }}
                            />
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                              <button name="action" value="REPROCESS" title="Executa novamente os controles automáticos; não publica sem todos os gates." style={{ border: "1px solid rgba(255,255,255,.16)", borderRadius: 8, background: "transparent", color: "#fff", padding: "9px 12px", fontWeight: 800 }}>
                                Reprocessar
                              </button>
                              <button name="action" value="REJECT" title="Requer justificativa e mantém o arquivo fora de publicação." style={{ border: "1px solid rgba(239,68,68,.4)", borderRadius: 8, background: "rgba(239,68,68,.12)", color: "#fca5a5", padding: "9px 12px", fontWeight: 800 }}>
                                Rejeitar
                              </button>
                              <button name="action" value="ESCALATE" title="Requer justificativa e mantém o arquivo em quarentena." style={{ border: "1px solid rgba(250,204,21,.4)", borderRadius: 8, background: "rgba(250,204,21,.12)", color: "#fde68a", padding: "9px 12px", fontWeight: 800 }}>
                                Escalar
                              </button>
                              <button
                                name="action"
                                value="APPROVE"
                                disabled={blockers.length > 0}
                                title={blockers.length
                                  ? `Aprovação desabilitada: ${blockers.map((blocker) => blockerReason(blocker, asset)).join("; ")}`
                                  : "Habilitada após todos os gates; o clique registra a decisão humana."}
                                style={{ border: 0, borderRadius: 8, background: "#b72cff", color: "#080704", padding: "9px 12px", fontWeight: 950, opacity: blockers.length === 0 ? 1 : 0.45, cursor: blockers.length === 0 ? "pointer" : "not-allowed" }}
                              >
                                Aprovar
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    ))}
                  </section>
                ))}
              </div>
            </AdminPanel>
          );
        })}
      </div>
    </div>
  );
}

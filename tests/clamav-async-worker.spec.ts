import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import {
  classifyClamAvResponse,
  jobCanBeClaimed,
  retryDelaySeconds,
  signatureIsFresh,
  transitionForMalwareResult,
} from "../src/lib/clamav-async-state";

test.describe("candidato ClamAV assincrono", () => {
  test("arquivo limpo segue somente para moderacao", () => {
    expect(transitionForMalwareResult({ status: "CLEAN", provider: "CLAMAV" })).toEqual({
      status: "PENDING_MODERATION",
      malwareStatus: "CLEAN",
      rejected: false,
      failureReason: null,
    });
  });

  test("resposta EICAR do ClamAV rejeita o ativo", () => {
    const result = classifyClamAvResponse("stream: Win.Test.EICAR_HDB-1 FOUND");
    expect(result.status).toBe("INFECTED");
    expect(transitionForMalwareResult(result)).toMatchObject({ status: "REJECTED", malwareStatus: "INFECTED" });
  });

  test("indisponibilidade e timeout permanecem fail-closed", () => {
    for (const reason of ["ClamAV unavailable", "Scan timeout"]) {
      expect(transitionForMalwareResult({ status: "ERROR", provider: "CLAMAV", reason })).toMatchObject({
        status: "QUARANTINED",
        malwareStatus: "ERROR",
        rejected: false,
      });
    }
  });

  test("lease impede duplicidade e permite recuperar worker morto", () => {
    const now = new Date("2026-10-11T12:00:00Z");
    expect(jobCanBeClaimed({ status: "QUEUED", availableAt: now, completedAt: null, leaseExpiresAt: null }, now)).toBe(true);
    expect(jobCanBeClaimed({ status: "PROCESSING", availableAt: now, completedAt: null, leaseExpiresAt: new Date("2026-10-11T12:05:00Z") }, now)).toBe(false);
    expect(jobCanBeClaimed({ status: "PROCESSING", availableAt: now, completedAt: null, leaseExpiresAt: new Date("2026-10-11T11:59:59Z") }, now)).toBe(true);
    expect(jobCanBeClaimed({ status: "COMPLETED", availableAt: now, completedAt: now, leaseExpiresAt: null }, now)).toBe(false);
  });

  test("assinatura vencida falha e retry usa backoff limitado", () => {
    const now = new Date("2026-10-11T12:00:00Z");
    expect(signatureIsFresh(new Date("2026-10-10T13:00:00Z"), now, 24)).toBe(true);
    expect(signatureIsFresh(new Date("2026-10-10T11:59:59Z"), now, 24)).toBe(false);
    expect(retryDelaySeconds(1)).toBe(30);
    expect(retryDelaySeconds(20)).toBe(3_600);
  });

  test("manifesto candidato preserva escala zero, limite e concorrencia", () => {
    const yaml = readFileSync("services/clamav-worker/cloud-run.candidate.yaml", "utf8");
    expect(yaml).toContain('autoscaling.knative.dev/minScale: "0"');
    expect(yaml).toContain('autoscaling.knative.dev/maxScale: "3"');
    expect(yaml).toContain("containerConcurrency: 1");
    expect(yaml).toContain('cpu: "1"');
    expect(yaml).toContain("memory: 2Gi");
  });

  test("worker recebe somente assetId e baixa do bucket privado", () => {
    const source = readFileSync("services/clamav-worker/server.ts", "utf8");
    expect(source).toContain("assetId?: unknown");
    expect(source).toContain("createSignedUrl(asset.quarantinePath, 60)");
    expect(source).not.toContain("formData()");
    expect(source).toContain('request.url !== "/tasks/scan"');
  });

  test("worker conserva retries no Cloud Tasks e valida ownership do lease", () => {
    const source = readFileSync("services/clamav-worker/server.ts", "utf8");
    expect(source).toContain('result.disposition === "retry" || result.disposition === "deferred"');
    expect(source).toContain("return json(response, 503, result)");
    expect(source).toContain('where: { assetId, leaseToken, status: "PROCESSING" }');
    expect(source).toContain('event: "scan_lease_lost"');
    expect(source).toContain('status: exhausted ? "FAILED" : "RETRY"');
  });

  test("dispatcher duravel usa Cloud Tasks com OIDC e recuperacao independente do navegador", () => {
    const worker = readFileSync("services/clamav-worker/server.ts", "utf8");
    const upload = readFileSync("src/lib/upload-quarantine.ts", "utf8");
    const migration = readFileSync("prisma/migrations/20261011120000_clamav_async_scan_queue/migration.sql", "utf8");
    expect(worker).toContain('request.url === "/tasks/dispatch"');
    expect(worker).toContain('request.headers["x-cloudscheduler"] !== "true"');
    expect(worker).toContain("metadata.google.internal");
    expect(worker).toContain("oidcToken: { serviceAccountEmail: oidcServiceAccountEmail, audience: workerUrl }");
    expect(worker).toContain("malware-${job.id}");
    expect(upload).toContain('process.env.UPLOAD_AV_ASYNC_ENABLED === "true"');
    expect(upload).toContain('malwareScanJob: createAsyncMalwareJob ? { create: { status: "QUEUED" } } : undefined');
    expect(worker).toContain('malwareScanJob: null');
    expect(worker).toContain('event: "malware_jobs_backfilled"');
    expect(worker).toContain('status: { in: ["QUEUED", "RETRY"] }');
    expect(migration).toContain('"taskName" TEXT');
    expect(migration).toContain('CREATE UNIQUE INDEX "MalwareScanJob_taskName_key"');
  });
});

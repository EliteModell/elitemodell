import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseUploadResponse, UPLOAD_PENDING_MESSAGE } from "../src/lib/upload-response";
import { retryDelaySeconds, transitionForMalwareResult } from "../src/lib/clamav-async-state";

test.describe("uploads em quarentena", () => {
  test("HTTP 202 e aceito como upload pendente com referencia controlada", () => {
    const result = parseUploadResponse(
      { ok: true, status: 202 },
      { assetId: "asset-123", path: "/api/media/asset-123", url: null, status: "QUARANTINED" },
    );
    expect(result).toMatchObject({
      assetId: "asset-123",
      reference: "/api/media/asset-123",
      url: null,
      pending: true,
    });
    expect(UPLOAD_PENDING_MESSAGE).toContain("aguardando verificação");
  });

  test("resposta aprovada exige URL controlada", () => {
    expect(parseUploadResponse(
      { ok: true, status: 200 },
      { assetId: "asset-123", path: "asset:asset-123", url: "/api/media/asset-123", status: "APPROVED" },
    )).toMatchObject({ pending: false, url: "/api/media/asset-123" });
  });

  test("erro HTTP nao e confundido com quarentena", () => {
    expect(() => parseUploadResponse(
      { ok: false, status: 422 },
      { assetId: "asset-123", status: "REJECTED", error: "Arquivo rejeitado." },
    )).toThrow("Arquivo rejeitado.");
  });

  test("retry usa backoff limitado e mantem falha fail-closed", () => {
    expect([1, 2, 3, 4, 5].map((attempt) => retryDelaySeconds(attempt))).toEqual([30, 60, 120, 240, 480]);
    expect(transitionForMalwareResult({ status: "ERROR", provider: "HTTP", reason: "timeout" }))
      .toMatchObject({ status: "QUARANTINED", malwareStatus: "ERROR", rejected: false });
  });

  test("componentes nao exigem URL em respostas 202", () => {
    for (const file of [
      "src/app/(dashboard)/profissional/fotos/page.tsx",
      "src/app/(dashboard)/profissional/configuracoes/page.tsx",
      "src/components/Stories.tsx",
      "src/components/professional-dashboard/ProfessionalStoriesClient.tsx",
      "src/components/professional-dashboard/ProfessionalPostClient.tsx",
    ]) {
      const source = readFileSync(file, "utf8");
      expect(source).toContain("parseUploadResponse");
      expect(source).not.toContain("!uploadRes.ok || !uploaded.url");
    }
  });

  test("status e privado, somente leitura e nunca retorna URL antes de aprovado", () => {
    const source = readFileSync("src/app/api/uploads/[id]/status/route.ts", "utf8");
    expect(source).toContain("userId: session.user.id");
    expect(source).toContain('owned.status === "APPROVED" ? owned.controlledUrl : null');
    expect(source).not.toContain("claimMalwareScan");
    expect(source).not.toContain("processUploadAsset");
  });

  test("script legado de storage esta bloqueado contra execucao acidental", () => {
    const legacySql = readFileSync("supabase/storage-setup.sql", "utf8");
    expect(legacySql).toContain("LEGADO — NAO EXECUTAR EM PRODUCAO");
    expect(legacySql).toContain("RAISE EXCEPTION 'Script legado bloqueado");

    const quarantine = readFileSync("src/lib/upload-quarantine.ts", "utf8");
    expect(quarantine).toContain('const DEFAULT_QUARANTINE_BUCKET = "upload-quarantine"');
    expect(quarantine).toContain('const DEFAULT_APPROVED_BUCKET = "approved-media"');
    expect(quarantine).toContain("if (data.public) throw new Error");
  });
});

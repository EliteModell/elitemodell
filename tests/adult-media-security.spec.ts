import { expect, test } from "@playwright/test";
import { isAgeRestrictedRequest } from "../src/lib/age-gate-policy";
import { createMediaAccessToken, verifyMediaAccessToken } from "../src/lib/media-access-token";
import { evaluateMediaPublicationGates } from "../src/lib/media-security";
import { isReadyForHumanContentReview, manualMediaReviewBlockers } from "../src/lib/manual-media-review";
import {
  AGE_DECLARATION_COOKIE,
  AGE_DECLARATION_MAX_AGE_SECONDS,
  AGE_DECLARATION_VALUE,
  hasConfirmedAgeDeclaration,
} from "../src/lib/age-declaration";

const passingGates = {
  uploadComplete: true,
  malwareStatus: "CLEAN",
  moderationStatus: "APPROVED",
  ageIdentityStatus: "PASS",
  consentStatus: "PASS",
  adminReviewRequired: true,
  adminReviewStatus: "PASS",
  takedownStatus: "CLEAR",
  ownerId: "owner-1",
};

test.describe("seguranca fail-closed de midia adulta", () => {
  const humanReviewReady = {
    category: "image",
    folder: "profiles/photos",
    uploadCompletedAt: new Date(),
    malwareStatus: "CLEAN",
    ageIdentityStatus: "PASS",
    consentStatus: "PASS",
    takedownStatus: "CLEAR",
    ownerBlocked: false,
    professionalStatus: "ACTIVE",
    professionalVerified: true,
    professionalKycStatus: "APPROVED",
    depictedPeople: [{ ageStatus: "PASS", consentStatus: "PASS", revokedAt: null }],
    hasOpenReport: false,
  };

  test("libera para revisao humana somente foto com controles obrigatorios aprovados", () => {
    expect(isReadyForHumanContentReview(humanReviewReady)).toBe(true);
  });

  test("bloqueia lote quando AV, consentimento, pessoa retratada ou denuncia estao pendentes", () => {
    const blockers = manualMediaReviewBlockers({
      ...humanReviewReady,
      malwareStatus: "PENDING",
      consentStatus: "PENDING",
      depictedPeople: [{ ageStatus: "PASS", consentStatus: "PENDING", revokedAt: null }],
      hasOpenReport: true,
    });
    expect(blockers).toEqual(expect.arrayContaining(["MALWARE_SCAN", "CONSENT", "DEPICTED_PEOPLE", "OPEN_REPORT"]));
  });

  test("fluxo oficial vincula foto promovida ao perfil sem substituir capa existente", async () => {
    const source = await import("node:fs/promises").then((fs) => fs.readFile("src/lib/upload-quarantine.ts", "utf8"));
    expect(source).toContain('asset.folder.startsWith("profiles")');
    expect(source).toContain("prisma.professionalPhoto.create");
    expect(source).toContain("cover: visibleCount === 0");
  });

  test("painel agrupa lotes por profissional e separa as fotos de 21/10/2026", async () => {
    const [page, batch] = await Promise.all([
      import("node:fs/promises").then((fs) => fs.readFile("src/app/(dashboard)/admin/moderacao/uploads/page.tsx", "utf8")),
      import("node:fs/promises").then((fs) => fs.readFile("src/app/(dashboard)/admin/moderacao/uploads/ProfessionalBatchApproval.tsx", "utf8")),
    ]);
    expect(page).toContain("ID profissional:");
    expect(page).toContain("Enviadas em 21/10/2026");
    expect(page).toContain("Fotos antigas (antes de 21/10/2026)");
    expect(page).toContain("ownedAssets.some");
    expect(batch).toContain("Selecionar todas as elegíveis");
    expect(batch).toContain("selectedCount === 0");
  });

  for (const malwareStatus of ["PENDING", "ERROR", "INFECTED"]) {
    test(`nao publica com malware ${malwareStatus}`, () => {
      const result = evaluateMediaPublicationGates({ ...passingGates, malwareStatus });
      expect(result.publishable).toBe(false);
      expect(result.blockers).toContain("MALWARE_SCAN");
    });
  }

  for (const moderationStatus of ["PENDING", "ERROR", "REJECTED"]) {
    test(`nao publica com moderacao ${moderationStatus}`, () => {
      const result = evaluateMediaPublicationGates({ ...passingGates, moderationStatus });
      expect(result.publishable).toBe(false);
      expect(result.blockers).toContain("CONTENT_MODERATION");
    });
  }

  test("nao publica midia sem owner", () => {
    const result = evaluateMediaPublicationGates({ ...passingGates, ownerId: null });
    expect(result.publishable).toBe(false);
    expect(result.blockers).toContain("OWNER_PRESENT");
  });

  test("publica somente quando todos os gates passam", () => {
    expect(evaluateMediaPublicationGates(passingGates)).toMatchObject({ publishable: true, blockers: [] });
  });

  test("token de midia expira e fica vinculado ao ativo", () => {
    const secret = "test-only-media-signing-key";
    const issuedAt = Date.parse("2026-10-01T12:00:00.000Z");
    const token = createMediaAccessToken("asset-1", "viewer-1", 60, issuedAt, secret);

    expect(verifyMediaAccessToken(token, "asset-1", issuedAt + 59_000, secret)?.subject).toBe("viewer-1");
    expect(verifyMediaAccessToken(token, "asset-1", issuedAt + 60_000, secret)).toBeNull();
    expect(verifyMediaAccessToken(token, "asset-2", issuedAt + 30_000, secret)).toBeNull();
  });

  test("rotas reais de descoberta e midia exigem age gate em leitura", () => {
    for (const path of [
      "/buscar",
      "/profissionais",
      "/profissionais/victoria",
      "/cidade/itauna",
      "/api/professionals",
      "/api/stories",
      "/api/reviews",
      "/api/media/asset-1",
    ]) {
      expect(isAgeRestrictedRequest(path, "GET"), path).toBe(true);
    }
    expect(isAgeRestrictedRequest("/api/professionals", "POST")).toBe(false);
  });

  test("declaracao etaria usa cookie limitado sem equivaler a verificacao forte", () => {
    expect(AGE_DECLARATION_COOKIE).toBe("elite_modell_age_declaration");
    expect(AGE_DECLARATION_VALUE).toBe("confirmed");
    expect(AGE_DECLARATION_MAX_AGE_SECONDS).toBe(30 * 24 * 60 * 60);
    expect(hasConfirmedAgeDeclaration({ get: () => ({ value: "confirmed" }) })).toBe(true);
    expect(hasConfirmedAgeDeclaration({ get: () => ({ value: "invalid" }) })).toBe(false);
  });

  test("API de midia privada recusa visitante sem sessao", async ({ request }) => {
    const response = await request.get("/api/media/asset-1");
    expect([401, 403]).toContain(response.status());
    expect(response.headers()["cache-control"]).toContain("no-store");
  });
});

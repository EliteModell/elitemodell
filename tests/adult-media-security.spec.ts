import { expect, test } from "@playwright/test";
import { isAgeRestrictedRequest } from "../src/lib/age-gate-policy";
import { createMediaAccessToken, verifyMediaAccessToken } from "../src/lib/media-access-token";
import { evaluateMediaPublicationGates } from "../src/lib/media-security";
import { CONTROLLED_MEDIA_SIGNED_URL_TTL_SECONDS, controlledMediaDeliveryMode } from "../src/lib/media-delivery";
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
  test("fotos aprovadas usam transferencia assinada curta sem tornar o bucket publico", () => {
    expect(controlledMediaDeliveryMode("SUPABASE", "image")).toBe("SIGNED_REDIRECT");
    expect(CONTROLLED_MEDIA_SIGNED_URL_TTL_SECONDS).toBeLessThanOrEqual(60);
    expect(controlledMediaDeliveryMode("BUNNY", "image")).toBe("BUFFERED_FALLBACK");
  });

  test("variantes publicas usam transformacoes fechadas depois dos mesmos gates", async () => {
    const source = await import("node:fs/promises").then((fs) => fs.readFile("src/app/api/media/[id]/route.ts", "utf8"));
    expect(source).toContain("PUBLIC_IMAGE_VARIANTS");
    expect(source).toContain('gallery: { width: 480, height: 640');
    expect(source).toContain('asset.category === "image"');
    expect(source).toContain('requestedVariant in PUBLIC_IMAGE_VARIANTS');
    expect(source.indexOf("evaluateMediaPublicationGates")).toBeLessThan(source.indexOf("PUBLIC_IMAGE_VARIANTS[requestedVariant"));
  });
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

  test("aprovacao profissional retoma fotos sem inventar decisao de conteudo", async () => {
    const [uploads, professionals, panel, batch, submit] = await Promise.all([
      import("node:fs/promises").then((fs) => fs.readFile("src/lib/upload-quarantine.ts", "utf8")),
      import("node:fs/promises").then((fs) => fs.readFile("src/app/(dashboard)/admin/profissionais/page.tsx", "utf8")),
      import("node:fs/promises").then((fs) => fs.readFile("src/app/(dashboard)/admin/moderacao/uploads/page.tsx", "utf8")),
      import("node:fs/promises").then((fs) => fs.readFile("src/app/(dashboard)/admin/moderacao/uploads/CohortBatchApproval.tsx", "utf8")),
      import("node:fs/promises").then((fs) => fs.readFile("src/app/api/professionals/route.ts", "utf8")),
    ]);
    expect(uploads).toContain("resumeProfessionalProfileAssetsAfterApproval");
    expect(uploads).toContain("existingMalwarePassed");
    expect(uploads).toContain("existingModerationPassed");
    expect(professionals).toContain("resumeProfessionalProfileAssetsAfterApproval({");
    expect(panel).toContain("Revisao visual administrativa em lote concluida: conteudo aprovado.");
    expect(panel).toContain("Abrir cadastro e corrigir pendências");
    expect(batch).not.toContain('name="reason"');
    expect(submit).toContain("rejectReason: null");
  });

  test("painel agrupa lotes por profissional sem limitar a fila a uma coorte temporaria", async () => {
    const [page, batch, home, listing] = await Promise.all([
      import("node:fs/promises").then((fs) => fs.readFile("src/app/(dashboard)/admin/moderacao/uploads/page.tsx", "utf8")),
      import("node:fs/promises").then((fs) => fs.readFile("src/app/(dashboard)/admin/moderacao/uploads/CohortBatchApproval.tsx", "utf8")),
      import("node:fs/promises").then((fs) => fs.readFile("src/components/home/HomeDiscoveryPreview.tsx", "utf8")),
      import("node:fs/promises").then((fs) => fs.readFile("src/app/profissionais/page.tsx", "utf8")),
    ]);
    expect(page).toContain("ID profissional:");
    expect(page).toContain("Enviadas em 21/10/2026");
    expect(page).toContain("Fotos antigas (antes de 21/10/2026)");
    expect(page).toContain("Revisão visual das mídias elegíveis");
    expect(page).toContain("ownedAssets.length !== assetIds.length");
    expect(page).not.toContain("ACCOUNT_COHORT_START");
    expect(page).not.toContain("ACCOUNT_COHORT_END");
    expect(page).toContain("A mídia não pertence a um perfil profissional.");
    expect(batch).toContain("Selecionar todas as elegíveis");
    expect(batch).toContain("selectedCount === 0");
    expect(home).toContain('new URLSearchParams({ sortBy: "recent", limit: "12" })');
    expect(home).toContain('fetch(`/api/professionals?${query}`');
    expect(listing).toContain("pro.user?.image ?? coverPhoto ?? null");
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

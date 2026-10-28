import { expect, test } from "@playwright/test";
import { isAgeRestrictedRequest } from "../src/lib/age-gate-policy";
import { createMediaAccessToken, verifyMediaAccessToken } from "../src/lib/media-access-token";
import { evaluateMediaPublicationGates } from "../src/lib/media-security";
import { CONTROLLED_MEDIA_SIGNED_URL_TTL_SECONDS, controlledMediaDeliveryMode } from "../src/lib/media-delivery";
import { isReadyForHumanContentReview, manualMediaReviewBlockers } from "../src/lib/manual-media-review";
import { AUTOMATED_MEDIA_MODERATION_CONTRACT, evaluateAutomatedMediaModeration } from "../src/lib/automated-media-moderation";
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
  const automatedEvidence = {
    contractVersion: AUTOMATED_MEDIA_MODERATION_CONTRACT,
    decision: "APPROVE",
    policyVersion: "test-policy-1",
    providerTaskId: "provider-task-1",
    mediaKind: "image",
    contentRating: "ADULT_EXPLICIT",
    analysis: { complete: true, fullDurationCovered: false, audioAnalyzed: false },
    file: { integrityPassed: true, normalized: true },
    people: { count: 1, uploaderIdentityMatched: true, allAdultsVerified: true, allConsentsVerified: true },
    risks: { minor: "CLEAR", illegal: "CLEAR", nonConsensual: "CLEAR", coercion: "CLEAR", violence: "CLEAR" },
  };

  test("permite automacao inclusive explicita somente com evidencias completas", () => {
    expect(evaluateAutomatedMediaModeration(automatedEvidence, "image"))
      .toMatchObject({ outcome: "APPROVE", contentRating: "ADULT_EXPLICIT", blockers: [] });
  });

  test("mantem privada a midia com contrato legado, menor, terceiros ou consentimento incompleto", () => {
    const result = evaluateAutomatedMediaModeration({
      ...automatedEvidence,
      contractVersion: "legacy-safe-boolean",
      people: { ...automatedEvidence.people, count: 2, allConsentsVerified: false },
      risks: { ...automatedEvidence.risks, minor: "REVIEW" },
    }, "image");
    expect(result.outcome).toBe("REVIEW");
    expect(result.blockers).toEqual(expect.arrayContaining(["CONTRACT_VERSION", "PEOPLE_COUNT", "CONSENT_VERIFICATION", "RISK_MINOR"]));
  });

  test("video exige analise integral e de audio", () => {
    const result = evaluateAutomatedMediaModeration({ ...automatedEvidence, mediaKind: "video" }, "video");
    expect(result.outcome).toBe("REVIEW");
    expect(result.blockers).toEqual(expect.arrayContaining(["VIDEO_NOT_FULLY_ANALYZED", "AUDIO_NOT_ANALYZED"]));
  });

  test("decisao de bloqueio nunca e convertida em aprovacao", () => {
    const result = evaluateAutomatedMediaModeration({
      ...automatedEvidence,
      decision: "REJECT",
      risks: { ...automatedEvidence.risks, illegal: "BLOCK" },
    }, "image");
    expect(result.outcome).toBe("REJECT");
  });
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

  test("libera foto e video elegiveis para decisao humana sem fingir moderacao automatica", () => {
    expect(isReadyForHumanContentReview(humanReviewReady)).toBe(true);
    expect(isReadyForHumanContentReview({
      ...humanReviewReady,
      category: "video",
      folder: "profile-videos/professional-test",
    })).toBe(true);
    expect(manualMediaReviewBlockers({
      ...humanReviewReady,
      category: "video",
      folder: "profiles/photos",
    })).toContain("NOT_PROFILE_MEDIA");
  });

  test("moderacao manual encaminha para fila sem publicar nem depender de endpoint externo", async () => {
    const [uploads, panel, statusRoute] = await Promise.all([
      import("node:fs/promises").then((fs) => fs.readFile("src/lib/upload-quarantine.ts", "utf8")),
      import("node:fs/promises").then((fs) => fs.readFile("src/app/(dashboard)/admin/moderacao/uploads/page.tsx", "utf8")),
      import("node:fs/promises").then((fs) => fs.readFile("src/app/api/uploads/[id]/status/route.ts", "utf8")),
    ]);
    expect(uploads).toContain('moderation.provider === "MANUAL"');
    expect(uploads).toContain('status: "PENDING_REVIEW"');
    expect(uploads).toContain('adminReviewStatus: "PENDING"');
    expect(panel).toContain('{ category: "video", folder: { startsWith: "profile-videos" } }');
    expect(statusRoute).toContain("owned.failureReason");
    expect(uploads).not.toContain("CONTENT_MODERATION_ENDPOINT");
  });

  test("reutiliza decisao somente para duplicata exata da mesma titular e com evidencias equivalentes", async () => {
    const uploads = await import("node:fs/promises").then((fs) => fs.readFile("src/lib/upload-quarantine.ts", "utf8"));
    expect(uploads).toContain("reusableModerationDecision");
    expect(uploads).toContain("userId: asset.userId");
    expect(uploads).toContain("fileHash: asset.fileHash");
    expect(uploads).toContain("detectedMimeType: asset.detectedMimeType");
    expect(uploads).toContain("contentRating: asset.contentRating");
    expect(uploads).toContain("declaredPeopleSignature(candidate.depictedPeople) !== expectedSignature");
    expect(uploads).toContain('status: { in: ["PENDING", "REVIEWING"] }');
    expect(uploads).toContain('adminReviewStatus: "NOT_REQUIRED"');
    expect(uploads).toContain("sourceAssetId: reusableDecision.id");
  });

  test("remove revisao administrativa redundante somente de decisao rastreavel e sem denuncia", async () => {
    const uploads = await import("node:fs/promises").then((fs) => fs.readFile("src/lib/upload-quarantine.ts", "utf8"));
    expect(uploads).toContain("clearRedundantAdminReviewForApprovedDecision");
    expect(uploads).toContain("!asset.moderationProviderVersion");
    expect(uploads).toContain("!asset.moderationResult");
    expect(uploads).toContain('status: { in: ["PENDING", "REVIEWING"] }');
    expect(uploads).toContain('adminReviewStatus: "NOT_REQUIRED"');
    expect(uploads).toContain("Revisao administrativa redundante removida");
  });

  test("declaracoes de pessoas retratadas nao substituem verificacao de conteudo", async () => {
    const [uploads, uploadRoute, avatarRoute] = await Promise.all([
      import("node:fs/promises").then((fs) => fs.readFile("src/lib/upload-quarantine.ts", "utf8")),
      import("node:fs/promises").then((fs) => fs.readFile("src/app/api/upload/route.ts", "utf8")),
      import("node:fs/promises").then((fs) => fs.readFile("src/app/api/users/me/avatar/route.ts", "utf8")),
    ]);
    expect(uploads).toContain("These records are declarations supplied by the uploader");
    expect(uploads).toContain("declaredPeopleSignature");
    expect(uploads).toContain('["SELF", "SELF_DECLARED", "DEPICTED_PERSON"]');
    expect(uploadRoute).toContain('relationship: "SELF_DECLARED"');
    expect(avatarRoute).toContain('relationship: "SELF_DECLARED"');
    expect(uploads).not.toContain("ownerAttestedDirectPublicationEligible");
    expect(uploads).not.toContain("OWNER_ATTESTATION_POLICY");
    expect(uploads).not.toContain("owner-only-v1");
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

  test("midia profissional normal tambem exige identidade e KYC aprovados", async () => {
    const source = await import("node:fs/promises").then((fs) => fs.readFile("src/app/api/upload/route.ts", "utf8"));
    expect(source).toContain('const requiresVerifiedProfessional = folder.startsWith("profiles")');
    expect(source).toContain("!requiresVerifiedProfessional || identityApproved");
  });

  test("aprovacao profissional retoma fotos e videos sem inventar decisao de conteudo", async () => {
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
    expect(uploads).toContain('category: { in: ["image", "video"] }');
    expect(uploads).toContain('{ folder: { startsWith: "profile-videos" } }');
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
    expect(page).toContain("Mídias antigas (antes de 21/10/2026)");
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

  test("declaracao sem moderacao aprovada permanece fora da publicacao", () => {
    expect(evaluateMediaPublicationGates({
      ...passingGates,
      moderationStatus: "PENDING",
      adminReviewRequired: false,
      adminReviewStatus: "NOT_REQUIRED",
    }).blockers).toContain("CONTENT_MODERATION");
  });

  test("decisao de politica e separada de moderacao visual", () => {
    const previous = process.env.SELF_DECLARATION_MEDIA_PUBLICATION_ENABLED;
    try {
      delete process.env.SELF_DECLARATION_MEDIA_PUBLICATION_ENABLED;
      expect(evaluateMediaPublicationGates({
        ...passingGates,
        moderationStatus: "PENDING",
        publicationDecisionType: "POLICY_ATTESTATION",
        adminReviewRequired: false,
      }).blockers).toContain("CONTENT_MODERATION");
      process.env.SELF_DECLARATION_MEDIA_PUBLICATION_ENABLED = "true";
      expect(evaluateMediaPublicationGates({
        ...passingGates,
        moderationStatus: "PENDING",
        publicationDecisionType: "POLICY_ATTESTATION",
        adminReviewRequired: false,
        adminReviewStatus: "POLICY_ATTESTATION",
      })).toMatchObject({ publishable: true, blockers: [] });
    } finally {
      if (previous === undefined) delete process.env.SELF_DECLARATION_MEDIA_PUBLICATION_ENABLED;
      else process.env.SELF_DECLARATION_MEDIA_PUBLICATION_ENABLED = previous;
    }
  });

  test("politica de autodeclaracao fica desativada e auditavel por padrao", async () => {
    const [policy, upload] = await Promise.all([
      import("node:fs/promises").then((fs) => fs.readFile("src/lib/self-declaration-media-policy.ts", "utf8")),
      import("node:fs/promises").then((fs) => fs.readFile("src/lib/upload-quarantine.ts", "utf8")),
    ]);
    expect(policy).toContain('SELF_DECLARATION_MEDIA_PUBLICATION_ENABLED !== "true"');
    expect(policy).toContain('visualAnalysisPerformed: false');
    expect(policy).toContain('policyNature: "SELF_DECLARATION_WITH_REACTIVE_MODERATION"');
    expect(policy).toContain('status: { in: ["PENDING", "REVIEWING"] }');
    expect(policy).toContain('asset.moderationStatus !== "PENDING" || asset.moderationProvider !== "MANUAL"');
    expect(upload).toContain('publicationDecisionType: "POLICY_ATTESTATION"');
    expect(upload).toContain("moderationStatusPreserved: asset.moderationStatus");
    expect(upload).not.toContain('moderationStatus: "POLICY_ATTESTATION"');
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

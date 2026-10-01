import { expect, test } from "@playwright/test";
import { isAgeRestrictedRequest } from "../src/lib/age-gate-policy";
import { createMediaAccessToken, verifyMediaAccessToken } from "../src/lib/media-access-token";
import { evaluateMediaPublicationGates } from "../src/lib/media-security";

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
  for (const malwareStatus of ["PENDING", "ERROR"]) {
    test(`nao publica com malware ${malwareStatus}`, () => {
      const result = evaluateMediaPublicationGates({ ...passingGates, malwareStatus });
      expect(result.publishable).toBe(false);
      expect(result.blockers).toContain("MALWARE_SCAN");
    });
  }

  for (const moderationStatus of ["PENDING", "ERROR"]) {
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

  test("API de midia privada recusa visitante sem sessao", async ({ request }) => {
    const response = await request.get("/api/media/asset-1");
    expect([401, 403]).toContain(response.status());
    expect(response.headers()["cache-control"]).toContain("no-store");
  });
});

import { expect, test } from "@playwright/test";
import {
  canCollectLegalAcceptance,
  canPublishLegalVersion,
  LEGAL_DOCUMENT_CATALOG,
  LEGAL_DOCUMENT_STATUSES,
  PUBLIC_FOOTER_LEGAL_LINKS,
  requiresContentAuthorizationDeclaration,
  ROLE_LEGAL_DOCUMENT_PLACEMENTS,
} from "../src/lib/legal-document-catalog";
import { ROULETTE_PROMOTION_POLICY } from "../src/lib/roulette-promotion-policy";

test("catalogo possui 32 minutas e status operacionais exigidos", () => {
  expect(LEGAL_DOCUMENT_CATALOG).toHaveLength(32);
  expect(LEGAL_DOCUMENT_STATUSES).toEqual([
    "DRAFT_INTERNAL",
    "READY_FOR_LEGAL_REVIEW",
    "LEGAL_REVIEW_REQUESTED",
    "OPERATIONAL_PUBLISHED_PENDING_LEGAL_RATIFICATION",
    "LEGAL_APPROVED",
    "COMPANY_APPROVED",
    "PUBLISHED",
    "SUPERSEDED",
    "REVOKED",
  ]);
});

test("rodape e colocacoes por papel contem documentos obrigatorios", () => {
  expect(PUBLIC_FOOTER_LEGAL_LINKS.map((item) => item.key)).toEqual(expect.arrayContaining([
    "terms-general",
    "privacy-policy",
    "cookies-policy",
    "community-rules",
    "content-policy",
    "moderation-reporting-policy",
    "adult-safety-policy",
    "adult-declaration",
    "roleta-promocional-policy",
  ]));
  expect(ROLE_LEGAL_DOCUMENT_PLACEMENTS.cadastroLogin).toEqual(expect.arrayContaining([
    "terms-general",
    "privacy-policy",
    "adult-declaration",
    "registration-short-notice",
  ]));
  expect(ROLE_LEGAL_DOCUMENT_PLACEMENTS.checkout).toEqual(expect.arrayContaining([
    "checkout-notice",
    "payments-policy",
    "refund-policy",
  ]));
  expect(ROLE_LEGAL_DOCUMENT_PLACEMENTS.roletaPromocional).toEqual([
    "roleta-promocional-policy",
  ]);
});

test("aceites versionados incluem cadastro, checkout e upload de conteudo", () => {
  expect(ROLE_LEGAL_DOCUMENT_PLACEMENTS.cadastroLogin).toContain("adult-declaration");
  expect(ROLE_LEGAL_DOCUMENT_PLACEMENTS.checkout).toEqual(["checkout-notice", "payments-policy", "refund-policy"]);
  expect(ROLE_LEGAL_DOCUMENT_PLACEMENTS.upload).toEqual([
    "content-policy",
    "content-publication-notice",
    "content-authorization-declaration",
    "adult-safety-policy",
  ]);
});

test("documento sem aprovacao formal nao pode virar published", () => {
  expect(canPublishLegalVersion({
    status: "READY_FOR_LEGAL_REVIEW",
    internal: false,
    version: "0.4-ready-for-legal-review",
    contentHash: "abc",
    effectiveAt: new Date(),
    legalReviewerName: "Advogada",
    legalReviewReference: "assinatura",
    companyApproved: false,
    pendingFields: [],
  })).toBe(false);

  expect(canPublishLegalVersion({
    status: "COMPANY_APPROVED",
    internal: false,
    version: "1.0",
    contentHash: "abc",
    effectiveAt: new Date(),
    legalReviewerName: "Advogada",
    legalReviewReference: "assinatura",
    companyApproved: true,
    pendingFields: [],
  })).toBe(true);
});

test("aceite juridico versionado exige documento publicado e vigente", () => {
  const now = new Date("2026-06-11T12:00:00.000Z");

  expect(canCollectLegalAcceptance({
    status: "READY_FOR_LEGAL_REVIEW",
    internal: false,
    effectiveAt: new Date("2026-06-11T00:00:00.000Z"),
    publishedAt: new Date("2026-06-11T00:00:00.000Z"),
  }, now)).toBe(false);

  expect(canCollectLegalAcceptance({
    status: "OPERATIONAL_PUBLISHED_PENDING_LEGAL_RATIFICATION",
    internal: false,
    effectiveAt: new Date("2026-06-11T00:00:00.000Z"),
    publishedAt: new Date("2026-06-11T00:00:00.000Z"),
  }, now)).toBe(true);

  expect(canCollectLegalAcceptance({
    status: "OPERATIONAL_PUBLISHED_PENDING_LEGAL_RATIFICATION",
    internal: true,
    effectiveAt: new Date("2026-06-11T00:00:00.000Z"),
    publishedAt: new Date("2026-06-11T00:00:00.000Z"),
  }, now)).toBe(false);

  expect(canCollectLegalAcceptance({
    status: "PUBLISHED",
    internal: false,
    effectiveAt: new Date("2026-06-12T00:00:00.000Z"),
    publishedAt: new Date("2026-06-11T00:00:00.000Z"),
  }, now)).toBe(false);

  expect(canCollectLegalAcceptance({
    status: "PUBLISHED",
    internal: false,
    effectiveAt: new Date("2026-06-11T00:00:00.000Z"),
    publishedAt: new Date("2026-06-11T00:00:00.000Z"),
  }, now)).toBe(true);
});

test("upload publico exige declaracao de autoria", () => {
  expect(requiresContentAuthorizationDeclaration("stories")).toBe(true);
  expect(requiresContentAuthorizationDeclaration("profiles/clx")).toBe(true);
  expect(requiresContentAuthorizationDeclaration("profile-videos/clx")).toBe(true);
  expect(requiresContentAuthorizationDeclaration("properties/clx")).toBe(true);
  expect(requiresContentAuthorizationDeclaration("documentos/clx")).toBe(false);
  expect(requiresContentAuthorizationDeclaration("verificacao/clx")).toBe(false);
});

test("politica da roleta cobre operacao, fraude, premios e aceite versionado", () => {
  expect(ROULETTE_PROMOTION_POLICY.key).toBe("roleta-promocional-policy");
  expect(ROULETTE_PROMOTION_POLICY.version).toBe(
    "1.0-operational-2026-06-11",
  );
  expect(ROULETTE_PROMOTION_POLICY.content).toContain(
    "uma participação por dia",
  );
  expect(ROULETTE_PROMOTION_POLICY.content).toContain(
    "cupons, créditos, vouchers",
  );
  expect(ROULETTE_PROMOTION_POLICY.content).toContain(
    "prevenção a fraude",
  );
  expect(ROULETTE_PROMOTION_POLICY.content).toContain(
    "versão, o hash do conteúdo",
  );
  expect(ROULETTE_PROMOTION_POLICY.content).toContain(
    "autorização do órgão competente",
  );
  expect(ROULETTE_PROMOTION_POLICY.content).not.toContain("LEGAL_APPROVED");
  expect(ROULETTE_PROMOTION_POLICY.content).not.toContain("PUBLISHED");
});

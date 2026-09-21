import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { createProfessionalSchema } from "../src/lib/professional-profile-schema";
import { assessProfessionalDiditDecision } from "../src/lib/professional-didit";
import {
  buildDigitVendorData,
  canRetryDigitStatus,
  createDigitIntentMarker,
  digitStatusWhenProviderUnavailable,
  digitWebhookAuditPayload,
  digitWebhookTargetsActiveSession,
  isSafeDigitVerificationUrl,
  normalizeDigitStatus,
  parseDigitIntentMarker,
  type DiditDecision,
} from "../src/lib/didit";
import {
  createDigitCallbackState,
  resolveDigitCallbackDestination,
  verifyDigitCallbackState,
} from "../src/lib/didit-callback";

const validProfile = {
  displayName: "Modelo Teste",
  bio: "A".repeat(80),
  city: "Sao Paulo",
  state: "SP",
  escortCategory: "MULHER",
  birthDate: "2000-01-01",
  attendanceTypes: ["A domicilio"],
  servesGenders: ["Homens"],
  diasDisponiveis: ["Segunda"],
  services: ["Acompanhamento"],
  paymentMethods: ["Pix"],
  pricePerHour: 300,
  whatsapp: "11912345678",
  image: "/api/media/test-cover",
  kycSessionId: "kyc_test",
};

function issuePaths(data: Record<string, unknown>) {
  const result = createProfessionalSchema.safeParse(data);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join("."));
}

test.describe("validacao do perfil profissional", () => {
  test("aceita o payload minimo completo", () => {
    expect(createProfessionalSchema.safeParse(validProfile).success).toBe(true);
  });

  test("aceita bairro e regiao ausentes e valor de 15 minutos", () => {
    const profile = { ...validProfile, price15min: 120 } as Record<string, unknown>;
    delete profile.pricePerHour;
    expect(createProfessionalSchema.safeParse(profile).success).toBe(true);
  });

  test("rejeita biografia com menos de 80 caracteres", () => {
    expect(issuePaths({ ...validProfile, bio: "curta" })).toContain("bio");
  });

  test("rejeita perfil sem foto principal", () => {
    const withoutImage: Record<string, unknown> = { ...validProfile };
    delete withoutImage.image;
    expect(issuePaths(withoutImage)).toContain("image");
  });

  test("rejeita perfil sem sessao KYC", () => {
    const withoutKyc: Record<string, unknown> = { ...validProfile };
    delete withoutKyc.kycSessionId;
    expect(issuePaths(withoutKyc)).toContain("kycSessionId");
  });

  test("rejeita data impossivel", () => {
    expect(issuePaths({ ...validProfile, birthDate: "2000-02-31" })).toContain("birthDate");
  });

  test("rejeita data futura", () => {
    expect(issuePaths({ ...validProfile, birthDate: "2999-01-01" })).toContain("birthDate");
  });

  test("rejeita menor de 18 anos", () => {
    const today = new Date();
    const minorDate = `${today.getFullYear() - 17}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    expect(issuePaths({ ...validProfile, birthDate: minorDate })).toContain("birthDate");
  });
});

function diditDecision(status: DiditDecision["status"], dateOfBirth: string | null = "1990-01-01"): DiditDecision {
  return {
    session_id: "didit_session_test",
    status,
    vendor_data: "user_test",
    id_verifications: dateOfBirth === null ? [] : [{ node_id: "document", status: "Approved", date_of_birth: dateOfBirth }],
    liveness_checks: [{ node_id: "liveness", status: "Approved" }],
  };
}

test.describe("verificacao Didit no onboarding profissional", () => {
  test("normaliza aprovacao, analise e recusa sem promover estado pendente", () => {
    expect(normalizeDigitStatus("Approved")).toBe("APPROVED");
    expect(normalizeDigitStatus("In Review")).toBe("PENDING");
    expect(normalizeDigitStatus("Awaiting User")).toBe("PENDING");
    expect(normalizeDigitStatus("Declined")).toBe("REJECTED");
    expect(normalizeDigitStatus("Expired")).toBe("REJECTED");
    expect(normalizeDigitStatus("Not Finished")).toBe("PENDING");
    expect(normalizeDigitStatus("Cancelled")).toBe("REJECTED");
    expect(normalizeDigitStatus("Unexpected Provider State")).toBe("PENDING");
    expect(canRetryDigitStatus("Expired")).toBe(true);
    expect(canRetryDigitStatus("Cancelled")).toBe(true);
  });

  test("so considera aprovada a decisao Didit que tambem confirma maioridade", () => {
    expect(assessProfessionalDiditDecision(diditDecision("Approved"))).toMatchObject({
      status: "APPROVED",
      approved: true,
    });
    expect(assessProfessionalDiditDecision(diditDecision("Approved", null))).toMatchObject({
      status: "REJECTED",
      approved: false,
    });
    expect(assessProfessionalDiditDecision(diditDecision("In Review"))).toMatchObject({
      status: "PENDING",
      approved: false,
    });
  });

  test("onboarding preserva rascunho, apresenta uma etapa Didit e impede clique duplo", () => {
    const page = fs.readFileSync(
      path.join(process.cwd(), "src/app/(dashboard)/profissional/novo/page.tsx"),
      "utf8",
    );
    expect(page.indexOf('title="Revise seus dados"')).toBeLessThan(page.indexOf('title="🔐 Verifique sua identidade"'));
    expect(page.match(/Verificar minha identidade/g)).toHaveLength(1);
    expect(page).toContain("diditStartingRef.current");
    expect(page).toContain("localStorage.setItem(DRAFT_KEY");
    expect(page).toContain('form.kycStatus !== "APPROVED"');
    expect(page).not.toContain("startFaceBiometry");
  });

  test("backend valida a decisao real e sobrescreve o estado enviado pelo navegador", () => {
    const route = fs.readFileSync(path.join(process.cwd(), "src/app/api/professionals/route.ts"), "utf8");
    const validationAt = route.indexOf("requireApprovedProfessionalDidit(session.user.id)");
    const persistenceAt = route.indexOf("const professionalData");
    expect(validationAt).toBeGreaterThan(-1);
    expect(persistenceAt).toBeGreaterThan(validationAt);
    expect(route).toContain("kycSessionId: diditVerification.sessionId");
    expect(route).toContain("kycStatus: diditVerification.status");
  });

  test("sessao Didit e callback permitem retomada sem criar duplicidade", () => {
    const sessionRoute = fs.readFileSync(path.join(process.cwd(), "src/app/api/didit/session/route.ts"), "utf8");
    const callback = fs.readFileSync(path.join(process.cwd(), "src/app/(dashboard)/verificacao/callback/page.tsx"), "utf8");
    expect(sessionRoute).toContain("pg_advisory_xact_lock");
    expect(sessionRoute).toContain("createDigitIntentMarker");
    expect(sessionRoute).toContain("findDigitSessionByVendorData");
    expect(sessionRoute).toContain("verificationUrl: diditSession.url");
    expect(callback).toContain("hasActiveProfessionalDigit");
  });

  test("retoma sessao pendente pelo backend sem depender do localStorage", () => {
    const sessionRoute = fs.readFileSync(path.join(process.cwd(), "src/app/api/didit/session/route.ts"), "utf8");
    const page = fs.readFileSync(path.join(process.cwd(), "src/app/(dashboard)/profissional/novo/page.tsx"), "utf8");
    expect(sessionRoute).toContain("verificationUrl: true");
    expect(sessionRoute).toContain("url: assessment.status === DIDIT_PENDING_STATUS ? storedUrl : null");
    expect(page).toContain('verificationUrl: data.url ?? ""');
    expect(page).not.toContain('form.kycStatus === "PENDING" && form.verificationUrl.startsWith("http")');
    expect(page).toContain('verificationUrl: ""');
  });

  test("intencao persistida estabiliza requisicoes concorrentes e permite reconciliacao", () => {
    const marker = createDigitIntentMarker("intent-test", 1_700_000_000_000);
    expect(parseDigitIntentMarker(marker)).toEqual({
      intentId: "intent-test",
      createdAt: 1_700_000_000_000,
      leaseAt: 1_700_000_000_000,
    });
    expect(buildDigitVendorData("user-test", "intent-test")).toBe("user-test:didit-intent:intent-test");
    const sessionRoute = fs.readFileSync(path.join(process.cwd(), "src/app/api/didit/session/route.ts"), "utf8");
    expect(sessionRoute).toContain("pg_advisory_xact_lock");
    expect(sessionRoute).toContain('kind: "starting"');
    expect(sessionRoute.indexOf("const marker = createDigitIntentMarker")).toBeLessThan(sessionRoute.indexOf("await createDigitSession(reservation.vendorData"));
  });

  test("webhook antigo nao pode atingir a sessao ativa e sessao atual pode", () => {
    const vendorData = buildDigitVendorData("user-test", "intent-test");
    expect(digitWebhookTargetsActiveSession({
      activeSessionId: "session-new",
      webhookSessionId: "session-old",
      vendorData,
      userId: "user-test",
    })).toBe(false);
    expect(digitWebhookTargetsActiveSession({
      activeSessionId: "session-new",
      webhookSessionId: "session-new",
      vendorData,
      userId: "user-test",
    })).toBe(true);
    expect(digitWebhookTargetsActiveSession({
      activeSessionId: "session-new",
      webhookSessionId: "session-new",
      vendorData: buildDigitVendorData("other-user", "intent-test"),
      userId: "user-test",
    })).toBe(false);
  });

  test("callback prioriza onboarding profissional ativo sem mudar cliente comum", () => {
    const client = { activeProfileType: "CLIENTE", accountType: "client", isProfessional: true };
    expect(resolveDigitCallbackDestination({ user: client, hasActiveProfessionalDigit: true }))
      .toBe("/profissional/novo?didit=returned");
    expect(resolveDigitCallbackDestination({ user: client, hasActiveProfessionalDigit: false }))
      .toBe("/dashboard/verificacao-idade");
    expect(resolveDigitCallbackDestination({ user: null, hasActiveProfessionalDigit: false, professionalStateValid: true }))
      .toContain("/login?returnUrl=");
    expect(resolveDigitCallbackDestination({ user: null, hasActiveProfessionalDigit: false }))
      .toContain(encodeURIComponent("/dashboard/verificacao-idade"));
    const state = createDigitCallbackState("test-secret", 1_700_000_000_000);
    expect(verifyDigitCallbackState(state, "test-secret", 1_700_000_001_000)).toBe(true);
    expect(verifyDigitCallbackState(`${state}tampered`, "test-secret", 1_700_000_001_000)).toBe(false);
  });

  test("falha temporaria da Didit nunca promove aprovacao persistida", () => {
    expect(digitStatusWhenProviderUnavailable()).toBe("PENDING");
    const sessionRoute = fs.readFileSync(path.join(process.cwd(), "src/app/api/didit/session/route.ts"), "utf8");
    expect(sessionRoute).not.toContain('user?.clientStatus === "VERIFIED"');
  });

  test("webhook armazena somente metadados tecnicos minimos", () => {
    const audit = digitWebhookAuditPayload({
      event_id: "event-test",
      webhook_type: "status.updated",
      timestamp: 123,
      created_at: 123,
      session_id: "session-test",
      status: "Approved",
      vendor_data: "user-test",
      environment: "sandbox",
      decision: { selfie: "sensitive", document: "sensitive", reason: "sensitive" },
    });
    expect(audit).toEqual({
      eventId: "event-test",
      eventType: "status.updated",
      sessionId: "session-test",
      status: "Approved",
      timestamp: 123,
    });
    expect(JSON.stringify(audit)).not.toContain("sensitive");
  });

  test("somente URLs HTTPS da Didit podem ser retomadas", () => {
    expect(isSafeDigitVerificationUrl("https://verify.didit.me/session-test")).toBe(true);
    expect(isSafeDigitVerificationUrl("https://evil.example/session-test")).toBe(false);
    expect(isSafeDigitVerificationUrl("javascript:alert(1)")).toBe(false);
  });

  test("rota de sessao exige autenticacao antes de recuperar URL sensivel", () => {
    const sessionRoute = fs.readFileSync(path.join(process.cwd(), "src/app/api/didit/session/route.ts"), "utf8");
    const authAt = sessionRoute.indexOf("if (!session) return NextResponse.json");
    const currentStatusAt = sessionRoute.indexOf("await currentStatus(session.user.id)");
    expect(authAt).toBeGreaterThan(-1);
    expect(currentStatusAt).toBeGreaterThan(authAt);
    expect(sessionRoute).not.toContain("searchParams.get(\"sessionId\")");
  });

  test("webhook repetido preserva a idempotencia existente", () => {
    const handler = fs.readFileSync(path.join(process.cwd(), "src/lib/didit-webhook-handler.ts"), "utf8");
    const idempotency = fs.readFileSync(path.join(process.cwd(), "src/lib/webhook-idempotency.ts"), "utf8");
    expect(handler).toContain("if (!claim.claimed)");
    expect(handler).toContain("duplicate: true");
    expect(idempotency).toContain("provider_eventId");
  });
});

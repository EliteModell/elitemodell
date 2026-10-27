import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { createProfessionalSchema } from "../src/lib/professional-profile-schema";
import { assessProfessionalDiditDecision } from "../src/lib/professional-didit";
import { professionalRegistrationStatus } from "../src/lib/professional-registration-status";
import { accountEmailLabel, isTechnicalPhoneEmail, realAccountEmail } from "../src/lib/account-email";
import { reconcileProfessionalDidit } from "../src/lib/didit-reconciliation";
import { handleDigitWebhook } from "../src/lib/didit-webhook-handler";
import { prisma } from "../src/lib/prisma";
import { NextRequest } from "next/server";
import { createHmac } from "node:crypto";
import {
  isServiceOptionSelected,
  PROFESSIONAL_SERVICE_CATEGORIES,
  removeServiceSelection,
  replaceServiceSelection,
  serviceSelectionDirection,
} from "../src/lib/professional-service-catalog";
import {
  buildDigitVendorData,
  canRetryDigitStatus,
  createDigitIntentMarker,
  digitStatusWhenProviderUnavailable,
  digitVendorDataBelongsToUser,
  digitWebhookAuditPayload,
  digitWebhookTargetsActiveSession,
  findDigitSessionByVendorData,
  isSafeDigitVerificationUrl,
  isSubmittedDigitStatus,
  normalizeDigitStatus,
  parseDigitIntentMarker,
  isDigitIntentInFlight,
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

test.describe("e-mail tecnico de cadastro por telefone", () => {
  test("mantem identificador interno fora da apresentacao", () => {
    const technical = "phone_model_11917934340@sms.elitemodell.local";
    expect(isTechnicalPhoneEmail(technical)).toBe(true);
    expect(isTechnicalPhoneEmail(technical.toUpperCase())).toBe(true);
    expect(realAccountEmail(technical)).toBeNull();
    expect(accountEmailLabel(technical)).toBe("E-mail não informado");
  });

  test("preserva e-mail verdadeiro e trata ausencia", () => {
    expect(isTechnicalPhoneEmail("modelo@example.com")).toBe(false);
    expect(realAccountEmail(" Modelo@Example.com ")).toBe("modelo@example.com");
    expect(accountEmailLabel("modelo@example.com")).toBe("modelo@example.com");
    expect(accountEmailLabel(null)).toBe("E-mail não informado");
  });

  test("bloqueia recuperacao e entrega para dominio tecnico sem mudar o identificador", () => {
    const recovery = fs.readFileSync(path.join(process.cwd(), "src/app/api/auth/password-recovery/route.ts"), "utf8");
    const emailService = fs.readFileSync(path.join(process.cwd(), "src/lib/auth-email.ts"), "utf8");
    const phoneAuth = fs.readFileSync(path.join(process.cwd(), "src/lib/phone-otp.ts"), "utf8");
    expect(recovery).toContain("isTechnicalPhoneEmail(email)");
    expect(emailService).toContain("realAccountEmail(to)");
    expect(phoneAuth).toContain("@sms.elitemodell.local");
  });

  test("painel administrativo usa rotulo seguro sem nova consulta", () => {
    const card = fs.readFileSync(path.join(process.cwd(), "src/app/(dashboard)/admin/profissionais/AdminProfessionalCard.tsx"), "utf8");
    expect(card).toContain("accountEmailLabel(pro.user.email)");
    expect(card).not.toContain('label="E-mail" value={pro.user.email}');
    expect(card).toContain('label="Nome da conta"');
    expect(card).toContain("PERFIL · ${completion.profilePercent}% PREENCHIDO");
    expect(card).toContain("!isTechnicalPhoneEmail(pro.user.email)");
  });

  test("novos profissionais nao recebem e-mail ou telefone como nome por fallback", () => {
    const auth = fs.readFileSync(path.join(process.cwd(), "src/lib/auth.ts"), "utf8");
    expect(auth).toContain('(roleIntent === "profissional" ? null : authUser.email ?? phone ?? null)');
  });

});

function issuePaths(data: Record<string, unknown>) {
  const result = createProfessionalSchema.safeParse(data);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join("."));
}

test.describe("acompanhamento do cadastro profissional", () => {
  const verifiedEmail = { email: "modelo@example.com", emailVerified: true };

  test("deriva estados reais sem confundir identidade, aprovacao e publicacao", () => {
    expect(professionalRegistrationStatus({ email: "phone_1@sms.elitemodell.local" }).id).toBe("email_missing");
    expect(professionalRegistrationStatus({ email: "modelo@example.com", emailVerified: false }).id).toBe("email_unconfirmed");
    expect(professionalRegistrationStatus({ ...verifiedEmail, professionalStatus: "DRAFT", firstIncompleteStep: 3 })).toMatchObject({ id: "incomplete", targetStep: 3 });
    expect(professionalRegistrationStatus({ ...verifiedEmail, professionalStatus: "DRAFT", kycStatus: "PENDING" }).id).toBe("identity_pending");
    expect(professionalRegistrationStatus({ ...verifiedEmail, professionalStatus: "PENDING_REVIEW", registrationSubmittedAt: "2026-10-26T10:00:00Z", kycStatus: "APPROVED" }).id).toBe("submitted");
    expect(professionalRegistrationStatus({ ...verifiedEmail, professionalStatus: "CORRECTION_REQUIRED", correctionReason: "Troque a foto principal." })).toMatchObject({ id: "correction_required", description: "Troque a foto principal." });
    expect(professionalRegistrationStatus({ ...verifiedEmail, professionalStatus: "ACTIVE", published: false }).id).toBe("approved");
    expect(professionalRegistrationStatus({ ...verifiedEmail, professionalStatus: "ACTIVE", published: true, profileUrl: "/profissionais/modelo" }).id).toBe("published");
  });
});

test("comunicacao de identidade usa servico existente com idempotencia e e-mail confirmado", () => {
  const reconciliation = fs.readFileSync(path.join(process.cwd(), "src/lib/didit-reconciliation.ts"), "utf8");
  const communications = fs.readFileSync(path.join(process.cwd(), "src/lib/professional-communications.ts"), "utf8");
  expect(reconciliation).toContain("outcome.becameApproved");
  expect(reconciliation).toContain("outcome.emailVerified");
  expect(reconciliation).toContain('type: "KYC_APPROVED"');
  expect(reconciliation).toContain('dedupeReason: "professional:kyc-approved-email:v1"');
  expect(reconciliation).toContain("sendProfessionalKycApprovedEmail");
  expect(communications).toContain("if (delivered) return { emailStatus: \"EMAIL_ALREADY_SENT\" as const }");
});

test.describe("validacao do perfil profissional", () => {
  test("aceita o payload minimo completo", () => {
    expect(createProfessionalSchema.safeParse(validProfile).success).toBe(true);
  });

  test("aceita qualquer valor informado na tabela de precos", () => {
    const profile = { ...validProfile, price15min: 120 } as Record<string, unknown>;
    delete profile.pricePerHour;
    expect(createProfessionalSchema.safeParse(profile).success).toBe(true);
  });

  test("exige biografia completa no cadastro de nove etapas", () => {
    expect(issuePaths({ ...validProfile, bio: "curta" })).toContain("bio");
    expect(issuePaths({ ...validProfile, bio: undefined })).toContain("bio");
  });

  test("rejeita perfil sem foto principal", () => {
    const withoutImage: Record<string, unknown> = { ...validProfile };
    delete withoutImage.image;
    expect(issuePaths(withoutImage)).toContain("image");
  });

  test("aceita informações iniciais sem sessão KYC, mantendo publicação bloqueada", () => {
    const withoutKyc: Record<string, unknown> = { ...validProfile };
    delete withoutKyc.kycSessionId;
    expect(createProfessionalSchema.safeParse(withoutKyc).success).toBe(true);
  });

  test("exige nascimento no perfil e confirma maioridade pela decisao assinada da Didit", () => {
    expect(issuePaths({ ...validProfile, birthDate: undefined })).toContain("birthDate");
    expect(assessProfessionalDiditDecision(diditDecision("Approved", null))).toMatchObject({
      status: "REJECTED",
      approved: false,
    });
  });
});

test.describe("catalogo de servicos profissionais", () => {
  test("possui ids unicos, categorias completas e nenhum rotulo duplicado", () => {
    const options = PROFESSIONAL_SERVICE_CATEGORIES.flatMap((category) => category.options);
    expect(new Set(options.map((option) => option.id)).size).toBe(options.length);
    expect(new Set(options.map((option) => option.label)).size).toBe(options.length);
    expect(PROFESSIONAL_SERVICE_CATEGORIES.map((category) => category.label)).toEqual([
      "Acompanhamento",
      "Massagens",
      "Serviços íntimos",
    ]);
  });

  test("preserva valor legado e troca direcao sem duplicar o servico", () => {
    const massage = PROFESSIONAL_SERVICE_CATEGORIES[1].options[0];
    const oral = PROFESSIONAL_SERVICE_CATEGORIES[2].options.find((option) => option.id === "protected-oral")!;
    expect(isServiceOptionSelected(["Massagem"], massage)).toBe(true);

    const doing = replaceServiceSelection(["Acompanhamento"], oral, "DO");
    const receiving = replaceServiceSelection(doing, oral, "RECEIVE");
    expect(receiving).toHaveLength(2);
    expect(serviceSelectionDirection(receiving[1], oral)).toBe("RECEIVE");
    expect(removeServiceSelection(receiving, oral)).toEqual(["Acompanhamento"]);
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
  test("distingue documentos enviados de fluxo ainda incompleto", () => {
    expect(isSubmittedDigitStatus("In Review")).toBe(true);
    expect(isSubmittedDigitStatus("Resubmitted")).toBe(true);
    expect(isSubmittedDigitStatus("Approved")).toBe(true);
    expect(isSubmittedDigitStatus("Not Started")).toBe(false);
    expect(isSubmittedDigitStatus("In Progress")).toBe(false);
    expect(isSubmittedDigitStatus("Declined")).toBe(false);
  });

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
    expect(assessProfessionalDiditDecision({ ...diditDecision("Approved"), id_verifications: [] })).toMatchObject({
      status: "REJECTED",
      approved: false,
    });
    expect(assessProfessionalDiditDecision({ ...diditDecision("Approved"), liveness_checks: [] })).toMatchObject({
      status: "REJECTED",
      approved: false,
    });
  });

  test("aprovacao do KYC reavalia publicacao sem ignorar as demais travas", () => {
    const reconciliation = fs.readFileSync(path.join(process.cwd(), "src/lib/didit-reconciliation.ts"), "utf8");
    const submission = fs.readFileSync(path.join(process.cwd(), "src/app/api/professionals/route.ts"), "utf8");
    const publication = fs.readFileSync(path.join(process.cwd(), "src/lib/professional-auto-publication.ts"), "utf8");
    expect(reconciliation).toContain('kycStatus: assessment.status');
    expect(reconciliation).toContain('attemptAutomaticProfessionalPublication(outcome.professionalId, "didit-approved")');
    expect(submission).toContain('status:    "PENDING_REVIEW" as const');
    expect(submission).toContain("KYC pendente impede aprovação");
    expect(submission).toContain('attemptAutomaticProfessionalPublication(professional.id, "registration-submitted")');
    expect(publication).toContain('status: "ACTIVE"');
    expect(publication).toContain('evaluateMediaPublicationGates({');
    expect(publication).toContain('professional.kycStatus !== "APPROVED"');
    expect(publication).toContain('professionalApprovalAccessData(tx, professional)');
  });

  test("onboarding preserva rascunho, apresenta uma etapa Didit e impede clique duplo", () => {
    const page = fs.readFileSync(
      path.join(process.cwd(), "src/app/(dashboard)/profissional/novo/page.tsx"),
      "utf8",
    );
    const verification = fs.readFileSync(
      path.join(process.cwd(), "src/components/professional-onboarding/ProfessionalVerificationSteps.tsx"),
      "utf8",
    );
    expect(verification).toContain("Verifique sua identidade");
    expect(page).toContain("diditStartingRef.current");
    expect(page).toContain("localStorage.setItem(professionalDraftStorageKey(accountUserId)");
    expect(page).toContain("localStorage.getItem(draftKey)");
    expect(page).toContain('form.kycStatus === "APPROVED"');
    expect(page).not.toContain("startFaceBiometry");
  });

  test("upload do onboarding preserva preview local e aceita referencia privada controlada", () => {
    const page = fs.readFileSync(
      path.join(process.cwd(), "src/app/(dashboard)/profissional/novo/page.tsx"),
      "utf8",
    );
    const uploadRoute = fs.readFileSync(path.join(process.cwd(), "src/app/api/upload/route.ts"), "utf8");
    const createRoute = fs.readFileSync(path.join(process.cwd(), "src/app/api/professionals/route.ts"), "utf8");

    expect(page).toContain("URL.createObjectURL(file)");
    expect(page).toContain("setMainPhotoPreview(previewUrl)");
    expect(page).toContain('fd.append("file", file)');
    expect(page).toContain("Foto recebida. Você pode continuar o cadastro.");
    expect(page).toContain("Foto recebida e em análise de segurança.");
    expect(uploadRoute).toContain("/api/media/${encodeURIComponent(processed.id)}");
    expect(uploadRoute).toContain("Arquivo recebido e em analise de seguranca.");
    expect(createRoute).toContain("assertOwnedUploadMediaUrls");
  });

  test("backend valida a decisao real e sobrescreve o estado enviado pelo navegador", () => {
    const route = fs.readFileSync(path.join(process.cwd(), "src/app/api/professionals/route.ts"), "utf8");
    const validationAt = route.indexOf("reconcileProfessionalDidit(session.user.id, diditVerification.sessionId)");
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
    expect(sessionRoute).toContain("reconcileProfessionalDidit(userId, sessionId)");
    expect(page).toContain('verificationUrl: data.url ?? ""');
    expect(page).toContain('const diditPending = Boolean(form.kycSessionId) && !diditApproved && !diditRejected');
    expect(page).toContain('if (data.url) set("verificationUrl", data.url)');
  });

  test("intencao persistida estabiliza requisicoes concorrentes e permite reconciliacao", () => {
    const marker = createDigitIntentMarker("intent-test", 1_700_000_000_000);
    expect(parseDigitIntentMarker(marker)).toEqual({
      intentId: "intent-test",
      createdAt: 1_700_000_000_000,
      leaseAt: 1_700_000_000_000,
    });
    expect(buildDigitVendorData("user-test")).toBe("user-test");
    expect(digitVendorDataBelongsToUser("user-test", "user-test")).toBe(true);
    expect(digitVendorDataBelongsToUser("user-test:didit-intent:legacy", "user-test")).toBe(true);
    const sessionRoute = fs.readFileSync(path.join(process.cwd(), "src/app/api/didit/session/route.ts"), "utf8");
    expect(sessionRoute).toContain("pg_advisory_xact_lock");
    expect(sessionRoute).toContain('kind: "starting"');
    expect(sessionRoute.indexOf("const marker = createDigitIntentMarker")).toBeLessThan(sessionRoute.indexOf("await createDigitSession(reservation.vendorData"));
  });

  test("webhook antigo nao pode atingir a sessao ativa e sessao atual pode", () => {
    const vendorData = buildDigitVendorData("user-test");
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
      vendorData: buildDigitVendorData("other-user"),
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

test.describe("reconciliacao Didit com respostas simuladas", () => {
  const originalFetch = globalThis.fetch;
  const originalTransaction = prisma.$transaction;
  const originalFind = prisma.professional.findFirst;
  const originalCreate = prisma.webhookEvent.create;
  const originalUpdate = prisma.webhookEvent.update;
  const originalNotificationFind = prisma.notification.findFirst;
  const originalSecret = process.env.DIDIT_WEBHOOK_SECRET;
  let decision: DiditDecision;
  let active = true;
  let profileStatus = "DRAFT";
  let writes: Array<{ target: string; data: Record<string, unknown>; where?: Record<string, unknown> }>;

  test.beforeEach(() => {
    active = true;
    profileStatus = "DRAFT";
    writes = [];
    decision = diditDecision("Approved");
    process.env.DIDIT_WEBHOOK_SECRET = "test-didit-secret";
    globalThis.fetch = async () => Response.json(decision);
    const tx = {
      $executeRaw: async () => 1,
      professional: {
        findFirst: async () => active ? {
          id: "professional-test",
          userId: "user_test",
          status: profileStatus,
          kycStatus: "APPROVED",
          registrationSubmittedAt: null,
          verificationUrl: "https://verify.didit.me/session-test",
          user: { email: null, name: "Profissional Teste" },
        } : null,
        updateMany: async ({ data, where }: { data: Record<string, unknown>; where?: Record<string, unknown> }) => { writes.push({ target: "professional", data, where }); return { count: 1 }; },
      },
      user: {
        updateMany: async ({ data, where }: { data: Record<string, unknown>; where?: Record<string, unknown> }) => { writes.push({ target: "user", data, where }); return { count: 1 }; },
      },
      uploadAsset: {
        updateMany: async ({ data, where }: { data: Record<string, unknown>; where?: Record<string, unknown> }) => { writes.push({ target: "uploadAsset", data, where }); return { count: 1 }; },
      },
      mediaDepictedPerson: {
        updateMany: async ({ data, where }: { data: Record<string, unknown>; where?: Record<string, unknown> }) => { writes.push({ target: "mediaDepictedPerson", data, where }); return { count: 1 }; },
      },
    };
    prisma.$transaction = (async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)) as unknown as typeof prisma.$transaction;
    prisma.professional.findFirst = (async () => ({ userId: "user_test" })) as typeof prisma.professional.findFirst;
    prisma.webhookEvent.create = (async () => ({ id: "event-test" })) as unknown as typeof prisma.webhookEvent.create;
    prisma.webhookEvent.update = (async () => ({ id: "event-test" })) as unknown as typeof prisma.webhookEvent.update;
    prisma.notification.findFirst = (async () => ({ id: "existing-action-notification" })) as typeof prisma.notification.findFirst;
  });

  test.afterEach(() => {
    globalThis.fetch = originalFetch;
    prisma.$transaction = originalTransaction;
    prisma.professional.findFirst = originalFind;
    prisma.webhookEvent.create = originalCreate;
    prisma.webhookEvent.update = originalUpdate;
    prisma.notification.findFirst = originalNotificationFind;
    if (originalSecret === undefined) delete process.env.DIDIT_WEBHOOK_SECRET;
    else process.env.DIDIT_WEBHOOK_SECRET = originalSecret;
  });

  async function webhook(status: string) {
    const body = JSON.stringify({ event_id: `event-${status}`, webhook_type: "status.updated",
      session_id: "didit_session_test", vendor_data: "user_test", status,
      timestamp: Math.floor(Date.now() / 1000), environment: "live" });
    return handleDigitWebhook(new NextRequest("https://example.test/api/didit/webhook", {
      method: "POST", body, headers: {
        "x-signature": createHmac("sha256", "test-didit-secret").update(body).digest("hex"),
        "x-timestamp": String(Math.floor(Date.now() / 1000)),
      },
    }));
  }

  test("evento pendente atrasado conserva a aprovacao atual e nao publica perfil", async () => {
    expect((await webhook("In Progress")).status).toBe(200);
    expect(writes.find(w => w.target === "professional")?.data).toMatchObject({ kycStatus: "APPROVED", rejectReason: null });
    expect(writes.find(w => w.target === "professional")?.data.status).not.toBe("ACTIVE");
  });

  test("evento antigo Approved nao aprova decisao atual Declined", async () => {
    decision = diditDecision("Declined");
    expect((await webhook("Approved")).status).toBe(200);
    expect(writes.find(w => w.target === "professional")?.data.kycStatus).toBe("REJECTED");
  });

  test("decisao oficial aprovada sincroniza somente a maioridade da titular da midia", async () => {
    await reconcileProfessionalDidit("user_test", "didit_session_test");
    const mediaWrite = writes.find(w => w.target === "uploadAsset");
    const ownerWrite = writes.find(w => w.target === "mediaDepictedPerson");

    expect(mediaWrite?.data).toEqual({ ageIdentityStatus: "PASS" });
    expect(mediaWrite?.where).toMatchObject({
      userId: "user_test",
      category: "image",
      ageIdentityStatus: { not: "PASS" },
    });
    expect(ownerWrite?.data).toEqual({
      ageStatus: "PASS",
      ageVerificationReference: "didit_session_test",
    });
    expect(ownerWrite?.where).toMatchObject({
      personReference: { in: ["user_test", "user:user_test"] },
      isUploader: true,
      isContentOwner: true,
      revokedAt: null,
    });
    expect(mediaWrite?.data).not.toHaveProperty("consentStatus");
    expect(ownerWrite?.data).not.toHaveProperty("consentStatus");
  });

  test("erro do provedor pede reentrega do webhook sem alterar KYC", async () => {
    globalThis.fetch = async () => new Response(null, { status: 503 });
    expect((await webhook("Approved")).status).toBe(500);
    expect(writes).toEqual([]);
  });

  test("sessao trocada ou pertencente a outro usuario nao grava resultado", async () => {
    active = false;
    await expect(reconcileProfessionalDidit("user_test", "didit_session_test")).rejects.toThrow("didit_active_session_changed");
    active = true;
    decision.vendor_data = "other_user";
    await expect(reconcileProfessionalDidit("user_test", "didit_session_test")).rejects.toThrow("didit_session_owner_mismatch");
    expect(writes).toEqual([]);
  });

  test("revisao pendente limpa aviso vermelho e nao oferece refazer documento", async () => {
    decision = diditDecision("In Review");
    const result = await reconcileProfessionalDidit("user_test", "didit_session_test");
    expect(result).toMatchObject({ status: "PENDING", url: null, retryAllowed: false });
    expect(result.message).toContain("não é necessário reenviá-los");
    expect(writes.find(w => w.target === "professional")?.data.rejectReason).toBeNull();
  });

  test("etapa incompleta permite retomar a mesma sessao", async () => {
    decision = diditDecision("In Progress");
    const result = await reconcileProfessionalDidit("user_test", "didit_session_test");
    expect(result.url).toBe("https://verify.didit.me/session-test");
    expect(result.message).toContain("Retome");
  });

  test("mensagem explica documento vencido sem expor sinal antifraude", () => {
    decision = diditDecision("Declined");
    decision.id_verifications![0].warnings = [{ short_description: "Document expired" }, { short_description: "Possible duplicated user from other session" }];
    const result = assessProfessionalDiditDecision(decision);
    expect(result.reason).toContain("vencido");
    expect(result.reason).not.toContain("duplicated");
    expect(result.retryAllowed).toBe(true);
  });

  test("maioridade nao confirmada exige suporte sem liberar novas tentativas", () => {
    expect(assessProfessionalDiditDecision(diditDecision("Approved", null))).toMatchObject({ status: "REJECTED", retryAllowed: false });
    expect(assessProfessionalDiditDecision(diditDecision("Approved", "2020-01-01"))).toMatchObject({ status: "REJECTED", retryAllowed: false });
  });

  test("marcador vencido permite recuperar preparacao interrompida", () => {
    const now = Date.now();
    expect(isDigitIntentInFlight(createDigitIntentMarker("intent", now, now), now)).toBe(true);
    expect(isDigitIntentInFlight(createDigitIntentMarker("intent", now - 180_000, now - 180_000), now)).toBe(false);
  });

  test("reconciliacao preserva motivo de moderacao manual", async () => {
    profileStatus = "REJECTED";
    await reconcileProfessionalDidit("user_test", "didit_session_test");
    expect(writes.find(w => w.target === "professional")?.data.rejectReason).toBeUndefined();
  });
});

test.describe("recuperacao segura de sessao Didit por conta", () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.DIDIT_API_KEY;

  test.afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.DIDIT_API_KEY;
    else process.env.DIDIT_API_KEY = originalApiKey;
  });

  test("usa vendor_data estavel e recupera somente a sessao nova mais recente", async () => {
    process.env.DIDIT_API_KEY = "test-key";
    globalThis.fetch = async () => Response.json({ results: [
      { session_id: "old", vendor_data: "user-test", status: "Approved", created_at: "2026-01-01T00:00:00Z", url: "https://verify.didit.me/old" },
      { session_id: "newer", vendor_data: "user-test", status: "In Review", created_at: "2026-10-27T10:00:02Z", url: "https://verify.didit.me/newer" },
      { session_id: "new", vendor_data: "user-test", status: "In Progress", created_at: "2026-10-27T10:00:01Z", url: "https://verify.didit.me/new" },
      { session_id: "other", vendor_data: "other-user", status: "Approved", created_at: "2026-10-27T10:00:03Z", url: "https://verify.didit.me/other" },
    ] });

    await expect(findDigitSessionByVendorData("user-test", Date.parse("2026-10-27T10:00:00Z"))).resolves.toMatchObject({
      session_id: "newer",
      status: "In Review",
      vendor_data: "user-test",
    });
  });
});

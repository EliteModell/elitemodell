import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { issueChecklist, issuesForStep, professionalAdministrativeApprovalIssues, professionalCompletion } from "../src/lib/professional-completeness";
import { CITY_CHANGE_REQUIRES_VOUCHER, INITIAL_FREE_CITY_CHANGES, locationChangeNeedsReview, normalizeServiceLocation, publicServiceLocation } from "../src/lib/professional-location";
import { professionalCityFilter, resolveExactCityQuery } from "../src/lib/public-city-search";
import { professionalDisplayNameForEditing } from "../src/lib/professional-display-name";
import { nameForPhoneAccount } from "../src/lib/phone-otp";

const complete = {
  displayName: "Modelo Teste",
  bio: "Perfil profissional completo com uma descrição clara, segura e suficientemente detalhada para análise.",
  city: "Vitória",
  state: "ES",
  escortCategory: "MULHER",
  birthDate: "1995-05-20",
  attendanceTypes: ["Local próprio"],
  servesGenders: ["Homens"],
  diasDisponiveis: ["Segunda"],
  services: ["Acompanhamento"],
  pricePerHour: 300,
  paymentMethods: ["Pix"],
  whatsapp: "27999999999",
  image: "/api/media/cover",
  kycSessionId: "kyc_approved",
  kycStatus: "APPROVED",
  emailVerified: true,
};

const approvalReady = {
  displayName: "Modelo Teste",
  registrationSubmittedAt: new Date("2026-10-21T18:50:00Z"),
  termsConsent: true,
  lgpdConsent: true,
  kycSessionId: "didit_live_approved",
  kycStatus: "APPROVED",
  image: null,
  photos: [{ url: "/api/media/existing-cover", cover: true }],
};

test.describe("aprovação administrativa cirúrgica", () => {
  test("reconhece a foto principal existente no relacionamento", () => {
    expect(professionalAdministrativeApprovalIssues(approvalReady).map((issue) => issue.code)).not.toContain("main_photo");
  });

  test("reconhece KYC Didit aprovado", () => {
    expect(professionalAdministrativeApprovalIssues(approvalReady).map((issue) => issue.code)).not.toContain("kyc");
  });

  test("libera aprovação sem campos comerciais opcionais", () => {
    expect(professionalAdministrativeApprovalIssues(approvalReady)).toEqual([]);
  });

  test("bloqueia quando falta requisito obrigatório de segurança", () => {
    const issues = professionalAdministrativeApprovalIssues({ ...approvalReady, kycStatus: "PENDING" });
    expect(issues).toContainEqual(expect.objectContaining({ code: "kyc" }));
  });

  test("bloqueia o nome provisório usado durante o cadastro", () => {
    const issues = professionalAdministrativeApprovalIssues({ ...approvalReady, displayName: "Cadastro de acompanhante" });
    expect(issues).toContainEqual(expect.objectContaining({ code: "display_name" }));
  });

  test("novo cadastro não transforma nome técnico em nome profissional", () => {
    expect(nameForPhoneAccount("model")).toBeNull();
    expect(professionalDisplayNameForEditing("Cadastro de acompanhante")).toBe("");
    expect(professionalDisplayNameForEditing("Perfil em cadastro")).toBe("");
    expect(professionalDisplayNameForEditing("Marina Elite")).toBe("Marina Elite");
  });
});

test.describe("regra central de completude profissional", () => {
  test("obrigatório faltando identifica a etapa e impede completude", () => {
    const result = professionalCompletion({ ...complete, services: [] });
    expect(result.profileComplete).toBe(false);
    expect(result.profileIssues).toContainEqual(expect.objectContaining({ code: "services", step: 3 }));
  });

  test("opcionais ausentes não impedem o cadastro", () => {
    expect(professionalCompletion(complete)).toMatchObject({ profileComplete: true, profilePercent: 100 });
  });

  test("cadastro completo, KYC e e-mail permitem envio", () => {
    expect(professionalCompletion(complete).readyToSubmit).toBe(true);
  });

  test("KYC aprovado não mascara cadastro incompleto", () => {
    const result = professionalCompletion({ ...complete, bio: "curta" });
    expect(result.kycApproved).toBe(true);
    expect(result.profileComplete).toBe(false);
    expect(result.readyToSubmit).toBe(false);
  });

  test("cadastro completo com KYC pendente não fica pronto", () => {
    const result = professionalCompletion({ ...complete, kycStatus: "PENDING" });
    expect(result.profileComplete).toBe(true);
    expect(result.kycApproved).toBe(false);
    expect(result.readyToSubmit).toBe(false);
  });

  test("e-mail não confirmado permanece separado de perfil e KYC", () => {
    const result = professionalCompletion({ ...complete, emailVerified: false });
    expect(result.profileComplete).toBe(true);
    expect(result.kycApproved).toBe(true);
    expect(result.readyToSubmit).toBe(false);
  });

  test("foto marcada como capa satisfaz foto principal", () => {
    expect(professionalCompletion({ ...complete, image: null, photos: [{ url: "/api/media/1", cover: true }] }).profileComplete).toBe(true);
  });

  test("foto única legada continua compatível mesmo sem flag cover", () => {
    expect(professionalCompletion({ ...complete, image: null, photos: [{ url: "/api/media/legacy" }] }).profileComplete).toBe(true);
  });

  test("especialidade legada satisfaz serviços sem inventar dados", () => {
    expect(professionalCompletion({ ...complete, services: [], specialties: [{ name: "Massagem" }] }).profileComplete).toBe(true);
  });

  test("retomada aponta a primeira etapa obrigatória incompleta", () => {
    expect(professionalCompletion({ ...complete, city: "", services: [] }).firstIncompleteStep).toBe(0);
  });

  test("checklist e validação da etapa usam a mesma regra", () => {
    const profile = { ...complete, paymentMethods: [] };
    expect(issuesForStep(profile, 4).map((issue) => issue.code)).toContain("payment");
    expect(issueChecklist(profile).find((step) => step.routeStep === 4)?.complete).toBe(false);
  });
});

test.describe("localização de atendimento", () => {
  test("politica inicial reserva tres trocas gratis e exige voucher depois", () => {
    expect(INITIAL_FREE_CITY_CHANGES).toBe(3);
    expect(CITY_CHANGE_REQUIRES_VOUCHER).toBe(true);
  });
  test("Vitória é reconhecida como cidade exata com acento e caixa variados", () => {
    for (const value of ["Vitória", "Vitoria", "vitória", "vitoria"]) {
      expect(resolveExactCityQuery(value, "ES")).toMatchObject({ city: "Vitória", state: "ES" });
    }
  });

  test("filtro de Vitória cobre grafias armazenadas com e sem acento sem agrupar a tabela", async () => {
    const filter = await professionalCityFilter("vitoria", "ES");
    const serialized = JSON.stringify(filter);
    expect(serialized).toContain("Vitória");
    expect(serialized).toContain("vitoria");
    expect(serialized).toContain('"currentServiceState":{"equals":"ES"');
  });

  test("normaliza UF sem alterar a cidade informada", () => {
    expect(normalizeServiceLocation({ city: " Vitória ", state: "es", neighborhood: " Praia do Canto " }))
      .toEqual({ city: "Vitória", state: "ES", neighborhood: "Praia do Canto" });
  });

  test("KYC pendente envia mudança de cidade para revisão", () => {
    expect(locationChangeNeedsReview({ kycApproved: false, recentChanges: 0, stateChanged: false }).review).toBe(true);
  });

  test("muitas cidades em poucas horas exigem revisão", () => {
    expect(locationChangeNeedsReview({ kycApproved: true, recentChanges: 3, stateChanged: false }).review).toBe(true);
  });

  test("trocas interestaduais frequentes exigem revisão", () => {
    expect(locationChangeNeedsReview({ kycApproved: true, recentChanges: 2, stateChanged: true }).review).toBe(true);
  });

  test("mudança comum com KYC aprovado pode ser aplicada", () => {
    expect(locationChangeNeedsReview({ kycApproved: true, recentChanges: 0, stateChanged: true }).review).toBe(false);
  });

  test("local público prefere a cidade atual de atendimento", () => {
    expect(publicServiceLocation({ currentServiceCity: "Belo Horizonte", currentServiceState: "MG", currentServiceNeighborhood: "Savassi", city: "Vitória", state: "ES", bairro: "Centro" }))
      .toEqual({ city: "Belo Horizonte", state: "MG", neighborhood: "Savassi" });
  });

  test("perfil legado usa cidade e bairro existentes", () => {
    expect(publicServiceLocation({ city: "Vitória", state: "ES", bairro: "Centro" }))
      .toEqual({ city: "Vitória", state: "ES", neighborhood: "Centro" });
  });

  test("wizard aguarda API e perfil público não seleciona endereço ou coordenadas", () => {
    const wizard = fs.readFileSync(path.join(process.cwd(), "src/app/(dashboard)/profissional/novo/page.tsx"), "utf8");
    const publicRoute = fs.readFileSync(path.join(process.cwd(), "src/app/api/professionals/route.ts"), "utf8");
    expect(wizard).toContain('await fetch("/api/professionals/draft"');
    expect(wizard.indexOf('await fetch("/api/professionals/draft"')).toBeLessThan(wizard.indexOf("setStep((current)"));
    const publicSelect = publicRoute.slice(publicRoute.indexOf("select: {"), publicRoute.indexOf("const safeList"));
    expect(publicSelect).not.toContain("address: true");
    expect(publicSelect).not.toContain("latitude: true");
    expect(publicSelect).not.toContain("longitude: true");
  });
});

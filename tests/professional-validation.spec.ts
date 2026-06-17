import { expect, test } from "@playwright/test";
import { createProfessionalSchema } from "../src/lib/professional-profile-schema";

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
});

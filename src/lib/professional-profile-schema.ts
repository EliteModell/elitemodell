import { z } from "zod";

export const createProfessionalSchema = z.object({
  displayName: z.string().min(2),
  bio: z.string().optional().default(""),
  city: z.string().min(2),
  state: z.string().min(2),
  bairro: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  instagram: z.string().optional(),
  website: z.string().optional(),
  priceMin: z.number().positive().optional(),
  priceMax: z.number().positive().optional(),
  pricePerHour: z.number().positive().optional(),
  price30min: z.number().positive().optional(),
  price2h: z.number().positive().optional(),
  priceOvernight: z.number().positive().optional(),
  priceWebcam: z.number().positive().optional(),
  paymentMethods: z.array(z.string()).optional().default([]),
  escortCategory: z.string().optional(),
  birthDate: z.string().optional(),
  height: z.number().optional(),
  weight: z.number().optional(),
  hairColor: z.string().optional(),
  eyeColor: z.string().optional(),
  ethnicity: z.string().optional(),
  signo: z.string().optional(),
  hasTattoos: z.boolean().optional().default(false),
  hasPiercing: z.boolean().optional().default(false),
  hasSilicone: z.boolean().optional().default(false),
  isDepilada: z.boolean().optional().default(true),
  depilationStyle: z.string().optional(),
  bodyType: z.string().optional(),
  attendanceTypes: z.array(z.string()).optional().default([]),
  servesGenders: z.array(z.string()).optional().default([]),
  idiomas: z.array(z.string()).optional().default([]),
  diasDisponiveis: z.array(z.string()).optional().default([]),
  horarioInicio: z.string().optional(),
  horarioFim: z.string().optional(),
  specialties: z.array(z.string()).optional().default([]),
  services: z.array(z.string()).optional().default([]),
  servicesNotOffered: z.array(z.string()).optional().default([]),
  fetishes: z.array(z.string()).optional().default([]),
  amenities: z.array(z.string()).optional().default([]),
  serviceCities: z.array(z.string()).optional().default([]),
  approximateLocation: z.string().max(160).optional(),
  image: z.string().optional(),
  galleryUrls: z.array(z.string()).optional().default([]),
  docType: z.string().optional(),
  docFrenteUrl: z.string().optional(),
  docVersoUrl: z.string().optional(),
  docStatus: z.string().optional().default("PENDING"),
  verifStatus: z.string().optional().default("PENDING"),
  verificationUrl: z.string().optional(),
  verificationType: z.string().optional(),
  verificationCode: z.string().optional(),
  kycProvider: z.string().optional(),
  kycSessionId: z.string().optional(),
  kycStatus: z.string().optional(),
}).superRefine((data, ctx) => {
  const addIssue = (path: string[], message: string) => {
    ctx.addIssue({ code: "custom", path, message });
  };

  if (!["MULHER", "HOMEM", "TRANS"].includes(data.escortCategory ?? "")) {
    addIssue(["escortCategory"], "Categoria invalida.");
  }
  if ((data.bio ?? "").trim().length < 80) {
    addIssue(["bio"], "A biografia deve ter pelo menos 80 caracteres.");
  }
  if (!data.birthDate) addIssue(["birthDate"], "Data de nascimento obrigatoria.");
  if (data.attendanceTypes.length === 0) {
    addIssue(["attendanceTypes"], "Informe o tipo de atendimento.");
  }
  if (data.servesGenders.length === 0) addIssue(["servesGenders"], "Informe quem atende.");
  if (data.diasDisponiveis.length === 0) {
    addIssue(["diasDisponiveis"], "Informe os dias disponiveis.");
  }
  if (data.services.length === 0) addIssue(["services"], "Informe pelo menos um servico.");
  if (
    !data.pricePerHour &&
    !data.price30min &&
    !data.price2h &&
    !data.priceOvernight &&
    !data.priceWebcam
  ) {
    addIssue(["pricePerHour"], "Informe pelo menos um valor.");
  }
  if (data.paymentMethods.length === 0) {
    addIssue(["paymentMethods"], "Informe uma forma de pagamento.");
  }
  if (!data.whatsapp || data.whatsapp.replace(/\D/g, "").length < 10) {
    addIssue(["whatsapp"], "WhatsApp invalido.");
  }
  if (!data.image) addIssue(["image"], "Foto principal obrigatoria.");
  if (!data.kycSessionId) addIssue(["kycSessionId"], "Verificacao de identidade obrigatoria.");
});

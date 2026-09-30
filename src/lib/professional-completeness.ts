import { isAgeOfMajority, isValidBirthDate } from "@/lib/age-validation";

export const PROFESSIONAL_REGISTRATION_STEPS = [
  { id: "basic", label: "Dados pessoais", routeStep: 0 },
  { id: "appearance", label: "Aparência", routeStep: 1 },
  { id: "attendance", label: "Atendimento", routeStep: 2 },
  { id: "services", label: "Serviços", routeStep: 3 },
  { id: "prices", label: "Valores", routeStep: 4 },
  { id: "contact", label: "Contato", routeStep: 5 },
  { id: "photos", label: "Fotos", routeStep: 6 },
  { id: "identity", label: "Identidade", routeStep: 7 },
  { id: "submit", label: "Enviar", routeStep: 8 },
] as const;

export type ProfessionalCompletionInput = {
  displayName?: string | null;
  bio?: string | null;
  city?: string | null;
  state?: string | null;
  escortCategory?: string | null;
  birthDate?: string | Date | null;
  attendanceTypes?: readonly string[] | null;
  servesGenders?: readonly string[] | null;
  diasDisponiveis?: readonly string[] | null;
  services?: readonly string[] | null;
  specialties?: readonly unknown[] | null;
  price15min?: number | null;
  price30min?: number | null;
  pricePerHour?: number | null;
  price2h?: number | null;
  priceOvernight?: number | null;
  priceWebcam?: number | null;
  paymentMethods?: readonly string[] | null;
  whatsapp?: string | null;
  image?: string | null;
  photos?: readonly { url?: string | null; cover?: boolean | null }[] | null;
  kycSessionId?: string | null;
  kycStatus?: string | null;
  emailVerified?: string | Date | boolean | null;
};

export type ProfessionalCompletionIssue = {
  code: string;
  field: string;
  label: string;
  step: number;
  stepLabel: string;
};

const REQUIRED_CHECKS: Array<{
  code: string;
  field: string;
  label: string;
  step: number;
  valid: (profile: ProfessionalCompletionInput) => boolean;
}> = [
  { code: "display_name", field: "displayName", label: "Nome profissional", step: 0, valid: (p) => (p.displayName?.trim().length ?? 0) >= 2 },
  { code: "bio", field: "bio", label: "Biografia com pelo menos 80 caracteres", step: 0, valid: (p) => (p.bio?.trim().length ?? 0) >= 80 },
  { code: "category", field: "escortCategory", label: "Categoria profissional", step: 0, valid: (p) => ["MULHER", "HOMEM", "TRANS"].includes(p.escortCategory ?? "") },
  { code: "service_city", field: "city", label: "Cidade de atendimento", step: 0, valid: (p) => (p.city?.trim().length ?? 0) >= 2 },
  { code: "service_state", field: "state", label: "Estado de atendimento", step: 0, valid: (p) => (p.state?.trim().length ?? 0) >= 2 },
  { code: "birth_date", field: "birthDate", label: "Data de nascimento válida e maioridade", step: 1, valid: (p) => {
    if (!p.birthDate) return false;
    const value = p.birthDate instanceof Date ? p.birthDate.toISOString().slice(0, 10) : String(p.birthDate).slice(0, 10);
    return isValidBirthDate(value) && isAgeOfMajority(value);
  } },
  { code: "attendance_type", field: "attendanceTypes", label: "Tipo de atendimento", step: 2, valid: (p) => Boolean(p.attendanceTypes?.length) },
  { code: "served_public", field: "servesGenders", label: "Público atendido", step: 2, valid: (p) => Boolean(p.servesGenders?.length) },
  { code: "availability", field: "diasDisponiveis", label: "Dias disponíveis", step: 2, valid: (p) => Boolean(p.diasDisponiveis?.length) },
  { code: "services", field: "services", label: "Serviços oferecidos", step: 3, valid: (p) => Boolean(p.services?.length || p.specialties?.length) },
  { code: "prices", field: "pricePerHour", label: "Ao menos um valor", step: 4, valid: (p) => [p.price15min, p.price30min, p.pricePerHour, p.price2h, p.priceOvernight, p.priceWebcam].some((value) => typeof value === "number" && value > 0) },
  { code: "payment", field: "paymentMethods", label: "Forma de pagamento", step: 4, valid: (p) => Boolean(p.paymentMethods?.length) },
  { code: "whatsapp", field: "whatsapp", label: "WhatsApp válido com DDD", step: 5, valid: (p) => (p.whatsapp?.replace(/\D/g, "").length ?? 0) >= 10 },
  { code: "main_photo", field: "image", label: "Foto principal", step: 6, valid: (p) => Boolean(p.image || p.photos?.some((photo) => photo.url && (photo.cover || p.photos?.length === 1))) },
];

const IDENTITY_CHECK = {
  code: "kyc",
  field: "kycSessionId",
  label: "Verificação de identidade aprovada",
  step: 7,
};

export function professionalCompletion(profile: ProfessionalCompletionInput) {
  const profileIssues: ProfessionalCompletionIssue[] = REQUIRED_CHECKS
    .filter((check) => !check.valid(profile))
    .map((check) => ({
      code: check.code,
      field: check.field,
      label: check.label,
      step: check.step,
      stepLabel: PROFESSIONAL_REGISTRATION_STEPS[check.step].label,
    }));
  const kycApproved = Boolean(profile.kycSessionId && profile.kycStatus === "APPROVED");
  const issues = kycApproved ? profileIssues : [...profileIssues, {
    ...IDENTITY_CHECK,
    stepLabel: PROFESSIONAL_REGISTRATION_STEPS[IDENTITY_CHECK.step].label,
  }];
  const completedRequired = REQUIRED_CHECKS.length - profileIssues.length;
  const profilePercent = Math.round((completedRequired / REQUIRED_CHECKS.length) * 100);
  const firstIncompleteStep = issues.length ? Math.min(...issues.map((issue) => issue.step)) : 8;
  return {
    profilePercent,
    profileComplete: profileIssues.length === 0,
    kycApproved,
    emailVerified: Boolean(profile.emailVerified),
    readyToSubmit: profileIssues.length === 0 && kycApproved && Boolean(profile.emailVerified),
    firstIncompleteStep,
    profileIssues,
    issues,
  };
}

export function issuesForStep(profile: ProfessionalCompletionInput, step: number) {
  return professionalCompletion(profile).issues.filter((issue) => issue.step === step);
}

export function issueChecklist(profile: ProfessionalCompletionInput) {
  const result = professionalCompletion(profile);
  return PROFESSIONAL_REGISTRATION_STEPS.slice(0, 8).map((step) => ({
    ...step,
    complete: !result.issues.some((issue) => issue.step === step.routeStep),
    issues: result.issues.filter((issue) => issue.step === step.routeStep),
  }));
}

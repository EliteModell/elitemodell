import { isAgeOfMajority, isValidBirthDate } from "@/lib/age-validation";
import { isProfessionalDisplayNameReady } from "@/lib/professional-display-name";

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
  genderIdentity?: string | null;
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
  registrationSubmittedAt?: string | Date | null;
  termsConsent?: boolean | null;
  lgpdConsent?: boolean | null;
};

export type ProfessionalCompletionIssue = {
  code: string;
  field: string;
  label: string;
  step: number;
  stepLabel: string;
};

const ONBOARDING_CHECKS: Array<{
  code: string;
  field: string;
  label: string;
  step: number;
  valid: (profile: ProfessionalCompletionInput) => boolean;
}> = [
  { code: "display_name", field: "displayName", label: "Nome profissional", step: 0, valid: (p) => isProfessionalDisplayNameReady(p.displayName) },
  { code: "category", field: "genderIdentity", label: "Identidade do perfil", step: 0, valid: (p) => ["MULHER", "HOMEM", "NAO_BINARIO", "AUTODESCRICAO"].includes(p.genderIdentity ?? "") || ["MULHER", "HOMEM", "TRANS"].includes(p.escortCategory ?? "") },
  { code: "service_city", field: "city", label: "Cidade principal de atendimento", step: 2, valid: (p) => (p.city?.trim().length ?? 0) >= 2 },
  { code: "service_state", field: "state", label: "Estado de atendimento", step: 2, valid: (p) => (p.state?.trim().length ?? 0) >= 2 },
  { code: "attendance_type", field: "attendanceTypes", label: "Modalidade de atendimento", step: 2, valid: (p) => Boolean(p.attendanceTypes?.length) },
  { code: "hourly_price", field: "pricePerHour", label: "Valor inicial por hora", step: 3, valid: (p) => typeof p.pricePerHour === "number" && p.pricePerHour > 0 },
  { code: "main_photo", field: "image", label: "Foto principal", step: 3, valid: (p) => Boolean(p.image || p.photos?.some((photo) => photo.url && (photo.cover || p.photos?.length === 1))) },
];

/** Requisitos mínimos de envio; a publicação continua usando professionalCompletion. */
export function professionalOnboardingCompletion(profile: ProfessionalCompletionInput) {
  const profileIssues: ProfessionalCompletionIssue[] = ONBOARDING_CHECKS
    .filter((check) => !check.valid(profile))
    .map((check) => ({
      code: check.code,
      field: check.field,
      label: check.label,
      step: check.step,
      stepLabel: ["Dados básicos", "Identidade", "Atendimento", "Perfil"][check.step] ?? "Cadastro",
    }));
  const kycApproved = Boolean(profile.kycSessionId && profile.kycStatus === "APPROVED");
  const issues = kycApproved ? profileIssues : [...profileIssues, {
    code: "kyc",
    field: "kycSessionId",
    label: "Conclua a verificação de identidade e maioridade",
    step: 1,
    stepLabel: "Identidade",
  }];
  const completedRequired = ONBOARDING_CHECKS.length - profileIssues.length;
  return {
    profilePercent: Math.round((completedRequired / ONBOARDING_CHECKS.length) * 100),
    profileComplete: profileIssues.length === 0,
    kycApproved,
    emailVerified: Boolean(profile.emailVerified),
    readyToSubmit: profileIssues.length === 0 && kycApproved,
    firstIncompleteStep: issues.length ? Math.min(...issues.map((issue) => issue.step)) : 4,
    profileIssues,
    issues,
  };
}

/**
 * Requisitos de segurança para a decisão administrativa. Campos comerciais
 * continuam no indicador de completude, mas não bloqueiam a aprovação.
 * A publicação de mídia permanece protegida pela moderação de assets.
 */
export function professionalAdministrativeApprovalIssues(profile: ProfessionalCompletionInput) {
  const issues: ProfessionalCompletionIssue[] = [];
  const add = (code: string, field: string, label: string) => issues.push({
    code, field, label, step: 0, stepLabel: "Aprovação administrativa",
  });
  if (!profile.registrationSubmittedAt) add("submission", "registrationSubmittedAt", "Cadastro ainda não enviado para análise");
  if (!isProfessionalDisplayNameReady(profile.displayName)) add("display_name", "displayName", "Informe um nome profissional antes da aprovação");
  if (!profile.termsConsent || !profile.lgpdConsent) add("legal_consent", "consent", "Termos e consentimento LGPD obrigatórios");
  if (!profile.kycSessionId || profile.kycStatus !== "APPROVED") add("kyc", "kycSessionId", "Verificação de identidade e maioridade aprovada");
  if (!profile.image && !profile.photos?.some((photo) => Boolean(photo.url))) add("main_photo", "image", "Foto principal");
  return issues;
}

const REQUIRED_CHECKS: Array<{
  code: string;
  field: string;
  label: string;
  step: number;
  valid: (profile: ProfessionalCompletionInput) => boolean;
}> = [
  { code: "display_name", field: "displayName", label: "Nome profissional", step: 0, valid: (p) => isProfessionalDisplayNameReady(p.displayName) },
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
  label: "Conclua a verificação de identidade e maioridade",
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
    completedRequired,
    requiredTotal: REQUIRED_CHECKS.length,
    profileComplete: profileIssues.length === 0,
    kycApproved,
    emailVerified: Boolean(profile.emailVerified),
    readyToSubmit: profileIssues.length === 0 && kycApproved && Boolean(profile.emailVerified),
    firstIncompleteStep,
    profileIssues,
    issues,
  };
}

/**
 * Submission and publication are deliberately separate states. A linked Didit
 * session under review permits the private registration to be submitted, while
 * professionalCompletion and the publication pipeline continue to require an
 * approved identity.
 */
export function professionalSubmissionCompletion(profile: ProfessionalCompletionInput) {
  const completion = professionalCompletion(profile);
  const identitySubmitted = Boolean(
    profile.kycSessionId
    && ["PENDING", "APPROVED"].includes(profile.kycStatus ?? ""),
  );
  const issues = identitySubmitted
    ? completion.profileIssues
    : completion.issues;
  return {
    ...completion,
    identitySubmitted,
    identityPending: identitySubmitted && !completion.kycApproved,
    readyToSubmit: completion.profileComplete && identitySubmitted && Boolean(profile.emailVerified),
    firstIncompleteStep: issues.length ? Math.min(...issues.map((issue) => issue.step)) : 8,
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

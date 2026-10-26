export type ProfessionalRegistrationStatusInput = {
  professionalStatus?: string | null;
  registrationSubmittedAt?: string | Date | null;
  kycStatus?: string | null;
  email?: string | null;
  emailVerified?: boolean | string | Date | null;
  firstIncompleteStep?: number | null;
  correctionReason?: string | null;
  profileUrl?: string | null;
  published?: boolean;
};

export type ProfessionalRegistrationStatus = {
  id: "email_missing" | "email_unconfirmed" | "correction_required" | "identity_pending" | "submitted" | "approved" | "published" | "incomplete";
  title: string;
  description: string;
  actionLabel: string;
  action: "email" | "identity" | "correction" | "continue" | "analysis" | "profile";
  targetStep?: number;
  tone: "neutral" | "warning" | "success";
};

function isTechnicalPhoneEmail(value: string | null | undefined) {
  return Boolean(value?.toLowerCase().endsWith("@sms.elitemodell.local"));
}

export function professionalRegistrationStatus(input: ProfessionalRegistrationStatusInput): ProfessionalRegistrationStatus {
  if (!input.email || isTechnicalPhoneEmail(input.email)) {
    return {
      id: "email_missing",
      title: "Falta informar seu e-mail para continuar",
      description: "Informe um e-mail válido para receber a confirmação e acompanhar o cadastro.",
      actionLabel: "Informar e-mail",
      action: "email",
      tone: "warning",
    };
  }
  if (!input.emailVerified) {
    return {
      id: "email_unconfirmed",
      title: "Confirme seu e-mail",
      description: "Abra o link de confirmação enviado para seu e-mail. Seus dados já preenchidos continuam salvos.",
      actionLabel: "Ver confirmação de e-mail",
      action: "email",
      tone: "warning",
    };
  }
  if (input.professionalStatus === "CORRECTION_REQUIRED") {
    return {
      id: "correction_required",
      title: "Correções necessárias",
      description: input.correctionReason || "A equipe indicou itens que precisam ser regularizados antes de uma nova análise.",
      actionLabel: "Corrigir cadastro",
      action: "correction",
      targetStep: input.firstIncompleteStep ?? 0,
      tone: "warning",
    };
  }
  if (input.professionalStatus === "ACTIVE" && input.published && input.profileUrl) {
    return {
      id: "published",
      title: "Seu perfil está publicado",
      description: "O perfil público está disponível para visitantes da Elite Modell.",
      actionLabel: "Ver perfil público",
      action: "profile",
      tone: "success",
    };
  }
  if (input.professionalStatus === "ACTIVE") {
    return {
      id: "approved",
      title: "Seu perfil foi aprovado!",
      description: "A aprovação foi confirmada pelo sistema. A publicação pode continuar aguardando verificações de mídia.",
      actionLabel: "Acompanhar publicação",
      action: "analysis",
      tone: "success",
    };
  }
  if (input.kycStatus === "PENDING") {
    return {
      id: "identity_pending",
      title: "Estamos verificando sua identidade",
      description: "A verificação está em análise. Não é necessário reenviar os documentos enquanto esse estado permanecer.",
      actionLabel: "Acompanhar identidade",
      action: "identity",
      targetStep: 7,
      tone: "neutral",
    };
  }
  if (input.registrationSubmittedAt && input.professionalStatus === "PENDING_REVIEW") {
    return {
      id: "submitted",
      title: "Seu perfil foi recebido e está aguardando análise",
      description: "O envio foi registrado. A aprovação e a publicação serão mostradas somente quando confirmadas pelo backend.",
      actionLabel: "Acompanhar análise",
      action: "analysis",
      tone: "neutral",
    };
  }
  return {
    id: "incomplete",
    title: "Continue de onde parou",
    description: "Seu cadastro está incompleto, mas os dados preenchidos foram preservados com segurança.",
    actionLabel: "Continuar cadastro",
    action: "continue",
    targetStep: input.firstIncompleteStep ?? 0,
    tone: "neutral",
  };
}

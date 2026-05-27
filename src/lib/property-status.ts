export const PROPERTY_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  PENDING_REVIEW: "Pendente de análise",
  ACTIVE: "Aprovado",
  INACTIVE: "Pausado",
  REJECTED: "Reprovado",
};

export const PROPERTY_STATUS_DESCRIPTION: Record<string, string> = {
  DRAFT: "Complete as informações e envie para análise quando estiver pronto.",
  PENDING_REVIEW: "Nossa equipe está revisando o cadastro antes da publicação.",
  ACTIVE: "O imóvel foi aprovado e pode aparecer para profissionais habilitadas.",
  INACTIVE: "O imóvel está pausado e não aparece na área pública.",
  REJECTED: "O imóvel precisa de correção antes de ser reenviado.",
};

export type PropertyStatusTone = "neutral" | "warning" | "success" | "danger" | "paused";

export function propertyStatusTone(status: string): PropertyStatusTone {
  if (status === "ACTIVE") return "success";
  if (status === "PENDING_REVIEW") return "warning";
  if (status === "REJECTED") return "danger";
  if (status === "INACTIVE") return "paused";
  return "neutral";
}

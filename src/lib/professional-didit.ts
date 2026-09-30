import { prisma } from "@/lib/prisma";
import {
  DIDIT_APPROVED_STATUS,
  DIDIT_PENDING_STATUS,
  DIDIT_REJECTED_STATUS,
  digitVendorDataBelongsToUser,
  extractDateOfBirth,
  fetchDigitSessionDecision,
  isAdult,
  normalizeDigitStatus,
  type DiditDecision,
  type DiditVerificationStatus,
} from "@/lib/didit";

export type ProfessionalDiditResult = {
  sessionId: string;
  status: typeof DIDIT_APPROVED_STATUS | typeof DIDIT_PENDING_STATUS | typeof DIDIT_REJECTED_STATUS;
  rawStatus: DiditDecision["status"];
};

export class ProfessionalDiditError extends Error {
  constructor(
    message: string,
    readonly code: "didit_not_started" | "didit_pending" | "didit_rejected" | "didit_unavailable",
    readonly httpStatus: number,
  ) {
    super(message);
    this.name = "ProfessionalDiditError";
  }
}

export function assessProfessionalDiditDecision(decision: DiditDecision): {
  status: DiditVerificationStatus;
  approved: boolean;
  reason: string | null;
  retryAllowed: boolean;
} {
  const status = normalizeDigitStatus(decision.status);
  const dateOfBirth = extractDateOfBirth(decision);

  if (status === DIDIT_APPROVED_STATUS && !isAdult(dateOfBirth)) {
    return {
      status: DIDIT_REJECTED_STATUS,
      approved: false,
      retryAllowed: false,
      reason: dateOfBirth
        ? "Não foi possível confirmar a idade mínima de 18 anos. Se os dados estiverem incorretos, fale com o suporte."
        : "Não foi possível confirmar a data de nascimento no documento. Fale com o suporte para revisar a verificação.",
    };
  }

  return {
    status,
    approved: status === DIDIT_APPROVED_STATUS,
    retryAllowed: status === DIDIT_REJECTED_STATUS,
    reason: status === DIDIT_REJECTED_STATUS
      ? diditRejectionMessage(decision)
      : status === DIDIT_PENDING_STATUS ? diditPendingMessage(decision.status) : null,
  };
}

export function diditPendingMessage(status: string) {
  if (status === "In Review") return "Seus documentos estão em análise de identidade. Aguarde o resultado; não é necessário reenviá-los agora.";
  if (["Not Started", "In Progress", "Awaiting User", "Not Finished"].includes(status)) {
    return "Sua verificação ainda não foi concluída. Retome a verificação para concluir as etapas solicitadas.";
  }
  return "Estamos aguardando o resultado da verificação de identidade. Esta página será atualizada automaticamente.";
}

function diditRejectionMessage(decision: DiditDecision) {
  if (["Expired", "Abandoned", "Kyc Expired", "Cancelled"].includes(decision.status)) {
    return "Esta tentativa expirou ou foi encerrada sem aprovação. Inicie uma nova verificação.";
  }
  const warnings = (decision.id_verifications ?? []).flatMap(v => v.warnings ?? [])
    .map(w => w.short_description?.toLowerCase() ?? "");
  // Only expose actionable capture guidance, never raw provider data or fraud signals.
  const messages: string[] = [];
  if (warnings.some(w => w.includes("document expired"))) messages.push("O documento foi identificado como vencido. Use um documento válido.");
  if (warnings.some(w => w.includes("screen capture"))) messages.push("Fotografe o documento original com a câmera, sem usar captura de tela.");
  if (warnings.some(w => w.includes("sides mismatch"))) messages.push("Envie a frente e o verso do mesmo documento.");
  if (warnings.some(w => w.includes("detect document type") || w.includes("not supported"))) messages.push("Use um dos tipos de documento aceitos na verificação, com todos os dados legíveis.");
  return messages.length ? messages.join(" ") : "A verificação de identidade não foi aprovada. Confira as imagens do documento e, se o problema persistir, fale com o suporte antes de tentar novamente.";
}

export async function requireApprovedProfessionalDidit(userId: string): Promise<ProfessionalDiditResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { kycSessionId: true },
  });

  if (!user?.kycSessionId) {
    throw new ProfessionalDiditError(
      "Conclua a verificacao de identidade Didit antes de enviar o cadastro.",
      "didit_not_started",
      409,
    );
  }

  let decision: DiditDecision;
  try {
    decision = await fetchDigitSessionDecision(user.kycSessionId);
  } catch (error) {
    console.error("[professional-didit] Nao foi possivel validar a decisao Didit.", {
      userId,
      reason: error instanceof Error ? error.name : "unknown",
    });
    throw new ProfessionalDiditError(
      "Nao foi possivel confirmar a verificacao de identidade agora. Tente novamente.",
      "didit_unavailable",
      503,
    );
  }

  if (decision.session_id !== user.kycSessionId || !digitVendorDataBelongsToUser(decision.vendor_data, userId)) {
    console.error("[professional-didit] Sessao Didit nao pertence ao usuario autenticado.", { userId });
    throw new ProfessionalDiditError(
      "Nao foi possivel confirmar a verificacao de identidade agora. Tente novamente.",
      "didit_unavailable",
      409,
    );
  }

  const assessment = assessProfessionalDiditDecision(decision);
  if (assessment.status === DIDIT_PENDING_STATUS) {
    throw new ProfessionalDiditError(
      "Sua verificacao de identidade ainda esta em analise.",
      "didit_pending",
      409,
    );
  }
  if (!assessment.approved) {
    throw new ProfessionalDiditError(
      assessment.reason ?? "Nao foi possivel concluir sua verificacao de identidade.",
      "didit_rejected",
      409,
    );
  }

  return {
    sessionId: user.kycSessionId,
    status: DIDIT_APPROVED_STATUS,
    rawStatus: decision.status,
  };
}

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
} {
  const status = normalizeDigitStatus(decision.status);
  const dateOfBirth = extractDateOfBirth(decision);

  if (status === DIDIT_APPROVED_STATUS && !isAdult(dateOfBirth)) {
    return {
      status: DIDIT_REJECTED_STATUS,
      approved: false,
      reason: dateOfBirth
        ? "A verificacao de identidade nao confirmou idade minima de 18 anos."
        : "A verificacao de identidade nao retornou uma data de nascimento valida.",
    };
  }

  return {
    status,
    approved: status === DIDIT_APPROVED_STATUS,
    reason: status === DIDIT_REJECTED_STATUS
      ? "Nao foi possivel concluir sua verificacao de identidade."
      : null,
  };
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

  if (!digitVendorDataBelongsToUser(decision.vendor_data, userId)) {
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

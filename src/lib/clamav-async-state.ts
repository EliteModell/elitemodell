export type AsyncMalwareResult = {
  status: "CLEAN" | "INFECTED" | "ERROR";
  provider: string;
  providerVersion?: string;
  reason?: string;
};

export type AsyncAssetTransition = {
  status: "PENDING_MODERATION" | "REJECTED" | "QUARANTINED";
  malwareStatus: "CLEAN" | "INFECTED" | "ERROR";
  rejected: boolean;
  failureReason: string | null;
};

export function transitionForMalwareResult(result: AsyncMalwareResult): AsyncAssetTransition {
  if (result.status === "CLEAN") {
    return {
      status: "PENDING_MODERATION",
      malwareStatus: "CLEAN",
      rejected: false,
      failureReason: null,
    };
  }
  if (result.status === "INFECTED") {
    return {
      status: "REJECTED",
      malwareStatus: "INFECTED",
      rejected: true,
      failureReason: result.reason || "Malware detectado.",
    };
  }
  return {
    status: "QUARANTINED",
    malwareStatus: "ERROR",
    rejected: false,
    failureReason: result.reason || "Varredura antimalware inconclusiva.",
  };
}

export function signatureIsFresh(updatedAt: Date, now: Date, maximumAgeHours: number) {
  if (!Number.isFinite(maximumAgeHours) || maximumAgeHours <= 0) return false;
  const ageMs = now.getTime() - updatedAt.getTime();
  return ageMs >= 0 && ageMs <= maximumAgeHours * 60 * 60 * 1000;
}

export function retryDelaySeconds(attempt: number, baseSeconds = 30, maximumSeconds = 3_600) {
  const exponent = Math.max(0, Math.min(attempt - 1, 10));
  return Math.min(maximumSeconds, baseSeconds * 2 ** exponent);
}

export function classifyClamAvResponse(response: string): AsyncMalwareResult {
  if (/\bFOUND\b/.test(response)) {
    return { status: "INFECTED", provider: "CLAMAV", reason: "Malware detected" };
  }
  if (/\bOK\b/.test(response)) return { status: "CLEAN", provider: "CLAMAV" };
  return { status: "ERROR", provider: "CLAMAV", reason: "Invalid scanner response" };
}

export function jobCanBeClaimed(input: {
  status: string;
  availableAt: Date;
  completedAt: Date | null;
  leaseExpiresAt: Date | null;
}, now: Date) {
  if (input.completedAt || input.availableAt > now) return false;
  if ((input.status === "QUEUED" || input.status === "RETRY") && !input.leaseExpiresAt) return true;
  return input.status === "PROCESSING" && Boolean(input.leaseExpiresAt && input.leaseExpiresAt < now);
}

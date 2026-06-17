const DAY_MS = 24 * 60 * 60 * 1000;

export type AccessProfessional = {
  accessGrandfathered: boolean;
  freeAccessStartedAt: Date | null;
  freeAccessEndsAt: Date | null;
};

export type AccessUser = {
  premiumUntil: Date | null;
};

export type ProfessionalAccessState = {
  kind: "GRANDFATHERED" | "FREE_TRIAL" | "PAID" | "EXPIRED" | "PENDING_APPROVAL";
  canUsePlatform: boolean;
  canAppearInSearch: boolean;
  freeTrialDaysLeft: number | null;
  freeTrialEndsAt: Date | null;
  paidUntil: Date | null;
};

export function resolveProfessionalAccess(
  professional: AccessProfessional,
  user: AccessUser,
  approved: boolean,
  now = new Date(),
): ProfessionalAccessState {
  if (professional.accessGrandfathered) {
    return {
      kind: "GRANDFATHERED",
      canUsePlatform: true,
      canAppearInSearch: approved,
      freeTrialDaysLeft: null,
      freeTrialEndsAt: null,
      paidUntil: user.premiumUntil,
    };
  }

  if (!approved || !professional.freeAccessStartedAt || !professional.freeAccessEndsAt) {
    return {
      kind: "PENDING_APPROVAL",
      canUsePlatform: false,
      canAppearInSearch: false,
      freeTrialDaysLeft: null,
      freeTrialEndsAt: professional.freeAccessEndsAt,
      paidUntil: user.premiumUntil,
    };
  }

  if (professional.freeAccessEndsAt > now) {
    return {
      kind: "FREE_TRIAL",
      canUsePlatform: true,
      canAppearInSearch: true,
      freeTrialDaysLeft: Math.max(1, Math.ceil((professional.freeAccessEndsAt.getTime() - now.getTime()) / DAY_MS)),
      freeTrialEndsAt: professional.freeAccessEndsAt,
      paidUntil: user.premiumUntil,
    };
  }

  if (user.premiumUntil && user.premiumUntil > now) {
    return {
      kind: "PAID",
      canUsePlatform: true,
      canAppearInSearch: true,
      freeTrialDaysLeft: 0,
      freeTrialEndsAt: professional.freeAccessEndsAt,
      paidUntil: user.premiumUntil,
    };
  }

  return {
    kind: "EXPIRED",
    canUsePlatform: false,
    canAppearInSearch: false,
    freeTrialDaysLeft: 0,
    freeTrialEndsAt: professional.freeAccessEndsAt,
    paidUntil: user.premiumUntil,
  };
}

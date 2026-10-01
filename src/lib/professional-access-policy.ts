const DAY_MS = 24 * 60 * 60 * 1000;

export type AccessProfessional = {
  accessGrandfathered: boolean;
  freeAccessStartedAt: Date | null;
  freeAccessEndsAt: Date | null;
  billingStatus?: "PENDING_APPROVAL" | "TRIAL" | "ACTIVE" | "TRIAL_EXPIRED" | "PAST_DUE" | "CANCELED" | "GRANDFATHERED";
  subscriptionStartedAt?: Date | null;
  subscriptionEndsAt?: Date | null;
};

export type AccessUser = {
  premiumUntil: Date | null;
};

export type ProfessionalAccessState = {
  kind: "GRANDFATHERED" | "TRIAL" | "ACTIVE" | "TRIAL_EXPIRED" | "PAST_DUE" | "CANCELED" | "PENDING_APPROVAL";
  canUsePlatform: boolean;
  canAppearInSearch: boolean;
  freeTrialDaysLeft: number | null;
  freeTrialEndsAt: Date | null;
  subscriptionActive: boolean;
  subscriptionEndsAt: Date | null;
  billingEnabled: boolean;
};

export type ProfessionalBillingPolicy = {
  billingEnabled: boolean;
};

export function professionalApprovalTrialData(
  professional: AccessProfessional,
  trialDays: number,
  now = new Date(),
) {
  if (professional.accessGrandfathered || professional.freeAccessStartedAt || professional.freeAccessEndsAt) return {};
  return {
    freeAccessStartedAt: now,
    freeAccessEndsAt: new Date(now.getTime() + trialDays * DAY_MS),
    billingStatus: "TRIAL" as const,
  };
}

export function resolveProfessionalAccess(
  professional: AccessProfessional,
  user: AccessUser,
  approved: boolean,
  now = new Date(),
  policy: ProfessionalBillingPolicy = { billingEnabled: false },
): ProfessionalAccessState {
  const subscriptionEndsAt = professional.subscriptionEndsAt ?? user.premiumUntil;
  const subscriptionActive = professional.billingStatus === "ACTIVE" &&
    (!subscriptionEndsAt || subscriptionEndsAt > now);

  if (professional.accessGrandfathered || professional.billingStatus === "GRANDFATHERED") {
    return {
      kind: "GRANDFATHERED",
      canUsePlatform: true,
      canAppearInSearch: approved,
      freeTrialDaysLeft: null,
      freeTrialEndsAt: null,
      subscriptionActive,
      subscriptionEndsAt,
      billingEnabled: policy.billingEnabled,
    };
  }

  if (subscriptionActive && approved) {
    return {
      kind: "ACTIVE",
      canUsePlatform: true,
      canAppearInSearch: true,
      freeTrialDaysLeft: professional.freeAccessEndsAt
        ? Math.max(0, Math.ceil((professional.freeAccessEndsAt.getTime() - now.getTime()) / DAY_MS))
        : null,
      freeTrialEndsAt: professional.freeAccessEndsAt,
      subscriptionActive: true,
      subscriptionEndsAt,
      billingEnabled: policy.billingEnabled,
    };
  }

  if (!approved || !professional.freeAccessStartedAt || !professional.freeAccessEndsAt) {
    return {
      kind: "PENDING_APPROVAL",
      canUsePlatform: false,
      canAppearInSearch: false,
      freeTrialDaysLeft: null,
      freeTrialEndsAt: professional.freeAccessEndsAt,
      subscriptionActive,
      subscriptionEndsAt,
      billingEnabled: policy.billingEnabled,
    };
  }

  if (professional.freeAccessEndsAt > now) {
    return {
      kind: "TRIAL",
      canUsePlatform: true,
      canAppearInSearch: true,
      freeTrialDaysLeft: Math.max(1, Math.ceil((professional.freeAccessEndsAt.getTime() - now.getTime()) / DAY_MS)),
      freeTrialEndsAt: professional.freeAccessEndsAt,
      subscriptionActive: false,
      subscriptionEndsAt,
      billingEnabled: policy.billingEnabled,
    };
  }

  if (professional.billingStatus === "PAST_DUE" || professional.billingStatus === "CANCELED") {
    const canUsePlatform = !policy.billingEnabled;
    return {
      kind: professional.billingStatus,
      canUsePlatform,
      canAppearInSearch: approved && canUsePlatform,
      freeTrialDaysLeft: 0,
      freeTrialEndsAt: professional.freeAccessEndsAt,
      subscriptionActive: false,
      subscriptionEndsAt,
      billingEnabled: policy.billingEnabled,
    };
  }

  const canUsePlatform = !policy.billingEnabled;
  return {
    kind: "TRIAL_EXPIRED",
    canUsePlatform,
    canAppearInSearch: approved && canUsePlatform,
    freeTrialDaysLeft: 0,
    freeTrialEndsAt: professional.freeAccessEndsAt,
    subscriptionActive: false,
    subscriptionEndsAt,
    billingEnabled: policy.billingEnabled,
  };
}

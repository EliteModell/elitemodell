import { expect, test } from "@playwright/test";
import { professionalApprovalTrialData, resolveProfessionalAccess } from "../src/lib/professional-access-policy";

const DAY_MS = 24 * 60 * 60 * 1000;
const approvalTime = new Date("2026-09-30T15:00:00.000Z");

function pendingProfessional() {
  return {
    accessGrandfathered: false,
    freeAccessStartedAt: null,
    freeAccessEndsAt: null,
    billingStatus: "PENDING_APPROVAL" as const,
    subscriptionStartedAt: null,
    subscriptionEndsAt: null,
  };
}

test("trial starts once on first approval and ends exactly 30 UTC days later", () => {
  const started = professionalApprovalTrialData(pendingProfessional(), 30, approvalTime);
  expect(started.freeAccessStartedAt).toEqual(approvalTime);
  expect(started.freeAccessEndsAt?.toISOString()).toBe("2026-10-30T15:00:00.000Z");
  expect(started.freeAccessEndsAt!.getTime() - started.freeAccessStartedAt!.getTime()).toBe(30 * DAY_MS);
  expect(started.billingStatus).toBe("TRIAL");
});

test("login, edits and reapproval cannot restart an existing trial", () => {
  const existing = {
    ...pendingProfessional(),
    freeAccessStartedAt: approvalTime,
    freeAccessEndsAt: new Date(approvalTime.getTime() + 30 * DAY_MS),
    billingStatus: "TRIAL" as const,
  };
  expect(professionalApprovalTrialData(existing, 30, new Date("2026-10-10T00:00:00.000Z"))).toEqual({});
  expect(resolveProfessionalAccess(existing, { premiumUntil: null }, true, new Date("2026-10-10T00:00:00.000Z"))).toMatchObject({ kind: "TRIAL", freeTrialDaysLeft: 21 });
});

test("expired trial is tracked but never blocks while billing is disabled", () => {
  const expired = {
    ...pendingProfessional(),
    freeAccessStartedAt: approvalTime,
    freeAccessEndsAt: new Date("2026-10-30T15:00:00.000Z"),
    billingStatus: "TRIAL_EXPIRED" as const,
  };
  expect(resolveProfessionalAccess(expired, { premiumUntil: null }, true, new Date("2026-11-01T00:00:00.000Z"), { billingEnabled: false }))
    .toMatchObject({ kind: "TRIAL_EXPIRED", freeTrialDaysLeft: 0, canUsePlatform: true, canAppearInSearch: true });
  expect(resolveProfessionalAccess(expired, { premiumUntil: null }, true, new Date("2026-11-01T00:00:00.000Z"), { billingEnabled: true }))
    .toMatchObject({ kind: "TRIAL_EXPIRED", canUsePlatform: false, canAppearInSearch: false });
});

test("legacy accounts stay active and active subscriptions are explicit", () => {
  expect(resolveProfessionalAccess({ ...pendingProfessional(), accessGrandfathered: true, billingStatus: "GRANDFATHERED" }, { premiumUntil: null }, true))
    .toMatchObject({ kind: "GRANDFATHERED", canUsePlatform: true });
  expect(resolveProfessionalAccess({
    ...pendingProfessional(),
    freeAccessStartedAt: approvalTime,
    freeAccessEndsAt: new Date("2026-10-01T00:00:00.000Z"),
    billingStatus: "ACTIVE",
    subscriptionStartedAt: new Date("2026-10-30T15:00:00.000Z"),
    subscriptionEndsAt: new Date("2026-12-30T15:00:00.000Z"),
  }, { premiumUntil: null }, true, new Date("2026-11-01T00:00:00.000Z"), { billingEnabled: true }))
    .toMatchObject({ kind: "ACTIVE", subscriptionActive: true, canUsePlatform: true });
  expect(resolveProfessionalAccess({
    ...pendingProfessional(),
    billingStatus: "ACTIVE",
    subscriptionStartedAt: approvalTime,
    subscriptionEndsAt: null,
  }, { premiumUntil: null }, true, new Date("2026-11-01T00:00:00.000Z"), { billingEnabled: true }))
    .toMatchObject({ kind: "ACTIVE", freeTrialDaysLeft: null, subscriptionActive: true, canUsePlatform: true });
});

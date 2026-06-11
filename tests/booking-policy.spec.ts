import { expect, test } from "@playwright/test";
import { bookingPayoutBlockers, canEnableLivePayout } from "../src/lib/booking-policy";

test("repasse live permanece bloqueado enquanto qualquer aprovacao faltar", () => {
  const settings = {
    bookingCommercialModelApproved: true,
    bookingCancellationPolicyApproved: false,
    bookingPayoutIntegrationHomologated: true,
    bookingFinancialTestsApproved: true,
  };
  expect(canEnableLivePayout(settings)).toBe(false);
  expect(bookingPayoutBlockers(settings)).toEqual(["politica de cancelamento"]);
});

test("repasse live so fica elegivel com as quatro validacoes", () => {
  expect(canEnableLivePayout({
    bookingCommercialModelApproved: true,
    bookingCancellationPolicyApproved: true,
    bookingPayoutIntegrationHomologated: true,
    bookingFinancialTestsApproved: true,
  })).toBe(true);
});

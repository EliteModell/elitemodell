export const BOOKING_PROPOSAL_STATUS = "PENDING_PARTNER_AND_LEGAL_APPROVAL";

export type BookingPayoutGates = {
  bookingCommercialModelApproved: boolean;
  bookingCancellationPolicyApproved: boolean;
  bookingPayoutIntegrationHomologated: boolean;
  bookingFinancialTestsApproved: boolean;
};

export function canEnableLivePayout(settings: BookingPayoutGates) {
  return settings.bookingCommercialModelApproved
    && settings.bookingCancellationPolicyApproved
    && settings.bookingPayoutIntegrationHomologated
    && settings.bookingFinancialTestsApproved;
}

export function bookingPayoutBlockers(settings: BookingPayoutGates) {
  const blockers: string[] = [];
  if (!settings.bookingCommercialModelApproved) blockers.push("modelo comercial");
  if (!settings.bookingCancellationPolicyApproved) blockers.push("politica de cancelamento");
  if (!settings.bookingPayoutIntegrationHomologated) blockers.push("integracao de repasse");
  if (!settings.bookingFinancialTestsApproved) blockers.push("testes de pagamento, reembolso e disputa");
  return blockers;
}

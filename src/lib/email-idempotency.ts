export function professionalSubmissionReceiptIdempotencyKey(professionalId: string) {
  return `professional-submission/${professionalId}`;
}

export function professionalPublicationEmailIdempotencyKey(professionalId: string) {
  return `professional-publication/${professionalId}`;
}

export function professionalApprovalEmailIdempotencyKey(professionalId: string) {
  return `professional-approval/${professionalId}`;
}

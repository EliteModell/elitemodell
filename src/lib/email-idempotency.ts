export function professionalSubmissionReceiptIdempotencyKey(professionalId: string) {
  return `professional-submission/${professionalId}`;
}

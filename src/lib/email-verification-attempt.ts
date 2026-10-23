import "server-only";

export {
  createEmailSignupSuccessPayload,
  createEmailVerificationAttempt,
  verifyEmailVerificationAttempt,
  type EmailVerificationAttempt,
} from "@/lib/email-verification-attempt-core";

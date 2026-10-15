import "server-only";

export {
  createEmailVerificationAttempt,
  verifyEmailVerificationAttempt,
  type EmailVerificationAttempt,
} from "@/lib/email-verification-attempt-core";

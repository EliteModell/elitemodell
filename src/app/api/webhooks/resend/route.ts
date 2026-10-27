import { handleResendWebhook } from "@/lib/resend-webhook";

export async function POST(request: Request) {
  return handleResendWebhook(request);
}

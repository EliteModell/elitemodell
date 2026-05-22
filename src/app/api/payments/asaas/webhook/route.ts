// URL canônica do webhook Asaas: /api/payments/asaas/webhook
// Configure esta URL no painel Asaas > Configurações > Webhooks
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { handleAsaasWebhook } from "@/lib/asaas-webhook-handler";

export async function POST(req: NextRequest) {
  return handleAsaasWebhook(req);
}

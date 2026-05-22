// Rota legada — mantida para compatibilidade.
// URL canônica: /api/payments/asaas/webhook
// Configure APENAS /api/payments/asaas/webhook no painel Asaas.
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { handleAsaasWebhook } from "@/lib/asaas-webhook-handler";

export async function POST(req: NextRequest) {
  return handleAsaasWebhook(req);
}

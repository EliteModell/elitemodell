import { NextRequest } from "next/server";
import { handleDigitWebhook } from "@/lib/didit-webhook-handler";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return handleDigitWebhook(req);
}

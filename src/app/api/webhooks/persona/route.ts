import { NextRequest } from "next/server";
import { handlePersonaWebhook } from "@/lib/persona-webhook-handler";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return handlePersonaWebhook(req);
}

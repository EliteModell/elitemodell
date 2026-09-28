export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getTwilioWhatsAppAvailability } from "@/lib/twilio-verify";

export async function GET() {
  const availability = await getTwilioWhatsAppAvailability();

  return NextResponse.json(
    {
      sms: true,
      whatsapp: availability.available,
    },
    {
      headers: {
        "Cache-Control": "private, max-age=60",
      },
    },
  );
}

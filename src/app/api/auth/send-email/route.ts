export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { buildAuthEmail, sendAuthEmail, type AuthEmailPayload } from "@/lib/auth-email";

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as AuthEmailPayload;
    const email = buildAuthEmail(payload);

    if (!email) {
      return NextResponse.json({});
    }

    await sendAuthEmail(payload.user.email, email);
    return NextResponse.json({});
  } catch (err) {
    console.error("[send-email]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

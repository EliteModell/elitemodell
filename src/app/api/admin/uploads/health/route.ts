export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-access";
import { checkClamAvHealth } from "@/lib/moderation-core";

export async function GET() {
  const access = await authorizeAdminRequest("reports:manage");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const clamav = await checkClamAvHealth();
  return NextResponse.json(
    {
      clamav: {
        healthy: clamav.healthy,
        reason: clamav.reason,
        mode: clamav.config.mode,
        port: clamav.config.port,
        protocol: clamav.config.protocol,
        timeoutMs: clamav.config.timeoutMs,
        streaming: clamav.config.streaming,
        chunkSizeBytes: clamav.config.chunkSizeBytes,
        maxFileSizeBytes: clamav.config.maxFileSizeBytes,
      },
    },
    { status: clamav.healthy ? 200 : 503, headers: { "Cache-Control": "private, no-store" } },
  );
}

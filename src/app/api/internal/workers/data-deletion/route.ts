export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { processPendingDeletionJobs } from "@/lib/data-deletion-worker";

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function run(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Worker nao autorizado." }, { status: 401 });
  }

  const requestedLimit = Number(new URL(req.url).searchParams.get("limit") || "5");
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 20)
    : 5;
  const results = await processPendingDeletionJobs(limit);
  return NextResponse.json({
    ok: true,
    processedAt: new Date().toISOString(),
    count: results.length,
    results,
  });
}

export const GET = run;
export const POST = run;

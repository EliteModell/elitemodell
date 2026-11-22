import { identityRuntimeEnabled } from "@/lib/manual-identity-runtime";
import { Prisma } from "@prisma/client";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { assertPrivateIdentityBucket, identityBucket, identityPath, identityStorage, privateIdentityHeaders } from "@/lib/manual-identity";
import { identityParts } from "@/lib/manual-identity-policy";

export async function POST(req: Request) {
  if (!(await identityRuntimeEnabled())) return new Response(null, { status: 404 });
  const secret = process.env.CRON_SECRET?.trim();
  const expected = Buffer.from(secret ? "Bearer " + secret : "");
  const actual = Buffer.from(req.headers.get("authorization") ?? "");
  if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return new Response(null, { status: 401 });
  let removed = 0;
  try {
    await assertPrivateIdentityBucket();
    const now = new Date();
    const attempts = await prisma.manualIdentityAttempt.findMany({
      where: { purgedAt: null, purgeAfter: { lte: now } }, take: 10,
      orderBy: { purgeAfter: "asc" }, select: { id: true, userId: true },
    });
    for (const attempt of attempts) {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"manual-identity:" + attempt.userId}))`;
        const active = await tx.manualIdentityAttempt.findUnique({ where: { id: attempt.id } });
        if (!active || active.purgedAt || active.purgeAfter > now) return;
        await Promise.all(identityParts(active.backUnavailable).map((part) => identityStorage.delete(identityBucket, identityPath(active.id, part))));
        await tx.manualIdentityAttempt.update({ where: { id: active.id }, data: { purgedAt: now, birthDate: null, evidenceHashes: Prisma.DbNull } });
        removed++;
      }, { timeout: 15_000 });
    }
    return Response.json({ removed }, { headers: privateIdentityHeaders });
  } catch {
    return Response.json({ removed, error: "A limpeza será retomada na próxima execução." }, { status: 503, headers: privateIdentityHeaders });
  }
}

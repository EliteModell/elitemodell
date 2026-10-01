export const dynamic = "force-dynamic";

import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminMfaSession } from "@/lib/admin-mfa";
import { getAdminAccessForUser } from "@/lib/admin-access";
import { logAudit } from "@/lib/audit";
import { enforceRateLimitAsync, getClientIP } from "@/lib/security";

function matchesConfiguredHash(value: string) {
  const configured = process.env.ADMIN_MFA_BREAK_GLASS_TOKEN_HASH?.trim().toLowerCase();
  if (!configured || !/^[a-f0-9]{64}$/.test(configured)) return false;
  const actual = createHash("sha256").update(value).digest("hex");
  const expectedBytes = Buffer.from(configured, "hex");
  const actualBytes = Buffer.from(actual, "hex");
  return timingSafeEqual(expectedBytes, actualBytes);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !await getAdminAccessForUser(session.user.id)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }
  const ipAddress = getClientIP(req);
  const limited = await enforceRateLimitAsync(`admin-break-glass:${session.user.id}:${ipAddress}`, 3, 60 * 60 * 1000);
  if (limited) return limited;
  const body = await req.json().catch(() => ({})) as { token?: unknown };
  if (typeof body.token !== "string" || !matchesConfiguredHash(body.token)) {
    await logAudit({
      adminId: session.user.id,
      action: "ADMIN_ACCESS",
      targetType: "SYSTEM",
      targetId: "mfa-break-glass",
      reason: "Tentativa de break-glass administrativo rejeitada.",
      ipAddress,
      userAgent: req.headers.get("user-agent") ?? undefined,
    });
    return NextResponse.json({ error: "Credencial de recuperacao invalida." }, { status: 403 });
  }
  await createAdminMfaSession(session.user.id, ipAddress, req.headers.get("user-agent") ?? undefined);
  await logAudit({
    adminId: session.user.id,
    action: "ADMIN_ACCESS",
    targetType: "SYSTEM",
    targetId: "mfa-break-glass",
    reason: "Break-glass administrativo utilizado; rotacao imediata da credencial e revisao obrigatorias.",
    ipAddress,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });
  return NextResponse.json({ ok: true, rotateCredentialImmediately: true });
}

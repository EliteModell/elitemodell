import type { NextRequest } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-access";
import { buildDigitVendorData, findDigitSessionByVendorData, isDigitAvailable, isSafeDigitVerificationUrl, parseDigitIntentMarker } from "@/lib/didit";
import { prisma } from "@/lib/prisma";
import { enforceRateLimitAsync } from "@/lib/security";

const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };

export async function GET(request: NextRequest) {
  const access = await authorizeAdminRequest("incidents:manage");
  if (!access.ok) return Response.json({ error: access.error }, { status: access.status, headers });
  const ref = request.nextUrl.searchParams.get("ref") ?? "";
  if (!/^[a-z0-9]{8}$/i.test(ref)) return Response.json({ error: "Referência inválida." }, { status: 400, headers });
  const limited = await enforceRateLimitAsync(`didit-diagnostic:${access.session.user.id}`, 10, 60_000);
  if (limited) return limited;
  const profiles = await prisma.professional.findMany({
    where: { id: { endsWith: ref }, kycProvider: "DIDIT" }, take: 2,
    select: { userId: true, kycSessionId: true, kycStatus: true, verificationUrl: true },
  });
  if (profiles.length !== 1) return Response.json({ error: "Referência indisponível ou ambígua." }, { status: 404, headers });
  const [profile] = profiles;
  const intent = parseDigitIntentMarker(profile.verificationUrl);
  const configured = isDigitAvailable();
  const base = {
    ref, configured, localStatus: profile.kycStatus, localSessionSaved: Boolean(profile.kycSessionId),
    workflowSuffix: process.env.DIDIT_WORKFLOW_ID?.trim().slice(-8) || null,
    webhookSecretConfigured: Boolean(process.env.DIDIT_WEBHOOK_SECRET?.trim()),
    localLinkSaved: isSafeDigitVerificationUrl(profile.verificationUrl),
    reservationCreatedAt: intent ? new Date(intent.createdAt).toISOString() : null,
    lastLeaseAt: intent ? new Date(intent.leaseAt).toISOString() : null,
  };
  if (!configured) return Response.json(base, { status: 503, headers });
  let observation: Parameters<NonNullable<Parameters<typeof findDigitSessionByVendorData>[2]>>[0] | undefined;
  try {
    const session = await findDigitSessionByVendorData(buildDigitVendorData(profile.userId), intent?.createdAt, (result) => { observation = result; });
    return Response.json({
      ...base, lookup: observation, remoteSessionFound: Boolean(session), remoteStatus: session?.status ?? null,
      remoteLinkAvailable: isSafeDigitVerificationUrl(session?.url),
    }, { headers });
  } catch (error) {
    const errorKind = error instanceof SyntaxError ? "invalid_json"
      : error instanceof Error && /^didit_[a-z_]+$/.test(error.message) ? error.message : "lookup_failed";
    return Response.json({ ...base, lookup: observation, errorKind }, { status: 502, headers });
  }
}

import type { NextRequest } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { enforceRateLimitAsync } from "@/lib/security";
import { readTwilioSmsDiagnostic, TwilioVerifyProviderError } from "@/lib/twilio-verify";

const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };

export async function GET(request: NextRequest) {
  const access = await authorizeAdminRequest("incidents:manage");
  if (!access.ok) return Response.json({ error: access.error }, { status: access.status, headers });
  const verificationSid = request.nextUrl.searchParams.get("verification") ?? "";
  if (!/^VE[0-9a-f]{32}$/i.test(verificationSid)) {
    return Response.json({ error: "Informe um identificador de verificação válido." }, { status: 400, headers });
  }

  const limited = await enforceRateLimitAsync(`sms-diagnostic:${access.session.user.id}`, 10, 60_000);
  if (limited) return limited;
  const record = await prisma.phoneVerificationCode.findFirst({
    where: {
      providerMessageId: verificationSid,
      channel: "sms",
      deliveryProvider: "twilio-verify",
      sentAt: { gte: new Date(Date.now() - 30 * 86_400_000) },
    },
    select: { id: true },
  });
  if (!record) return Response.json({ error: "Verificação indisponível nos registros recentes." }, { status: 404, headers });

  try {
    return Response.json(await readTwilioSmsDiagnostic(verificationSid), { headers });
  } catch (error) {
    const providerStatus = error instanceof TwilioVerifyProviderError ? error.status : undefined;
    return Response.json({ error: "Consulta à Twilio indisponível.", providerStatus }, { status: 502, headers });
  }
}

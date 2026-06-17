export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { ensureProfileForIntent } from "@/lib/account-profiles";
import { prisma } from "@/lib/prisma";
import {
  attachPendingProfessionalPhone,
  clearPendingProfessionalPhoneCookie,
  ProfessionalPhoneRegistrationError,
  validatePendingProfessionalPhone,
} from "@/lib/professional-phone-registration";

const schema = z.object({
  category: z.enum(["MULHER", "HOMEM", "TRANS"]).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  try {
    const pendingProfessionalPhone = await validatePendingProfessionalPhone(req, session.user.id);
    if (!pendingProfessionalPhone) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { phoneVerified: true },
      });
      if (!user?.phoneVerified) {
        throw new ProfessionalPhoneRegistrationError(
          "Confirme seu telefone antes de continuar o cadastro de acompanhante.",
        );
      }
    }

    await ensureProfileForIntent(session.user.id, "profissional", parsed.data.category);
    if (pendingProfessionalPhone) {
      await attachPendingProfessionalPhone(req, session.user.id);
    }

    const response = NextResponse.json({ ok: true });
    if (pendingProfessionalPhone) clearPendingProfessionalPhoneCookie(response);
    return response;
  } catch (error) {
    if (error instanceof ProfessionalPhoneRegistrationError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}

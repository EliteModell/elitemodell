import "server-only";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ageGateCacheHeaders } from "@/lib/age-gate-policy";
import { hasConfirmedAgeDeclaration } from "@/lib/age-declaration";
import type { NextRequest } from "next/server";

type AdultContentAccessOptions = {
  allowAgeDeclaration?: boolean;
};

export async function authorizeAdultContentRequest(
  request?: NextRequest,
  options: AdultContentAccessOptions = {},
) {
  const session = await getServerSession(authOptions);
  const declarationAccepted = Boolean(
    options.allowAgeDeclaration && request && hasConfirmedAgeDeclaration(request.cookies),
  );
  if (!session?.user?.id) {
    if (declarationAccepted) {
      return { ok: true as const, access: "AGE_DECLARATION" as const, session: null };
    }
    return {
      ok: false as const,
      status: 401,
      error: "Autenticacao e verificacao 18+ obrigatorias.",
      headers: ageGateCacheHeaders(),
    };
  }
  if (!session.user.adultVerified && session.user.role !== "ADMIN") {
    if (declarationAccepted) {
      return { ok: true as const, access: "AGE_DECLARATION" as const, session };
    }
    return {
      ok: false as const,
      status: 403,
      error: "Verificacao de maioridade obrigatoria.",
      headers: ageGateCacheHeaders(),
    };
  }
  return { ok: true as const, access: "STRONG_VERIFICATION" as const, session };
}

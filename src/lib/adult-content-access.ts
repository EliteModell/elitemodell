import "server-only";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ageGateCacheHeaders } from "@/lib/age-gate-policy";

export async function authorizeAdultContentRequest() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      ok: false as const,
      status: 401,
      error: "Autenticacao e verificacao 18+ obrigatorias.",
      headers: ageGateCacheHeaders(),
    };
  }
  if (!session.user.adultVerified && session.user.role !== "ADMIN") {
    return {
      ok: false as const,
      status: 403,
      error: "Verificacao de maioridade obrigatoria.",
      headers: ageGateCacheHeaders(),
    };
  }
  return { ok: true as const, session };
}

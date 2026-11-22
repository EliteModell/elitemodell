import "server-only";
import { identityEnabled, identityTargetsProduction } from "@/lib/manual-identity-policy";
import { prisma } from "@/lib/prisma";

export async function identityRuntimeEnabled() {
  if (!identityEnabled()) return false;
  if (process.env.NODE_ENV !== "production") return true;
  if (identityTargetsProduction(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.DATABASE_URL)) return true;

  // Check the connected cluster when the runtime connection string is unavailable
  // or uses a hostname that does not identify the Supabase project.
  try {
    const [result] = await prisma.$queryRaw<{ matches: boolean }[]>`
      SELECT system_identifier::text = ${"7637215626725903220"} AS matches FROM pg_control_system()
    `;
    return result?.matches === true;
  } catch {
    return false;
  }
}

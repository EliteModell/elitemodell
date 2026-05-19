import "server-only";

import { prisma } from "@/lib/prisma";

export type PropertyAccessUser = {
  id?: string;
  role?: string | null;
  accountType?: string | null;
  isProfessional?: boolean | null;
};

export function hasProfessionalAccountType(accountType?: string | null) {
  const normalized = (accountType ?? "").toLowerCase();
  return ["professional", "model", "companion", "acompanhante"].includes(normalized);
}

export async function isApprovedProfessional(user: PropertyAccessUser | null | undefined) {
  if (!user?.id) return false;
  if (user.role === "ADMIN") return true;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      accountType: true,
      professional: { select: { status: true, verified: true } },
    },
  });

  if (!dbUser) return false;
  return (
    hasProfessionalAccountType(dbUser.accountType) &&
    dbUser.professional?.status === "ACTIVE" &&
    dbUser.professional.verified === true
  );
}

export async function canViewApprovedProperties(user: PropertyAccessUser | null | undefined) {
  if (!user?.id) return false;
  if (user.role === "ADMIN") return true;
  return isApprovedProfessional(user);
}

export async function canCreatePropertyUseRequest(user: PropertyAccessUser | null | undefined) {
  return canViewApprovedProperties(user);
}

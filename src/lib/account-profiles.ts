import "server-only";

import { prisma } from "@/lib/prisma";
import { type EntryAccountRole, isHostAccountType } from "@/lib/account-routes";

export type ActiveProfileType = "CLIENTE" | "HOST" | "PROFESSIONAL" | "ADMIN";

export function profileTypeFromIntent(intent: EntryAccountRole | null | undefined): ActiveProfileType {
  if (intent === "anfitriao") return "HOST";
  if (intent === "profissional") return "PROFESSIONAL";
  return "CLIENTE";
}

export function hasProfessionalAccountType(value: string | null | undefined) {
  return ["model", "professional", "PROFESSIONAL"].includes(value ?? "");
}

export function deriveAvailableProfiles(user: {
  role?: string | null;
  accountType?: string | null;
  clientProfile?: unknown | null;
  hostProfile?: unknown | null;
  professional?: unknown | null;
  properties?: Array<{ status?: string | null }> | null;
}) {
  const profiles = new Set<ActiveProfileType>();

  if (user.clientProfile || user.accountType === "client" || !user.accountType) profiles.add("CLIENTE");
  if (user.role === "ADMIN") profiles.add("ADMIN");
  if (user.professional || hasProfessionalAccountType(user.accountType)) profiles.add("PROFESSIONAL");
  if (user.hostProfile || isHostAccountType(user.accountType) || (user.properties?.length ?? 0) > 0) profiles.add("HOST");

  if (profiles.size === 0) profiles.add("CLIENTE");
  return Array.from(profiles);
}

export async function ensureProfileForIntent(userId: string, intent: EntryAccountRole | null | undefined, category?: string | null) {
  const profileType = profileTypeFromIntent(intent);

  if (profileType === "CLIENTE") {
    await prisma.clientProfile.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    return profileType;
  }

  if (profileType === "HOST") {
    await prisma.$transaction(async (tx) => {
      await tx.hostProfile.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });
      await tx.user.update({
        where: { id: userId },
        data: { accountType: "host" },
        select: { id: true },
      });
    });
    return profileType;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      accountType: "model",
      role: "HOST",
      category: category && ["MULHER", "HOMEM", "TRANS"].includes(category) ? category as "MULHER" | "HOMEM" | "TRANS" : undefined,
    },
    select: { id: true },
  });
  return profileType;
}

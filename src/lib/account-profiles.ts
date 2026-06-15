import "server-only";

import { Prisma } from "@prisma/client";
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

const PROFESSIONAL_CATEGORIES = ["MULHER", "HOMEM", "TRANS"] as const;

function normalizeProfessionalCategory(category?: string | null) {
  return category && (PROFESSIONAL_CATEGORIES as readonly string[]).includes(category)
    ? category as typeof PROFESSIONAL_CATEGORIES[number]
    : undefined;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function uniqueDraftProfessionalSlug(tx: Prisma.TransactionClient, userId: string, seed: string) {
  const base = slugify(seed) || `profissional-${userId.slice(-8)}`;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const existing = await tx.professional.findUnique({
      where: { slug },
      select: { userId: true },
    });
    if (!existing || existing.userId === userId) return slug;
  }

  return `${base}-${Date.now()}`;
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
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { role: true, accountType: true },
      });

      await tx.clientProfile.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });

      const shouldKeepCurrentPrimaryType =
        user?.role === "ADMIN" ||
        hasProfessionalAccountType(user?.accountType) ||
        isHostAccountType(user?.accountType);

      if (!shouldKeepCurrentPrimaryType) {
        await tx.user.update({
          where: { id: userId },
          data: { role: "GUEST", accountType: "client" },
          select: { id: true },
        });
      }
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

  await prisma.$transaction(async (tx) => {
    const normalizedCategory = normalizeProfessionalCategory(category);
    const user = await tx.user.update({
      where: { id: userId },
      data: {
        accountType: "model",
        role: "HOST",
        category: normalizedCategory,
      },
      select: { id: true, name: true, email: true, category: true },
    });

    const existing = await tx.professional.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (existing) {
      await tx.professional.update({
        where: { userId },
        data: { escortCategory: normalizedCategory },
        select: { id: true },
      });
      return;
    }

    const displayName = user.name?.trim() || "Perfil em cadastro";
    const slug = await uniqueDraftProfessionalSlug(tx, userId, `${displayName}-${user.email ?? userId.slice(-8)}`);
    await tx.professional.create({
      data: {
        userId,
        slug,
        displayName,
        bio: "",
        city: "",
        state: "",
        escortCategory: normalizedCategory ?? user.category ?? undefined,
        status: "DRAFT",
        verified: false,
        accessGrandfathered: false,
        paymentMethods: [],
        attendanceTypes: [],
        servesGenders: [],
        idiomas: [],
        diasDisponiveis: [],
        services: [],
        fetishes: [],
        galleryUrls: [],
      },
      select: { id: true },
    });
  });

  return profileType;
}

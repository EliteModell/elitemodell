import process from "node:process";
import { PrismaClient } from "@prisma/client";

const HOMOLOG_SCHEMA = "homolog_legal_20260611";
const databaseUrl = new URL(process.env.DATABASE_URL ?? "");

if (databaseUrl.searchParams.get("schema") !== HOMOLOG_SCHEMA) {
  throw new Error(`Refusing to seed outside ${HOMOLOG_SCHEMA}.`);
}

const email = process.env.TEST_USER_EMAIL?.trim().toLowerCase();
if (!email) {
  throw new Error("TEST_USER_EMAIL is required.");
}

const prisma = new PrismaClient();

try {
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      name: "Conta E2E Homologacao",
      email,
      accountType: "client",
      role: "GUEST",
      blocked: false,
      phoneVerified: true,
      phoneVerifiedAt: new Date(),
      birthDate: new Date("1990-01-01T00:00:00.000Z"),
      termsConsent: true,
      lgpdConsent: true,
      consentDate: new Date(),
      clientStatus: "UNVERIFIED",
    },
    update: {
      name: "Conta E2E Homologacao",
      accountType: "client",
      role: "GUEST",
      blocked: false,
      blockReason: null,
      blockedAt: null,
      phoneVerified: true,
      birthDate: new Date("1990-01-01T00:00:00.000Z"),
      termsConsent: true,
      lgpdConsent: true,
      clientStatus: "UNVERIFIED",
    },
  });

  await prisma.clientProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      displayName: "Conta E2E",
      status: "UNVERIFIED",
    },
    update: {
      displayName: "Conta E2E",
      status: "UNVERIFIED",
    },
  });

  console.log(`Homologation E2E identity ready: ${user.id}`);
} finally {
  await prisma.$disconnect();
}

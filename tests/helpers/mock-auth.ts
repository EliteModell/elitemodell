import type { BrowserContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";

type MockToken = {
  id: string;
  name: string;
  email: string;
  role: string;
  accountType: string;
  clientStatus?: string | null;
  professionalStatus?: string | null;
  isProfessional?: boolean;
  needsConsent?: boolean;
  activeProfileType: "CLIENTE" | "PROFESSIONAL" | "HOST";
  availableProfiles: Array<"CLIENTE" | "PROFESSIONAL" | "HOST">;
  adultVerified?: boolean;
};

type MockSessionOptions = {
  persistedProfessionalStatus?: "DRAFT";
};

type PersistedUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  accountType: string | null;
  clientStatus: string | null;
  blocked: boolean;
};

let configuredUserPromise: Promise<PersistedUser | null> | null = null;
let draftProfessionalUserPromise: Promise<PersistedUser | null> | null = null;

async function resolvePersistedIdentity(
  token: MockToken,
  options: MockSessionOptions = {},
): Promise<MockToken> {
  if (options.persistedProfessionalStatus) {
    draftProfessionalUserPromise ??= (async () => {
      const prisma = new PrismaClient();
      try {
        return await prisma.user.findFirst({
          where: {
            blocked: false,
            professional: { is: { status: options.persistedProfessionalStatus } },
          },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            accountType: true,
            clientStatus: true,
            blocked: true,
          },
        });
      } finally {
        await prisma.$disconnect();
      }
    })();

    const professionalUser = await draftProfessionalUserPromise;
    if (!professionalUser) {
      throw new Error("A persisted DRAFT professional is required for this E2E session.");
    }
    return {
      ...token,
      id: professionalUser.id,
      name: professionalUser.name ?? token.name,
      email: professionalUser.email,
      role: professionalUser.role,
      accountType: professionalUser.accountType ?? token.accountType,
      clientStatus: professionalUser.clientStatus,
    };
  }

  const email = process.env.TEST_USER_EMAIL;
  if (!email) return token;

  configuredUserPromise ??= (async () => {
    const prisma = new PrismaClient();
    try {
      return await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          accountType: true,
          clientStatus: true,
          blocked: true,
        },
      });
    } finally {
      await prisma.$disconnect();
    }
  })();

  const user = await configuredUserPromise;
  if (!user || user.blocked) {
    throw new Error(
      "TEST_USER_EMAIL must reference an existing, unblocked user for E2E sessions.",
    );
  }

  return {
    ...token,
    id: user.id,
    name: user.name ?? token.name,
    email: user.email,
    role: user.role,
    accountType: user.accountType ?? token.accountType,
    clientStatus: user.clientStatus,
  };
}

export async function installMockSessionCookie(
  context: BrowserContext,
  token: MockToken,
  options: MockSessionOptions = {},
) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required for signed E2E sessions.");
  }

  const persistedToken = await resolvePersistedIdentity(token, options);
  const { clientStatus, ...tokenWithoutNullableClientStatus } = persistedToken;
  const value = await encode({
    secret,
    maxAge: 60 * 60,
    token: {
      ...tokenWithoutNullableClientStatus,
      ...(clientStatus ? { clientStatus } : {}),
      sub: persistedToken.id,
      adultVerified: persistedToken.adultVerified ?? true,
      needsConsent: persistedToken.needsConsent ?? false,
    },
  });

  await context.addCookies([
    {
      name: "next-auth.session-token",
      value,
      url: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await context.setExtraHTTPHeaders({
    Authorization: `Bearer ${value}`,
  });
}

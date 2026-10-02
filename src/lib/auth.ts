import { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { verifyPhoneAuthToken } from "./phone-otp";
import { createSupabaseServerClient } from "./supabase-server";
import { checkRateLimitAsync } from "./rate-limit";
import { getHostRegistrationStatus, normalizeEntryRole } from "./account-routes";
import { deriveAvailableProfiles, ensureProfileForIntent, profileTypeFromIntent } from "./account-profiles";
import { verifySignupDraftToken } from "./signup-draft-token";

function accountTypeFromRoleIntent(roleIntent: ReturnType<typeof normalizeEntryRole>) {
  if (roleIntent === "profissional") return "model";
  if (roleIntent === "anfitriao") return "host";
  return null;
}

function isUniqueEmailConflict(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002" &&
    Array.isArray(err.meta?.target) &&
    err.meta.target.includes("email");
}

type AuthContextRow = {
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  accountType: string;
  clientStatus: string;
  lgpdConsent: boolean;
  termsConsent: boolean;
  birthDate: Date | null;
  blocked: boolean;
  hasClientProfile: boolean;
  hasHostProfile: boolean;
  professionalId: string | null;
  professionalStatus: string | null;
  professionalVerified: boolean | null;
  professionalKycStatus: string | null;
  hasActiveAdminAssignment: boolean;
  propertyStatuses: string[];
};

export async function loadAuthContext(userId: string) {
  const configuredSchema = process.env.DATABASE_URL
    ? new URL(process.env.DATABASE_URL).searchParams.get("schema") ?? "public"
    : "public";
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(configuredSchema)) {
    throw new Error("Invalid database schema configured for auth context.");
  }
  const table = (name: string) => Prisma.raw(`"${configuredSchema}"."${name}"`);
  const rows = await prisma.$queryRaw<AuthContextRow[]>`
    SELECT
      u."name", u."email", u."image", u."role"::text AS "role",
      u."accountType", u."clientStatus"::text AS "clientStatus",
      u."lgpdConsent", u."termsConsent", u."birthDate", u."blocked",
      EXISTS (SELECT 1 FROM ${table("ClientProfile")} cp WHERE cp."userId" = u."id") AS "hasClientProfile",
      EXISTS (SELECT 1 FROM ${table("HostProfile")} hp WHERE hp."userId" = u."id") AS "hasHostProfile",
      p."id" AS "professionalId", p."status"::text AS "professionalStatus",
      p."verified" AS "professionalVerified", p."kycStatus" AS "professionalKycStatus",
      EXISTS (
        SELECT 1 FROM ${table("AdminRoleAssignment")} ara
        WHERE ara."userId" = u."id" AND ara."active" = true AND ara."revokedAt" IS NULL
      ) AS "hasActiveAdminAssignment",
      COALESCE((
        SELECT array_agg(prop."status"::text) FROM ${table("Property")} prop WHERE prop."hostId" = u."id"
      ), ARRAY[]::text[]) AS "propertyStatuses"
    FROM ${table("User")} u
    LEFT JOIN ${table("Professional")} p ON p."userId" = u."id"
    WHERE u."id" = ${userId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

function invalidateAuthToken(token: JWT): JWT {
  token.id = "";
  token.sub = "";
  token.role = "GUEST";
  token.adultVerified = false;
  token.availableProfiles = [];
  token.activeProfileType = undefined;
  return token;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      id: "supabase",
      name: "Supabase",
      credentials: {
        accessToken: { label: "Supabase Access Token", type: "text" },
        roleIntent: { label: "Role Intent", type: "text" },
        authFlow: { label: "Auth Flow", type: "text" },
        category: { label: "Professional Category", type: "text" },
        birthDate: { label: "Birth Date", type: "text" },
        lgpdConsent: { label: "LGPD Consent", type: "text" },
        termsConsent: { label: "Terms Consent", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.accessToken) return null;
        const limit = await checkRateLimitAsync(`auth:supabase:${credentials.accessToken.slice(0, 32)}`, 20, 15 * 60 * 1000);
        if (!limit.allowed) return null;
        try {
          const supabase = createSupabaseServerClient();
          const { data, error } = await supabase.auth.getUser(credentials.accessToken);
          if (error || !data.user) return null;

          const authUser = data.user;
          const phone = authUser.phone?.replace(/\D/g, "").replace(/^55/, "");
          const email = authUser.email ?? (phone ? `phone_${phone}@sms.elitemodell.local` : null);

          if (!email) return null;
          const metadata = authUser.user_metadata ?? {};
          const credentialMap = credentials as Record<string, string | undefined>;
          const roleIntent = normalizeEntryRole(credentialMap.roleIntent ?? null);
          const isCadastroFlow = credentialMap.authFlow === "cadastro";
          const intentAccountType = accountTypeFromRoleIntent(roleIntent);
          const credentialBirthDate =
            credentialMap.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(credentialMap.birthDate)
              ? new Date(`${credentialMap.birthDate}T00:00:00.000Z`)
              : null;
          const credentialCategory = typeof credentialMap.category === "string" ? credentialMap.category : undefined;
          const metadataCategory = typeof metadata.category === "string" ? metadata.category : undefined;
          const rawCategory = credentialCategory ?? metadataCategory;
          const category = ["MULHER", "HOMEM", "TRANS"].includes(rawCategory ?? "")
            ? rawCategory as "MULHER" | "HOMEM" | "TRANS"
            : null;
          const emailVerified = authUser.email_confirmed_at
            ? new Date(authUser.email_confirmed_at)
            : null;
          const metadataName =
            (metadata.name as string | undefined) ??
            (metadata.full_name as string | undefined) ??
            authUser.email ??
            phone ??
            null;
          const metadataImage =
            (metadata.avatar_url as string | undefined) ??
            (metadata.picture as string | undefined) ??
            null;
          const metadataBirthDate =
            typeof metadata.birthDate === "string" && metadata.birthDate
              ? new Date(metadata.birthDate)
              : null;
          const birthDate = credentialBirthDate ?? metadataBirthDate;
          const hasConsent = (credentialMap.lgpdConsent === "true" && credentialMap.termsConsent === "true") ||
            Boolean(metadata.lgpdConsent && metadata.termsConsent);
          const isGoogleAuth =
            authUser.app_metadata?.provider === "google" ||
            Boolean(authUser.identities?.some((identity) => identity.provider === "google"));

          let user = await prisma.user.findFirst({
            where: {
              OR: [{ email }, ...(phone ? [{ phone }] : [])],
            },
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              phone: true,
              emailVerified: true,
              role: true,
              accountType: true,
              category: true,
              birthDate: true,
              lgpdConsent: true,
              termsConsent: true,
              clientProfile: { select: { id: true } },
              hostProfile: { select: { id: true } },
              professional: { select: { id: true, status: true } },
              properties: { select: { status: true } },
              blocked: true,
            },
          });

          if (!user) {
            const metadataAccountType =
              (isCadastroFlow ? intentAccountType : null) ??
              (metadata.accountType === "PROFESSIONAL"
                ? "model"
                : metadata.accountType === "model" || metadata.accountType === "host"
                    ? metadata.accountType
                    : "client");
            const role = metadataAccountType === "model" ? "HOST" : "GUEST";
            const metadataClientStatus = metadata.clientStatus === "VERIFIED" ? "VERIFIED" as const : undefined;

            user = await prisma.user.upsert({
              where: { email },
              update: {},
              create: {
                email,
                name: metadataName,
                image: metadataImage,
                phone: phone ?? null,
                emailVerified,
                role,
                accountType: metadataAccountType,
                category,
                birthDate,
                lgpdConsent: hasConsent,
                termsConsent: hasConsent,
                consentDate: hasConsent ? new Date() : null,
                ...(metadataClientStatus ? { clientStatus: metadataClientStatus, kycReviewedAt: new Date() } : {}),
                clientProfile: { create: { displayName: metadataName } },
              },
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                phone: true,
                emailVerified: true,
                role: true,
                accountType: true,
                category: true,
                birthDate: true,
                lgpdConsent: true,
                termsConsent: true,
                clientProfile: { select: { id: true } },
                hostProfile: { select: { id: true } },
                professional: { select: { id: true, status: true } },
                properties: { select: { status: true } },
                blocked: true,
              },
            }).catch(async (err: unknown) => {
              if (!isUniqueEmailConflict(err)) throw err;
              const existingUser = await prisma.user.findUnique({
                where: { email },
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                  phone: true,
                  emailVerified: true,
                  role: true,
                  accountType: true,
                  category: true,
                  birthDate: true,
                  lgpdConsent: true,
                  termsConsent: true,
                  clientProfile: { select: { id: true } },
                  hostProfile: { select: { id: true } },
                  professional: { select: { id: true, status: true } },
                  properties: { select: { status: true } },
                  blocked: true,
                },
              });
              if (!existingUser) throw err;
              return existingUser;
            });

            if (role === "HOST") {
              await prisma.hostProfile.upsert({
                where: { userId: user.id },
                create: { userId: user.id },
                update: {},
              });
            }
          }

          await prisma.user.update({
            where: { id: user.id },
            data: {
              name: user.name ?? metadataName,
              image: user.image ?? metadataImage,
              phone: user.phone ?? phone ?? null,
              emailVerified: emailVerified && !user.emailVerified ? emailVerified : user.emailVerified,
              category: user.category ?? (roleIntent === "profissional" ? category : undefined),
              birthDate: user.birthDate ?? birthDate ?? undefined,
              lgpdConsent: user.lgpdConsent || hasConsent,
              termsConsent: user.termsConsent || hasConsent,
              consentDate: hasConsent && (!user.lgpdConsent || !user.termsConsent) ? new Date() : undefined,
            },
            select: { id: true },
          });

          // Validar se usuário está bloqueado
          if (user.blocked) {
            console.warn(`[AUTH] Usuário bloqueado tentando acessar: ${user.id}`);
            return null;
          }

          let activeProfileType = profileTypeFromIntent(null);
          if (isCadastroFlow || roleIntent === "cliente") {
            activeProfileType = await ensureProfileForIntent(
              user.id,
              roleIntent,
              category,
            );
          }

          const refreshedUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
              accountType: true,
              clientProfile: { select: { id: true } },
              hostProfile: { select: { id: true } },
              professional: { select: { id: true, status: true } },
              properties: { select: { status: true } },
            },
          });
          const availableProfiles = refreshedUser ? deriveAvailableProfiles(refreshedUser) : [activeProfileType];
          if (!isCadastroFlow && roleIntent) {
            const requestedProfileType = profileTypeFromIntent(roleIntent);
            activeProfileType = availableProfiles.includes(requestedProfileType)
              ? requestedProfileType
              : availableProfiles.includes("CLIENTE")
                ? "CLIENTE"
                : availableProfiles[0] ?? "CLIENTE";
          }

          return {
            id: user.id,
            name: refreshedUser?.name ?? user.name ?? metadataName,
            email: user.email,
            image: refreshedUser?.image ?? user.image ?? metadataImage,
            role: refreshedUser?.role ?? user.role,
            accountType: refreshedUser?.accountType ?? user.accountType,
            professionalStatus: refreshedUser?.professional?.status ?? user.professional?.status ?? null,
            activeProfileType,
            availableProfiles,
          };
        } catch (err) {
          console.error("[AUTH] Erro no authorize supabase:", err);
          return null;
        }
      },
    }),
    CredentialsProvider({
      id: "email-signup-draft",
      name: "Email Signup Draft",
      credentials: {
        token: { label: "Draft Token", type: "text" },
      },
      async authorize(credentials) {
        const rawToken = credentials?.token;
        const payload = verifySignupDraftToken(rawToken);
        if (!payload || payload.accountType !== "PROFESSIONAL" || !payload.category) return null;

        const limit = await checkRateLimitAsync(`auth:email-draft:${payload.email}`, 20, 15 * 60 * 1000);
        if (!limit.allowed) return null;

        try {
          const email = payload.email.trim().toLowerCase();
          const birthDate = /^\d{4}-\d{2}-\d{2}$/.test(payload.birthDate)
            ? new Date(`${payload.birthDate}T00:00:00.000Z`)
            : null;
          const hasConsent = payload.lgpdConsent && payload.termsConsent && payload.ageConfirmed;

          let user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
              accountType: true,
              clientProfile: { select: { id: true } },
              hostProfile: { select: { id: true } },
              professional: { select: { id: true, status: true } },
              properties: { select: { status: true } },
              blocked: true,
            },
          });

          if (user?.blocked) return null;

          if (!user) {
            user = await prisma.user.create({
              data: {
                email,
                name: payload.name,
                role: "HOST",
                accountType: "model",
                category: payload.category,
                birthDate,
                lgpdConsent: hasConsent,
                termsConsent: hasConsent,
                consentDate: hasConsent ? new Date() : null,
              },
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
                accountType: true,
                clientProfile: { select: { id: true } },
                hostProfile: { select: { id: true } },
                professional: { select: { id: true, status: true } },
                properties: { select: { status: true } },
                blocked: true,
              },
            }).catch(async (err: unknown) => {
              if (!isUniqueEmailConflict(err)) throw err;
              return prisma.user.findUnique({
                where: { email },
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                  role: true,
                  accountType: true,
                  clientProfile: { select: { id: true } },
                  hostProfile: { select: { id: true } },
                  professional: { select: { id: true, status: true } },
                  properties: { select: { status: true } },
                  blocked: true,
                },
              });
            });
          } else {
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                name: user.name ?? payload.name,
                role: "HOST",
                accountType: "model",
                category: payload.category,
                birthDate: birthDate ?? undefined,
                lgpdConsent: hasConsent || undefined,
                termsConsent: hasConsent || undefined,
                consentDate: hasConsent ? new Date() : undefined,
              },
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
                accountType: true,
                clientProfile: { select: { id: true } },
                hostProfile: { select: { id: true } },
                professional: { select: { id: true, status: true } },
                properties: { select: { status: true } },
                blocked: true,
              },
            });
          }

          if (!user || user.blocked) return null;

          await ensureProfileForIntent(user.id, "profissional", payload.category);

          const refreshedUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
              accountType: true,
              clientProfile: { select: { id: true } },
              hostProfile: { select: { id: true } },
              professional: { select: { id: true, status: true } },
              properties: { select: { status: true } },
            },
          });

          if (!refreshedUser) return null;
          return {
            id: refreshedUser.id,
            name: refreshedUser.name,
            email: refreshedUser.email,
            image: refreshedUser.image,
            role: refreshedUser.role,
            accountType: refreshedUser.accountType,
            professionalStatus: refreshedUser.professional?.status ?? null,
            activeProfileType: "PROFESSIONAL",
            availableProfiles: deriveAvailableProfiles(refreshedUser),
          };
        } catch (err) {
          console.error("[AUTH] Erro no authorize email-signup-draft:", err);
          return null;
        }
      },
    }),
    CredentialsProvider({
      id: "phone-otp-token",
      name: "Phone OTP",
      credentials: {
        token: { label: "Token", type: "text" },
      },
      async authorize(credentials) {
        if (credentials?.token) {
          const limit = await checkRateLimitAsync(`auth:phone-token:${credentials.token.slice(0, 32)}`, 20, 15 * 60 * 1000);
          if (!limit.allowed) return null;
        }
        const token = credentials?.token ? verifyPhoneAuthToken(credentials.token) : null;
        if (!token) return null;

        const user = await prisma.user.findUnique({
          where: { id: token.userId },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            accountType: true,
            phone: true,
            phoneVerified: true,
            phoneVerifiedAt: true,
            clientProfile: { select: { id: true } },
            hostProfile: { select: { id: true } },
            professional: { select: { id: true, status: true } },
            properties: { select: { status: true } },
            blocked: true,
          },
        });

        if (!user || user.blocked || user.phone !== token.phone || (!user.phoneVerified && !user.phoneVerifiedAt)) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          accountType: user.accountType,
          professionalStatus: user.professional?.status ?? null,
          activeProfileType: user.accountType === "host" ? "HOST" : user.accountType === "model" ? "PROFESSIONAL" : "CLIENTE",
          availableProfiles: deriveAvailableProfiles(user),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
        token.accountType = user.accountType;
        token.professionalStatus = user.professionalStatus ?? null;
        token.activeProfileType = user.activeProfileType ?? profileTypeFromIntent(null);
        token.availableProfiles = user.availableProfiles ?? ["CLIENTE"];
      }
      if (token.id) {
        try {
          const dbUser = await loadAuthContext(token.id as string);
          if (!dbUser) return invalidateAuthToken(token);
          {
            if (dbUser.blocked) {
              console.warn(`[JWT] Usuário bloqueado: ${token.id}`);
              return invalidateAuthToken(token);
            }
            token.name = dbUser.name;
            token.email = dbUser.email;
            token.picture = dbUser.image;
            const effectiveRole = dbUser.hasActiveAdminAssignment ? "ADMIN" : dbUser.role;
            token.role = effectiveRole;
            token.accountType = dbUser.accountType;
            token.clientStatus = dbUser.clientStatus;
            token.professionalStatus = dbUser.professionalStatus;
            token.adultVerified =
              dbUser.clientStatus === "VERIFIED" ||
              Boolean(dbUser.professionalVerified && dbUser.professionalKycStatus === "APPROVED") ||
              effectiveRole === "ADMIN";
            const profileShape = {
              role: effectiveRole,
              accountType: dbUser.accountType,
              clientProfile: dbUser.hasClientProfile ? {} : null,
              hostProfile: dbUser.hasHostProfile ? {} : null,
              professional: dbUser.professionalId ? {} : null,
              properties: dbUser.propertyStatuses.map((status) => ({ status })),
            };
            token.availableProfiles = deriveAvailableProfiles(profileShape);
            token.isProfessional = Boolean(dbUser.professionalId) || token.availableProfiles.includes("PROFESSIONAL");
            token.needsConsent = !dbUser.lgpdConsent || !dbUser.termsConsent || !dbUser.birthDate;
            token.hostStatus = getHostRegistrationStatus(profileShape);
            if (!token.activeProfileType || !token.availableProfiles.includes(token.activeProfileType)) {
              token.activeProfileType = token.availableProfiles.includes("CLIENTE") ? "CLIENTE" : token.availableProfiles[0];
            }
          }
        } catch (err) {
          console.error("[JWT] Erro ao buscar usuário no banco:", err);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.name = token.name as string | null;
        session.user.email = token.email as string | null;
        session.user.image = token.picture as string | null;
        session.user.role = token.role as string;
        session.user.accountType = token.accountType as string;
        session.user.clientStatus = token.clientStatus as string;
        session.user.professionalStatus = token.professionalStatus as string | null | undefined;
        session.user.isProfessional = token.isProfessional ?? false;
        session.user.needsConsent = token.needsConsent ?? false;
        session.user.hostStatus = token.hostStatus as string | undefined;
        session.user.activeProfileType = token.activeProfileType as string | undefined;
        session.user.availableProfiles = token.availableProfiles as string[] | undefined;
        session.user.adultVerified = token.adultVerified ?? false;
      }
      return session;
    },
  },
};

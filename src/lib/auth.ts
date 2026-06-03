import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { verifyPhoneAuthToken } from "./phone-otp";
import { createSupabaseServerClient } from "./supabase-server";
import { checkRateLimitAsync } from "./rate-limit";
import { getHostRegistrationStatus, normalizeEntryRole } from "./account-routes";
import { deriveAvailableProfiles, ensureProfileForIntent, profileTypeFromIntent } from "./account-profiles";

function accountTypeFromRoleIntent(roleIntent: ReturnType<typeof normalizeEntryRole>) {
  if (roleIntent === "profissional") return "model";
  if (roleIntent === "anfitriao") return "host";
  return null;
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
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              name: true,
              email: true,
              image: true,
              role: true,
              accountType: true,
              clientStatus: true,
              clientProfile: { select: { id: true } },
              hostProfile: { select: { id: true } },
              lgpdConsent: true,
              termsConsent: true,
              birthDate: true,
              professional: { select: { id: true, status: true } },
              properties: { select: { status: true } },
              blocked: true,
            },
          });
          if (dbUser) {
            if (dbUser.blocked) {
              console.warn(`[JWT] Usuário bloqueado: ${token.id}`);
              return null as unknown as typeof token;
            }
            token.name = dbUser.name;
            token.email = dbUser.email;
            token.picture = dbUser.image;
            token.role = dbUser.role;
            token.accountType = dbUser.accountType;
            token.clientStatus = dbUser.clientStatus;
            token.professionalStatus = dbUser.professional?.status ?? null;
            token.availableProfiles = deriveAvailableProfiles(dbUser);
            token.isProfessional = !!dbUser.professional || token.availableProfiles.includes("PROFESSIONAL");
            token.needsConsent = !dbUser.lgpdConsent || !dbUser.termsConsent || !dbUser.birthDate;
            token.hostStatus = getHostRegistrationStatus(dbUser);
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
      }
      return session;
    },
  },
};

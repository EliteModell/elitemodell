import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { createSupabaseServerClient } from "./supabase-server";

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
      },
      async authorize(credentials) {
        if (!credentials?.accessToken) return null;
        try {
          const supabase = createSupabaseServerClient();
          const { data, error } = await supabase.auth.getUser(credentials.accessToken);
          if (error || !data.user) return null;

          const authUser = data.user;
          const phone = authUser.phone?.replace(/\D/g, "").replace(/^55/, "");
          const email = authUser.email ?? (phone ? `phone_${phone}@sms.elitemodell.local` : null);

          if (!email) return null;
          const metadata = authUser.user_metadata ?? {};
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
          const birthDate =
            typeof metadata.birthDate === "string" && metadata.birthDate
              ? new Date(metadata.birthDate)
              : null;
          const hasConsent = Boolean(metadata.lgpdConsent && metadata.termsConsent);
          const isGoogleAuth =
            authUser.app_metadata?.provider === "google" ||
            Boolean(authUser.identities?.some((identity) => identity.provider === "google"));

          let user = await prisma.user.findFirst({
            where: {
              OR: [{ email }, ...(phone ? [{ phone }] : [])],
            },
          });

          if (!user) {
            if (!isGoogleAuth && (!birthDate || !hasConsent)) {
              return null;
            }

            const role = metadata.role === "HOST" ? "HOST" : "GUEST";
            const metadataCategory =
              typeof metadata.category === "string" ? metadata.category : undefined;
            const category = ["MULHER", "HOMEM", "TRANS"].includes(metadataCategory ?? "")
              ? (metadataCategory as "MULHER" | "HOMEM" | "TRANS")
              : null;
            const metadataClientStatus = metadata.clientStatus === "VERIFIED" ? "VERIFIED" as const : undefined;

            user = await prisma.user.create({
              data: {
                email,
                name: metadataName,
                image: metadataImage,
                phone: phone ?? null,
                emailVerified,
                role,
                category,
                birthDate,
                lgpdConsent: hasConsent,
                termsConsent: hasConsent,
                consentDate: hasConsent ? new Date() : null,
                ...(metadataClientStatus ? { clientStatus: metadataClientStatus, kycReviewedAt: new Date() } : {}),
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
            },
          });

          // Validar se usuário está bloqueado
          if (user.blocked) {
            console.warn(`[AUTH] Usuário bloqueado tentando acessar: ${user.id}`);
            return null;
          }

          return {
            id: user.id,
            name: user.name ?? metadataName,
            email: user.email,
            image: user.image ?? metadataImage,
            role: user.role,
          };
        } catch {
          return null;
        }
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
      }
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            name: true,
            email: true,
            image: true,
            role: true,
            clientStatus: true,
            professional: { select: { id: true } },
            blocked: true,
          },
        });
        if (dbUser) {
          // Validar bloqueio
          if (dbUser.blocked) {
            console.warn(`[JWT] Usuário bloqueado: ${token.id}`);
            return null as unknown as typeof token;
          }
          token.name = dbUser.name;
          token.email = dbUser.email;
          token.picture = dbUser.image;
          token.role = dbUser.role;
          token.clientStatus = dbUser.clientStatus;
          token.isProfessional = !!dbUser.professional;
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
        session.user.clientStatus = token.clientStatus as string;
        session.user.isProfessional = token.isProfessional ?? false;
      }
      return session;
    },
  },
};

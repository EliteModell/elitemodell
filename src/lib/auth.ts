import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { createSupabaseServerClient } from "./supabase-auth";

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

          let user = await prisma.user.findFirst({
            where: {
              OR: [{ email }, ...(phone ? [{ phone }] : [])],
            },
          });

          if (!user) {
            const metadata = authUser.user_metadata ?? {};
            const role = metadata.role === "HOST" ? "HOST" : "GUEST";
            const category = ["MULHER", "HOMEM", "TRANS"].includes(metadata.category)
              ? metadata.category
              : null;

            if (!metadata.birthDate || !metadata.lgpdConsent || !metadata.termsConsent) {
              return null;
            }

            user = await prisma.user.create({
              data: {
                email,
                name: metadata.name ?? authUser.email ?? phone ?? null,
                image: metadata.avatar_url ?? null,
                phone: phone ?? null,
                emailVerified: authUser.email_confirmed_at ? new Date(authUser.email_confirmed_at) : null,
                role,
                category,
                birthDate: new Date(metadata.birthDate),
                lgpdConsent: true,
                termsConsent: true,
                consentDate: new Date(),
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
              name: user.name ?? (authUser.user_metadata?.name as string | undefined) ?? null,
              image: user.image ?? (authUser.user_metadata?.avatar_url as string | undefined) ?? null,
              emailVerified:
                authUser.email_confirmed_at && !user.emailVerified
                  ? new Date(authUser.email_confirmed_at)
                  : user.emailVerified,
            },
          });

          // Validar se usuário está bloqueado
          if (user.blocked) {
            console.warn(`[AUTH] Usuário bloqueado tentando acessar: ${user.id}`);
            return null;
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role,
          } as any;
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
        token.role = (user as any).role;
      }
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { 
            role: true, 
            professional: { select: { id: true } },
            blocked: true,
          },
        });
        if (dbUser) {
          // Validar bloqueio
          if (dbUser.blocked) {
            console.warn(`[JWT] Usuário bloqueado: ${token.id}`);
            return null as any;
          }
          token.role = dbUser.role;
          token.isProfessional = !!dbUser.professional;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        (session.user as any).isProfessional = token.isProfessional ?? false;
      }
      return session;
    },
  },
};

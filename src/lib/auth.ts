import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      id: "firebase",
      name: "Firebase",
      credentials: {
        idToken: { label: "Firebase ID Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.idToken) return null;
        try {
          const { adminAuth } = await import("./firebase-admin");
          const decoded = await adminAuth.verifyIdToken(credentials.idToken);

          const email = decoded.email
            ?? `phone_${decoded.phone_number?.replace(/\D/g, "").replace(/^55/, "")}@sms.elitemodell.local`;

          const phone = decoded.phone_number
            ?.replace(/\D/g, "")
            .replace(/^55/, "");

          let user = await prisma.user.findFirst({
            where: {
              OR: [{ email }, ...(phone ? [{ phone }] : [])],
            },
          });

          if (!user) {
            user = await prisma.user.create({
              data: {
                email,
                name: decoded.name ?? null,
                image: decoded.picture ?? null,
                phone: phone ?? null,
                emailVerified: decoded.email_verified ? new Date() : null,
              },
            });
          } else {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                name: user.name ?? decoded.name ?? null,
                image: user.image ?? decoded.picture ?? null,
                emailVerified:
                  decoded.email_verified && !user.emailVerified
                    ? new Date()
                    : user.emailVerified,
              },
            });
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
      if (token.id && !token.role) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, professional: { select: { id: true } } },
        });
        if (dbUser) {
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

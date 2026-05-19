import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    role: string;
    accountType?: string;
    clientStatus?: string;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      accountType?: string;
      clientStatus?: string;
      isProfessional?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    accountType?: string;
    clientStatus?: string;
    isProfessional?: boolean;
    name?: string | null;
    email?: string | null;
    picture?: string | null;
  }
}

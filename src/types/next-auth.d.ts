import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    role: string;
    accountType?: string;
    clientStatus?: string;
    professionalStatus?: string | null;
    activeProfileType?: string;
    availableProfiles?: string[];
    adultVerified?: boolean;
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
      professionalStatus?: string | null;
      isProfessional?: boolean;
      needsConsent?: boolean;
      hostStatus?: string;
      activeProfileType?: string;
      availableProfiles?: string[];
      adultVerified?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    accountType?: string;
    clientStatus?: string;
    professionalStatus?: string | null;
    isProfessional?: boolean;
    needsConsent?: boolean;
    hostStatus?: string;
    activeProfileType?: string;
    availableProfiles?: string[];
    adultVerified?: boolean;
    name?: string | null;
    email?: string | null;
    picture?: string | null;
  }
}

export type CadastroTipo = "cliente" | "acompanhante" | "anfitriao";
export type InternalAccountType = "GUEST" | "PROFESSIONAL" | "PROPERTY_HOST";

export const ACCOUNT_ROUTES = {
  login: "/login",
  cadastro: "/cadastro",
  cadastroCliente: "/app/consumer/register",
  verificarTelefoneCliente: "/app/consumer/verify-phone",
  loginCliente: "/app/consumer/login",
  cadastroAcompanhante: "/cadastro-modelo",
  cadastroAnfitriao: "/cadastro-anfitriao",
  verificarTelefoneAnfitriao: "/cadastro-anfitriao/verificar-telefone",
  painelCliente: "/painel/cliente",
  painelAcompanhante: "/painel/acompanhante",
  painelAnfitriao: "/painel/anfitriao",
  dashboardCliente: "/dashboard",
  mainClientFeed: "/dashboard/acompanhantes",
  dashboardAcompanhante: "/profissional",
  dashboardAnfitriao: "/anfitriao",
  verificacaoAcompanhante: "/verificacao/acompanhante",
  verificacaoAnfitriao: "/verificacao/anfitriao",
  onboardingAcompanhante: "/profissional/novo",
  onboardingAnfitriao: "/anfitriao/imoveis/novo",
  admin: "/admin",
} as const;

export const PROFESSIONAL_CATEGORIES = ["MULHER", "HOMEM", "TRANS"] as const;

export function isProfessionalCategory(value: string | null | undefined) {
  return (PROFESSIONAL_CATEGORIES as readonly string[]).includes(value ?? "");
}

export function normalizeCadastroTipo(value: string | null): CadastroTipo | null {
  if (!value) return null;
  const normalized = value.toLowerCase();

  if (["cliente", "client", "guest"].includes(normalized)) return "cliente";
  if (["acompanhante", "profissional", "professional", "anunciante"].includes(normalized)) {
    return "acompanhante";
  }
  if (["anfitriao", "anfitrião", "imovel", "imóvel", "quarto", "host"].includes(normalized)) {
    return "anfitriao";
  }

  return null;
}

export function internalAccountTypeFromTipo(tipo: CadastroTipo): InternalAccountType {
  if (tipo === "acompanhante") return "PROFESSIONAL";
  if (tipo === "anfitriao") return "PROPERTY_HOST";
  return "GUEST";
}

export function cadastroHref(tipo: CadastroTipo) {
  if (tipo === "acompanhante") return ACCOUNT_ROUTES.cadastroAcompanhante;
  if (tipo === "anfitriao") return ACCOUNT_ROUTES.cadastroAnfitriao;
  return ACCOUNT_ROUTES.cadastroCliente;
}

type PostLoginUser = {
  role?: string | null;
  accountType?: string | null;
  category?: string | null;
  professional?: { status?: string | null } | null;
  properties?: Array<{ status?: string | null }> | null;
  redirectTo?: string | null;
};

export function postLoginPathFromUser(user: PostLoginUser | null | undefined) {
  if (!user) return ACCOUNT_ROUTES.mainClientFeed;
  if (user.redirectTo) return user.redirectTo;
  if (user.role === "ADMIN") return ACCOUNT_ROUTES.admin;

  const professionalStatus = user.professional?.status;
  const isModelAccount = user.accountType === "model";
  const isHostAccount = user.accountType === "host";
  const isProfessionalIntent = isProfessionalCategory(user.category);
  if (professionalStatus === "ACTIVE") return ACCOUNT_ROUTES.painelAcompanhante;
  if (!professionalStatus && (isProfessionalIntent || isModelAccount)) return ACCOUNT_ROUTES.onboardingAcompanhante;
  if (professionalStatus || isProfessionalIntent || isModelAccount) return ACCOUNT_ROUTES.verificacaoAcompanhante;

  const properties = user.properties ?? [];
  if (properties.some((property) => property.status === "ACTIVE")) return ACCOUNT_ROUTES.painelAnfitriao;
  if (properties.length > 0) return ACCOUNT_ROUTES.verificacaoAnfitriao;
  if (user.role === "HOST" || isHostAccount) return ACCOUNT_ROUTES.onboardingAnfitriao;

  return ACCOUNT_ROUTES.mainClientFeed;
}

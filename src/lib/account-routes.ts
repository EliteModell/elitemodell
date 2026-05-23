export type CadastroTipo = "cliente" | "acompanhante" | "anfitriao";
export type InternalAccountType = "GUEST" | "PROFESSIONAL" | "PROPERTY_HOST";
export type EntryAccountRole = "cliente" | "profissional" | "anfitriao";

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
const APPROVED_HOST_STATUSES = ["ACTIVE"] as const;
const SUBMITTED_HOST_STATUSES = ["PENDING_REVIEW", "ACTIVE", "INACTIVE", "REJECTED"] as const;

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
  if (tipo === "anfitriao") return ACCOUNT_ROUTES.onboardingAnfitriao;
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

export type HostRegistrationStatus =
  | "NO_REQUEST"
  | "CADASTRO_INCOMPLETO"
  | "PENDENTE_APROVACAO"
  | "APROVADO"
  | "REPROVADO";

export function getHostRegistrationStatus(user: Pick<PostLoginUser, "role" | "accountType" | "properties"> | null | undefined): HostRegistrationStatus {
  if (!user) return "NO_REQUEST";
  const properties = user.properties ?? [];
  const statuses = properties.map((property) => property.status).filter(Boolean);
  const isApprovedHostIdentity = user.role === "HOST" || user.accountType === "host";

  if (isApprovedHostIdentity && statuses.some((status) => APPROVED_HOST_STATUSES.includes(status as typeof APPROVED_HOST_STATUSES[number]))) {
    return "APROVADO";
  }

  if (statuses.includes("REJECTED")) return "REPROVADO";
  if (statuses.some((status) => status && SUBMITTED_HOST_STATUSES.includes(status as typeof SUBMITTED_HOST_STATUSES[number]))) {
    return "PENDENTE_APROVACAO";
  }
  if (properties.length > 0) return "CADASTRO_INCOMPLETO";
  return "NO_REQUEST";
}

export function hostPathForStatus(status: HostRegistrationStatus) {
  if (status === "APROVADO") return ACCOUNT_ROUTES.dashboardAnfitriao;
  if (status === "PENDENTE_APROVACAO" || status === "REPROVADO") return ACCOUNT_ROUTES.verificacaoAnfitriao;
  return ACCOUNT_ROUTES.onboardingAnfitriao;
}

export function loginHrefForRole(role: EntryAccountRole) {
  return `${ACCOUNT_ROUTES.login}?role=${role}`;
}

export function cadastroHrefForRole(role: EntryAccountRole) {
  if (role === "profissional") return ACCOUNT_ROUTES.cadastroAcompanhante;
  if (role === "anfitriao") return ACCOUNT_ROUTES.onboardingAnfitriao;
  // Clientes vão para o form de e-mail/senha (/cadastro)
  // que é a mesma tela acessível via "Entrar → não tem conta"
  return ACCOUNT_ROUTES.cadastro;
}

export function normalizeEntryRole(value: string | null): EntryAccountRole | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (["cliente", "client", "guest"].includes(normalized)) return "cliente";
  if (["profissional", "acompanhante", "professional", "model", "modelo"].includes(normalized)) return "profissional";
  if (["anfitriao", "anfitrião", "host", "imovel", "imóvel"].includes(normalized)) return "anfitriao";
  return null;
}

export function postLoginPathFromUser(user: PostLoginUser | null | undefined, intent?: EntryAccountRole | null) {
  if (!user) return ACCOUNT_ROUTES.dashboardCliente;
  if (user.redirectTo && !intent) return user.redirectTo;
  if (user.role === "ADMIN") return ACCOUNT_ROUTES.admin;

  const professionalStatus = user.professional?.status;
  const isModelAccount = user.accountType === "model";
  const isProfessionalIntent = isProfessionalCategory(user.category);
  const properties = user.properties ?? [];
  const hostStatus = getHostRegistrationStatus(user);

  if (intent === "cliente") return ACCOUNT_ROUTES.dashboardCliente;

  if (intent === "profissional") {
    if (professionalStatus === "ACTIVE") return ACCOUNT_ROUTES.dashboardAcompanhante;
    if (!professionalStatus) return ACCOUNT_ROUTES.onboardingAcompanhante;
    return ACCOUNT_ROUTES.verificacaoAcompanhante;
  }

  if (intent === "anfitriao") {
    return hostPathForStatus(hostStatus);
  }

  if (professionalStatus === "ACTIVE") return ACCOUNT_ROUTES.dashboardAcompanhante;
  if (!professionalStatus && (isProfessionalIntent || isModelAccount)) return ACCOUNT_ROUTES.onboardingAcompanhante;
  if (professionalStatus || isProfessionalIntent || isModelAccount) return ACCOUNT_ROUTES.verificacaoAcompanhante;

  if (hostStatus !== "NO_REQUEST") return hostPathForStatus(hostStatus);

  return ACCOUNT_ROUTES.dashboardCliente;
}

export function accountHomePathFromSession(sessionUser: {
  role?: string | null;
  accountType?: string | null;
  isProfessional?: boolean | null;
  hostStatus?: string | null;
} | null | undefined) {
  if (!sessionUser) return ACCOUNT_ROUTES.dashboardCliente;
  if (sessionUser.role === "ADMIN") return ACCOUNT_ROUTES.admin;
  if (sessionUser.isProfessional || sessionUser.accountType === "model" || sessionUser.accountType === "professional") {
    return ACCOUNT_ROUTES.dashboardAcompanhante;
  }
  if (sessionUser.hostStatus && sessionUser.hostStatus !== "NO_REQUEST") {
    return hostPathForStatus(sessionUser.hostStatus as HostRegistrationStatus);
  }
  return ACCOUNT_ROUTES.dashboardCliente;
}

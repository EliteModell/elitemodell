export type CadastroTipo = "cliente" | "acompanhante" | "anfitriao";
export type InternalAccountType = "GUEST" | "PROFESSIONAL" | "PROPERTY_HOST";
export type EntryAccountRole = "cliente" | "profissional" | "anfitriao";

export const ACCOUNT_ROUTES = {
  login: "/login",
  cadastro: "/cadastro",
  cadastroCliente: "/app/consumer/register",
  verificarTelefoneCliente: "/app/consumer/verify-phone",
  loginCliente: "/app/consumer/login",
  cadastroAcompanhante: "/profissional/novo",
  cadastroAnfitriao: "/cadastro-anfitriao",
  verificarTelefoneAnfitriao: "/cadastro-anfitriao/verificar-telefone",
  painelCliente: "/painel/cliente",
  painelAcompanhante: "/painel/acompanhante",
  painelAnfitriao: "/painel/anfitriao",
  dashboardCliente: "/dashboard",
  mainClientFeed: "/dashboard/acompanhantes",
  dashboardAcompanhante: "/profissional",
  dashboardAnfitriao: "/anfitriao",
  verificacaoAcompanhante: "/profissional/analise",
  verificacaoAnfitriao: "/verificacao/anfitriao",
  onboardingAcompanhante: "/profissional/novo",
  analiseAcompanhante: "/profissional/analise",
  onboardingAnfitriao: "/anfitriao/imoveis/novo",
  admin: "/admin",
} as const;

export const PROFESSIONAL_CATEGORIES = ["MULHER", "HOMEM", "TRANS"] as const;
const APPROVED_HOST_STATUSES = ["ACTIVE"] as const;
const SUBMITTED_HOST_STATUSES = ["PENDING_REVIEW", "ACTIVE", "INACTIVE", "REJECTED"] as const;

export function isProfessionalCategory(value: string | null | undefined) {
  return (PROFESSIONAL_CATEGORIES as readonly string[]).includes(value ?? "");
}

export function isHostAccountType(value: string | null | undefined) {
  return ["host", "property_host", "PROPERTY_HOST"].includes(value ?? "");
}

export function normalizeCadastroTipo(value: string | null): CadastroTipo | null {
  if (!value) return null;
  const normalized = value.toLowerCase();

  if (["cliente", "client", "guest"].includes(normalized)) return "cliente";
  if (["ac", "acompanhante", "profissional", "professional", "anunciante"].includes(normalized)) {
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
  if (tipo === "acompanhante") return ACCOUNT_ROUTES.onboardingAcompanhante;
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

  if (statuses.some((status) => APPROVED_HOST_STATUSES.includes(status as typeof APPROVED_HOST_STATUSES[number]))) {
    return "APROVADO";
  }

  if (statuses.includes("REJECTED")) return "REPROVADO";
  if (statuses.some((status) => status && SUBMITTED_HOST_STATUSES.includes(status as typeof SUBMITTED_HOST_STATUSES[number]))) {
    return "PENDENTE_APROVACAO";
  }
  if (properties.length > 0) return "CADASTRO_INCOMPLETO";
  if (isHostAccountType(user.accountType)) return "CADASTRO_INCOMPLETO";
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
  if (role === "profissional") return `${ACCOUNT_ROUTES.cadastro}?tipo=acompanhante`;
  if (role === "anfitriao") return ACCOUNT_ROUTES.onboardingAnfitriao;
  return `${ACCOUNT_ROUTES.cadastro}?tipo=cliente`;
}

export function normalizeEntryRole(value: string | null): EntryAccountRole | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (["cliente", "client", "guest"].includes(normalized)) return "cliente";
  if (["ac", "profissional", "acompanhante", "professional", "model", "modelo"].includes(normalized)) return "profissional";
  if (["anfitriao", "anfitrião", "host", "imovel", "imóvel"].includes(normalized)) return "anfitriao";
  return null;
}

export function postLoginPathFromUser(user: PostLoginUser | null | undefined, intent?: EntryAccountRole | null) {
  if (!user) return ACCOUNT_ROUTES.dashboardCliente;
  if (user.redirectTo && !intent) return user.redirectTo;

  const professionalStatus = user.professional?.status;
  const isModelAccount = user.accountType === "model";
  const isProfessionalIntent = isProfessionalCategory(user.category);
  const hostStatus = getHostRegistrationStatus(user);

  if (user.role === "ADMIN") return ACCOUNT_ROUTES.admin;
  if (professionalStatus && professionalStatus !== "ACTIVE" && professionalStatus !== "PAUSED") {
    return professionalStatus === "DRAFT" ? ACCOUNT_ROUTES.onboardingAcompanhante : ACCOUNT_ROUTES.analiseAcompanhante;
  }

  if (intent === "cliente") return ACCOUNT_ROUTES.dashboardCliente;

  if (intent === "profissional") {
    if (professionalStatus === "ACTIVE" || professionalStatus === "PAUSED") return ACCOUNT_ROUTES.dashboardAcompanhante;
    if (!professionalStatus || professionalStatus === "DRAFT") return ACCOUNT_ROUTES.onboardingAcompanhante;
    return ACCOUNT_ROUTES.verificacaoAcompanhante;
  }

  if (intent === "anfitriao") {
    return hostPathForStatus(hostStatus);
  }

  if (professionalStatus === "ACTIVE" || professionalStatus === "PAUSED") return ACCOUNT_ROUTES.dashboardAcompanhante;
  if (professionalStatus === "DRAFT") return ACCOUNT_ROUTES.onboardingAcompanhante;
  if (!professionalStatus && (isProfessionalIntent || isModelAccount)) return ACCOUNT_ROUTES.onboardingAcompanhante;
  if (professionalStatus || isProfessionalIntent || isModelAccount) return ACCOUNT_ROUTES.verificacaoAcompanhante;

  if (hostStatus !== "NO_REQUEST" || isHostAccountType(user.accountType)) return hostPathForStatus(hostStatus);

  return ACCOUNT_ROUTES.dashboardCliente;
}

export function accountHomePathFromSession(sessionUser: {
  role?: string | null;
  accountType?: string | null;
  isProfessional?: boolean | null;
  professionalStatus?: string | null;
  hostStatus?: string | null;
  activeProfileType?: string | null;
} | null | undefined) {
  if (!sessionUser) return ACCOUNT_ROUTES.dashboardCliente;
  if (sessionUser.role === "ADMIN") return ACCOUNT_ROUTES.admin;
  if (sessionUser.professionalStatus && sessionUser.professionalStatus !== "ACTIVE" && sessionUser.professionalStatus !== "PAUSED") {
    return sessionUser.professionalStatus === "DRAFT" ? ACCOUNT_ROUTES.onboardingAcompanhante : ACCOUNT_ROUTES.analiseAcompanhante;
  }
  if (sessionUser.activeProfileType === "CLIENTE") return ACCOUNT_ROUTES.dashboardCliente;
  if (sessionUser.activeProfileType === "PROFESSIONAL") {
    if (sessionUser.professionalStatus === "ACTIVE" || sessionUser.professionalStatus === "PAUSED") {
      return ACCOUNT_ROUTES.dashboardAcompanhante;
    }
    if (!sessionUser.professionalStatus || sessionUser.professionalStatus === "DRAFT") {
      return ACCOUNT_ROUTES.onboardingAcompanhante;
    }
    return ACCOUNT_ROUTES.verificacaoAcompanhante;
  }
  if (sessionUser.activeProfileType === "HOST") {
    return hostPathForStatus((sessionUser.hostStatus ?? "CADASTRO_INCOMPLETO") as HostRegistrationStatus);
  }
  if (sessionUser.isProfessional || sessionUser.accountType === "model" || sessionUser.accountType === "professional") {
    if (!sessionUser.professionalStatus || sessionUser.professionalStatus === "DRAFT") return ACCOUNT_ROUTES.onboardingAcompanhante;
    if (sessionUser.professionalStatus !== "ACTIVE" && sessionUser.professionalStatus !== "PAUSED") return ACCOUNT_ROUTES.verificacaoAcompanhante;
    return ACCOUNT_ROUTES.dashboardAcompanhante;
  }
  if (sessionUser.hostStatus && sessionUser.hostStatus !== "NO_REQUEST") {
    return hostPathForStatus(sessionUser.hostStatus as HostRegistrationStatus);
  }
  if (isHostAccountType(sessionUser.accountType)) return ACCOUNT_ROUTES.onboardingAnfitriao;
  return ACCOUNT_ROUTES.dashboardCliente;
}

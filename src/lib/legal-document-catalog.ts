export const LEGAL_DOCUMENT_STATUSES = [
  "DRAFT_INTERNAL",
  "READY_FOR_LEGAL_REVIEW",
  "LEGAL_REVIEW_REQUESTED",
  "OPERATIONAL_PUBLISHED_PENDING_LEGAL_RATIFICATION",
  "LEGAL_APPROVED",
  "COMPANY_APPROVED",
  "PUBLISHED",
  "SUPERSEDED",
  "REVOKED",
] as const;

export type LegalDocumentStatus = (typeof LEGAL_DOCUMENT_STATUSES)[number];

export const CURRENT_LEGAL_REVIEW_STATUS = "READY_FOR_LEGAL_REVIEW" satisfies LegalDocumentStatus;
export const OPERATIONAL_LEGAL_STATUS =
  "OPERATIONAL_PUBLISHED_PENDING_LEGAL_RATIFICATION" satisfies LegalDocumentStatus;

export const PUBLIC_LEGAL_STATUSES = [
  OPERATIONAL_LEGAL_STATUS,
  "PUBLISHED",
] as const satisfies readonly LegalDocumentStatus[];

export const LEGAL_CHANNELS = {
  support: "suporte@elitemodell.com.br",
  admin: "admin@elitemodell.com.br",
  finance: "financeiro@elitemodell.com.br",
  privacy: "privacidade@elitemodell.com.br",
  security: "seguranca@elitemodell.com.br",
  legalPending: "[CRIAR/CONFIRMAR juridico@elitemodell.com.br]",
} as const;

export type LegalDocumentCatalogEntry = {
  key: string;
  title: string;
  audience: string;
  publicDocument: boolean;
  placement: readonly string[];
};

export const LEGAL_DOCUMENT_CATALOG = [
  { key: "terms-general", title: "Termos de Uso Gerais", audience: "Todos", publicDocument: true, placement: ["rodape", "cadastro-login"] },
  { key: "terms-clients", title: "Termos para Clientes", audience: "Cliente", publicDocument: true, placement: ["cliente"] },
  { key: "terms-professionals", title: "Termos para Profissionais", audience: "Profissional", publicDocument: true, placement: ["profissional"] },
  { key: "terms-hosts", title: "Termos para Anfitrioes", audience: "Anfitriao", publicDocument: true, placement: ["anfitriao"] },
  { key: "privacy-policy", title: "Politica de Privacidade", audience: "Todos", publicDocument: true, placement: ["rodape", "cadastro-login", "cliente", "profissional"] },
  { key: "cookies-policy", title: "Politica de Cookies", audience: "Todos", publicDocument: true, placement: ["rodape"] },
  { key: "identity-biometric-policy", title: "Politica de Verificacao de Identidade e Biometria", audience: "Anunciantes", publicDocument: true, placement: ["profissional"] },
  { key: "content-policy", title: "Politica de Conteudo", audience: "Todos", publicDocument: true, placement: ["rodape", "profissional", "upload"] },
  { key: "community-rules", title: "Regras da Comunidade", audience: "Todos", publicDocument: true, placement: ["rodape"] },
  { key: "moderation-reporting-policy", title: "Politica de Moderacao e Denuncia", audience: "Todos", publicDocument: true, placement: ["rodape", "cliente", "profissional"] },
  { key: "adult-safety-policy", title: "Politica de Maioridade e Protecao contra Exploracao", audience: "Todos", publicDocument: true, placement: ["rodape", "cadastro-login", "upload"] },
  { key: "fraud-prevention-policy", title: "Politica de Prevencao a Fraudes", audience: "Todos", publicDocument: true, placement: ["checkout", "admin-juridico"] },
  { key: "roleta-promocional-policy", title: "Politica da Roleta Promocional", audience: "Participantes da roleta", publicDocument: true, placement: ["rodape", "cliente", "roleta-promocional", "admin-juridico"] },
  { key: "payments-policy", title: "Politica de Pagamentos", audience: "Todos", publicDocument: true, placement: ["cliente", "anfitriao", "checkout"] },
  { key: "boost-terms", title: "Termos dos Destaques", audience: "Profissional", publicDocument: true, placement: ["profissional"] },
  { key: "refund-policy", title: "Politica de Cancelamento e Reembolso", audience: "Todos", publicDocument: true, placement: ["cliente", "anfitriao", "checkout"] },
  { key: "professional-free-period", title: "Politica do Periodo Gratuito", audience: "Profissional", publicDocument: true, placement: ["profissional"] },
  { key: "retention-deletion-policy", title: "Politica de Retencao e Exclusao", audience: "Todos", publicDocument: true, placement: ["privacidade"] },
  { key: "data-subject-rights", title: "Procedimento de Direitos LGPD", audience: "Todos", publicDocument: true, placement: ["privacidade"] },
  { key: "incident-response-plan", title: "Plano de Resposta a Incidentes", audience: "Interno", publicDocument: false, placement: ["admin-juridico"] },
  { key: "access-control-policy", title: "Politica Interna de Controle de Acesso", audience: "Interno", publicDocument: false, placement: ["admin-juridico"] },
  { key: "information-security-policy", title: "Politica Interna de Seguranca", audience: "Interno", publicDocument: false, placement: ["admin-juridico"] },
  { key: "admin-moderator-policy", title: "Politica Interna de Administradores e Moderadores", audience: "Interno", publicDocument: false, placement: ["admin-juridico"] },
  { key: "operator-agreement-template", title: "Modelo de Contrato com Operadores", audience: "Interno", publicDocument: false, placement: ["admin-juridico"] },
  { key: "registration-short-notice", title: "Aviso Resumido de Cadastro", audience: "Todos", publicDocument: true, placement: ["cadastro-login"] },
  { key: "biometric-notice", title: "Aviso de Biometria", audience: "Anunciantes", publicDocument: true, placement: ["profissional"] },
  { key: "document-upload-notice", title: "Aviso de Documentos", audience: "Anunciantes", publicDocument: true, placement: ["profissional"] },
  { key: "content-publication-notice", title: "Aviso de Publicacao de Conteudo", audience: "Profissional", publicDocument: true, placement: ["upload"] },
  { key: "checkout-notice", title: "Aviso de Checkout", audience: "Comprador", publicDocument: true, placement: ["checkout"] },
  { key: "adult-declaration", title: "Confirmacao de Maioridade", audience: "Todos", publicDocument: true, placement: ["rodape", "cadastro-login"] },
  { key: "content-authorization-declaration", title: "Declaracao de Autoria e Autorizacao", audience: "Publicador", publicDocument: true, placement: ["upload"] },
  { key: "privacy-officer-appointment-act", title: "Ato Formal de Designacao do Responsavel Operacional", audience: "Interno", publicDocument: false, placement: ["admin-juridico"] },
] as const satisfies readonly LegalDocumentCatalogEntry[];

export const PUBLIC_FOOTER_LEGAL_LINKS = [
  { label: "Termos de Uso Gerais", href: "/terms", key: "terms-general" },
  { label: "Politica de Privacidade", href: "/privacy", key: "privacy-policy" },
  { label: "Politica de Cookies", href: "/documentos/cookies-policy", key: "cookies-policy" },
  { label: "Regras da Comunidade", href: "/documentos/community-rules", key: "community-rules" },
  { label: "Politica de Conteudo", href: "/politica-conteudo", key: "content-policy" },
  { label: "Moderacao e Denuncia", href: "/documentos/moderation-reporting-policy", key: "moderation-reporting-policy" },
  { label: "Maioridade e Protecao", href: "/documentos/adult-safety-policy", key: "adult-safety-policy" },
  { label: "Roleta Promocional", href: "/documentos/roleta-promocional-policy", key: "roleta-promocional-policy" },
  { label: "Confirmacao de Maioridade", href: "/documentos/adult-declaration", key: "adult-declaration" },
] as const;

export const ROLE_LEGAL_DOCUMENT_PLACEMENTS = {
  cadastroLogin: ["terms-general", "privacy-policy", "adult-declaration", "registration-short-notice"],
  cliente: ["terms-clients", "privacy-policy", "adult-declaration", "payments-policy", "refund-policy", "moderation-reporting-policy"],
  profissional: [
    "terms-professionals",
    "identity-biometric-policy",
    "document-upload-notice",
    "biometric-notice",
    "content-publication-notice",
    "content-authorization-declaration",
    "content-policy",
    "moderation-reporting-policy",
  ],
  anfitriao: ["terms-hosts", "payments-policy", "refund-policy"],
  checkout: ["checkout-notice", "payments-policy", "refund-policy"],
  roletaPromocional: ["roleta-promocional-policy"],
  upload: ["content-policy", "content-publication-notice", "content-authorization-declaration", "adult-safety-policy"],
  adminJuridico: LEGAL_DOCUMENT_CATALOG.map((document) => document.key),
} as const;

export function legalDocumentRoute(key: string) {
  return `/documentos/${key}`;
}

export function publicLegalDocument(key: string) {
  const document = LEGAL_DOCUMENT_CATALOG.find((entry) => entry.key === key);
  return document && document.publicDocument ? document : null;
}

export function requiresContentAuthorizationDeclaration(folder: string) {
  return ["properties", "profiles", "profile-videos", "stories"].some((prefix) => folder.startsWith(prefix));
}

export function canPublishLegalVersion(input: {
  status: string | null | undefined;
  internal: boolean;
  version: string | null | undefined;
  contentHash: string | null | undefined;
  effectiveAt: Date | string | null | undefined;
  legalReviewerName: string | null | undefined;
  legalReviewReference: string | null | undefined;
  companyApproved: boolean;
  pendingFields?: unknown;
}) {
  const pendingFields = Array.isArray(input.pendingFields) ? input.pendingFields : [];
  return (
    !input.internal &&
    input.status === "COMPANY_APPROVED" &&
    Boolean(input.version) &&
    Boolean(input.contentHash) &&
    Boolean(input.effectiveAt) &&
    Boolean(input.legalReviewerName) &&
    Boolean(input.legalReviewReference) &&
    input.companyApproved &&
    pendingFields.length === 0
  );
}

export function canCollectLegalAcceptance(
  input: {
    status: string | null | undefined;
    internal: boolean;
    effectiveAt: Date | string | null | undefined;
    publishedAt: Date | string | null | undefined;
  },
  now = new Date(),
) {
  const effectiveAt = input.effectiveAt ? new Date(input.effectiveAt) : null;
  const publishedAt = input.publishedAt ? new Date(input.publishedAt) : null;

  return (
    !input.internal &&
    PUBLIC_LEGAL_STATUSES.includes(input.status as (typeof PUBLIC_LEGAL_STATUSES)[number]) &&
    Boolean(publishedAt && !Number.isNaN(publishedAt.getTime())) &&
    Boolean(effectiveAt && !Number.isNaN(effectiveAt.getTime()) && effectiveAt <= now)
  );
}

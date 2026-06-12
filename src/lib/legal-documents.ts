import "server-only";

import { createHash } from "crypto";
import { PRIVACY_MODERATION_APPOINTMENT_MINUTE } from "@/lib/internal-governance-minutes";
import { CURRENT_LEGAL_REVIEW_STATUS, LEGAL_CHANNELS } from "@/lib/legal-document-catalog";
import { ROULETTE_PROMOTION_POLICY } from "@/lib/roulette-promotion-policy";

export const LEGAL_DOCUMENT_DEFINITIONS = [
  ["terms-general", "Termos de Uso Gerais", "TERMS", "ALL", false],
  ["terms-clients", "Termos para Clientes", "TERMS", "CLIENT", false],
  ["terms-professionals", "Termos para Profissionais", "TERMS", "PROFESSIONAL", false],
  ["terms-hosts", "Termos para Anfitrioes", "TERMS", "HOST", false],
  ["privacy-policy", "Politica de Privacidade", "PRIVACY", "ALL", false],
  ["cookies-policy", "Politica de Cookies", "COOKIES", "ALL", false],
  ["identity-biometric-policy", "Politica de Verificacao de Identidade e Biometria", "KYC", "ADVERTISER", false],
  ["content-policy", "Politica de Conteudo", "CONTENT", "ALL", false],
  ["community-rules", "Regras da Comunidade", "COMMUNITY", "ALL", false],
  ["moderation-reporting-policy", "Politica de Moderacao e Denuncia", "MODERATION", "ALL", false],
  ["adult-safety-policy", "Politica de Maioridade e Protecao contra Exploracao", "SAFETY", "ALL", false],
  ["fraud-prevention-policy", "Politica de Prevencao a Fraudes", "FRAUD", "ALL", false],
  [
    ROULETTE_PROMOTION_POLICY.key,
    ROULETTE_PROMOTION_POLICY.title,
    ROULETTE_PROMOTION_POLICY.type,
    ROULETTE_PROMOTION_POLICY.audience,
    ROULETTE_PROMOTION_POLICY.internal,
  ],
  ["payments-policy", "Politica de Pagamentos", "PAYMENTS", "ALL", false],
  ["boost-terms", "Termos dos Destaques", "BOOSTS", "PROFESSIONAL", false],
  ["refund-policy", "Politica de Cancelamento e Reembolso", "REFUNDS", "ALL", false],
  ["professional-free-period", "Politica do Periodo Gratuito", "TRIAL", "PROFESSIONAL", false],
  ["retention-deletion-policy", "Politica de Retencao e Exclusao", "RETENTION", "ALL", false],
  ["data-subject-rights", "Procedimento de Direitos LGPD", "PRIVACY_RIGHTS", "ALL", false],
  ["incident-response-plan", "Plano de Resposta a Incidentes", "INCIDENTS", "INTERNAL", true],
  ["access-control-policy", "Politica Interna de Controle de Acesso", "ACCESS_CONTROL", "INTERNAL", true],
  ["information-security-policy", "Politica Interna de Seguranca", "SECURITY", "INTERNAL", true],
  ["admin-moderator-policy", "Politica Interna de Administradores e Moderadores", "ADMIN", "INTERNAL", true],
  ["operator-agreement-template", "Modelo de Contrato com Operadores", "DPA", "INTERNAL", true],
  ["registration-short-notice", "Aviso Resumido de Cadastro", "NOTICE", "ALL", false],
  ["biometric-notice", "Aviso de Biometria", "NOTICE", "ADVERTISER", false],
  ["document-upload-notice", "Aviso de Documentos", "NOTICE", "ADVERTISER", false],
  ["content-publication-notice", "Aviso de Publicacao de Conteudo", "NOTICE", "PROFESSIONAL", false],
  ["checkout-notice", "Aviso de Checkout", "NOTICE", "BUYER", false],
  ["adult-declaration", "Confirmacao de Maioridade", "DECLARATION", "ALL", false],
  ["content-authorization-declaration", "Declaracao de Autoria e Autorizacao", "DECLARATION", "PUBLISHER", false],
  [
    PRIVACY_MODERATION_APPOINTMENT_MINUTE.key,
    PRIVACY_MODERATION_APPOINTMENT_MINUTE.name,
    PRIVACY_MODERATION_APPOINTMENT_MINUTE.type,
    PRIVACY_MODERATION_APPOINTMENT_MINUTE.audience,
    PRIVACY_MODERATION_APPOINTMENT_MINUTE.internal,
  ],
] as const;

export const REQUIRED_LEGAL_FIELDS = [
  "LEGAL_COMPANY_NAME",
  "LEGAL_TRADE_NAME",
  "LEGAL_CNPJ",
  "LEGAL_ADDRESS",
  "LEGAL_SUPPORT_EMAIL",
  "LEGAL_PRIVACY_EMAIL",
  "LEGAL_PRIVACY_CONTACT",
] as const;

const CONFIRMED_LEGAL_DEFAULTS: Partial<Record<(typeof REQUIRED_LEGAL_FIELDS)[number], string>> = {
  LEGAL_COMPANY_NAME: "ELITE MODEL LTDA",
  LEGAL_TRADE_NAME: "Elite Modell",
  LEGAL_CNPJ: "66.807.135/0001-71",
  LEGAL_ADDRESS: "Rua Joao Machado, nº 834, Fundos, Centro, Pompeu/MG, CEP 35.640-000",
  LEGAL_SUPPORT_EMAIL: LEGAL_CHANNELS.support,
  LEGAL_PRIVACY_EMAIL: LEGAL_CHANNELS.privacy,
  LEGAL_PRIVACY_CONTACT: "BRUNO MORAES DA ROCHA",
};

const PUBLICATION_APPROVAL_BLOCKERS = [
  "LEGAL_REVIEW_APPROVAL",
  "COMPANY_APPROVAL",
  "EFFECTIVE_DATE",
  "FINAL_TEXT_APPROVED_BY_LAWYER",
] as const;

export function legalFieldValue(key: (typeof REQUIRED_LEGAL_FIELDS)[number]) {
  return process.env[key] || CONFIRMED_LEGAL_DEFAULTS[key] || "";
}

export function legalPendingFields() {
  return REQUIRED_LEGAL_FIELDS.filter((key) => !legalFieldValue(key));
}

function proposalAppendix(key: string) {
  if (["moderation-reporting-policy", "admin-moderator-policy"].includes(key)) {
    return `## Proposta operacional de moderacao

- denuncia comum: triagem em ate 2 dias uteis;
- possivel menor, exploracao, coercao, trafico, imagem nao autorizada ou risco fisico: ocultacao cautelar imediata e analise prioritaria;
- fraude: suspensao cautelar quando houver evidencia suficiente;
- exclusao definitiva: justificativa obrigatoria;
- casos juridicamente sensiveis: encaminhamento para advogada;
- todas as acoes: auditoria, preservacao de evidencia e comunicacao conforme a matriz de autoridade.

Responsavel operacional: BRUNO MORAES DA ROCHA.
Limites de autoridade, segundo aprovador, socio, juridico, horarios e substituto permanecem pendentes de aprovacao.
`;
  }
  if (["payments-policy", "terms-hosts"].includes(key)) {
    return `## PROPOSTA PENDENTE DE APROVACAO DOS SOCIOS E DA ADVOGADA

1. A cliente paga o valor integral para a plataforma.
2. O pagamento nao e feito diretamente ao anfitriao.
3. A plataforma registra o valor bruto da reserva.
4. A Elite Modell retem taxa de servico proposta de 10%.
5. O anfitriao possui direito ao valor liquido proposto de 90%, sujeito as regras da reserva.
6. O repasse fica pendente ate a condicao de liberacao.
7. Liberacao proposta: ate 24 horas apos o check-in confirmado.
8. Disputa, cancelamento, suspeita de fraude ou falha na hospedagem suspendem o repasse.
9. O valor somente e liberado apos resolucao do impedimento.
10. Toda movimentacao deve possuir auditoria e conciliacao.

Repasses live permanecem desabilitados ate aprovacao comercial e juridica, homologacao da integracao e conclusao dos testes.
`;
  }
  if (key === "refund-policy") {
    return `## PROPOSTA PENDENTE DE APROVACAO DOS SOCIOS E DA ADVOGADA

- antes da confirmacao do anfitriao: reembolso integral;
- cancelamento pelo anfitriao: reembolso integral;
- quarto indisponivel: reembolso integral e abertura de caso de moderacao;
- imovel significativamente diferente: suspensao do repasse e analise;
- suspeita de fraude: retencao temporaria e analise;
- ausencia da cliente: regra especifica ainda pendente dos socios;
- pedido de reembolso: analise administrativa proposta em ate 5 dias uteis;
- reembolso aprovado: executar pelo Asaas e registrar auditoria;
- nenhuma alteracao apenas local de status sem confirmacao no fornecedor.
`;
  }
  if (key === "data-subject-rights") {
    return `## Governanca operacional de privacidade

BRUNO MORAES DA ROCHA acompanha operacionalmente o canal de privacidade e as solicitacoes dos titulares.
O canal corporativo publico, o ato formal, o cargo, o substituto e a aprovacao do representante legal permanecem pendentes.
`;
  }
  return "";
}

export function draftContent(key: string, name: string, audience: string) {
  if (key === ROULETTE_PROMOTION_POLICY.key) {
    return ROULETTE_PROMOTION_POLICY.content;
  }

  if (key === PRIVACY_MODERATION_APPOINTMENT_MINUTE.key) {
    return PRIVACY_MODERATION_APPOINTMENT_MINUTE.content;
  }

  return `# ${name}

Status: RASCUNHO PARA REVISAO JURIDICA - NAO PUBLICAR
Status tecnico na plataforma: ${CURRENT_LEGAL_REVIEW_STATUS}
Publico: ${audience}

## Identificacao do responsavel

- Empresa: ELITE MODEL LTDA.
- Marca: Elite Modell.
- CNPJ: 66.807.135/0001-71.
- Endereco: Rua Joao Machado, nº 834, Fundos, Centro, Pompeu/MG, CEP 35.640-000.
- Suporte geral: ${LEGAL_CHANNELS.support}.
- Privacidade/LGPD: ${LEGAL_CHANNELS.privacy}.
- Seguranca, incidentes e denuncias sensiveis: ${LEGAL_CHANNELS.security}.
- Financeiro/pagamentos: ${LEGAL_CHANNELS.finance}.
- Administracao: ${LEGAL_CHANNELS.admin}.
- Canal juridico: ${LEGAL_CHANNELS.legalPending}.
- Responsavel operacional por privacidade e moderacao: BRUNO MORAES DA ROCHA.

## Objetivo e escopo

Este documento deve refletir o funcionamento tecnico efetivamente aprovado da Elite Modell. Ele nao constitui aprovacao juridica e deve ser revisado por advogado brasileiro antes da publicacao.

## Regras operacionais

- identificacao confirmada: ELITE MODEL LTDA, marca Elite Modell, CNPJ 66.807.135/0001-71;
- acesso restrito a maiores de 18 anos, com verificacao proporcional ao risco;
- tratamento de dados limitado a finalidades documentadas;
- controles de acesso, auditoria e revisao humana;
- ausencia de renovacao automatica quando nao houver recorrencia implementada;
- preservacao restrita quando necessaria para seguranca, obrigacao aplicavel ou exercicio de direitos;
- fornecedores operacionais mapeados: Asaas, Persona, Vercel, Supabase, Cloudflare, OVH Object Storage/OVHcloud, Zoho Mail e Upstash/Redis;
- canais oficiais conhecidos preenchidos, exceto canal juridico dedicado ainda pendente de criacao/confirmacao;
- prazos juridicos, foro, bases legais, retencao, DPA/contratos e texto final dependem de validacao da advogada.

## Pendencias

- aprovacao formal da advogada;
- aprovacao empresarial;
- data de vigencia;
- texto final aprovado;
- decisao sobre novo aceite quando aplicavel.

${proposalAppendix(key)}
`;
}

export function draftVersion(key: string) {
  if (key === ROULETTE_PROMOTION_POLICY.key) {
    return ROULETTE_PROMOTION_POLICY.version;
  }

  return key === PRIVACY_MODERATION_APPOINTMENT_MINUTE.key
    ? PRIVACY_MODERATION_APPOINTMENT_MINUTE.version
    : "0.4-ready-for-legal-review";
}

export function draftPendingFields(key: string) {
  if (key === ROULETTE_PROMOTION_POLICY.key) {
    return [
      "LEGAL_RATIFICATION_PENDING",
      "COMPANY_FINAL_APPROVAL_PENDING",
      "PROMOTION_AUTHORIZATION_REFERENCE_PENDING",
    ];
  }

  return key === PRIVACY_MODERATION_APPOINTMENT_MINUTE.key
    ? [...PRIVACY_MODERATION_APPOINTMENT_MINUTE.pendingFields]
    : [...legalPendingFields(), ...PUBLICATION_APPROVAL_BLOCKERS];
}

export function draftChangeSummary(key: string) {
  if (key === ROULETTE_PROMOTION_POLICY.key) {
    return "Versao operacional V1 da Politica da Roleta Promocional, com elegibilidade, limites, premiacao, fraude, auditoria, validade e aceite versionado.";
  }

  return key === PRIVACY_MODERATION_APPOINTMENT_MINUTE.key
    ? PRIVACY_MODERATION_APPOINTMENT_MINUTE.changeSummary
    : "Definicoes operacionais, matriz de autoridade e propostas financeiras; requer aprovacao dos socios e revisao juridica.";
}

export function legalContentHash(content: string) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

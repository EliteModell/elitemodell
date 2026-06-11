ALTER TABLE "Booking"
ADD COLUMN "checkInStatus" TEXT NOT NULL DEFAULT 'NOT_CONFIRMED',
ADD COLUMN "payoutBlocked" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "payoutBlockedReason" TEXT,
ADD COLUMN "payoutEligibleAt" TIMESTAMP(3),
ADD COLUMN "contestationDeadline" TIMESTAMP(3);

ALTER TABLE "PlatformSettings"
ADD COLUMN "moderationOperationalOwner" TEXT NOT NULL DEFAULT 'BRUNO MORAES DA ROCHA',
ADD COLUMN "privacyOperationalOwner" TEXT NOT NULL DEFAULT 'BRUNO MORAES DA ROCHA',
ADD COLUMN "commonReportTriageBusinessDays" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN "supportInitialResponseBusinessDays" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN "refundReviewBusinessDays" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN "bookingServiceFeeBps" INTEGER NOT NULL DEFAULT 1000,
ADD COLUMN "bookingPayoutDelayHours" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN "bookingPayoutReleaseEvent" TEXT NOT NULL DEFAULT 'CHECK_IN_CONFIRMED',
ADD COLUMN "bookingContestationHours" INTEGER,
ADD COLUMN "bookingProposalStatus" TEXT NOT NULL DEFAULT 'PENDING_PARTNER_AND_LEGAL_APPROVAL',
ADD COLUMN "bookingCommercialModelApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "bookingCancellationPolicyApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "bookingPayoutIntegrationHomologated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "bookingFinancialTestsApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "bookingLivePayoutEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "ModerationAuthorityRule" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "requiredPermission" TEXT NOT NULL,
  "canExecuteAlone" BOOLEAN NOT NULL DEFAULT false,
  "requiresSecondApprover" BOOLEAN NOT NULL DEFAULT false,
  "requiresPartner" BOOLEAN NOT NULL DEFAULT false,
  "requiresLegal" BOOLEAN NOT NULL DEFAULT false,
  "requiresEvidence" BOOLEAN NOT NULL DEFAULT true,
  "requiresUserNotification" BOOLEAN NOT NULL DEFAULT true,
  "operationalRule" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PROPOSED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ModerationAuthorityRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CorporateChannel" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "email" TEXT,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "status" TEXT NOT NULL DEFAULT 'PENDING_CREATION',
  "domainValidated" BOOLEAN NOT NULL DEFAULT false,
  "receiveValidated" BOOLEAN NOT NULL DEFAULT false,
  "sendValidated" BOOLEAN NOT NULL DEFAULT false,
  "owner" TEXT,
  "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
  "recoveryEmail" TEXT,
  "lastValidatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CorporateChannel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PrivacyOfficerAppointment" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "operationalOwner" TEXT NOT NULL DEFAULT 'BRUNO MORAES DA ROCHA',
  "formalName" TEXT,
  "formalRole" TEXT,
  "cpfEncrypted" TEXT,
  "publicEmail" TEXT,
  "corporatePhone" TEXT,
  "designationActReference" TEXT,
  "designatedAt" TIMESTAMP(3),
  "startsAt" TIMESTAMP(3),
  "substituteName" TEXT,
  "duties" TEXT,
  "autonomy" TEXT,
  "conflicts" TEXT,
  "legalRepresentativeApproval" TEXT,
  "status" TEXT NOT NULL DEFAULT 'NOT_FORMALLY_APPOINTED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PrivacyOfficerAppointment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LegalAddressVisibility" (
  "id" TEXT NOT NULL,
  "context" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "visible" BOOLEAN NOT NULL DEFAULT false,
  "legallyRequired" BOOLEAN NOT NULL DEFAULT false,
  "legalReviewStatus" TEXT NOT NULL DEFAULT 'PENDING_LEGAL_REVIEW',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LegalAddressVisibility_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookingPolicyHistory" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookingPolicyHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ModerationAuthorityRule_key_key" ON "ModerationAuthorityRule"("key");
CREATE INDEX "ModerationAuthorityRule_status_action_idx" ON "ModerationAuthorityRule"("status", "action");
CREATE UNIQUE INDEX "CorporateChannel_key_key" ON "CorporateChannel"("key");
CREATE INDEX "CorporateChannel_status_required_idx" ON "CorporateChannel"("status", "required");
CREATE UNIQUE INDEX "LegalAddressVisibility_context_key" ON "LegalAddressVisibility"("context");
CREATE INDEX "LegalAddressVisibility_legalReviewStatus_legallyRequired_idx" ON "LegalAddressVisibility"("legalReviewStatus", "legallyRequired");
CREATE INDEX "BookingPolicyHistory_createdAt_idx" ON "BookingPolicyHistory"("createdAt");
CREATE INDEX "BookingPolicyHistory_actorId_createdAt_idx" ON "BookingPolicyHistory"("actorId", "createdAt");

INSERT INTO "ModerationAuthorityRule"
("id", "key", "action", "requiredPermission", "canExecuteAlone", "requiresSecondApprover", "requiresPartner", "requiresLegal", "requiresEvidence", "requiresUserNotification", "operationalRule", "status", "updatedAt")
VALUES
('mod_auth_common', 'COMMON_REPORT', 'Denuncia comum', 'reports:manage', true, false, false, false, true, true, 'Triagem proposta em ate 2 dias uteis. Toda acao gera auditoria.', 'PROPOSED', CURRENT_TIMESTAMP),
('mod_auth_emergency', 'EMERGENCY_SAFETY', 'Possivel menor, exploracao, coercao, trafico, imagem nao autorizada ou risco fisico', 'reports:manage', true, false, false, true, true, true, 'Ocultacao cautelar imediata, preservacao de evidencia e analise prioritaria.', 'PROPOSED', CURRENT_TIMESTAMP),
('mod_auth_fraud', 'FRAUD', 'Suspeita de fraude', 'reports:manage', false, true, false, false, true, true, 'Suspensao cautelar quando houver evidencia suficiente.', 'PROPOSED', CURRENT_TIMESTAMP),
('mod_auth_delete', 'DEFINITIVE_DELETION', 'Exclusao definitiva', 'reports:manage', false, true, true, false, true, true, 'Exige justificativa registrada e auditoria antes da exclusao definitiva.', 'PROPOSED', CURRENT_TIMESTAMP),
('mod_auth_legal', 'LEGALLY_SENSITIVE', 'Caso juridicamente sensivel', 'legal:manage', false, false, false, true, true, true, 'Encaminhar para a advogada e preservar a trilha de decisao.', 'PROPOSED', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "CorporateChannel"
("id", "key", "label", "purpose", "required", "status", "updatedAt")
VALUES
('channel_support', 'SUPPORT', 'Suporte', 'Atendimento a usuarios e consumidores.', true, 'PENDING_CREATION', CURRENT_TIMESTAMP),
('channel_privacy', 'PRIVACY', 'Privacidade e LGPD', 'Solicitacoes de titulares e comunicacoes de privacidade.', true, 'PENDING_CREATION', CURRENT_TIMESTAMP),
('channel_security', 'SECURITY', 'Seguranca e incidentes', 'Relatos de seguranca e incidentes; pode encaminhar inicialmente ao canal de privacidade.', true, 'PENDING_CREATION', CURRENT_TIMESTAMP),
('channel_finance', 'FINANCE', 'Financeiro', 'Comunicacoes financeiras e conciliacao.', false, 'PENDING_CREATION', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "PrivacyOfficerAppointment"
("id", "operationalOwner", "status", "duties", "updatedAt")
VALUES
('default', 'BRUNO MORAES DA ROCHA', 'NOT_FORMALLY_APPOINTED', 'Responsabilidade operacional pelo canal de privacidade e acompanhamento das solicitacoes dos titulares. Indicacao formal permanece pendente.', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "LegalAddressVisibility"
("id", "context", "label", "visible", "legalReviewStatus", "updatedAt")
VALUES
('addr_terms', 'TERMS', 'Termos', false, 'PENDING_LEGAL_REVIEW', CURRENT_TIMESTAMP),
('addr_privacy', 'PRIVACY', 'Politica de privacidade', false, 'PENDING_LEGAL_REVIEW', CURRENT_TIMESTAMP),
('addr_checkout', 'CHECKOUT', 'Checkout', false, 'PENDING_LEGAL_REVIEW', CURRENT_TIMESTAMP),
('addr_receipt', 'CONTRACT_RECEIPT', 'Comprovante contratual', false, 'PENDING_LEGAL_REVIEW', CURRENT_TIMESTAMP),
('addr_invoice', 'INVOICE', 'Nota fiscal', false, 'PENDING_LEGAL_REVIEW', CURRENT_TIMESTAMP),
('addr_contact', 'CONTACT', 'Contato', false, 'PENDING_LEGAL_REVIEW', CURRENT_TIMESTAMP),
('addr_footer', 'FOOTER', 'Rodape publico', false, 'PENDING_LEGAL_REVIEW', CURRENT_TIMESTAMP),
('addr_admin', 'ADMIN', 'Painel administrativo', true, 'PENDING_LEGAL_REVIEW', CURRENT_TIMESTAMP)
ON CONFLICT ("context") DO NOTHING;

UPDATE "Booking"
SET "payoutBlockedReason" = COALESCE("payoutBlockedReason", 'Modelo comercial, politica de cancelamento, integracao de repasse e testes ainda pendentes de aprovacao/homologacao.')
WHERE "payoutStatus" <> 'PAID';

UPDATE "PublicationRequirement"
SET
  "owner" = 'BRUNO MORAES DA ROCHA',
  "status" = 'IN_PROGRESS',
  "value" = 'Minuta interna de designacao operacional preenchida para BRUNO MORAES DA ROCHA. Permanecem pendentes somente data de inicio, substituto, representante legal, CPF se juridicamente necessario e assinatura.',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'privacy_officer';

UPDATE "PublicationRequirement"
SET
  "owner" = 'BRUNO MORAES DA ROCHA',
  "status" = 'IN_PROGRESS',
  "value" = 'Moderacao humana operacional definida. Denuncia comum: proposta de 2 dias uteis; emergencias: ocultacao cautelar imediata e prioridade. Matriz de autoridade criada; aprovacoes formais permanecem pendentes.',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" IN ('malware_moderation_provider', 'service_sla', 'authority_preservation');

UPDATE "PublicationRequirement"
SET
  "status" = 'IN_PROGRESS',
  "value" = 'PROPOSTA PENDENTE DE APROVACAO DOS SOCIOS E DA ADVOGADA: taxa de 10%, liquido de 90%, liberacao proposta em ate 24 horas apos check-in confirmado, bloqueio por disputa/cancelamento/fraude/falha e nenhuma ativacao live.',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'booking_rules';

UPDATE "PublicationRequirement"
SET
  "status" = 'IN_PROGRESS',
  "value" = 'PROPOSTA PENDENTE DE APROVACAO DOS SOCIOS E DA ADVOGADA: regras de cancelamento e reembolso configuradas como rascunho; analise proposta em ate 5 dias uteis; reembolso somente com confirmacao do Asaas.',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'refund_rules';

INSERT INTO "PublicationRequirement"
("id", "key", "information", "reason", "owner", "status", "documentKey", "affectedFeature", "value", "requiredForPublish", "updatedAt")
VALUES
('pub_channels', 'corporate_channels', 'Canais corporativos de suporte, privacidade, seguranca e financeiro', 'Os canais devem ser criados, validados, protegidos por MFA e possuir responsavel e recuperacao.', 'Socios', 'PENDING', 'privacy-policy', 'Contato e atendimento', 'Nao inventar enderecos. Criar e validar dominio, recebimento, envio, responsavel, MFA e recuperacao.', true, CURRENT_TIMESTAMP),
('pub_privacy_act', 'privacy_formal_appointment', 'Ato Formal de Designacao do Responsavel Operacional por Privacidade e Moderacao', 'A minuta deve permanecer interna e somente pode ser finalizada apos o preenchimento dos campos pendentes e assinatura do representante legal.', 'Socios e representante legal', 'PENDING', 'privacy-officer-appointment-act', 'Governanca de privacidade', 'Minuta interna criada. Permanecem pendentes somente data de inicio, substituto, representante legal, CPF se juridicamente necessario e assinatura.', true, CURRENT_TIMESTAMP),
('pub_address_visibility', 'legal_address_visibility', 'Endereco empresarial e visibilidade por contexto', 'A exibicao depende de revisao juridica e nao pode ocultar informacao legalmente obrigatoria.', 'Socios e advogada', 'PENDING', 'terms-general', 'Termos, privacidade, checkout, comprovantes, nota, contato e rodape', 'Matriz criada com revisao juridica pendente.', true, CURRENT_TIMESTAMP),
('pub_moderation_authority', 'moderation_authority_matrix', 'Matriz de autoridade da moderacao', 'Define limites, segunda aprovacao, socios, juridico, evidencia e comunicacao ao usuario.', 'BRUNO MORAES DA ROCHA', 'IN_PROGRESS', 'admin-moderator-policy', 'Moderacao administrativa', 'Responsavel operacional definido; limites de autoridade e aprovacao formal permanecem pendentes.', true, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

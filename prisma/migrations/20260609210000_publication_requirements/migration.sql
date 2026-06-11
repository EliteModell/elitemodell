CREATE TABLE "PublicationRequirement" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "information" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "owner" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dueAt" TIMESTAMP(3),
    "documentKey" TEXT,
    "affectedFeature" TEXT,
    "value" TEXT,
    "requiredForPublish" BOOLEAN NOT NULL DEFAULT true,
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicationRequirement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PublicationRequirementHistory" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "actorId" TEXT,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "previousValue" TEXT,
    "nextValue" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicationRequirementHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PublicationRequirement_key_key" ON "PublicationRequirement"("key");
CREATE INDEX "PublicationRequirement_status_dueAt_idx" ON "PublicationRequirement"("status", "dueAt");
CREATE INDEX "PublicationRequirement_documentKey_status_idx" ON "PublicationRequirement"("documentKey", "status");
CREATE INDEX "PublicationRequirementHistory_requirementId_createdAt_idx" ON "PublicationRequirementHistory"("requirementId", "createdAt");

ALTER TABLE "PublicationRequirementHistory"
ADD CONSTRAINT "PublicationRequirementHistory_requirementId_fkey"
FOREIGN KEY ("requirementId") REFERENCES "PublicationRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "PublicationRequirement"
("id", "key", "information", "reason", "documentKey", "affectedFeature", "requiredForPublish", "updatedAt")
VALUES
('pub_company', 'company_identity', 'Razao social, nome fantasia, CNPJ e endereco', 'Identificacao obrigatoria do fornecedor e controlador.', 'terms-general', 'Publicacao legal e checkout', true, CURRENT_TIMESTAMP),
('pub_contacts', 'support_privacy_contacts', 'E-mails de suporte e privacidade', 'Canais publicos para consumidor e titular de dados.', 'privacy-policy', 'Suporte e direitos LGPD', true, CURRENT_TIMESTAMP),
('pub_dpo', 'privacy_officer', 'Encarregado ou responsavel e canal publico', 'Governanca e contato de privacidade.', 'data-subject-rights', 'Privacidade', true, CURRENT_TIMESTAMP),
('pub_processors', 'processors_subprocessors', 'Fornecedores, suboperadores, paises e contratos', 'Transparencia e gestao de operadores.', 'privacy-policy', 'KYC, Storage, pagamento e infraestrutura', true, CURRENT_TIMESTAMP),
('pub_age', 'visitor_age_provider', 'Fornecedor de verificacao etaria para visitantes', 'Barreira etaria proporcional ao risco.', 'adult-safety-policy', 'Acesso a conteudo sensivel', true, CURRENT_TIMESTAMP),
('pub_moderation', 'malware_moderation_provider', 'Fornecedor real de malware e moderacao', 'Uploads nao podem ser liberados sem decisao confiavel.', 'moderation-reporting-policy', 'Uploads e publicacao', true, CURRENT_TIMESTAMP),
('pub_retention', 'retention_periods', 'Prazos de retencao por categoria', 'Exclusao e preservacao exigem prazos aprovados.', 'retention-deletion-policy', 'Worker LGPD', true, CURRENT_TIMESTAMP),
('pub_refunds', 'refund_rules', 'Regras de cancelamento, arrependimento e reembolso', 'Oferta e pos-venda precisam de regras claras.', 'refund-policy', 'Checkout e Asaas', true, CURRENT_TIMESTAMP),
('pub_sla', 'service_sla', 'SLA de suporte, privacidade e moderacao emergencial', 'Prazos de atendimento e escalonamento.', 'moderation-reporting-policy', 'Suporte, LGPD e denuncia', true, CURRENT_TIMESTAMP),
('pub_authorities', 'authority_preservation', 'Procedimento de autoridades e preservacao', 'Ordens, sigilo, evidencias e legal hold.', 'moderation-reporting-policy', 'Denuncias e evidencias', true, CURRENT_TIMESTAMP),
('pub_booking', 'booking_rules', 'Regras de reserva, taxa de 10%, repasse, disputa e no-show', 'A plataforma participa do fluxo financeiro da reserva.', 'payments-policy', 'Reservas de imoveis', true, CURRENT_TIMESTAMP),
('pub_plans', 'commercial_plans', 'Validacao comercial de todos os planos', 'Preco, duracao e beneficio devem corresponder ao produto real.', 'boost-terms', 'Planos e destaques', true, CURRENT_TIMESTAMP),
('pub_deploy', 'deployment_approval', 'Aprovacao para executar deploy', 'Mudancas juridicas e de seguranca exigem homologacao formal.', null, 'Deploy', false, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

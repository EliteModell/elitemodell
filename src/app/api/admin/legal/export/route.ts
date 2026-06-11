export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { LEGAL_DOCUMENT_DEFINITIONS, legalPendingFields } from "@/lib/legal-documents";

export async function GET() {
  const access = await authorizeAdminRequest("legal:manage");
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const [
    documents,
    requirements,
    settings,
    moderationAuthority,
    corporateChannels,
    privacyAppointment,
    addressVisibility,
    bookingPolicyHistory,
  ] = await Promise.all([
    prisma.legalDocument.findMany({
      include: { versions: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    prisma.publicationRequirement.findMany({
      orderBy: { createdAt: "asc" },
      include: { history: { orderBy: { createdAt: "asc" } } },
    }),
    prisma.platformSettings.findUnique({ where: { id: "default" } }),
    prisma.moderationAuthorityRule.findMany({ orderBy: { action: "asc" } }),
    prisma.corporateChannel.findMany({ orderBy: { label: "asc" } }),
    prisma.privacyOfficerAppointment.findUnique({ where: { id: "default" } }),
    prisma.legalAddressVisibility.findMany({ orderBy: { label: "asc" } }),
    prisma.bookingPolicyHistory.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  const byKey = new Map(documents.map((document) => [document.key, document]));
  const exportedDocuments = LEGAL_DOCUMENT_DEFINITIONS.map(([key, name, type, audience, internal]) => {
    const document = byKey.get(key);
    const version = document?.versions[0];
    return {
      key,
      name,
      type,
      audience,
      internal,
      status: version?.status ?? "MISSING",
      version: version?.version ?? null,
      contentHash: version?.contentHash ?? null,
      content: version?.content ?? null,
      pendingFields: version?.pendingFields ?? [],
      legalReviewerName: version?.legalReviewerName ?? null,
      legalReviewNote: version?.legalReviewNote ?? null,
      legalReviewReference: version?.legalReviewReference ?? null,
      warning: "NAO APROVADO JURIDICAMENTE. REQUER REVISAO DE ADVOGADO BRASILEIRO.",
    };
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    generatedByAdminId: access.session.user.id,
    packageStatus: "DRAFT_FOR_EXTERNAL_LEGAL_REVIEW",
    legalApproval: false,
    warning: "Este pacote reune minutas e evidencias tecnicas. Nenhum documento deve ser tratado como parecer ou aprovacao juridica.",
    environmentPendingFields: legalPendingFields(),
    documents: exportedDocuments,
    technicalReport: {
      main: "docs/RELATORIO_RAIO_X_JURIDICO_TECNICO_2026-06-09.md",
      implementation: "docs/RELATORIO_IMPLEMENTACAO_JURIDICA_TECNICA_2026-06-09.md",
      mediaInventory: "docs/INVENTARIO_MIDIA_ANTIGA.md",
    },
    matrices: {
      legal: ["LGPD", "Marco Civil", "CDC e Decreto 7.962/2013", "ANPD", "ECA e protecao etaria"],
      felca: ["barreira etaria", "nao entrega de conteudo antes da verificacao", "denuncia e retirada", "evidencia e autoridade"],
      data: ["cadastro", "KYC e biometria", "midia", "pagamentos", "reservas", "auditoria", "retencao"],
      moderationAuthority,
      addressVisibility,
    },
    flows: {
      acceptance: "UserAcceptance e CheckoutAcceptance com versao/hash, IP, user agent e data.",
      kyc: "Persona ou revisao manual, com MFA e permissao kyc:review no administrativo.",
      deletion: "DataDeletionJob idempotente, simulacao, legal hold, comprovante e preservacao restrita.",
      reporting: "ModerationCase, retirada emergencial, eventos e EvidenceArtifact.",
      financial: "Asaas consultado em conciliacao, cancelamento e reembolso; PaymentOperation registra a trilha.",
    },
    operationalGovernance: {
      company: {
        legalName: "ELITE MODEL LTDA",
        tradeName: "Elite Modell",
        cnpj: "66.807.135/0001-71",
      },
      moderationOperationalOwner: settings?.moderationOperationalOwner ?? "BRUNO MORAES DA ROCHA",
      privacyOperationalOwner: settings?.privacyOperationalOwner ?? "BRUNO MORAES DA ROCHA",
      privacyAppointment,
      corporateChannels,
      bookingProposal: settings ? {
        status: settings.bookingProposalStatus,
        serviceFeeBps: settings.bookingServiceFeeBps,
        payoutDelayHours: settings.bookingPayoutDelayHours,
        payoutReleaseEvent: settings.bookingPayoutReleaseEvent,
        contestationHours: settings.bookingContestationHours,
        commercialModelApproved: settings.bookingCommercialModelApproved,
        cancellationPolicyApproved: settings.bookingCancellationPolicyApproved,
        payoutIntegrationHomologated: settings.bookingPayoutIntegrationHomologated,
        financialTestsApproved: settings.bookingFinancialTestsApproved,
        livePayoutEnabled: settings.bookingLivePayoutEnabled,
      } : null,
      bookingPolicyHistory,
    },
    partnerRequirements: requirements,
    legalQuestions: [
      "Bases legais finais por finalidade, incluindo biometria e verificacao etaria.",
      "Prazos aprovados de retencao, legal hold e atendimento de direitos.",
      "Regras comerciais finais de cancelamento, arrependimento, reembolso, no-show e disputa.",
      "Papel contratual da plataforma na reserva, taxa de 10% e repasse de 90%.",
      "Procedimento de autoridades, sigilo, preservacao e comunicacao de incidentes.",
      "Adequacao final a Lei 15.211/2025 e ao Decreto 12.880/2026.",
    ],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="elite-modell-pacote-revisao-juridica-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}

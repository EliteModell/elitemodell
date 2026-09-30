import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-access";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { digitVendorDataBelongsToUser, fetchDigitSessionDecision } from "@/lib/didit";
import { assessProfessionalDiditDecision } from "@/lib/professional-didit";
import { getClientIP } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const access = await authorizeAdminRequest("kyc:review");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id } = await context.params;
  const professional = await prisma.professional.findUnique({
    where: { id },
    select: { id: true, userId: true, kycProvider: true, kycSessionId: true },
  });
  if (!professional) return NextResponse.json({ error: "Profissional não encontrada." }, { status: 404 });
  if (professional.kycProvider !== "DIDIT" || !professional.kycSessionId) {
    return NextResponse.json({ error: "Este cadastro não possui uma sessão Didit." }, { status: 409 });
  }

  try {
    const decision = await fetchDigitSessionDecision(professional.kycSessionId);
    if (
      decision.session_id !== professional.kycSessionId ||
      !digitVendorDataBelongsToUser(decision.vendor_data, professional.userId)
    ) {
      return NextResponse.json({ error: "A sessão Didit não pertence a este cadastro." }, { status: 409 });
    }

    const assessment = assessProfessionalDiditDecision(decision);
    await logAudit({
      adminId: access.session.user.id,
      action: "ADMIN_ACCESS",
      targetType: "PROFESSIONAL",
      targetId: professional.id,
      reason: "Consulta administrativa da decisão Didit",
      ipAddress: getClientIP(req),
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json({
      sessionId: decision.session_id,
      status: decision.status,
      environment: decision.environment ?? null,
      approved: assessment.approved,
      reason: assessment.reason,
      documents: (decision.id_verifications ?? []).map((verification) => ({
        nodeId: verification.node_id,
        status: verification.status,
        documentType: verification.document_type ?? null,
        fullName: verification.full_name ?? null,
        dateOfBirth: verification.date_of_birth ?? null,
        expirationDate: verification.expiration_date ?? null,
        warnings: (verification.warnings ?? []).map((warning) => ({
          description: warning.short_description ?? "Alerta sem descrição",
          type: warning.log_type ?? null,
        })),
      })),
      liveness: (decision.liveness_checks ?? []).map((check) => ({
        nodeId: check.node_id,
        status: check.status,
        score: check.score ?? null,
        ageEstimation: check.age_estimation ?? null,
      })),
      faceMatch: {
        status: "INCLUDED_IN_DIDIT_WORKFLOW",
        detail: "A decisão geral considera o workflow configurado. O endpoint atual não devolve um campo Face Match separado.",
      },
      mediaAvailability: {
        document: false,
        selfie: false,
        detail: "A API de decisão usada pelo projeto não fornece URLs de imagens. Nenhuma cópia local foi criada.",
      },
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[admin/didit] Falha ao consultar decisão.", {
      professionalId: id,
      reason: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json({ error: "Não foi possível consultar a Didit agora." }, { status: 502 });
  }
}

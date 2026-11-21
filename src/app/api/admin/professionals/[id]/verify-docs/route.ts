import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-access";
import { shouldReviewRegistrationManually } from "@/lib/manual-identity-policy";
import { prisma } from "@/lib/prisma";
import { getClientIP } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await authorizeAdminRequest("kyc:review");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (body?.action !== "APPROVE" && body?.action !== "REJECT") {
    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  }
  const approve = body.action === "APPROVE";
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 1_000) : "";

  try {
    const result = await prisma.$transaction(async (tx) => {
      const target = await tx.professional.findUnique({ where: { id }, select: { userId: true } });
      if (!target) return { kind: "missing" } as const;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"manual-identity:" + target.userId}))`;
      const current = await tx.professional.findUnique({ where: { id } });
      if (!current) return { kind: "missing" } as const;
      if (shouldReviewRegistrationManually(current)) return { kind: "manual" } as const;

      const docStatus = approve ? "APPROVED" : "REJECTED";
      if (current.docStatus === docStatus && (approve || current.status === "REJECTED")) {
        return { kind: "ok", professional: current, changed: false } as const;
      }
      const professional = await tx.professional.update({
        where: { id },
        data: approve
          ? { docStatus }
          : { docStatus, verifStatus: "REJECTED", status: "REJECTED", rejectReason: reason || "Documentação insuficiente" },
      });
      await tx.auditLog.create({
        data: {
          adminId: access.session.user.id,
          action: approve ? "ADMIN_ACCESS" : "PROFESSIONAL_REJECTED",
          targetType: "PROFESSIONAL",
          targetId: id,
          reason: approve ? "Revisão documental legada aprovada" : reason || "Documentação insuficiente",
          ipAddress: getClientIP(req),
          changes: { moderationAction: "legacy-document-review", previousDocumentStatus: current.docStatus, documentStatus: docStatus },
        },
      });
      return { kind: "ok", professional, changed: true } as const;
    });

    if (result.kind === "missing") return NextResponse.json({ error: "Profissional não encontrado." }, { status: 404 });
    if (result.kind === "manual") return NextResponse.json({ code: "MANUAL_DOCUMENT_REVIEW_REQUIRED" }, { status: 409 });
    return NextResponse.json({ ...result.professional, idempotentReplay: !result.changed });
  } catch {
    return NextResponse.json({ error: "Não foi possível concluir a verificação agora." }, { status: 500 });
  }
}

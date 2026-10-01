export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { logProfessionalApproved, logProfessionalRejected } from "@/lib/audit";
import { getClientIP } from "@/lib/security";
import { professionalApprovalAccessData } from "@/lib/professional-access";

/**
 * POST /api/admin/professionals/[id]/verify-docs - Aprovar/Rejeitar documentos
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: professionalId } = await params;
    const body = await req.json();
    const { action, reason } = body;

    if (!["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
    }

    const professional = await prisma.professional.findUnique({
      where: { id: professionalId },
    });

    if (!professional) {
      return NextResponse.json(
        { error: "Profissional não encontrado" },
        { status: 404 }
      );
    }

    let updated;
    let changed = true;

    if (action === "APPROVE") {
      const result = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`professional-approval:${professionalId}`}))`;
        const current = await tx.professional.findUniqueOrThrow({ where: { id: professionalId } });
        if (
          current.status === "ACTIVE" &&
          current.verified &&
          current.docStatus === "APPROVED" &&
          current.verifStatus === "APPROVED" &&
          current.kycStatus === "APPROVED"
        ) {
          return { changed: false, professional: current };
        }
        const accessData = await professionalApprovalAccessData(tx, current);
        const saved = await tx.professional.update({
          where: { id: professionalId },
          data: {
            docStatus: "APPROVED",
            verifStatus: "APPROVED",
            kycStatus: "APPROVED",
            status: "ACTIVE",
            verified: true,
            ...accessData,
          },
        });
        return { changed: true, professional: saved };
      });
      updated = result.professional;
      changed = result.changed;

      if (changed) {
        await logProfessionalApproved(
          session.user.id,
          professionalId,
          "Documentos verificados",
          getClientIP(req)
        );
      }
    } else {
      updated = await prisma.professional.update({
        where: { id: professionalId },
        data: {
          docStatus: "REJECTED",
          verifStatus: "REJECTED",
          kycStatus: "REJECTED",
          status: "REJECTED",
          rejectReason: reason,
        },
      });

      await logProfessionalRejected(
        session.user.id,
        professionalId,
        reason || "Documentação insuficiente",
        getClientIP(req)
      );
    }

    return NextResponse.json({ ...updated, idempotentReplay: !changed });
  } catch (error: unknown) {
    console.error("[VERIFY DOCS ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

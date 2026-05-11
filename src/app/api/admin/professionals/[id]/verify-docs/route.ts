export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { logProfessionalApproved, logProfessionalRejected } from "@/lib/audit";
import { getClientIP } from "@/lib/security";

/**
 * POST /api/admin/professionals/[id]/verify-docs - Aprovar/Rejeitar documentos
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const professionalId = params.id;
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

    if (action === "APPROVE") {
      updated = await prisma.professional.update({
        where: { id: professionalId },
        data: {
          docStatus: "APPROVED",
          verifStatus: "APPROVED",
          status: "ACTIVE",
          verified: true,
        },
      });

      await logProfessionalApproved(
        session.user.id,
        professionalId,
        "Documentos verificados",
        getClientIP(req)
      );
    } else {
      updated = await prisma.professional.update({
        where: { id: professionalId },
        data: {
          docStatus: "REJECTED",
          verifStatus: "REJECTED",
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

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("[VERIFY DOCS ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// PATCH /api/admin/kyc — aprovar ou rejeitar verificação de cliente
// Body: { userId, action: "approve" | "reject", reason?: string }
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { userId, action, reason } = body as {
    userId?: string;
    action?: "approve" | "reject";
    reason?: string;
  };

  if (!userId || !action) {
    return NextResponse.json({ error: "userId e action são obrigatórios." }, { status: 400 });
  }

  const newStatus = action === "approve" ? "VERIFIED" : "REJECTED";

  await prisma.user.update({
    where: { id: userId },
    data: {
      clientStatus: newStatus,
      kycReviewedAt: new Date(),
      kycRejectionReason: action === "reject" ? (reason ?? "Verificação não aprovada.") : null,
    },
  });

  return NextResponse.json({ success: true, userId, status: newStatus });
}

// GET /api/admin/kyc?status=PENDING_REVIEW — listar usuários aguardando verificação
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "PENDING_REVIEW";

  const users = await prisma.user.findMany({
    where: { clientStatus: status as "UNVERIFIED" | "PENDING_REVIEW" | "VERIFIED" | "REJECTED" },
    select: {
      id: true,
      name: true,
      email: true,
      clientStatus: true,
      kycSubmittedAt: true,
      kycReviewedAt: true,
      kycRejectionReason: true,
      createdAt: true,
    },
    orderBy: { kycSubmittedAt: "desc" },
  });

  return NextResponse.json(users);
}

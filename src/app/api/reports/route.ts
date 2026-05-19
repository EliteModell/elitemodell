export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { ReportStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { checkRateLimit, sanitizeInput } from "@/lib/security";

const reportSchema = z.object({
  targetType: z.enum(["USER", "PROFESSIONAL", "PROPERTY", "CONTENT"]),
  targetId: z.string().min(1),
  reason: z.enum([
    "ILLEGAL_CONTENT",
    "FAKE_PROFILE",
    "HARASSMENT",
    "SCAM",
    "INAPPROPRIATE_CONTENT",
    "FAKE_DOCUMENTS",
    "OTHER",
  ]),
  description: z.string().min(10).max(1000),
  evidence: z.array(z.string().url()).optional().default([]),
});

/**
 * POST /api/reports - Criar denúncia
 * Qualquer usuário autenticado pode denunciar conteúdo
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting: máx 5 denúncias por hora
    const rateLimit = checkRateLimit(`report:${session.user.id}`, 5, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Muitas denúncias. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const validated = reportSchema.parse(body);

    // Verificar se já denunciou este recurso
    const existing = await prisma.report.findFirst({
      where: {
        authorId: session.user.id,
        targetType: validated.targetType,
        targetId: validated.targetId,
        status: "PENDING",
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Você já denunciou este conteúdo. Aguarde análise." },
        { status: 400 }
      );
    }

    // Criar denúncia
    const report = await prisma.report.create({
      data: {
        authorId: session.user.id,
        targetType: validated.targetType,
        targetId: validated.targetId,
        reason: validated.reason,
        description: sanitizeInput(validated.description),
        evidence: validated.evidence,
        status: "PENDING",
      },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error: unknown) {
    console.error("[REPORT ERROR]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * GET /api/reports - Listar denúncias (apenas ADMIN)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? "PENDING";
    const where = status !== "ALL" && Object.values(ReportStatus).includes(status as ReportStatus)
      ? { status: status as ReportStatus }
      : {};
    const page = Number(searchParams.get("page") ?? 1);
    const limit = 20;

    const reports = await prisma.report.findMany({
      where,
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.report.count({
      where,
    });

    return NextResponse.json({
      reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error("[GET REPORTS ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

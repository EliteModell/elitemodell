export const dynamic = "force-dynamic";

import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { buildDeletionPlan, processDataDeletionJob } from "@/lib/data-deletion-worker";

const schema = z.object({
  confirmation: z.literal("EXCLUIR MINHA CONTA"),
  mode: z.enum(["SIMULATE", "EXECUTE"]).default("EXECUTE"),
});

function protocol() {
  return `LGPD-${new Date().getFullYear()}-${randomBytes(6).toString("hex").toUpperCase()}`;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  const [plan, jobs] = await Promise.all([
    buildDeletionPlan(session.user.id),
    prisma.dataDeletionJob.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        items: {
          orderBy: { createdAt: "asc" },
          select: { itemKey: true, status: true, attempts: true, error: true, completedAt: true },
        },
      },
    }),
  ]);
  return NextResponse.json({ plan, jobs }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });

  try {
    const input = schema.parse(await req.json());
    const plan = await buildDeletionPlan(session.user.id);

    if (input.mode === "SIMULATE") {
      const job = await prisma.dataDeletionJob.create({
        data: {
          userId: session.user.id,
          status: "PENDING",
          mode: "SIMULATE",
          scope: JSON.parse(JSON.stringify(plan)),
          preservation: JSON.parse(JSON.stringify(plan.preserve)),
        },
      });
      const simulated = await processDataDeletionJob(job.id);
      return NextResponse.json({
        ok: true,
        mode: "SIMULATE",
        jobId: simulated.id,
        status: simulated.status,
        plan,
        receiptHash: simulated.receiptHash,
      });
    }

    const existing = await prisma.dataDeletionJob.findFirst({
      where: {
        userId: session.user.id,
        mode: "EXECUTE",
        status: { in: ["PENDING", "PROCESSING", "RETRY", "LEGAL_HOLD"] },
      },
      orderBy: { createdAt: "desc" },
    });
    if (existing) {
      return NextResponse.json({
        ok: true,
        completed: false,
        jobId: existing.id,
        status: existing.status,
        receiptHash: existing.receiptHash,
        message: "Ja existe uma solicitacao de exclusao em processamento.",
      }, { status: 202 });
    }

    const requestProtocol = protocol();
    const receiptHash = createHash("sha256")
      .update(`${requestProtocol}:${session.user.id}:${new Date().toISOString()}`)
      .digest("hex");

    const queued = await prisma.$transaction(async (tx) => {
      const created = await tx.privacyRequest.create({
        data: {
          protocol: requestProtocol,
          userId: session.user.id,
          type: "DELETION",
          status: "RECEIVED",
          details: "Solicitacao de exclusao iniciada pelo titular.",
          receiptHash,
          events: { create: { type: "REQUEST_RECEIVED", notes: "Aguardando classificacao de dados e processamento assincrono." } },
        },
      });
      const job = await tx.dataDeletionJob.create({
        data: {
          userId: session.user.id,
          privacyRequestId: created.id,
          status: "PENDING",
          mode: "EXECUTE",
          scope: JSON.parse(JSON.stringify(plan)),
          preservation: JSON.parse(JSON.stringify(plan.preserve)),
          receiptHash,
        },
      });
      await tx.session.deleteMany({ where: { userId: session.user.id } });
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          blocked: true,
          blockedAt: new Date(),
          blockReason: "Exclusao LGPD aguardando processamento.",
        },
      });
      return { request: created, job };
    });

    return NextResponse.json({
      ok: true,
      completed: false,
      jobId: queued.job.id,
      status: queued.job.status,
      protocol: queued.request.protocol,
      receiptHash,
      plan,
      message: "Solicitacao registrada. A conta foi bloqueada operacionalmente e o processamento assincrono preservara apenas dados legalmente necessarios.",
    }, { status: 202 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Digite exatamente EXCLUIR MINHA CONTA para confirmar." }, { status: 400 });
    }
    console.error("[delete-account] falha ao registrar solicitacao");
    return NextResponse.json({ error: "Nao foi possivel registrar a solicitacao." }, { status: 500 });
  }
}

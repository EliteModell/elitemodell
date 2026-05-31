export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createVoucherFromSpin,
  normalizeVoucherPhone,
  releaseRegistrationVouchersForUser,
  voucherExpiresAt,
  VOUCHER_VISITOR_COOKIE,
} from "@/lib/voucher-roulette";

const schema = z.object({
  spinId: z.string().cuid(),
  pendingToken: z.string().min(16),
  name: z.string().min(2).max(80).optional(),
  whatsapp: z.string().min(10).max(24).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions).catch(() => null);
  const data = schema.parse(await req.json());
  const visitorId = req.cookies.get(VOUCHER_VISITOR_COOKIE)?.value ?? null;
  const phone = data.whatsapp ? normalizeVoucherPhone(data.whatsapp) : null;

  if (!session?.user?.id && (!phone || !data.name)) {
    return NextResponse.json({ error: "Informe nome e WhatsApp para salvar o voucher." }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const spin = await tx.voucherSpin.findUnique({
      where: { id: data.spinId },
      include: { prize: true, vouchers: true },
    });
    if (!spin || spin.pendingToken !== data.pendingToken) throw new Error("Prêmio temporário inválido.");
    if (!spin.prize || !["VOUCHER", "PAID_VOUCHER"].includes(spin.prize.type)) throw new Error("Este resultado não gera voucher.");
    if (spin.pendingExpiresAt && spin.pendingExpiresAt < new Date()) throw new Error("O prazo para salvar este voucher expirou.");

    const value = spin.prize.value ?? 0;
    const existingVoucher = spin.vouchers[0] ?? null;
    if (value === 100 && !session?.user?.id) {
      throw new Error("Para liberar o voucher de R$ 100, conclua seu cadastro na plataforma.");
    }

    if (session?.user?.id && existingVoucher?.status === "AWAITING_REGISTRATION") {
      await releaseRegistrationVouchersForUser({ userId: session.user.id, visitorId: spin.visitorId ?? visitorId, tx });
      const voucher = await tx.clientVoucher.findUnique({ where: { id: existingVoucher.id } });
      if (!voucher) throw new Error("Voucher não encontrado.");
      await tx.voucherSpin.update({ where: { id: spin.id }, data: { claimedAt: new Date() } });
      return voucher;
    }

    if (phone) {
      const activeVoucher = await tx.clientVoucher.findFirst({
        where: {
          OR: [{ recipientPhone: phone }, { whatsapp: phone }],
          id: existingVoucher ? { not: existingVoucher.id } : undefined,
          status: { in: ["AVAILABLE", "AWAITING_REGISTRATION"] },
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      });
      if (activeVoucher) throw new Error("Este WhatsApp já possui um voucher ativo.");
    }

    if (existingVoucher) {
      const voucher = await tx.clientVoucher.update({
        where: { id: existingVoucher.id },
        data: {
          recipientName: data.name ?? existingVoucher.recipientName,
          recipientPhone: phone || existingVoucher.recipientPhone,
          whatsapp: phone || existingVoucher.whatsapp,
          expiresAt: voucherExpiresAt(spin.prize),
        },
      });
      await tx.voucherSpin.update({
        where: { id: spin.id },
        data: {
          claimedAt: new Date(),
          recipientName: data.name ?? null,
          recipientPhone: phone,
          whatsapp: phone,
        },
      });
      return voucher;
    }

    const settings = await tx.voucherSettings.findUnique({ where: { id: "default" } });
    const voucher = await createVoucherFromSpin({
      tx,
      spin,
      prize: spin.prize,
      settings,
      clientId: session?.user?.id ?? null,
      visitorId: spin.visitorId ?? visitorId,
      recipientName: data.name ?? null,
      recipientPhone: phone,
    });
    await tx.voucherSpin.update({
      where: { id: spin.id },
      data: {
        claimedAt: new Date(),
        recipientName: data.name ?? null,
        recipientPhone: phone,
        whatsapp: phone,
      },
    });
    return voucher;
  }).catch((err) => ({ error: err instanceof Error ? err.message : "Não foi possível salvar o voucher." }));

  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ voucher: result });
}

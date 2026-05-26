export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import {
  createAsaasCustomer,
  createAsaasPixPayment,
  getAsaasConfig,
  getAsaasPixQrCode,
} from "@/lib/asaas";
import { prisma } from "@/lib/prisma";
import {
  addMs,
  getProfessionalPlanPrice,
  professionalPlanReference,
} from "@/lib/professional-plans";

const schema = z.object({
  planId: z.string().min(1),
  priceKey: z.string().min(1),
  activationMode: z.enum(["agora", "depois"]).default("agora"),
  paymentMethod: z.enum(["pix"]).default("pix"),
  payerName: z.string().optional(),
  payerCpf: z.string().optional(),
});

function nextDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });

  try {
    const data = schema.parse(await req.json());
    const resolved = getProfessionalPlanPrice(data.planId, data.priceKey);
    if (!resolved) return NextResponse.json({ error: "Plano ou duracao invalida." }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        document: true,
        premiumUntil: true,
        professional: { select: { id: true, displayName: true } },
      },
    });

    if (!user) return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 404 });
    if (!user.professional) {
      return NextResponse.json({ error: "Apenas perfis profissionais podem comprar estes planos." }, { status: 403 });
    }

    const { plan, price } = resolved;
    const now = new Date();
    const base =
      data.activationMode === "depois" && user.premiumUntil && user.premiumUntil > now
        ? user.premiumUntil
        : now;
    const premiumUntil = addMs(base, price.durationMs);
    const externalReference = professionalPlanReference({
      planId: plan.id,
      priceKey: price.key,
      activationMode: data.activationMode,
      userId: user.id,
    });

    const asaas = getAsaasConfig();
    const localPayment = await prisma.payment.create({
      data: {
        userId: user.id,
        amount: Number(price.value.toFixed(2)),
        method: "pix",
        provider: asaas.configured && asaas.productionReady ? "asaas" : "manual",
        status: "PENDING",
        externalReference,
        premiumUntil,
      },
    });

    if (!asaas.configured || !asaas.productionReady) {
      return NextResponse.json({
        localPaymentId: localPayment.id,
        provider: localPayment.provider,
        providerConfigured: false,
        status: "PENDING",
        amount: price.value,
        planName: plan.name,
        priceLabel: price.label,
        message: "Nao foi possivel gerar o Pix agora. Tente novamente ou fale com o suporte.",
      });
    }

    try {
      const customer = await createAsaasCustomer({
        name: data.payerName?.trim() || user.name || user.professional.displayName || "Profissional Elite Modell",
        email: user.email,
        cpfCnpj: data.payerCpf || user.document,
        phone: user.phone,
      });

      const description = `${plan.name} - ${price.label} - Elite Modell`;
      const asaasPayment = await createAsaasPixPayment({
        customer: customer.id,
        value: Number(price.value.toFixed(2)),
        dueDate: nextDueDate(),
        description,
        externalReference,
      });

      const pix = await getAsaasPixQrCode(asaasPayment.id);

      await prisma.payment.update({
        where: { id: localPayment.id },
        data: {
          providerPaymentId: asaasPayment.id,
          stripePaymentId: asaasPayment.id,
          pixCode: pix.payload ?? null,
          pixQrCodeBase64: pix.encodedImage ?? null,
          invoiceUrl: asaasPayment.invoiceUrl ?? null,
          boletoUrl: asaasPayment.bankSlipUrl ?? null,
        },
        select: { id: true },
      });

      return NextResponse.json({
        paymentId: asaasPayment.id,
        localPaymentId: localPayment.id,
        provider: "asaas",
        providerConfigured: true,
        environment: asaas.environment,
        status: asaasPayment.status ?? "PENDING",
        qrCode: pix.payload ?? null,
        qrCodeBase64: pix.encodedImage ?? null,
        copyPaste: pix.payload ?? null,
        ticketUrl: asaasPayment.invoiceUrl ?? null,
        expiresAt: pix.expirationDate ?? null,
        amount: price.value,
        planName: plan.name,
        priceLabel: price.label,
      });
    } catch (err) {
      await prisma.payment.update({
        where: { id: localPayment.id },
        data: { status: "FAILED" },
        select: { id: true },
      });
      console.error("[professional-plans-checkout]", err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: "Nao foi possivel gerar o Pix agora. Tente novamente ou fale com o suporte." },
        { status: 502 }
      );
    }
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    console.error("[professional-plans-checkout]", err);
    return NextResponse.json({ error: "Erro interno ao iniciar checkout." }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import {
  AsaasApiError,
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
import { getClientIP } from "@/lib/security";
import { toCents } from "@/lib/money";
import {
  PROFESSIONAL_CHECKOUT_LEGAL_KEYS,
  latestLegalDocumentVersions,
  recordUserAcceptances,
} from "@/lib/legal-acceptance";

const schema = z.object({
  planId: z.string().min(1),
  priceKey: z.string().min(1),
  productId: z.string().optional(),
  productType: z.string().optional(),
  planName: z.string().optional(),
  duration: z.string().optional(),
  price: z.number().optional(),
  points: z.number().int().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  activationMode: z.enum(["agora", "depois"]).default("agora"),
  paymentMethod: z.enum(["pix"]).default("pix"),
  pointsQuantity: z.number().int().min(10).max(15000).optional(),
  payerName: z.string().optional(),
  payerCpf: z.string().optional(),
  reviewedPurchase: z.literal(true),
  acceptedPolicies: z.literal(true),
  checkoutToken: z.string().uuid(),
});

function nextDueDate() {
  return new Date().toISOString().slice(0, 10);
}

function logCheckoutError(err: unknown, context: Record<string, unknown>) {
  const technical =
    err instanceof AsaasApiError
      ? {
          name: err.name,
          message: err.message,
          status: err.status,
          path: err.path,
        }
      : err instanceof Error
        ? { name: err.name, message: err.message }
        : err;

  console.error("[professional-plans-checkout]", {
    ...context,
    error: technical,
  });
}

function clientSafeCheckoutError(err: unknown) {
  if (err instanceof AsaasApiError) {
    if (err.status === 400) {
      return `Nao foi possivel gerar o Pix: ${err.message}`;
    }
    if (err.status === 401 || err.status === 403) {
      return "Nao foi possivel gerar o Pix agora. Configuracao do provedor recusada.";
    }
    return "Nao foi possivel gerar o Pix no Asaas agora. Tente novamente em instantes.";
  }
  return "Nao foi possivel gerar o Pix agora. Tente novamente em instantes.";
}

function cpfCnpjDigits(value?: string | null) {
  return value?.replace(/\D/g, "") ?? "";
}

function hasValidCpfCnpjLength(value?: string | null) {
  const length = cpfCnpjDigits(value).length;
  return length === 11 || length === 14;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const data = schema.parse(await req.json());
    const resolved = getProfessionalPlanPrice(data.planId, data.priceKey, data.pointsQuantity);
    if (!resolved) return NextResponse.json({ error: "Plano ou duração inválida." }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        document: true,
        premiumUntil: true,
        professional: { select: { id: true, displayName: true, freeAccessEndsAt: true } },
      },
    });

    if (!user) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    if (!user.professional) {
      return NextResponse.json({ error: "Apenas perfis profissionais podem comprar estes planos." }, { status: 403 });
    }
    const payerCpfCnpj = cpfCnpjDigits(data.payerCpf || user.document);
    if (!hasValidCpfCnpjLength(payerCpfCnpj)) {
      return NextResponse.json({ error: "Informe um CPF ou CNPJ valido para gerar o Pix." }, { status: 400 });
    }

    const { plan, price } = resolved;
    const now = new Date();
    const deferredDates = [user.premiumUntil, user.professional.freeAccessEndsAt]
      .filter((date): date is Date => Boolean(date && date > now));
    const base =
      data.activationMode === "depois" && deferredDates.length
        ? new Date(Math.max(...deferredDates.map((date) => date.getTime())))
        : now;
    const premiumUntil = addMs(base, price.durationMs);
    const externalReference = professionalPlanReference({
      planId: plan.id,
      priceKey: price.key,
      activationMode: data.activationMode,
      userId: user.id,
      pointsQuantity: plan.id === "pontos" ? plan.points : undefined,
      checkoutToken: data.checkoutToken,
    });

    const asaas = getAsaasConfig();
    if (!asaas.configured) {
      console.error("[professional-plans-checkout]", {
        userId: user.id,
        planId: plan.id,
        priceKey: price.key,
        error: "ASAAS_API_KEY não configurada.",
      });
      return NextResponse.json(
        { error: "Nao foi possivel gerar o Pix agora. Asaas nao configurado no ambiente." },
        { status: 503 }
      );
    }
    if (!asaas.productionReady) {
      console.error("[professional-plans-checkout]", {
        userId: user.id,
        planId: plan.id,
        priceKey: price.key,
        environment: asaas.environment,
        error: "Asaas em sandbox durante NODE_ENV=production.",
      });
      return NextResponse.json(
        { error: "Nao foi possivel gerar o Pix agora. Asaas esta em sandbox no ambiente de producao." },
        { status: 503 }
      );
    }

    const existingPayment = await prisma.payment.findUnique({
      where: { externalReference },
    });
    if (
      existingPayment &&
      existingPayment.userId === user.id &&
      existingPayment.status === "PENDING" &&
      existingPayment.pixCode
    ) {
      return NextResponse.json({
        paymentId: existingPayment.providerPaymentId,
        localPaymentId: existingPayment.id,
        provider: existingPayment.provider,
        status: existingPayment.providerStatus ?? existingPayment.status,
        qrCode: existingPayment.pixCode,
        qrCodeBase64: existingPayment.pixQrCodeBase64,
        copyPaste: existingPayment.pixCode,
        ticketUrl: existingPayment.invoiceUrl,
        expiresAt: existingPayment.expiresAt?.toISOString() ?? null,
        amount: existingPayment.amount,
        planName: plan.name,
        priceLabel: price.label,
        reused: true,
      });
    }

    const localPayment = await prisma.payment.create({
      data: {
        userId: user.id,
        amount: Number(price.value.toFixed(2)),
        amountCents: toCents(price.value),
        method: "pix",
        provider: "asaas",
        status: "PENDING",
        externalReference,
        premiumUntil,
      },
    });
    const durationDays = price.durationMs
      ? Math.max(1, Math.round(price.durationMs / (24 * 60 * 60 * 1000)))
      : null;
    const legalVersions = await latestLegalDocumentVersions(PROFESSIONAL_CHECKOUT_LEGAL_KEYS);
    const boostVersion = legalVersions.get("boost-terms") ?? legalVersions.get("payments-policy");
    const refundVersion = legalVersions.get("refund-policy");
    await recordUserAcceptances({
      userId: user.id,
      userCategory: session.user.accountType,
      documentKeys: PROFESSIONAL_CHECKOUT_LEGAL_KEYS,
      source: "professional-plan-checkout",
      acceptanceType: "CHECKOUT",
      req,
    });
    const disclosure = [
      plan.id,
      price.key,
      Number(price.value.toFixed(2)),
      durationDays,
      base.toISOString(),
      premiumUntil.toISOString(),
      "pagamento-unico-pix",
      "sem-renovacao-automatica",
      "sem-garantia-de-resultados",
    ].join("|");
    await prisma.checkoutAcceptance.create({
      data: {
        userId: user.id,
        paymentId: localPayment.id,
        productId: plan.id,
        productName: plan.name,
        dailyPrice: durationDays ? Number((price.value / durationDays).toFixed(2)) : null,
        totalPrice: Number(price.value.toFixed(2)),
        durationDays,
        startsAt: base,
        expectedEndsAt: premiumUntil,
        termsVersionId: boostVersion?.id ?? null,
        refundPolicyVersionId: refundVersion?.id ?? null,
        termsHash: boostVersion?.contentHash ?? createHash("sha256").update(`boost-terms:${disclosure}`).digest("hex"),
        refundPolicyHash: refundVersion?.contentHash ?? createHash("sha256").update(`refund-policy:${disclosure}`).digest("hex"),
        ipAddress: getClientIP(req),
        userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
        sessionId: req.cookies.get("next-auth.session-token")?.value
          ? createHash("sha256").update(req.cookies.get("next-auth.session-token")!.value).digest("hex")
          : null,
        route: new URL(req.url).pathname,
        language: "pt-BR",
        acceptanceType: "CHECKOUT",
        required: true,
      },
    });

    try {
      const customer = await createAsaasCustomer({
        name: data.payerName?.trim() || user.name || user.professional.displayName || "Profissional Elite Modell",
        email: user.email,
        cpfCnpj: payerCpfCnpj,
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
      if (!pix.payload || !pix.encodedImage) {
        throw new Error("Asaas criou a cobrança, mas não retornou QR Code Pix completo.");
      }

      await prisma.payment.update({
        where: { id: localPayment.id },
        data: {
          providerPaymentId: asaasPayment.id,
          stripePaymentId: asaasPayment.id,
          pixCode: pix.payload,
          pixQrCodeBase64: pix.encodedImage,
          invoiceUrl: asaasPayment.invoiceUrl ?? null,
          boletoUrl: asaasPayment.bankSlipUrl ?? null,
          providerStatus: asaasPayment.status ?? "PENDING",
          providerUpdatedAt: new Date(),
          expiresAt: pix.expirationDate ? new Date(pix.expirationDate) : null,
        },
        select: { id: true },
      });

      console.info("[professional-plans-checkout] Pix criado", {
        userId: user.id,
        professionalId: user.professional.id,
        localPaymentId: localPayment.id,
        providerPaymentId: asaasPayment.id,
        planId: plan.id,
        priceKey: price.key,
        amount: Number(price.value.toFixed(2)),
        environment: asaas.environment,
        hasQrCode: Boolean(pix.encodedImage),
        hasCopyPaste: Boolean(pix.payload),
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
      logCheckoutError(err, {
        userId: user.id,
        professionalId: user.professional.id,
        localPaymentId: localPayment.id,
        planId: plan.id,
        priceKey: price.key,
        amount: Number(price.value.toFixed(2)),
        environment: asaas.environment,
      });
      return NextResponse.json(
        { error: clientSafeCheckoutError(err) },
        { status: 502 }
      );
    }
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    console.error("[professional-plans-checkout]", err);
    return NextResponse.json({ error: "Erro interno ao iniciar checkout." }, { status: 500 });
  }
}

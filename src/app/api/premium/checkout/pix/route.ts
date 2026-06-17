export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import {
  AsaasApiError,
  createAsaasCustomer,
  createAsaasPixPayment,
  getAsaasConfig,
  getAsaasPixQrCode,
} from "@/lib/asaas";
import {
  getPremiumUpsellPlan,
  PREMIUM_UPSELL_PLAN_IDS,
  premiumUpsellUntil,
  resolvePremiumUpsellPrice,
  type PremiumUpsellPlanId,
} from "@/lib/client-plans";
import {
  CHECKOUT_LEGAL_KEYS,
  latestLegalDocumentVersions,
  recordUserAcceptances,
} from "@/lib/legal-acceptance";
import { toCents } from "@/lib/money";
import {
  hashPremiumClaimToken,
  hashPurchaserDocument,
  newPremiumClaimToken,
  normalizePurchaserEmail,
  PREMIUM_CLAIM_COOKIE,
  PREMIUM_CLAIM_MAX_AGE_SECONDS,
  premiumClaimCookieValue,
} from "@/lib/premium-checkout";
import { prisma } from "@/lib/prisma";
import {
  enforceRateLimitAsync,
  getClientIP,
  isValidBRPhone,
  isValidCPF,
} from "@/lib/security";

const schema = z.object({
  planId: z.enum(PREMIUM_UPSELL_PLAN_IDS),
  checkoutToken: z.string().uuid(),
  payerName: z.string().trim().min(2).max(120),
  payerEmail: z.string().trim().email().max(254),
  payerCpf: z.string().min(11).max(18),
  payerPhone: z.string().min(10).max(24),
  acceptedTerms: z.literal(true),
  ageConfirmed: z.literal(true),
});

function nextDueDate() {
  return new Date().toISOString().slice(0, 10);
}

function json(value: Record<string, unknown>): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
}

function safeProviderError(error: unknown) {
  if (error instanceof AsaasApiError) {
    if (error.status === 400) return `Nao foi possivel gerar o Pix: ${error.message}`;
    if (error.status === 401 || error.status === 403) {
      return "O provedor de pagamento recusou a configuracao atual.";
    }
  }
  return "Nao foi possivel gerar o Pix agora. Tente novamente em instantes.";
}

async function firstPremiumPurchase(userId: string | null, email: string) {
  const knownUser = userId
    ? { id: userId }
    : await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

  const [paidByUser, paidByIntent] = await Promise.all([
    knownUser
      ? prisma.payment.findFirst({
          where: {
            userId: knownUser.id,
            status: "PAID",
            premiumUntil: { not: null },
          },
          select: { id: true },
        })
      : null,
    prisma.premiumPurchaseIntent.findFirst({
      where: {
        purchaserEmail: email,
        payment: { status: "PAID" },
      },
      select: { id: true },
    }),
  ]);

  return !paidByUser && !paidByIntent;
}

export async function POST(req: NextRequest) {
  const ipAddress = getClientIP(req);
  const limited = await enforceRateLimitAsync(
    `premium-pix:${ipAddress}`,
    8,
    15 * 60 * 1000,
    "Muitas tentativas de checkout. Aguarde alguns minutos.",
  );
  if (limited) return limited;

  const session = await getServerSession(authOptions).catch(() => null);
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Revise os dados minimos do pagamento e os aceites obrigatorios." },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const cpf = data.payerCpf.replace(/\D/g, "");
  const phone = data.payerPhone.replace(/\D/g, "");
  if (!isValidCPF(cpf)) {
    return NextResponse.json({ error: "Informe um CPF valido para gerar o Pix." }, { status: 400 });
  }
  if (!isValidBRPhone(phone)) {
    return NextResponse.json({ error: "Informe um telefone brasileiro valido." }, { status: 400 });
  }

  const asaas = getAsaasConfig();
  if (!asaas.configured) {
    return NextResponse.json({ error: "Pagamento Pix indisponivel no momento." }, { status: 503 });
  }
  if (!asaas.productionReady) {
    return NextResponse.json(
      { error: "O checkout real ainda nao esta habilitado neste ambiente." },
      { status: 503 },
    );
  }

  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          document: true,
          accountType: true,
          premiumUntil: true,
        },
      })
    : null;
  const purchaserEmail = normalizePurchaserEmail(user?.email ?? data.payerEmail);
  const purchaserName = user?.name?.trim() || data.payerName;
  const storedPhone = user?.phone?.replace(/\D/g, "") ?? "";
  const storedCpf = user?.document?.replace(/\D/g, "") ?? "";
  const purchaserPhone = isValidBRPhone(storedPhone) ? storedPhone : phone;
  const purchaserCpf = isValidCPF(storedCpf) ? storedCpf : cpf;

  if (!isValidCPF(purchaserCpf)) {
    return NextResponse.json({ error: "Informe um CPF valido para gerar o Pix." }, { status: 400 });
  }

  const purchaserAccount = user ?? await prisma.user.findUnique({
    where: { email: purchaserEmail },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      document: true,
      accountType: true,
      premiumUntil: true,
    },
  });
  const activePremiumUntil = purchaserAccount?.premiumUntil ?? null;
  if (activePremiumUntil && activePremiumUntil > new Date()) {
    return NextResponse.json(
      { error: "Este e-mail ja possui acesso Premium ativo. Entre na conta para continuar." },
      { status: 409 },
    );
  }

  const plan = getPremiumUpsellPlan(data.planId as PremiumUpsellPlanId);
  const isFirstPurchase = await firstPremiumPurchase(user?.id ?? null, purchaserEmail);
  const amount = resolvePremiumUpsellPrice(plan, isFirstPurchase);
  const now = new Date();
  const premiumUntil = premiumUpsellUntil(plan, now);
  const externalReference = `premium-intent:${plan.id}:${data.checkoutToken}`;

  const existing = await prisma.payment.findUnique({
    where: { externalReference },
    include: { premiumPurchase: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Esta tentativa de checkout ja foi utilizada. Inicie uma nova tentativa." },
      { status: 409 },
    );
  }

  const legalVersions = await latestLegalDocumentVersions(CHECKOUT_LEGAL_KEYS);
  const checkoutVersion =
    legalVersions.get("checkout-notice") ?? legalVersions.get("payments-policy");
  const refundVersion = legalVersions.get("refund-policy");
  if (!checkoutVersion || !refundVersion) {
    return NextResponse.json(
      { error: "Os documentos vigentes do checkout estao temporariamente indisponiveis." },
      { status: 503 },
    );
  }

  if (user) {
    await recordUserAcceptances({
      userId: user.id,
      userCategory: user.accountType,
      documentKeys: CHECKOUT_LEGAL_KEYS,
      source: "premium-upsell-pix",
      acceptanceType: "CHECKOUT",
      req,
      throwOnError: true,
    });
  }

  const claimToken = newPremiumClaimToken();
  const claimTokenHash = hashPremiumClaimToken(claimToken);
  const description = `Elite Modell Premium - ${plan.durationLabel}`;
  let intentData: {
    payment: { id: string };
    intent: { id: string };
  };
  try {
    intentData = await prisma.$transaction(async (tx) => {
      const unresolvedPurchase = await tx.premiumPurchaseIntent.findFirst({
        where: {
          purchaserEmail,
          OR: [
            {
              status: "PAYMENT_PENDING",
              createdAt: { gt: new Date(Date.now() - 30 * 60 * 1000) },
            },
            {
              status: { in: ["PAID_AWAITING_ACCOUNT", "CLAIM_PROCESSING"] },
              createdAt: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
          ],
        },
        select: { id: true },
      });
      if (unresolvedPurchase) throw new Error("PREMIUM_PURCHASE_PENDING");

      const payment = await tx.payment.create({
        data: {
          userId: user?.id ?? null,
          amount,
          amountCents: toCents(amount),
          method: "pix",
          provider: "asaas",
          status: "PENDING",
          externalReference,
          premiumUntil,
        },
      });
      const intent = await tx.premiumPurchaseIntent.create({
        data: {
          paymentId: payment.id,
          planId: plan.id,
          status: "PAYMENT_PENDING",
          claimTokenHash,
          purchaserName,
          purchaserEmail,
          purchaserPhone,
          purchaserDocumentHash: hashPurchaserDocument(purchaserCpf),
          purchaserDocumentLast4: purchaserCpf.slice(-4),
          ipAddress,
          userAgent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
          termsVersionId: checkoutVersion.id,
          refundPolicyVersionId: refundVersion.id,
          termsHash: checkoutVersion.contentHash,
          refundPolicyHash: refundVersion.contentHash,
          acceptedAt: now,
          claimedByUserId: user?.id ?? null,
          claimedAt: user ? now : null,
          events: {
            create: {
              type: "PURCHASE_ATTEMPT_REGISTERED",
              metadata: json({
                planId: plan.id,
                amount,
                authenticated: Boolean(user),
                provider: "asaas",
              }),
            },
          },
        },
      });
      return { payment, intent };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5_000,
      timeout: 10_000,
    });
  } catch (error) {
    if (
      (error instanceof Error && error.message === "PREMIUM_PURCHASE_PENDING") ||
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")
    ) {
      return NextResponse.json(
        { error: "Ja existe uma compra Premium pendente para este e-mail neste periodo." },
        { status: 409 },
      );
    }
    throw error;
  }

  if (user) {
    await prisma.checkoutAcceptance.create({
      data: {
        userId: user.id,
        paymentId: intentData.payment.id,
        productId: plan.id,
        productName: description,
        totalPrice: amount,
        durationDays: plan.durationMs
          ? Math.max(1, Math.round(plan.durationMs / (24 * 60 * 60 * 1000)))
          : 30,
        startsAt: now,
        expectedEndsAt: premiumUntil,
        termsVersionId: checkoutVersion.id,
        refundPolicyVersionId: refundVersion.id,
        termsHash: checkoutVersion.contentHash,
        refundPolicyHash: refundVersion.contentHash,
        ipAddress,
        userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
        route: new URL(req.url).pathname,
        language: "pt-BR",
        acceptanceType: "CHECKOUT",
        required: true,
        acceptedAt: now,
      },
    });
  }

  try {
    const customer = await createAsaasCustomer({
      name: purchaserName,
      email: purchaserEmail,
      cpfCnpj: purchaserCpf,
      phone: purchaserPhone,
    });
    const providerPayment = await createAsaasPixPayment({
      customer: customer.id,
      value: Number(amount.toFixed(2)),
      dueDate: nextDueDate(),
      description,
      externalReference,
    });
    const pix = await getAsaasPixQrCode(providerPayment.id);
    if (!pix.payload || !pix.encodedImage) {
      throw new Error("O provedor nao retornou um QR Code Pix completo.");
    }

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: intentData.payment.id },
        data: {
          providerPaymentId: providerPayment.id,
          stripePaymentId: providerPayment.id,
          pixCode: pix.payload,
          pixQrCodeBase64: pix.encodedImage,
          invoiceUrl: providerPayment.invoiceUrl ?? null,
          providerStatus: providerPayment.status ?? "PENDING",
          providerUpdatedAt: new Date(),
          expiresAt: pix.expirationDate ? new Date(pix.expirationDate) : null,
        },
      }),
      prisma.premiumPurchaseEvent.create({
        data: {
          intentId: intentData.intent.id,
          type: "PIX_CREATED",
          metadata: json({
            providerPaymentId: providerPayment.id,
            providerStatus: providerPayment.status ?? "PENDING",
          }),
        },
      }),
    ]);

    const response = NextResponse.json({
      intentId: intentData.intent.id,
      localPaymentId: intentData.payment.id,
      status: providerPayment.status ?? "PENDING",
      qrCode: pix.payload,
      qrCodeBase64: pix.encodedImage,
      copyPaste: pix.payload,
      expiresAt: pix.expirationDate ?? null,
      amount,
      plan: {
        id: plan.id,
        label: plan.label,
        durationLabel: plan.durationLabel,
      },
      authenticated: Boolean(user),
    });
    response.cookies.set(
      PREMIUM_CLAIM_COOKIE,
      premiumClaimCookieValue(intentData.intent.id, claimToken),
      {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: PREMIUM_CLAIM_MAX_AGE_SECONDS,
      },
    );
    return response;
  } catch (error) {
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: intentData.payment.id },
        data: {
          status: "FAILED",
          benefitStatus: "FAILED",
          benefitError: error instanceof Error ? error.message.slice(0, 500) : "provider_error",
        },
      }),
      prisma.premiumPurchaseIntent.update({
        where: { id: intentData.intent.id },
        data: { status: "PAYMENT_FAILED" },
      }),
      prisma.premiumPurchaseEvent.create({
        data: {
          intentId: intentData.intent.id,
          type: "PIX_CREATION_FAILED",
          metadata: json({
            error: error instanceof Error ? error.message.slice(0, 240) : "unknown",
          }),
        },
      }),
    ]).catch(() => undefined);
    console.error("[premium-upsell-pix] provider_error", {
      intentId: intentData.intent.id,
      paymentId: intentData.payment.id,
      error: error instanceof Error ? error.message : error,
    });
    return NextResponse.json({ error: safeProviderError(error) }, { status: 502 });
  }
}

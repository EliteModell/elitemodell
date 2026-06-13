import "server-only";

import type { PaymentStatus, Prisma } from "@prisma/client";
import {
  cancelAsaasPayment,
  getAsaasPayment,
  isAsaasPaidStatus,
  refundAsaasPayment,
  sanitizeAsaasPayment,
  type AsaasPayment,
} from "@/lib/asaas";
import { fromCents, toCents } from "@/lib/money";
import { applyPaidPaymentEffects, reversePaidPaymentEffects } from "@/lib/payment-effects";
import { prisma } from "@/lib/prisma";

type OperationInput = {
  paymentId: string;
  adminId: string;
  reason: string;
  confirmation: string;
  idempotencyKey: string;
};

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function localStatus(remote: AsaasPayment, current: PaymentStatus): PaymentStatus {
  const status = remote.status;
  const valueCents = toCents(remote.value ?? 0);
  const refundedCents = toCents(remote.refundedValue ?? 0);
  if (refundedCents > 0) {
    return valueCents > 0 && refundedCents < valueCents ? "PARTIALLY_REFUNDED" : "REFUNDED";
  }
  if (isAsaasPaidStatus(status)) return "PAID";
  if (status === "REFUNDED") {
    return "REFUNDED";
  }
  if (status === "DELETED") return "CANCELLED";
  if (status === "OVERDUE") return "EXPIRED";
  if (status?.includes("CHARGEBACK")) return "CHARGEBACK";
  if (["PENDING", "AWAITING_RISK_ANALYSIS"].includes(status ?? "")) return "PENDING";
  return current;
}

async function paymentForProvider(paymentId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new Error("Pagamento nao encontrado.");
  if (payment.provider !== "asaas" || !payment.providerPaymentId) {
    throw new Error("Pagamento sem cobranca Asaas vinculada.");
  }
  return payment;
}

async function beginOperation(
  input: OperationInput,
  type: string,
  amountCents?: number,
) {
  const existing = await prisma.paymentOperation.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) return { operation: existing, duplicate: true };
  const payment = await prisma.payment.findUniqueOrThrow({
    where: { id: input.paymentId },
    select: { status: true },
  });
  const operation = await prisma.paymentOperation.create({
    data: {
      paymentId: input.paymentId,
      adminId: input.adminId,
      type,
      amountCents,
      previousStatus: payment.status,
      reason: input.reason,
      confirmation: input.confirmation,
      idempotencyKey: input.idempotencyKey,
    },
  });
  return { operation, duplicate: false };
}

async function failOperation(operationId: string, cause: unknown) {
  const error = cause instanceof Error ? cause.message : "Falha desconhecida.";
  await prisma.paymentOperation.update({
    where: { id: operationId },
    data: { status: "FAILED", error, completedAt: new Date() },
  }).catch(() => undefined);
}

async function auditOperation(input: OperationInput, type: string, details: Record<string, unknown>) {
  await prisma.auditLog.create({
    data: {
      adminId: input.adminId,
      actorIdentifier: input.adminId,
      action: type === "REFUND" ? "PAYMENT_REFUNDED" : "PAYMENT_PROCESSED",
      targetType: "PAYMENT",
      targetId: input.paymentId,
      reason: input.reason,
      changes: json(details),
    },
  });
}

export async function syncAsaasPaymentSnapshot(paymentId: string, remote: AsaasPayment) {
  const current = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
  const nextStatus = localStatus(remote, current.status);
  const refundedAmountCents = toCents(remote.refundedValue ?? (nextStatus === "REFUNDED" ? remote.value ?? current.amount : 0));
  const updated = await prisma.payment.update({
    where: { id: current.id },
    data: {
      status: nextStatus,
      providerStatus: remote.status ?? null,
      providerUpdatedAt: new Date(),
      lastReconciledAt: new Date(),
      refundedAmountCents,
      refundAmount: refundedAmountCents ? fromCents(refundedAmountCents) : current.refundAmount,
      refundedAt: refundedAmountCents ? current.refundedAt ?? new Date() : current.refundedAt,
      cancelledAt: nextStatus === "CANCELLED" ? current.cancelledAt ?? new Date() : current.cancelledAt,
      invoiceUrl: remote.invoiceUrl ?? current.invoiceUrl,
      boletoUrl: remote.bankSlipUrl ?? current.boletoUrl,
    },
  });

  if (nextStatus === "PAID") {
    await applyPaidPaymentEffects(current.id);
  } else if (nextStatus === "REFUNDED" || nextStatus === "CHARGEBACK") {
    await reversePaidPaymentEffects(current.id);
    if (current.bookingId && nextStatus === "CHARGEBACK") {
      await prisma.booking.update({
        where: { id: current.bookingId },
        data: { paymentStatus: nextStatus, disputeStatus: "OPEN" },
      });
    }
  } else if (current.bookingId && ["CANCELLED", "EXPIRED"].includes(nextStatus)) {
    await prisma.booking.update({
      where: { id: current.bookingId },
      data: {
        paymentStatus: nextStatus,
        ...(nextStatus === "CANCELLED" ? { status: "CANCELLED", cancelledAt: new Date() } : {}),
      },
    });
  }
  return updated;
}

export async function reconcileAsaasPayment(input: OperationInput) {
  const { operation, duplicate } = await beginOperation(input, "RECONCILE");
  if (duplicate && operation.status === "COMPLETED") {
    return prisma.payment.findUniqueOrThrow({ where: { id: input.paymentId } });
  }
  try {
    const payment = await paymentForProvider(input.paymentId);
    const remote = await getAsaasPayment(payment.providerPaymentId!);
    const updated = await syncAsaasPaymentSnapshot(payment.id, remote);
    await prisma.paymentOperation.update({
      where: { id: operation.id },
      data: {
        status: "COMPLETED",
        nextStatus: updated.status,
        providerStatus: remote.status ?? null,
        providerResponse: json(sanitizeAsaasPayment(remote)),
        completedAt: new Date(),
        error: null,
      },
    });
    await auditOperation(input, "RECONCILE", {
      previousStatus: operation.previousStatus,
      nextStatus: updated.status,
      providerStatus: remote.status ?? null,
    });
    return updated;
  } catch (cause) {
    await failOperation(operation.id, cause);
    throw cause;
  }
}

export async function cancelPendingAsaasPayment(input: OperationInput) {
  const { operation, duplicate } = await beginOperation(input, "CANCEL");
  if (duplicate && operation.status === "COMPLETED") {
    return prisma.payment.findUniqueOrThrow({ where: { id: input.paymentId } });
  }
  try {
    const payment = await paymentForProvider(input.paymentId);
    const before = await getAsaasPayment(payment.providerPaymentId!);
    if (isAsaasPaidStatus(before.status) || before.status === "REFUNDED") {
      throw new Error("Cobranca confirmada nao pode ser cancelada; use reembolso.");
    }
    const remote = await cancelAsaasPayment(payment.providerPaymentId!);
    const updated = await syncAsaasPaymentSnapshot(payment.id, { ...remote, status: remote.status ?? "DELETED" });
    await prisma.paymentOperation.update({
      where: { id: operation.id },
      data: {
        status: "COMPLETED",
        nextStatus: updated.status,
        providerStatus: remote.status ?? "DELETED",
        providerResponse: json(sanitizeAsaasPayment(remote)),
        completedAt: new Date(),
      },
    });
    await auditOperation(input, "CANCEL", {
      previousStatus: operation.previousStatus,
      nextStatus: updated.status,
      providerStatus: remote.status ?? "DELETED",
    });
    return updated;
  } catch (cause) {
    await failOperation(operation.id, cause);
    throw cause;
  }
}

export async function refundAsaasPaymentOperation(
  input: OperationInput & { amountCents?: number },
) {
  const payment = await paymentForProvider(input.paymentId);
  const totalCents = payment.amountCents ?? toCents(payment.amount);
  const remainingCents = totalCents - payment.refundedAmountCents;
  const amountCents = input.amountCents ?? remainingCents;
  if (!Number.isInteger(amountCents) || amountCents <= 0 || amountCents > remainingCents) {
    throw new Error("Valor de reembolso invalido.");
  }

  const { operation, duplicate } = await beginOperation(input, "REFUND", amountCents);
  if (duplicate && operation.status === "COMPLETED") {
    return prisma.payment.findUniqueOrThrow({ where: { id: input.paymentId } });
  }
  try {
    const before = await getAsaasPayment(payment.providerPaymentId!);
    if (!isAsaasPaidStatus(before.status) && before.status !== "REFUNDED") {
      throw new Error("O Asaas nao confirma este pagamento como elegivel para reembolso.");
    }
    const partial = amountCents < remainingCents;
    const remote = await refundAsaasPayment(payment.providerPaymentId!, {
      value: partial ? fromCents(amountCents) : undefined,
      description: input.reason.slice(0, 250),
    });
    const cumulativeRefundCents = payment.refundedAmountCents + amountCents;
    const nextStatus: PaymentStatus = cumulativeRefundCents >= totalCents
      ? "REFUNDED"
      : "PARTIALLY_REFUNDED";
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: nextStatus,
        providerStatus: remote.status ?? (partial ? "PARTIALLY_REFUNDED" : "REFUNDED"),
        providerUpdatedAt: new Date(),
        lastReconciledAt: new Date(),
        refundedAmountCents: cumulativeRefundCents,
        refundAmount: fromCents(cumulativeRefundCents),
        refundedAt: new Date(),
      },
    });
    if (nextStatus === "REFUNDED") await reversePaidPaymentEffects(payment.id);
    if (payment.bookingId) {
      await prisma.bookingFinancialEvent.create({
        data: {
          bookingId: payment.bookingId,
          paymentId: payment.id,
          type: partial ? "PARTIAL_REFUND" : "FULL_REFUND",
          status: "COMPLETED",
          refundCents: amountCents,
          reason: input.reason,
          metadata: json({ providerStatus: remote.status ?? null }),
        },
      });
    }
    await prisma.paymentOperation.update({
      where: { id: operation.id },
      data: {
        status: "COMPLETED",
        nextStatus,
        providerStatus: remote.status ?? null,
        providerResponse: json(sanitizeAsaasPayment(remote)),
        completedAt: new Date(),
      },
    });
    await auditOperation(input, "REFUND", {
      previousStatus: operation.previousStatus,
      nextStatus,
      amountCents,
      providerStatus: remote.status ?? null,
    });
    return updated;
  } catch (cause) {
    await failOperation(operation.id, cause);
    throw cause;
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireHostPanel } from "@/lib/account-access";

async function updateHostBooking(formData: FormData, status: "CONFIRMED" | "REJECTED" | "COMPLETED") {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const access = await requireHostPanel();
  const booking = await prisma.booking.findFirst({
    where: access.isAdmin ? { id } : { id, property: { hostId: access.user.id } },
    select: { id: true, status: true, paymentStatus: true, totalPriceCents: true, serviceFeeCents: true, hostPayoutCents: true },
  });
  if (!booking) return;
  if (status === "CONFIRMED" && booking.status !== "PENDING") return;
  if (status === "REJECTED" && booking.status !== "PENDING") return;
  if (status === "REJECTED" && booking.paymentStatus === "PAID") return;
  if (status === "COMPLETED" && booking.status !== "CONFIRMED") return;

  await prisma.$transaction([
    prisma.booking.update({
      where: { id: booking.id },
      data: { status },
      select: { id: true },
    }),
    prisma.bookingFinancialEvent.create({
      data: {
        bookingId: booking.id,
        type: status === "CONFIRMED" ? "HOST_CONFIRMED" : status === "REJECTED" ? "HOST_REJECTED" : "STAY_COMPLETED",
        status: "COMPLETED",
        grossCents: booking.totalPriceCents,
        platformFeeCents: booking.serviceFeeCents,
        hostNetCents: booking.hostPayoutCents,
      },
    }),
  ]);

  revalidatePath("/anfitriao");
  revalidatePath("/anfitriao/reservas");
}

export async function acceptBooking(formData: FormData) {
  await updateHostBooking(formData, "CONFIRMED");
}

export async function rejectBooking(formData: FormData) {
  await updateHostBooking(formData, "REJECTED");
}

export async function completeBooking(formData: FormData) {
  await updateHostBooking(formData, "COMPLETED");
}

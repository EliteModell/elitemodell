import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const settings = await prisma.platformSettings.findUnique({
    where: { id: "default" },
    select: { bookingServiceFeeBps: true },
  });
  const serviceFeeBasisPoints = settings?.bookingServiceFeeBps ?? 1_000;
  return NextResponse.json(
    {
      serviceFeeBasisPoints,
      platformPercentage: serviceFeeBasisPoints / 100,
      hostPercentage: (10_000 - serviceFeeBasisPoints) / 100,
    },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
  );
}

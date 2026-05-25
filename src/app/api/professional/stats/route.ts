export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });

  const professional = await prisma.professional.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      profileViews: true,
      contactClicks: true,
      totalReviews: true,
      rating: true,
      favorites: { select: { id: true } },
    },
  });

  if (!professional) return NextResponse.json({ error: "Perfil profissional nao encontrado." }, { status: 404 });

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const events = await prisma.professionalProfileEvent.findMany({
    where: { professionalId: professional.id, createdAt: { gte: since } },
    select: { eventType: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const byType = events.reduce<Record<string, number>>((acc, event) => {
    acc[event.eventType] = (acc[event.eventType] ?? 0) + 1;
    return acc;
  }, {});

  const dailyMap = new Map<string, { date: string; views: number; contacts: number }>();
  for (let index = 13; index >= 0; index -= 1) {
    const date = startOfDay(new Date(Date.now() - index * 24 * 60 * 60 * 1000));
    const key = date.toISOString().slice(0, 10);
    dailyMap.set(key, { date: key, views: 0, contacts: 0 });
  }

  for (const event of events) {
    const key = startOfDay(event.createdAt).toISOString().slice(0, 10);
    const item = dailyMap.get(key);
    if (!item) continue;
    if (event.eventType === "profile_view") item.views += 1;
    if (event.eventType === "contact_click") item.contacts += 1;
  }

  return NextResponse.json({
    totals: {
      views: professional.profileViews,
      contacts: professional.contactClicks,
      favorites: professional.favorites.length,
      reviews: professional.totalReviews,
      rating: professional.rating,
    },
    last30Days: {
      views: byType.profile_view ?? 0,
      contacts: byType.contact_click ?? 0,
      favorites: byType.favorite ?? 0,
    },
    daily: Array.from(dailyMap.values()),
  });
}

import type { DashboardHomeData } from "@/components/dashboard/PremiumDashboardHome";
import type { PremiumProfileData } from "@/components/dashboard/PremiumProfile";
import { prisma } from "@/lib/prisma";

type DashboardUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  phone: string | null;
  role: string;
  verified: boolean;
  credits: number;
  emailVerified?: Date | null;
  createdAt: Date;
  birthDate: Date | null;
  termsConsent: boolean;
  lgpdConsent: boolean;
  _count: {
    favorites: number;
    bookingsAsGuest: number;
    clientAppointments: number;
    reviews: number;
  };
};

function iso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function getVipLevel({
  completedBookings,
  favorites,
  appointments,
  credits,
  verified,
}: {
  completedBookings: number;
  favorites: number;
  appointments: number;
  credits: number;
  verified: boolean;
}) {
  const score =
    completedBookings * 18 +
    favorites * 8 +
    appointments * 12 +
    (verified ? 20 : 0) +
    Math.min(credits / 20, 25);
  const progress = Math.min(100, Math.round(score));

  if (score >= 80) {
    return {
      label: "Elite Black",
      description: "Prioridade, curadoria avançada e experiência mais personalizada.",
      progress,
    };
  }

  if (score >= 45) {
    return {
      label: "Gold",
      description: "Perfil aquecido, recomendações mais precisas e vantagens em evolução.",
      progress,
    };
  }

  if (score >= 20) {
    return {
      label: "Plus",
      description: "Primeiros sinais de preferência já estão moldando seu feed.",
      progress,
    };
  }

  return {
    label: "Essencial",
    description: "Complete seu perfil e salve favoritos para subir de nível.",
    progress,
  };
}

function getOnboarding(user: DashboardUser, city: string | null, favorites: number, activeBookings: number) {
  return [
    {
      label: "Perfil com identidade",
      done: Boolean(user.name && user.email && user.image),
      detail: "Nome, email e avatar deixam o painel pessoal desde o primeiro acesso.",
    },
    {
      label: "Contato e cidade",
      done: Boolean(user.phone && city),
      detail: "Telefone e cidade preferida ajudam a priorizar recomendações relevantes.",
    },
    {
      label: "Segurança +18",
      done: Boolean(user.birthDate && user.termsConsent && user.lgpdConsent),
      detail: "Dados de elegibilidade e privacidade mantêm a experiência segura.",
    },
    {
      label: "Curadoria inicial",
      done: favorites > 0,
      detail: "Favoritos ensinam o sistema a montar um feed com mais intenção.",
    },
    {
      label: "Primeira reserva",
      done: activeBookings > 0,
      detail: "Sua agenda aparece aqui assim que uma experiência for iniciada.",
    },
  ];
}

async function getCoreData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      phone: true,
      role: true,
      verified: true,
      credits: true,
      emailVerified: true,
      createdAt: true,
      birthDate: true,
      termsConsent: true,
      lgpdConsent: true,
      _count: {
        select: {
          favorites: true,
          bookingsAsGuest: true,
          clientAppointments: true,
          reviews: true,
        },
      },
    },
  });

  if (!user) return null;

  const [
    activeBookings,
    completedBookings,
    recentBookings,
    recentFavorites,
    recentAppointments,
    recommendedProperties,
    recommendedProfessionals,
  ] = await Promise.all([
    prisma.booking.count({
      where: { guestId: userId, status: { in: ["PENDING", "CONFIRMED"] } },
    }),
    prisma.booking.count({
      where: { guestId: userId, status: "COMPLETED" },
    }),
    prisma.booking.findMany({
      where: { guestId: userId },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        status: true,
        checkIn: true,
        createdAt: true,
        property: {
          select: {
            title: true,
            city: true,
            photos: {
              orderBy: [{ order: "asc" }, { createdAt: "asc" }],
              take: 1,
              select: { url: true },
            },
          },
        },
      },
    }),
    prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        createdAt: true,
        property: {
          select: {
            id: true,
            title: true,
            city: true,
            pricePerNight: true,
            photos: {
              orderBy: [{ order: "asc" }, { createdAt: "asc" }],
              take: 1,
              select: { url: true },
            },
          },
        },
      },
    }),
    prisma.appointment.findMany({
      where: { clientId: userId },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        status: true,
        date: true,
        createdAt: true,
        professional: {
          select: {
            displayName: true,
            city: true,
            state: true,
            image: true,
          },
        },
      },
    }),
    prisma.property.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ rating: "desc" }, { totalReviews: "desc" }, { createdAt: "desc" }],
      take: 5,
      select: {
        id: true,
        title: true,
        city: true,
        bairro: true,
        pricePerNight: true,
        rating: true,
        photos: {
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          take: 1,
          select: { url: true },
        },
      },
    }),
    prisma.professional.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ featured: "desc" }, { rating: "desc" }, { totalReviews: "desc" }, { createdAt: "desc" }],
      take: 6,
      select: {
        id: true,
        slug: true,
        displayName: true,
        city: true,
        state: true,
        rating: true,
        verified: true,
        featured: true,
        pricePerHour: true,
        priceMin: true,
        image: true,
      },
    }),
  ]);

  const city =
    recentFavorites[0]?.property.city ??
    recentBookings[0]?.property.city ??
    recentAppointments[0]?.professional.city ??
    null;

  const vip = getVipLevel({
    completedBookings,
    favorites: user._count.favorites,
    appointments: user._count.clientAppointments,
    credits: user.credits,
    verified: user.verified,
  });

  const onboarding = getOnboarding(user, city, user._count.favorites, activeBookings);

  return {
    user,
    activeBookings,
    completedBookings,
    recentBookings,
    recentFavorites,
    recentAppointments,
    recommendedProperties,
    recommendedProfessionals,
    city,
    vip,
    onboarding,
  };
}

export async function getDashboardHomeData(userId: string): Promise<DashboardHomeData | null> {
  const data = await getCoreData(userId);
  if (!data) return null;

  const user = data.user;

  return {
    user: {
      name: user.name,
      email: user.email,
      image: user.image,
      phone: user.phone,
      verified: user.verified,
      credits: user.credits,
      createdAt: user.createdAt.toISOString(),
      birthDate: iso(user.birthDate),
      termsConsent: user.termsConsent,
      lgpdConsent: user.lgpdConsent,
    },
    city: data.city,
    vip: data.vip,
    stats: {
      activeBookings: data.activeBookings,
      completedBookings: data.completedBookings,
      favorites: user._count.favorites,
      credits: user.credits,
      appointments: user._count.clientAppointments,
    },
    onboarding: data.onboarding,
    recentBookings: data.recentBookings.map((booking) => ({
      id: booking.id,
      title: booking.property.title,
      city: booking.property.city,
      status: booking.status,
      date: booking.checkIn.toISOString(),
      image: booking.property.photos[0]?.url ?? null,
    })),
    recentFavorites: data.recentFavorites.map((favorite) => ({
      id: favorite.property.id,
      title: favorite.property.title,
      city: favorite.property.city,
      price: favorite.property.pricePerNight,
      image: favorite.property.photos[0]?.url ?? null,
    })),
    recentAppointments: data.recentAppointments.map((appointment) => ({
      id: appointment.id,
      name: appointment.professional.displayName,
      city: appointment.professional.city,
      status: appointment.status,
      date: appointment.date.toISOString(),
      image: appointment.professional.image,
    })),
    recommendedProperties: data.recommendedProperties.map((property) => ({
      id: property.id,
      title: property.title,
      city: property.city,
      bairro: property.bairro,
      price: property.pricePerNight,
      rating: property.rating,
      image: property.photos[0]?.url ?? null,
    })),
    recommendedProfessionals: data.recommendedProfessionals.map((professional) => ({
      id: professional.id,
      slug: professional.slug,
      name: professional.displayName,
      city: professional.city,
      state: professional.state,
      rating: professional.rating,
      verified: professional.verified,
      featured: professional.featured,
      price: professional.pricePerHour ?? professional.priceMin,
      image: professional.image,
    })),
  };
}

export async function getPremiumProfileData(userId: string): Promise<PremiumProfileData | null> {
  const data = await getCoreData(userId);
  if (!data) return null;

  const user = data.user;
  const recentHistory = [
    ...data.recentBookings.map((booking) => ({
      id: booking.id,
      type: "Reserva" as const,
      title: booking.property.title,
      detail: `${booking.property.city} · ${booking.status}`,
      date: booking.createdAt.toISOString(),
    })),
    ...data.recentFavorites.map((favorite) => ({
      id: favorite.id,
      type: "Favorito" as const,
      title: favorite.property.title,
      detail: `${favorite.property.city} · imóvel salvo`,
      date: favorite.createdAt.toISOString(),
    })),
    ...data.recentAppointments.map((appointment) => ({
      id: appointment.id,
      type: "Agendamento" as const,
      title: appointment.professional.displayName,
      detail: `${appointment.professional.city} · ${appointment.status}`,
      date: appointment.createdAt.toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      phone: user.phone,
      role: user.role,
      verified: user.verified,
      credits: user.credits,
      emailVerified: iso(user.emailVerified),
      createdAt: user.createdAt.toISOString(),
      birthDate: iso(user.birthDate),
      termsConsent: user.termsConsent,
      lgpdConsent: user.lgpdConsent,
    },
    city: data.city,
    vip: data.vip,
    metrics: {
      favorites: user._count.favorites,
      bookings: user._count.bookingsAsGuest,
      activeBookings: data.activeBookings,
      appointments: user._count.clientAppointments,
      reviews: user._count.reviews,
    },
    onboarding: data.onboarding,
    recentHistory,
  };
}

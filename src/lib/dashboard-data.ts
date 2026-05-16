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
    clientAppointments: number;
    proReviews: number;
  };
};

function iso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function getVipLevel({
  completedAppointments,
  savedProfiles,
  totalAppointments,
  credits,
  verified,
}: {
  completedAppointments: number;
  savedProfiles: number;
  totalAppointments: number;
  credits: number;
  verified: boolean;
}) {
  const score =
    completedAppointments * 22 +
    savedProfiles * 10 +
    totalAppointments * 8 +
    (verified ? 20 : 0) +
    Math.min(credits / 20, 25);
  const progress = Math.min(100, Math.round(score));

  if (score >= 80) {
    return {
      label: "Elite Black",
      description: "Prioridade, curadoria refinada e atendimento mais personalizado.",
      progress,
    };
  }

  if (score >= 45) {
    return {
      label: "Gold",
      description: "Perfil aquecido, recomendações melhores e benefícios em evolução.",
      progress,
    };
  }

  if (score >= 20) {
    return {
      label: "Plus",
      description: "Primeiros sinais de preferência já estão moldando sua experiência.",
      progress,
    };
  }

  return {
    label: "Essencial",
    description: "Complete seu perfil e explore profissionais para subir de nível.",
    progress,
  };
}

function getOnboarding(user: DashboardUser, savedProfiles: number, activeAppointments: number) {
  return [
    {
      label: "Perfil com identidade",
      done: Boolean(user.name && user.email && user.image),
      detail: "Nome, email e avatar deixam a experiência pessoal desde o primeiro acesso.",
    },
    {
      label: "Contato seguro",
      done: Boolean(user.phone),
      detail: "Telefone ajuda no suporte e nos fluxos de contato sem expor dados no painel.",
    },
    {
      label: "Segurança +18",
      done: Boolean(user.birthDate && user.termsConsent && user.lgpdConsent),
      detail: "Elegibilidade e privacidade mantêm o ambiente confiável e discreto.",
    },
    {
      label: "Curadoria inicial",
      done: savedProfiles > 0,
      detail: "Favoritar perfis vai treinar sua seleção pessoal de profissionais.",
    },
    {
      label: "Primeiro agendamento",
      done: activeAppointments > 0,
      detail: "Sua agenda aparece aqui quando uma experiência for iniciada.",
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
          clientAppointments: true,
          proReviews: true,
        },
      },
    },
  });

  if (!user) return null;

  const savedProfiles = 0;

  const [activeAppointments, completedAppointments, recentAppointments, recommendedProfessionals] =
    await Promise.all([
      prisma.appointment.count({
        where: { clientId: userId, status: { in: ["PENDING", "CONFIRMED"] } },
      }),
      prisma.appointment.count({
        where: { clientId: userId, status: "COMPLETED" },
      }),
      prisma.appointment.findMany({
        where: { clientId: userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          status: true,
          date: true,
          duration: true,
          contactMethod: true,
          createdAt: true,
          professional: {
            select: {
              displayName: true,
              slug: true,
              city: true,
              state: true,
              image: true,
              verified: true,
            },
          },
        },
      }),
      prisma.professional.findMany({
        where: { status: "ACTIVE" },
        orderBy: [{ featured: "desc" }, { rating: "desc" }, { totalReviews: "desc" }, { createdAt: "desc" }],
        take: 8,
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
          attendanceTypes: true,
        },
      }),
    ]);

  const city = recentAppointments[0]?.professional.city ?? recommendedProfessionals[0]?.city ?? null;
  const vip = getVipLevel({
    completedAppointments,
    savedProfiles,
    totalAppointments: user._count.clientAppointments,
    credits: user.credits,
    verified: user.verified,
  });
  const onboarding = getOnboarding(user, savedProfiles, activeAppointments);

  return {
    user,
    activeAppointments,
    completedAppointments,
    recentAppointments,
    recommendedProfessionals,
    savedProfiles,
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
      activeAppointments: data.activeAppointments,
      completedAppointments: data.completedAppointments,
      favoriteProfiles: data.savedProfiles,
      credits: user.credits,
      totalAppointments: user._count.clientAppointments,
    },
    onboarding: data.onboarding,
    recentAppointments: data.recentAppointments.map((appointment) => ({
      id: appointment.id,
      name: appointment.professional.displayName,
      slug: appointment.professional.slug,
      city: appointment.professional.city,
      state: appointment.professional.state,
      status: appointment.status,
      date: appointment.date.toISOString(),
      duration: appointment.duration,
      contactMethod: appointment.contactMethod,
      image: appointment.professional.image,
      verified: appointment.professional.verified,
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
      attendanceTypes: professional.attendanceTypes.slice(0, 2),
    })),
  };
}

export async function getPremiumProfileData(userId: string): Promise<PremiumProfileData | null> {
  const data = await getCoreData(userId);
  if (!data) return null;

  const user = data.user;
  const recentHistory = data.recentAppointments
    .map((appointment) => ({
      id: appointment.id,
      type: "Agendamento" as const,
      title: appointment.professional.displayName,
      detail: `${appointment.professional.city} · ${appointment.status}`,
      date: appointment.createdAt.toISOString(),
    }))
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
      favoriteProfiles: data.savedProfiles,
      appointments: user._count.clientAppointments,
      activeAppointments: data.activeAppointments,
      completedAppointments: data.completedAppointments,
      reviews: user._count.proReviews,
    },
    onboarding: data.onboarding,
    recentHistory,
  };
}

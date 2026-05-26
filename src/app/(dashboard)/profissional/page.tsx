import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCompanionPanel } from "@/lib/account-access";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";
import { refreshExpiredProfessionalTimers } from "@/lib/professional-timers";
import {
  PendingAppointmentsCard,
  PlanResourcesCard,
  PrivacyBoostCard,
  ProfessionalMainCard,
  QuickManagementGrid,
  QuickPostCard,
  RankingCard,
  type DashboardAppointment,
} from "@/components/professional-dashboard/ProfessionalDashboardCards";
import { ProfessionalAlertStack, type ProfessionalAlert } from "@/components/professional-dashboard/ProfessionalAlertCard";
import { PerformanceStats, type PerformancePeriod, type PerformanceSnapshot } from "@/components/professional-dashboard/PerformanceStats";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

function daysUntil(date: Date | null | undefined, baseDate: Date) {
  if (!date) return null;
  return Math.ceil((date.getTime() - baseDate.getTime()) / DAY_MS);
}

function periodStart(period: Exclude<PerformancePeriod, "all">, baseDate: Date) {
  const now = new Date(baseDate);
  if (period === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  return new Date(now.getTime() - (period === "7d" ? 7 : 30) * DAY_MS);
}

function countSince<T extends { createdAt: Date }>(items: T[], start: Date) {
  return items.filter((item) => item.createdAt >= start).length;
}

function securityCode(id: string) {
  const digits = id.replace(/\D/g, "");
  return (digits || id.split("").map((char) => char.charCodeAt(0)).join("")).slice(-6).padStart(6, "0");
}

function buildCompleteness(professional: {
  displayName: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  whatsapp: string | null;
  phone: string | null;
  image: string | null;
  galleryUrls: string[];
  priceMin: number | null;
  pricePerHour: number | null;
  attendanceTypes: string[];
  services: string[];
  horarioInicio: string | null;
  horarioFim: string | null;
  docFrenteUrl: string | null;
  docVersoUrl: string | null;
  verificationUrl: string | null;
  kycSessionId: string | null;
  user: { premiumUntil: Date | null; phoneVerified: boolean };
}) {
  const checks = [
    { ok: professional.displayName, label: "nome artistico" },
    { ok: professional.bio, label: "bio" },
    { ok: professional.city && professional.state, label: "cidade/local" },
    { ok: professional.whatsapp || professional.phone || professional.user.phoneVerified, label: "telefone/contato" },
    { ok: professional.image, label: "foto de perfil" },
    { ok: professional.galleryUrls.length > 2, label: "fotos" },
    { ok: professional.priceMin || professional.pricePerHour, label: "valores" },
    { ok: professional.attendanceTypes.length > 0, label: "tipo de atendimento" },
    { ok: professional.services.length > 0, label: "servicos" },
    { ok: professional.horarioInicio && professional.horarioFim, label: "agenda" },
    { ok: professional.docFrenteUrl && professional.docVersoUrl, label: "documentos" },
    { ok: professional.verificationUrl || professional.kycSessionId, label: "verificacao" },
    { ok: professional.user.premiumUntil && professional.user.premiumUntil > new Date(), label: "plano ativo" },
  ];

  return {
    score: Math.round((checks.filter((check) => Boolean(check.ok)).length / checks.length) * 100),
    missing: checks.filter((check) => !check.ok).map((check) => check.label),
  };
}

function appointmentLabel(client: { name: string | null; email: string | null }) {
  return client.name ?? client.email ?? "Cliente";
}

export default async function ProfissionalDashPage() {
  const access = await requireCompanionPanel();
  await refreshExpiredProfessionalTimers();
  const now = new Date();
  const eventsSince = new Date(now.getTime() - 31 * DAY_MS);

  const professional = await prisma.professional.findUnique({
    where: { userId: access.user.id },
    include: {
      user: { select: { premiumUntil: true, phoneVerified: true } },
      appointments: {
        orderBy: { date: "desc" },
        take: 12,
        include: { client: { select: { name: true, email: true } } },
      },
      photos: { orderBy: { order: "asc" } },
      schedule: true,
      favorites: { select: { id: true, createdAt: true } },
      reviews: { select: { id: true, rating: true, hidden: true, createdAt: true } },
      profileEvents: {
        where: { createdAt: { gte: eventsSince } },
        select: { eventType: true, createdAt: true },
      },
    },
  });

  if (!professional) {
    redirect(ACCOUNT_ROUTES.onboardingAcompanhante);
  }

  const allPhotosCount = professional.photos.length || professional.galleryUrls.length + (professional.image ? 1 : 0);
  const completeness = buildCompleteness(professional);
  const hasActivePlan = Boolean(professional.user.premiumUntil && professional.user.premiumUntil > now);
  const premiumDaysLeft = daysUntil(professional.user.premiumUntil, now);
  const isBoostActive = Boolean(professional.boostActive && (!professional.boostUntil || professional.boostUntil > now));
  const isVisible = professional.status === "ACTIVE" && (!professional.pauseUntil || professional.pauseUntil <= now);

  const cityRanking = professional.city
    ? await prisma.professional.findMany({
        where: { city: professional.city, status: "ACTIVE" },
        select: { id: true },
        orderBy: [{ boostActive: "desc" }, { featured: "desc" }, { rating: "desc" }, { totalReviews: "desc" }, { createdAt: "asc" }],
      })
    : [];
  const rankingIndex = cityRanking.findIndex((item) => item.id === professional.id);
  const rankingPosition = rankingIndex >= 0 ? rankingIndex + 1 : null;

  const pendingAppointments: DashboardAppointment[] = professional.appointments
    .filter((appointment) => appointment.status === "PENDING")
    .slice(0, 4)
    .map((appointment) => ({
      id: appointment.id,
      clientLabel: appointmentLabel(appointment.client),
      date: appointment.date,
      duration: appointment.duration,
      status: appointment.status,
      price: appointment.price,
    }));

  const eventCount = (eventType: string, start: Date) =>
    professional.profileEvents.filter((event) => event.eventType === eventType && event.createdAt >= start).length;

  const highlightPoints =
    (hasActivePlan ? 2000 : 0) +
    (professional.featured ? 1000 : 0) +
    (isBoostActive ? 1200 : 0) +
    Math.min(allPhotosCount * 80, 640) +
    Math.round(professional.rating * 100);

  const snapshotFor = (period: PerformancePeriod): PerformanceSnapshot => {
    if (period === "all") {
      return {
        views: professional.profileViews,
        contactClicks: professional.contactClicks,
        phoneClicks: null,
        favorites: professional.favorites.length,
        appointments: professional.totalAppointments,
        reviews: professional.totalReviews,
        rating: professional.rating,
        rankingPosition,
        highlightPoints,
      };
    }

    const start = periodStart(period, now);
    const visibleReviews = professional.reviews.filter((review) => !review.hidden);
    const periodReviews = visibleReviews.filter((review) => review.createdAt >= start);
    const average = periodReviews.length ? periodReviews.reduce((sum, review) => sum + review.rating, 0) / periodReviews.length : 0;

    return {
      views: eventCount("profile_view", start),
      contactClicks: eventCount("contact_click", start),
      phoneClicks: null,
      favorites: countSince(professional.favorites, start),
      appointments: professional.appointments.filter((appointment) => appointment.createdAt >= start).length,
      reviews: periodReviews.length,
      rating: average,
      rankingPosition,
      highlightPoints,
    };
  };

  const snapshots: Record<PerformancePeriod, PerformanceSnapshot> = {
    today: snapshotFor("today"),
    "7d": snapshotFor("7d"),
    "30d": snapshotFor("30d"),
    all: snapshotFor("all"),
  };

  const alerts: ProfessionalAlert[] = [];
  if (professional.status === "SUSPENDED" || professional.status === "REJECTED") {
    alerts.push({
      id: "status-blocked",
      title: "Seu perfil precisa de atencao",
      description: professional.rejectReason ?? "Existe uma restricao ou pendencia de revisao antes do perfil voltar a performar.",
      href: "/verificacao/acompanhante",
      actionLabel: "Verificar status",
      tone: "danger",
      icon: "shield",
    });
  }
  if (completeness.score < 85) {
    alerts.push({
      id: "profile-completeness",
      title: "Seu perfil pode receber mais contatos",
      description: `Complete: ${completeness.missing.slice(0, 4).join(", ")}.`,
      href: "/profissional/perfil",
      actionLabel: "Melhorar perfil",
      tone: "gold",
      icon: "user",
    });
  }
  if (!hasActivePlan) {
    alerts.push({
      id: "basic-plan",
      title: "Seu perfil esta no modo basico",
      description: "Planos e destaques aumentam a visibilidade na cidade e ajudam clientes a encontrarem seu anuncio.",
      href: "/profissional/planos",
      actionLabel: "Conhecer planos",
      tone: "gold",
      icon: "sparkles",
    });
  } else if (premiumDaysLeft !== null && premiumDaysLeft <= 3) {
    alerts.push({
      id: "plan-expiring",
      title: premiumDaysLeft <= 0 ? "Seu plano venceu" : `Seu plano vence em ${premiumDaysLeft} dia(s)`,
      description: "Renove para manter os recursos premium e evitar perda de destaque na listagem.",
      href: "/profissional/planos",
      actionLabel: "Renovar plano",
      tone: premiumDaysLeft <= 0 ? "danger" : "gold",
      icon: "clock",
    });
  }
  if (professional.kycStatus === "PENDING" || professional.docStatus === "PENDING" || professional.verifStatus === "PENDING") {
    alerts.push({
      id: "kyc-pending",
      title: "Documento em analise",
      description: "Nossa equipe esta conferindo sua verificacao. Voce sera avisada quando a analise terminar.",
      href: "/verificacao/acompanhante",
      actionLabel: "Acompanhar KYC",
      tone: "neutral",
      dismissible: true,
      icon: "file",
    });
  }
  if (professional.kycStatus === "APPROVED" || professional.docStatus === "APPROVED" || professional.verifStatus === "APPROVED") {
    alerts.push({
      id: "kyc-approved",
      title: "Verificacao aprovada",
      description: "Seu perfil tem um sinal importante de confianca. Mantenha suas informacoes atualizadas.",
      href: "/profissional/perfil",
      actionLabel: "Revisar perfil",
      tone: "success",
      dismissible: true,
      icon: "check",
    });
  }
  if (professional.presentationVideoStatus === "APPROVED") {
    alerts.push({
      id: "video-approved",
      title: "Video aprovado",
      description: "Seu conteudo foi liberado. Continue renovando sua midia para manter o perfil competitivo.",
      href: "/profissional/configuracoes",
      actionLabel: "Ver video",
      tone: "success",
      dismissible: true,
      icon: "check",
    });
  } else if (professional.presentationVideoStatus === "REJECTED") {
    alerts.push({
      id: "video-rejected",
      title: "Video recusado",
      description: professional.presentationVideoRejectReason ?? "Envie um novo video seguindo as regras de conteudo da plataforma.",
      href: "/profissional/configuracoes",
      actionLabel: "Enviar novamente",
      tone: "danger",
      icon: "alert",
    });
  }
  if (professional.schedule.length === 0 && professional.diasDisponiveis.length === 0) {
    alerts.push({
      id: "empty-schedule",
      title: "Agenda sem horarios cadastrados",
      description: "Horarios claros reduzem atrito e ajudam clientes a solicitarem atendimento com mais seguranca.",
      href: "/profissional/agenda",
      actionLabel: "Atualizar agenda",
      tone: "gold",
      icon: "calendar",
    });
  }
  if (!professional.city || !professional.state) {
    alerts.push({
      id: "location",
      title: "Localizacao desatualizada",
      description: "A cidade correta ajuda seu perfil a aparecer para clientes da regiao certa.",
      href: "/profissional/perfil",
      actionLabel: "Atualizar localizacao",
      tone: "gold",
      icon: "map",
    });
  }
  if (professional.status === "PAUSED") {
    alerts.push({
      id: "paused",
      title: "Perfil pausado",
      description: "Enquanto pausado, seu perfil nao aparece normalmente na busca publica.",
      href: "/profissional/configuracoes",
      actionLabel: "Controlar visibilidade",
      tone: "neutral",
      icon: "alert",
    });
  }
  if (allPhotosCount < 3) {
    alerts.push({
      id: "few-photos",
      title: "Poucas fotos cadastradas",
      description: "Adicione uma capa forte e uma galeria recente para aumentar confianca e conversao.",
      href: "/profissional/fotos",
      actionLabel: "Postar fotos",
      tone: "gold",
      icon: "image",
    });
  }
  if (!professional.bio) {
    alerts.push({
      id: "missing-bio",
      title: "Sua bio ainda esta vazia",
      description: "Uma descricao objetiva ajuda o cliente a entender seu estilo de atendimento antes do contato.",
      href: "/profissional/perfil",
      actionLabel: "Escrever bio",
      tone: "gold",
      icon: "user",
    });
  }
  if (!professional.priceMin && !professional.pricePerHour && !professional.price30min) {
    alerts.push({
      id: "missing-prices",
      title: "Valores nao cadastrados",
      description: "Precos claros qualificam melhor os contatos e reduzem conversas improdutivas.",
      href: "/profissional/perfil",
      actionLabel: "Cadastrar valores",
      tone: "gold",
      icon: "sparkles",
    });
  }
  if (!professional.user.phoneVerified && !professional.whatsapp && !professional.phone) {
    alerts.push({
      id: "phone",
      title: "Telefone/WhatsApp nao confirmado",
      description: "Confirme um canal de contato para nao perder clientes prontos para conversar.",
      href: "/profissional/perfil",
      actionLabel: "Confirmar contato",
      tone: "gold",
      icon: "phone",
    });
  }

  const resources = [
    { label: "Perfil premium", active: hasActivePlan, description: "Sinal comercial baseado em premiumUntil da conta." },
    { label: "Destaque na cidade", active: professional.featured, description: "Aparece acima de perfis comuns quando o destaque esta ativo." },
    { label: "Ocultar idade", active: professional.hideAge, description: "Controle de privacidade salvo no perfil." },
    { label: "Ocultar telefone", active: professional.hidePhone, description: "Telefone fica oculto publicamente." },
    { label: "Impulsionamento", active: isBoostActive, description: "Boost ativo enquanto nao estiver vencido." },
    { label: "Telefone na listagem", active: Boolean(!professional.hidePhone && (professional.phone || professional.whatsapp)), description: "Disponivel quando ha contato e ele nao esta oculto." },
    { label: "Galeria premium", active: hasActivePlan && allPhotosCount >= 6, description: "Preparado a partir de plano ativo e galeria robusta." },
    { label: "Stories/videos", active: Boolean(professional.presentationVideoUrl), description: "Video de apresentacao existe no perfil." },
  ];

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#d4a843]">Painel profissional Elite Modell</p>
          <h1 className="mt-1 text-3xl font-black leading-tight text-white sm:text-4xl">Visibilidade, conteudo e conversao</h1>
        </div>
        <p className="max-w-xl text-sm leading-6 text-white/50">Um painel para acompanhar status, melhorar posicionamento e agir rapido nos pontos que geram mais contatos.</p>
      </div>

      <ProfessionalAlertStack alerts={alerts.slice(0, 8)} />

      <ProfessionalMainCard
        image={professional.image}
        displayName={professional.displayName}
        status={professional.status}
        city={professional.city}
        state={professional.state}
        planName={hasActivePlan ? "Premium Elite" : "Basico"}
        planExpiresAt={professional.user.premiumUntil}
        completeness={completeness.score}
        rankingPosition={rankingPosition}
        securityCode={professional.verificationCode ?? securityCode(professional.id)}
        slug={professional.slug}
        online={professional.updatedAt.getTime() > now.getTime() - 15 * 60 * 1000}
        verified={professional.verified || professional.kycStatus === "APPROVED" || professional.docStatus === "APPROVED"}
        missingItems={completeness.missing}
      />

      <PerformanceStats snapshots={snapshots} />
      <RankingCard city={professional.city} position={rankingPosition} />
      <QuickPostCard />
      <PlanResourcesCard
        planName="Premium Elite"
        statusLabel={hasActivePlan ? "ativo" : "basico"}
        expiresAt={professional.user.premiumUntil}
        resources={resources}
        hasActivePlan={hasActivePlan}
      />
      <PrivacyBoostCard
        hideAge={professional.hideAge}
        hidePhone={professional.hidePhone}
        isPaused={professional.status === "PAUSED"}
        isVisible={isVisible}
        boostActive={isBoostActive}
      />
      <PendingAppointmentsCard appointments={pendingAppointments} />
      <QuickManagementGrid slug={professional.slug} />
    </div>
  );
}

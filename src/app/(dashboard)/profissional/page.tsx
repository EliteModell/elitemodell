import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCompanionPanel } from "@/lib/account-access";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";
import { refreshExpiredProfessionalTimers } from "@/lib/professional-timers";
import { resolveProfessionalAccess } from "@/lib/professional-access";
import {
  PendingAppointmentsCard,
  PlanResourcesCard,
  PrivacyBoostCard,
  ProfessionalMainCard,
  QuickManagementGrid,
  RankingCard,
  type DashboardAppointment,
} from "@/components/professional-dashboard/ProfessionalDashboardCards";
import { ProfessionalAlertStack, type ProfessionalAlert } from "@/components/professional-dashboard/ProfessionalAlertCard";
import { PerformanceStats, type PerformancePeriod, type PerformanceSnapshot } from "@/components/professional-dashboard/PerformanceStats";
import { PremiumActionCard, PremiumIllustration } from "@/components/professional-dashboard/ProfessionalPremium";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

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
  presentationVideoUrl?: string | null;
  photos?: { url: string; cover: boolean }[];
  schedule?: { available: boolean }[];
  user: { premiumUntil: Date | null; phoneVerified: boolean; image?: string | null; stories?: { id: string }[] };
}) {
  const profilePhoto = professional.user.image ?? null;
  const coverPhoto = professional.photos?.find((photo) => photo.cover)?.url ?? professional.image;
  const galleryCount = professional.photos?.filter((photo) => !photo.cover).length ?? professional.galleryUrls.length;
  const hasSchedule = Boolean(professional.schedule?.some((day) => day.available) || (professional.horarioInicio && professional.horarioFim));
  const checks = [
    { ok: professional.displayName, label: "nome artístico" },
    { ok: professional.bio, label: "bio" },
    { ok: professional.city && professional.state, label: "cidade/local" },
    { ok: professional.whatsapp || professional.phone || professional.user.phoneVerified, label: "telefone/contato" },
    { ok: profilePhoto, label: "foto de perfil" },
    { ok: coverPhoto, label: "foto de capa" },
    { ok: galleryCount >= 3, label: "galeria" },
    { ok: professional.presentationVideoUrl, label: "video" },
    { ok: (professional.user.stories?.length ?? 0) > 0, label: "stories" },
    { ok: professional.priceMin || professional.pricePerHour, label: "valores" },
    { ok: professional.attendanceTypes.length > 0, label: "tipo de atendimento" },
    { ok: professional.services.length > 0, label: "serviços" },
    { ok: hasSchedule, label: "agenda" },
    { ok: professional.docFrenteUrl && professional.docVersoUrl, label: "documentos" },
    { ok: professional.verificationUrl || professional.kycSessionId, label: "verificação" },
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
  const access = await requireCompanionPanel({ allowExpired: true });
  await refreshExpiredProfessionalTimers();
  const now = new Date();
  const eventsSince = new Date(now.getTime() - 31 * DAY_MS);

  const professional = await prisma.professional.findUnique({
    where: { userId: access.user.id },
    include: {
      user: {
        select: {
          premiumUntil: true,
          phoneVerified: true,
          image: true,
          stories: {
            where: { expiresAt: { gt: now } },
            select: { id: true },
          },
        },
      },
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

  const professionalAccess = resolveProfessionalAccess(
    professional,
    professional.user,
    professional.status === "ACTIVE" || professional.status === "PAUSED",
    now,
  );

  if (professionalAccess.kind === "EXPIRED") {
    return (
      <div className="professional-premium-page">
        <section className="premium-section-card" style={{ padding: 28 }}>
          <p className="premium-eyebrow">Período gratuito encerrado</p>
          <h1 className="premium-title" style={{ fontSize: 32 }}>Escolha como continuar</h1>
          <p className="premium-description" style={{ marginTop: 14 }}>
            Seu período gratuito terminou. Nenhuma cobrança foi feita e não existe renovação automática.
            Escolha uma opção somente quando quiser reativar a publicação do perfil.
          </p>
          <div className="premium-grid premium-grid-3" style={{ marginTop: 22 }}>
            <div className="premium-card" style={{ padding: 18 }}>
              <strong>Sem cobrança automática</strong>
              <p className="premium-action-text" style={{ marginTop: 8 }}>Seus dados continuam salvos com segurança.</p>
            </div>
            <div className="premium-card" style={{ padding: 18 }}>
              <strong>Pagamento autorizado</strong>
              <p className="premium-action-text" style={{ marginTop: 8 }}>O acesso só é ativado depois da sua escolha e confirmação.</p>
            </div>
            <div className="premium-card" style={{ padding: 18 }}>
              <strong>Planos e destaques</strong>
              <p className="premium-action-text" style={{ marginTop: 8 }}>Compare os períodos e recursos antes de pagar.</p>
            </div>
          </div>
          <Link href="/profissional/planos?acesso=expirado" className="premium-button" style={{ marginTop: 22 }}>
            Ver opções disponíveis
          </Link>
        </section>
      </div>
    );
  }

  const profilePhoto = professional.user.image ?? null;
  const coverPhoto = professional.photos.find((photo) => photo.cover)?.url ?? professional.image ?? null;
  const galleryCount = professional.photos.filter((photo) => !photo.cover).length || professional.galleryUrls.filter((url) => url !== coverPhoto).length;
  const allPhotosCount = (coverPhoto ? 1 : 0) + galleryCount;
  const activeStoriesCount = professional.user.stories.length;
  const hasPresentationVideo = Boolean(professional.presentationVideoUrl && professional.presentationVideoStatus !== "REJECTED");
  const hasSchedule = Boolean(professional.schedule.some((day) => day.available) || (professional.horarioInicio && professional.horarioFim) || professional.diasDisponiveis.length > 0);
  const hasApprovedVerification = professional.verified || professional.kycStatus === "APPROVED" || professional.docStatus === "APPROVED" || professional.verifStatus === "APPROVED";
  const completeness = buildCompleteness(professional);
  const hasActivePlan = Boolean(professional.user.premiumUntil && professional.user.premiumUntil > now);
  const premiumDaysLeft = daysUntil(professional.user.premiumUntil, now);
  const isBoostActive = Boolean(professional.boostActive && (!professional.boostUntil || professional.boostUntil > now));
  const hasListingPhoneBenefit = Boolean(professional.listingPhoneUntil && professional.listingPhoneUntil > now);
  const isVisible = professional.status === "ACTIVE" && professionalAccess.canAppearInSearch && (!professional.pauseUntil || professional.pauseUntil <= now);
  const smartCards: Array<Parameters<typeof PremiumActionCard>[0] & { id: string }> = [];
  const addSmartCard = (card: Parameters<typeof PremiumActionCard>[0] & { id: string }) => smartCards.push(card);

  if (!profilePhoto) {
    addSmartCard({
      id: "profile-photo",
      href: "/profissional/fotos",
      icon: "profile",
      title: "Falta foto de perfil",
      description: "Adicione uma foto principal para deixar seu perfil mais confiável para os clientes.",
      buttonLabel: "Adicionar foto",
      badge: "Pendente",
    });
  }
  if (!coverPhoto) {
    addSmartCard({
      id: "cover-photo",
      href: "/profissional/fotos",
      icon: "image",
      title: "Falta foto de capa",
      description: "Escolha uma capa forte para destacar seu anúncio na plataforma.",
      buttonLabel: "Adicionar capa",
      badge: "Pendente",
    });
  }
  if (galleryCount < 3) {
    addSmartCard({
      id: "gallery",
      href: "/profissional/fotos",
      icon: "camera",
      title: "Poucas fotos cadastradas",
      description: "Adicione mais fotos recentes para aumentar a confiança no seu perfil.",
      buttonLabel: "Postar fotos",
      badge: "Recomendado",
    });
  }
  if (!hasPresentationVideo) {
    addSmartCard({
      id: "video",
      href: "/profissional/postar",
      icon: "video",
      title: "Adicione um vídeo de apresentação",
      description: "Vídeos ajudam clientes a conhecerem melhor seu perfil.",
      buttonLabel: "Postar vídeo",
      badge: "Recomendado",
    });
  }
  if (activeStoriesCount === 0) {
    addSmartCard({
      id: "story",
      href: "/profissional/stories",
      icon: "story",
      title: "Publique um story",
      description: "Stories mantêm seu perfil ativo e aparecem para clientes na área de conteúdo recente.",
      buttonLabel: "Postar story",
      badge: "Recomendado",
    });
  }
  if (!hasSchedule) {
    addSmartCard({
      id: "schedule",
      href: "/profissional/agenda",
      icon: "calendar",
      title: "Atualize sua agenda",
      description: "Informe seus horários e disponibilidade para melhorar a experiência dos clientes.",
      buttonLabel: "Atualizar agenda",
      badge: "Pendente",
    });
  }
  if (!professional.bio || professional.bio.trim().length < 80) {
    addSmartCard({
      id: "bio",
      href: "/profissional/perfil",
      icon: "profile",
      title: "Complete sua descrição",
      description: "Uma descrição clara ajuda clientes a entenderem seu estilo de atendimento.",
      buttonLabel: "Escrever bio",
      badge: "Pendente",
    });
  }
  if (!hasApprovedVerification) {
    addSmartCard({
      id: "verification",
      href: ACCOUNT_ROUTES.analiseAcompanhante,
      icon: "shield",
      title: "Verificação pendente",
      description: "Acompanhe sua análise para manter o perfil com sinal de confiança.",
      buttonLabel: "Ver status",
      badge: "Análise",
    });
  } else {
    addSmartCard({
      id: "verification-approved",
      href: "/profissional/perfil",
      icon: "shield",
      title: "Perfil aprovado",
      description: "Sua verificação está registrada. Mantenha seus dados sempre atualizados.",
      buttonLabel: "Revisar perfil",
      badge: "Completo",
    });
  }
  if (professional.status === "ACTIVE") {
    addSmartCard({
      id: "active",
      href: `/profissionais/${professional.slug}`,
      icon: "star",
      title: "Perfil ativo",
      description: "Seu anúncio está liberado para aparecer para clientes.",
      buttonLabel: "Ver perfil",
      badge: "Ativo",
    });
  }
  if (!hasActivePlan) {
    addSmartCard({
      id: "plan",
      href: "/profissional/planos",
      icon: "diamond",
      title: "Destaques opcionais",
      description: "Seu acesso normal não exige plano durante o período gratuito. Pague apenas se quiser mais visibilidade.",
      buttonLabel: "Ver destaques",
      badge: "Opcional",
    });
  }
  if (!professional.featured && !isBoostActive) {
    addSmartCard({
      id: "highlight",
      href: "/profissional/planos",
      icon: "crown",
      title: "Destaque disponível",
      description: "Use destaque ou boost para melhorar sua posição na listagem.",
      buttonLabel: "Ver opções",
      badge: "Oportunidade",
    });
  }

  const checklist = [
    { label: "Foto de perfil", href: "/profissional/fotos", done: Boolean(profilePhoto), status: profilePhoto ? "completo" : "pendente" },
    { label: "Foto de capa", href: "/profissional/fotos", done: Boolean(coverPhoto), status: coverPhoto ? "completo" : "pendente" },
    { label: "Galeria", href: "/profissional/fotos", done: galleryCount >= 3, status: galleryCount >= 3 ? "completo" : "pendente" },
    { label: "Vídeo", href: "/profissional/postar", done: hasPresentationVideo, status: hasPresentationVideo ? "completo" : "recomendado" },
    { label: "Stories", href: "/profissional/stories", done: activeStoriesCount > 0, status: activeStoriesCount > 0 ? "completo" : "recomendado" },
    { label: "Agenda", href: "/profissional/agenda", done: hasSchedule, status: hasSchedule ? "completo" : "pendente" },
    { label: "Descrição", href: "/profissional/perfil", done: Boolean(professional.bio && professional.bio.trim().length >= 80), status: professional.bio && professional.bio.trim().length >= 80 ? "completo" : "pendente" },
    { label: "Verificação", href: ACCOUNT_ROUTES.analiseAcompanhante, done: hasApprovedVerification, status: hasApprovedVerification ? "completo" : "pendente" },
  ];
  const checklistProgress = Math.round((checklist.filter((item) => item.done).length / checklist.length) * 100);

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
  if (professionalAccess.kind === "FREE_TRIAL") {
    alerts.push({
      id: "free-access",
      title: `${professionalAccess.freeTrialDaysLeft} dia(s) de acesso gratuito restante(s)`,
      description: `Seu perfil pode ser usado e publicado normalmente até ${professionalAccess.freeTrialEndsAt?.toLocaleDateString("pt-BR")}. Planos e destaques são opcionais neste período.`,
      href: "/profissional/planos",
      actionLabel: "Ver destaques opcionais",
      tone: professionalAccess.freeTrialDaysLeft !== null && professionalAccess.freeTrialDaysLeft <= 5 ? "gold" : "success",
      icon: "clock",
    });
  }
  if (professional.status === "SUSPENDED" || professional.status === "REJECTED") {
    alerts.push({
      id: "status-blocked",
      title: "Seu perfil precisa de atenção",
      description: professional.rejectReason ?? "Existe uma restrição ou pendência de revisão antes do perfil voltar a performar.",
      href: ACCOUNT_ROUTES.analiseAcompanhante,
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
  if (!hasActivePlan && professionalAccess.kind !== "FREE_TRIAL") {
    alerts.push({
      id: "basic-plan",
      title: "Seu perfil está no modo básico",
      description: "Planos e destaques aumentam a visibilidade na cidade e ajudam clientes a encontrarem seu anúncio.",
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
      title: "Documento em análise",
      description: "Nossa equipe está conferindo sua verificação. Você será avisada quando a análise terminar.",
      href: ACCOUNT_ROUTES.analiseAcompanhante,
      actionLabel: "Acompanhar KYC",
      tone: "neutral",
      dismissible: true,
      icon: "file",
    });
  }
  if (professional.kycStatus === "APPROVED" || professional.docStatus === "APPROVED" || professional.verifStatus === "APPROVED") {
    alerts.push({
      id: "kyc-approved",
      title: "Verificação aprovada",
      description: "Seu perfil tem um sinal importante de confiança. Mantenha suas informações atualizadas.",
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
      title: "Vídeo aprovado",
      description: "Seu conteúdo foi liberado. Continue renovando sua mídia para manter o perfil competitivo.",
      href: "/profissional/postar",
      actionLabel: "Ver vídeo",
      tone: "success",
      dismissible: true,
      icon: "check",
    });
  } else if (professional.presentationVideoStatus === "REJECTED") {
    alerts.push({
      id: "video-rejected",
      title: "Vídeo recusado",
      description: professional.presentationVideoRejectReason ?? "Envie um novo vídeo seguindo as regras de conteúdo da plataforma.",
      href: "/profissional/postar",
      actionLabel: "Enviar novamente",
      tone: "danger",
      icon: "alert",
    });
  }
  if (professional.schedule.length === 0 && professional.diasDisponiveis.length === 0) {
    alerts.push({
      id: "empty-schedule",
      title: "Agenda sem horários cadastrados",
      description: "Horários claros reduzem atrito e ajudam clientes a solicitarem atendimento com mais segurança.",
      href: "/profissional/agenda",
      actionLabel: "Atualizar agenda",
      tone: "gold",
      icon: "calendar",
    });
  }
  if (!professional.city || !professional.state) {
    alerts.push({
      id: "location",
      title: "Localização desatualizada",
      description: "A cidade correta ajuda seu perfil a aparecer para clientes da região certa.",
      href: "/profissional/perfil",
      actionLabel: "Atualizar localização",
      tone: "gold",
      icon: "map",
    });
  }
  if (professional.status === "PAUSED") {
    alerts.push({
      id: "paused",
      title: "Perfil pausado",
      description: "Enquanto pausado, seu perfil não aparece normalmente na busca pública.",
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
      description: "Adicione uma capa forte e uma galeria recente para aumentar confiança e conversão.",
      href: "/profissional/fotos",
      actionLabel: "Postar fotos",
      tone: "gold",
      icon: "image",
    });
  }
  if (!professional.bio) {
    alerts.push({
      id: "missing-bio",
      title: "Sua bio ainda está vazia",
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
      title: "Valores não cadastrados",
      description: "Preços claros qualificam melhor os contatos e reduzem conversas improdutivas.",
      href: "/profissional/perfil",
      actionLabel: "Cadastrar valores",
      tone: "gold",
      icon: "sparkles",
    });
  }
  if (!professional.user.phoneVerified && !professional.whatsapp && !professional.phone) {
    alerts.push({
      id: "phone",
      title: "Telefone/WhatsApp não confirmado",
      description: "Confirme um canal de contato para não perder clientes prontos para conversar.",
      href: "/profissional/perfil",
      actionLabel: "Confirmar contato",
      tone: "gold",
      icon: "phone",
    });
  }

  const resources = [
    { label: "Perfil premium", active: hasActivePlan, description: "Plano ativo para ampliar visibilidade e recursos comerciais." },
    { label: "Destaque na cidade", active: professional.featured, description: "Ajuda seu perfil a ganhar mais presença na listagem." },
    { label: "Ocultar idade", active: professional.hideAge, description: "Sua idade fica fora da exibição pública." },
    { label: "Ocultar telefone", active: professional.hidePhone, description: "Seu telefone não aparece publicamente quando esta opção está ativa." },
    { label: "Impulsionamento", active: isBoostActive, description: "Aumenta temporariamente sua presença para clientes." },
    { label: "Telefone na listagem", active: Boolean(hasListingPhoneBenefit && !professional.hidePhone && (professional.phone || professional.whatsapp)), description: "Mostra seu contato na listagem quando o recurso estiver ativo." },
    { label: "Galeria premium", active: hasActivePlan && allPhotosCount >= 6, description: "Galeria mais completa para aumentar confiança no perfil." },
    { label: "Stories/vídeos", active: Boolean(professional.presentationVideoUrl || activeStoriesCount > 0), description: "Conteúdo recente ajuda clientes a conhecerem melhor seu perfil." },
  ];

  return (
    <div className="professional-premium-page" data-dashboard-version="professional-premium-v3">
      <section className="premium-hero">
        <div className="premium-hero-copy">
          <p className="premium-eyebrow">Painel profissional Elite Modell</p>
          <h1 className="premium-title">Visibilidade,<br />conteúdo e conversão</h1>
          <p className="premium-description">Um painel para acompanhar status, melhorar posicionamento e agir rápido nos pontos que geram mais contatos.</p>
        </div>
        <PremiumIllustration kind="growth" />
      </section>

      {alerts.length ? <ProfessionalAlertStack alerts={alerts.slice(0, 4)} /> : null}

      {smartCards.slice(0, 8).map(({ id, ...card }) => (
        <PremiumActionCard key={id} {...card} />
      ))}

      <section className="premium-section-card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div>
            <p className="premium-eyebrow">Seu perfil profissional</p>
            <h2 className="premium-section-title">Perfil {checklistProgress}% completo</h2>
            <p className="premium-action-text" style={{ marginTop: 10 }}>
              Complete os itens essenciais para melhorar confiança, visibilidade e conversão.
            </p>
          </div>
          <span className="premium-badge">{checklistProgress === 100 ? "Perfil completo" : "Pendências reais"}</span>
        </div>
        <div style={{ height: 10, overflow: "hidden", borderRadius: 999, background: "rgba(255,255,255,0.10)", marginTop: 18 }}>
          <div style={{ width: `${checklistProgress}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#D6A83A,#F5D46B)" }} />
        </div>
        <div className="premium-grid premium-grid-3" style={{ marginTop: 18 }}>
          {checklist.map((item) => (
            <Link key={item.label} href={item.href} className="premium-check-card" style={{ textDecoration: "none", justifyContent: "space-between" }}>
              <span>{item.label}</span>
              <span style={{ color: item.done ? "var(--elite-success)" : item.status === "pendente" ? "var(--elite-warning)" : "var(--elite-gold-light)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                {item.status}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {alerts.length > 4 ? <ProfessionalAlertStack alerts={alerts.slice(4, 8)} /> : null}

      <ProfessionalMainCard
        image={profilePhoto}
        displayName={professional.displayName}
        status={professional.status}
        city={professional.city}
        state={professional.state}
        planName={hasActivePlan ? "Premium Elite" : "Básico"}
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
      <Link href="/profissional/postar" className="premium-button" style={{ width: "100%" }}>
        Postar conteúdo
      </Link>
      <PlanResourcesCard
        planName="Premium Elite"
        statusLabel={hasActivePlan ? "ativo" : "básico"}
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

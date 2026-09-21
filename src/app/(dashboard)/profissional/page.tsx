import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Crown,
  Eye,
  FileImage,
  Images,
  MapPin,
  MessageCircle,
  Play,
  Plus,
  Rocket,
  ShieldCheck,
  Sparkles,
  Video,
} from "lucide-react";
import { requireCompanionPanel } from "@/lib/account-access";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";
import { prisma } from "@/lib/prisma";
import { resolveProfessionalAccess } from "@/lib/professional-access";
import { refreshExpiredProfessionalTimers } from "@/lib/professional-timers";
import styles from "./professional-dashboard.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const DAY_MS = 24 * 60 * 60 * 1000;

type ItemStatus = "complete" | "pending" | "recommended";

function statusLabel(status: string, visible: boolean) {
  if (visible) return "Anúncio ativo";
  if (status === "PENDING_REVIEW") return "Em análise";
  if (status === "PAUSED") return "Anúncio pausado";
  if (status === "REJECTED") return "Revisão necessária";
  if (status === "SUSPENDED") return "Anúncio suspenso";
  return "Anúncio em preparação";
}

function StatusPill({ status, label }: { status: ItemStatus | "active" | "optional" | "opportunity"; label: string }) {
  return <span className={`${styles.statusPill} ${styles[`status_${status}`]}`}>{label}</span>;
}

function ContentPreview({
  kind,
  count,
}: {
  kind: "cover" | "gallery" | "video" | "story";
  count?: number;
}) {
  if (kind === "gallery") {
    return (
      <div className={`${styles.preview} ${styles.galleryPreview}`} aria-hidden="true">
        {[0, 1, 2].map((item) => (
          <span key={item} className={styles.previewTile}>
            <FileImage />
          </span>
        ))}
        <span className={styles.previewCaption}>{count ? `${count} foto${count === 1 ? "" : "s"}` : "Sua galeria aqui"}</span>
      </div>
    );
  }

  if (kind === "story") {
    return (
      <div className={`${styles.preview} ${styles.storyPreview}`} aria-hidden="true">
        <span className={styles.storyAdd}><Plus /></span>
        {[0, 1, 2, 3].map((item) => <span key={item} className={styles.storyTile} />)}
        <span className={styles.previewCaption}>{count ? `${count} story ativo` : "Seu story aqui"}</span>
      </div>
    );
  }

  const Icon = kind === "video" ? Play : FileImage;
  return (
    <div className={`${styles.preview} ${kind === "video" ? styles.videoPreview : styles.coverPreview}`} aria-hidden="true">
      <span className={styles.previewIcon}><Icon /></span>
      <span className={styles.previewCaption}>{kind === "video" ? "Sua apresentação em vídeo" : "Sua capa em destaque"}</span>
    </div>
  );
}

export default async function ProfissionalDashPage() {
  const access = await requireCompanionPanel({ allowExpired: true });
  await refreshExpiredProfessionalTimers();
  const now = new Date();
  const eventsSince = new Date(now.getTime() - 30 * DAY_MS);

  const professional = await prisma.professional.findUnique({
    where: { userId: access.user.id },
    include: {
      user: {
        select: {
          premiumUntil: true,
          image: true,
          stories: {
            where: { expiresAt: { gt: now } },
            select: { id: true },
          },
        },
      },
      photos: { orderBy: { order: "asc" } },
      profileEvents: {
        where: { createdAt: { gte: eventsSince } },
        select: { eventType: true, createdAt: true },
      },
    },
  });

  if (!professional) redirect(ACCOUNT_ROUTES.onboardingAcompanhante);

  const professionalAccess = resolveProfessionalAccess(
    professional,
    professional.user,
    professional.status === "ACTIVE" || professional.status === "PAUSED",
    now,
  );

  if (professionalAccess.kind === "EXPIRED") {
    return (
      <div className={styles.dashboard}>
        <section className={styles.expiredCard}>
          <span className={styles.eyebrow}>Período gratuito encerrado</span>
          <h1>Escolha como continuar</h1>
          <p>Seus dados continuam salvos. Compare as opções disponíveis quando quiser reativar a publicação do seu anúncio.</p>
          <Link href="/profissional/planos?acesso=expirado" className={styles.primaryButton}>
            Ver opções disponíveis <ArrowRight />
          </Link>
        </section>
      </div>
    );
  }

  const profilePhoto = professional.user.image ?? null;
  const coverPhoto = professional.photos.find((photo) => photo.cover)?.url ?? professional.image ?? null;
  const galleryCount = professional.photos.filter((photo) => !photo.cover).length || professional.galleryUrls.filter((url) => url !== coverPhoto).length;
  const storyCount = professional.user.stories.length;
  const hasVideo = Boolean(professional.presentationVideoUrl && professional.presentationVideoStatus !== "REJECTED");
  const hasApprovedVerification = professional.verified || professional.kycStatus === "APPROVED" || professional.docStatus === "APPROVED" || professional.verifStatus === "APPROVED";
  const hasActivePlan = Boolean(professional.user.premiumUntil && professional.user.premiumUntil > now);
  const boostActive = Boolean(professional.boostActive && (!professional.boostUntil || professional.boostUntil > now));
  const isVisible = professional.status === "ACTIVE" && professionalAccess.canAppearInSearch && (!professional.pauseUntil || professional.pauseUntil <= now);
  const activeToday = Boolean(professional.lastOnlineAt && professional.lastOnlineAt.getTime() >= now.getTime() - DAY_MS);
  const last30Clicks = professional.profileEvents.filter((event) => event.eventType === "contact_click").length;

  const essentials = [
    { done: Boolean(profilePhoto) },
    { done: Boolean(coverPhoto) },
    { done: galleryCount >= 3 },
    { done: hasVideo },
    { done: storyCount > 0 },
  ];
  const progress = Math.round((essentials.filter((item) => item.done).length / essentials.length) * 100);

  const contentItems = [
    {
      id: "cover",
      title: "Foto de capa",
      description: "A capa é o primeiro impacto do seu anúncio.",
      status: (coverPhoto ? "complete" : "pending") as ItemStatus,
      label: coverPhoto ? "Completo" : "Pendente",
      href: "/profissional/fotos",
      action: coverPhoto ? "Gerenciar capa" : "Adicionar capa",
      icon: FileImage,
      kind: "cover" as const,
    },
    {
      id: "gallery",
      title: "Galeria principal",
      description: "Adicione fotos recentes e de alta qualidade.",
      status: (galleryCount >= 3 ? "complete" : "pending") as ItemStatus,
      label: galleryCount >= 3 ? "Completo" : "Pendente",
      href: "/profissional/fotos",
      action: galleryCount ? "Gerenciar fotos" : "Adicionar fotos",
      icon: Images,
      kind: "gallery" as const,
      count: galleryCount,
    },
    {
      id: "video",
      title: "Vídeo de apresentação",
      description: "Mostre um pouco da sua personalidade e aumente a confiança no seu perfil.",
      status: (hasVideo ? "complete" : "recommended") as ItemStatus,
      label: hasVideo ? "Completo" : "Recomendado",
      href: "/profissional/postar",
      action: hasVideo ? "Gerenciar vídeo" : "Enviar vídeo",
      icon: Video,
      kind: "video" as const,
    },
    {
      id: "story",
      title: "Story em destaque",
      description: "Compartilhe momentos recentes e mantenha seu perfil ativo.",
      status: (storyCount > 0 ? "complete" : "recommended") as ItemStatus,
      label: storyCount > 0 ? "Completo" : "Recomendado",
      href: "/profissional/stories",
      action: storyCount ? "Gerenciar stories" : "Publicar story",
      icon: Sparkles,
      kind: "story" as const,
      count: storyCount,
    },
  ];

  const checklist = [
    { title: "Foto de perfil", description: "Sua foto principal no perfil.", status: profilePhoto ? "complete" : "pending", label: profilePhoto ? "Completo" : "Pendente", href: "/profissional/fotos", icon: CircleUserRound },
    { title: "Foto de capa", description: "Imagem de destaque do seu anúncio.", status: coverPhoto ? "complete" : "pending", label: coverPhoto ? "Completo" : "Pendente", href: "/profissional/fotos", icon: FileImage },
    { title: "Galeria", description: "Adicione mais fotos para aumentar o alcance.", status: galleryCount >= 3 ? "complete" : "pending", label: galleryCount >= 3 ? "Completo" : "Pendente", href: "/profissional/fotos", icon: Images },
    { title: "Vídeo", description: "Mostre mais sobre você.", status: hasVideo ? "complete" : "recommended", label: hasVideo ? "Completo" : "Recomendado", href: "/profissional/postar", icon: Video },
    { title: "Story", description: "Mantenha seu perfil sempre ativo.", status: storyCount > 0 ? "complete" : "recommended", label: storyCount > 0 ? "Completo" : "Recomendado", href: "/profissional/stories", icon: Sparkles },
  ] as const;

  const opportunities = [
    {
      title: "Anúncio aprovado",
      description: hasApprovedVerification ? "Seu anúncio foi revisado e está em conformidade com as diretrizes." : "Sua verificação ainda está em análise.",
      status: hasApprovedVerification ? "complete" : "pending",
      label: hasApprovedVerification ? "Completo" : "Em análise",
      href: ACCOUNT_ROUTES.analiseAcompanhante,
      action: "Revisar anúncio",
      icon: ShieldCheck,
    },
    {
      title: "Anúncio ativo",
      description: isVisible ? "Seu anúncio está no ar e aparecendo nas buscas." : "Confira o status para publicar seu anúncio nas buscas.",
      status: isVisible ? "active" : "pending",
      label: isVisible ? "Ativo" : "Pendente",
      href: `/profissionais/${professional.slug}`,
      action: "Ver anúncio",
      icon: Eye,
    },
    {
      title: "Destaques opcionais",
      description: "Adicione recursos extras para gerar mais visibilidade e contatos.",
      status: hasActivePlan ? "active" : "optional",
      label: hasActivePlan ? "Ativo" : "Opcional",
      href: "/profissional/planos",
      action: "Ver destaques",
      icon: Crown,
    },
    {
      title: boostActive ? "Destaque ativo" : "Destaque disponível",
      description: boostActive ? "Seu anúncio está com visibilidade ampliada neste momento." : "Impulsione seu anúncio e melhore sua posição na listagem.",
      status: boostActive ? "active" : "opportunity",
      label: boostActive ? "Ativo" : "Oportunidade",
      href: "/profissional/planos",
      action: boostActive ? "Ver detalhes" : "Ver opções",
      icon: Rocket,
    },
  ] as const;

  return (
    <div className={styles.dashboard} data-dashboard-version="professional-light-v1">
      <section className={styles.profileCard} aria-label="Perfil profissional">
        <Link href="/profissional/fotos" className={styles.avatarLink} aria-label="Editar foto de perfil">
          <span className={styles.avatar}>
            {profilePhoto ? <Image src={profilePhoto} alt={professional.displayName} width={76} height={76} sizes="76px" /> : <CircleUserRound />}
          </span>
          <span className={styles.cameraBadge}><Camera /></span>
        </Link>
        <div className={styles.profileCopy}>
          <strong>{professional.displayName}</strong>
          <span><MapPin /> {professional.city}, {professional.state}</span>
        </div>
        <Link href={`/profissionais/${professional.slug}`} className={styles.profileLink}>
          Ver perfil <ChevronRight />
        </Link>
      </section>

      <section className={styles.summaryCard}>
        <div className={styles.summaryGlow} aria-hidden="true"><BarChart3 /></div>
        <div className={styles.summaryHeading}>
          <span className={styles.eyebrow}>Seu anúncio</span>
          <div className={styles.summaryTitleRow}>
            <h1>Gestão do seu anúncio</h1>
            <span className={`${styles.liveBadge} ${isVisible ? styles.live : styles.offline}`}>
              <i /> {statusLabel(professional.status, isVisible)}
            </span>
          </div>
          <p>Acompanhe seu desempenho e mantenha as informações que geram mais contatos sempre atualizadas.</p>
        </div>

        <div className={styles.metrics}>
          <div><strong>{professional.profileViews.toLocaleString("pt-BR")}</strong><span>Visualizações</span></div>
          <div><strong>{last30Clicks.toLocaleString("pt-BR")}</strong><span>Cliques em 30 dias</span></div>
          <div><strong>{professional.contactClicks.toLocaleString("pt-BR")}</strong><span>Contatos</span></div>
          <div className={styles.activityMetric}>
            <strong><Clock3 /></strong>
            <span>{activeToday ? "Ativo hoje" : "Presença offline"}</span>
          </div>
        </div>

        <div className={styles.summaryActions}>
          <Link href="/profissional/perfil" className={styles.primaryButton}>Editar anúncio <ArrowRight /></Link>
          <Link href="/profissional/planos" className={styles.secondaryButton}>Impulsionar agora <Rocket /></Link>
        </div>
      </section>

      <section className={styles.sectionBlock}>
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>Melhore seu anúncio</span>
          <h2>Conteúdo que gera mais contatos</h2>
          <p>Complete os itens abaixo para deixar seu anúncio mais forte e confiável.</p>
        </div>
        <div className={styles.contentList}>
          {contentItems.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.id} className={styles.contentModule}>
                <div className={styles.moduleHeading}>
                  <span className={styles.moduleIcon}><Icon /></span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                  <StatusPill status={item.status} label={item.label} />
                </div>
                <div className={styles.moduleBody}>
                  <ContentPreview kind={item.kind} count={item.count} />
                  <Link href={item.href} className={styles.moduleAction}>{item.action} <ArrowRight /></Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className={styles.twoColumnGrid}>
        <section className={styles.progressCard}>
          <div className={styles.progressDecoration} aria-hidden="true"><CheckCircle2 /></div>
          <span className={styles.eyebrow}>Seu progresso</span>
          <h2>Anúncio {progress}% completo</h2>
          <p>Complete os itens essenciais para melhorar confiança, visibilidade e conversão.</p>
          <div className={styles.progressTrack} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso do anúncio">
            <span style={{ width: `${progress}%` }}>{progress}%</span>
          </div>
          <div className={styles.progressNote}><BarChart3 /> Anúncios completos recebem mais visualizações e mais contatos.</div>
        </section>

        <section className={styles.pendingCard}>
          <div className={styles.compactHeading}>
            <h2>Pendências reais</h2>
            <p>Veja o que falta para concluir o seu anúncio.</p>
          </div>
          <div className={styles.checklist}>
            {checklist.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.title} href={item.href} className={styles.checklistItem}>
                  <span className={`${styles.checkIcon} ${styles[`check_${item.status}`]}`}><Icon /></span>
                  <span className={styles.checkCopy}><strong>{item.title}</strong><small>{item.description}</small></span>
                  <StatusPill status={item.status} label={item.label} />
                  <ChevronRight className={styles.checkArrow} />
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      <section className={styles.sectionBlock}>
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>Meu anúncio</span>
          <h2>Status e oportunidades</h2>
          <p>Acompanhe a situação do seu anúncio e descubra formas de aumentar sua visibilidade.</p>
        </div>
        <div className={styles.opportunityGrid}>
          {opportunities.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className={styles.opportunityCard}>
                <div className={styles.opportunityTop}>
                  <span className={styles.opportunityIcon}><Icon /></span>
                  <StatusPill status={item.status} label={item.label} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <Link href={item.href}>{item.action} <ChevronRight /></Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.helpStrip}>
        <span><MessageCircle /></span>
        <div><strong>Precisa de ajuda com seu anúncio?</strong><p>Acesse mensagens e fale com a equipe Elite Modell.</p></div>
        <Link href="/profissional/mensagens">Abrir mensagens <ArrowRight /></Link>
      </section>
    </div>
  );
}

"use client";
import Link from "next/link";
import {
  ChevronRight,
  CircleAlert,
  CreditCard,
  Heart,
  MessageCircle,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import AchievementsSection from "@/components/client-area/AchievementsSection";
import HistorySection from "@/components/client-area/HistorySection";
import ListsSection from "@/components/client-area/ListsSection";
import UserWelcomeCard from "@/components/client-area/UserWelcomeCard";
import VerificationSection, { type VerificationStep } from "@/components/client-area/VerificationSection";

export type DashboardHomeData = {
  user: {
    name: string | null;
    email: string | null;
    image: string | null;
    phone: string | null;
    phoneVerified?: boolean;
    phoneVerifiedAt?: string | null;
    document?: string | null;
    verified: boolean;
    credits: number;
    createdAt: string;
    birthDate: string | null;
    termsConsent: boolean;
    lgpdConsent: boolean;
  };
  city: string | null;
  vip: {
    label: string;
    description: string;
    progress: number;
  };
  stats: {
    activeAppointments: number;
    completedAppointments: number;
    favoriteProfiles: number;
    credits: number;
    totalAppointments: number;
  };
  onboarding: Array<{ label: string; done: boolean; detail: string }>;
  recentAppointments: Array<{
    id: string;
    name: string;
    slug: string;
    city: string;
    state: string;
    status: string;
    date: string;
    duration: number;
    contactMethod: string;
    image: string | null;
    verified: boolean;
    age: number | null;
  }>;
  recommendedProfessionals: Array<unknown>;
};

function hasRealEmail(email: string | null) {
  return Boolean(email && !email.startsWith("phone_"));
}

function ActionCard({
  href,
  icon,
  title,
  description,
  cta,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <Link href={href} className="client-action-card group no-underline">
      <span className="grid h-12 w-12 place-items-center rounded-[8px] border border-[#d4a843]/26 bg-[#d4a843]/10 text-[#f5d78c]">
        {icon}
      </span>
      <span className="mt-6 block text-[20px] font-black leading-6 text-[#f5f0e4]">{title}</span>
      <span className="mt-3 block min-h-[42px] text-[13px] leading-5 text-[#f5f0e4]/56">{description}</span>
      <span className="mt-5 flex items-center justify-between text-[12px] font-black uppercase text-[#f5d78c]">
        {cta}
        <ChevronRight className="h-4 w-4 transition-transform group-active:translate-x-0.5" />
      </span>
    </Link>
  );
}

function QuickActionGrid({
  credits,
  verificationDone,
}: {
  credits: number;
  verificationDone: number;
}) {
  const walletText =
    credits > 0
      ? `${credits.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} disponivel`
      : "Saldo protegido e acesso rapido a sua carteira.";

  return (
    <>
      <section
        className="px-4 pb-7 pt-4"
        style={{ background: "linear-gradient(180deg, #0e0f11 0%, #111214 100%)" }}
      >
        <div className="grid grid-cols-2 gap-3">
          <ActionCard
            href="/dashboard/acompanhantes"
            icon={<Search className="h-6 w-6" />}
            title="Explorar"
            description="Veja perfis reais quando houver disponibilidade na sua cidade."
            cta="Acessar"
          />
          <ActionCard
            href="/dashboard/favoritos"
            icon={<Heart className="h-6 w-6" />}
            title="Listas"
            description="Guarde curtidos, seguidos e colecoes privadas sem exposicao."
            cta="Abrir"
          />
          <ActionCard
            href="/dashboard/carteira"
            icon={<CreditCard className="h-6 w-6" />}
            title="Carteira"
            description={walletText}
            cta="Ver saldo"
          />
          <ActionCard
            href="/dashboard/perfil"
            icon={<ShieldCheck className="h-6 w-6" />}
            title="Verificar"
            description={`${verificationDone}/3 etapas concluidas para reforcar sua conta.`}
            cta="Validar"
          />
        </div>
      </section>
      <div style={{ height: 28, background: "linear-gradient(180deg, #111214 0%, #ffffff 100%)" }} />
    </>
  );
}

function QuickStatsSection({
  stats,
  vip,
}: {
  stats: DashboardHomeData["stats"];
  vip: DashboardHomeData["vip"];
}) {
  return (
    <section className="client-page-tight" style={{ paddingBottom: 20 }}>
      <div className="client-card overflow-hidden p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wide text-[#f5d78c]/70">Nivel atual</p>
            <p className="mt-0.5 text-[20px] font-black leading-tight text-[#f5d78c]">{vip.label}</p>
          </div>
          <span className="shrink-0 rounded-full border border-[#d4a843]/24 bg-[#d4a843]/10 px-2.5 py-1 text-[13px] font-black text-[#f5d78c]">
            {vip.progress}%
          </span>
        </div>
        <p className="mt-1.5 text-[12px] leading-[1.5] text-[#f5f0e4]/46">{vip.description}</p>

        <div className="mt-3 h-[4px] overflow-hidden rounded-full bg-[rgba(30,24,14,0.06)]">
          <div
            className="h-full rounded-full bg-[#d4a843] transition-all duration-700"
            style={{ width: `${Math.max(3, vip.progress)}%` }}
          />
        </div>

        <div className="my-4 h-px bg-[rgba(30,24,14,0.07)]" />

        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[26px] font-black leading-none text-[#f5f0e4]">{stats.completedAppointments}</p>
            <p className="mt-1 text-[11px] text-[#f5f0e4]/44">Concluidos</p>
          </div>
          <div className="h-8 w-px bg-[rgba(30,24,14,0.07)]" />
          <div className="min-w-0 flex-1">
            <p className="text-[26px] font-black leading-none text-[#f5f0e4]">{stats.favoriteProfiles}</p>
            <p className="mt-1 text-[11px] text-[#f5f0e4]/44">Salvos</p>
          </div>
          <div className="h-8 w-px bg-[rgba(30,24,14,0.07)]" />
          <div className="min-w-0 flex-1">
            <p className="text-[26px] font-black leading-none text-[#f5f0e4]">{stats.totalAppointments}</p>
            <p className="mt-1 text-[11px] text-[#f5f0e4]/44">Total</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReviewsSection() {
  return (
    <section className="client-page-tight">
      <div className="client-card p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] border border-white/[0.07] bg-white/[0.04] text-[#f5d78c]">
            <CircleAlert className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold text-[#f5f0e4]">Avaliacoes aparecerao depois</h2>
            <p className="mt-1 text-[13px] leading-5 text-[#f5f0e4]/52">
              Quando voce tiver experiencias concluídas, podera registrar avaliacoes de forma discreta.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/acompanhantes"
          className="client-secondary-button mt-4 flex min-h-0 items-center justify-center py-2.5 text-[13px] no-underline"
        >
          Explorar perfis
        </Link>
      </div>
    </section>
  );
}

function SafetyCard() {
  return (
    <section className="client-page-tight" style={{ paddingBottom: "calc(180px + env(safe-area-inset-bottom))" }}>
      <div className="client-panel p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] border border-[#d4a843]/20 bg-[#d4a843]/10 text-[#f5d78c]">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-bold text-[#f5f0e4]">Seguranca da conta</h2>
            <p className="mt-1.5 text-[13px] leading-5 text-[#f5f0e4]/54">
              Nunca informe senhas, codigos ou documentos fora da plataforma.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/atendimento"
          className="client-secondary-button mt-4 flex min-h-0 items-center justify-center gap-2 py-2.5 text-[13px] no-underline"
        >
          <MessageCircle className="h-4 w-4" />
          Falar com atendimento
        </Link>
      </div>
    </section>
  );
}

export default function PremiumDashboardHome({
  data,
}: {
  data: DashboardHomeData;
  clientStatus?: string;
}) {
  const verificationSteps: VerificationStep[] = [
    {
      label: hasRealEmail(data.user.email) ? "E-mail validado" : "Informar e-mail",
      done: hasRealEmail(data.user.email),
    },
    {
      label: data.user.phoneVerified || data.user.phoneVerifiedAt ? "Telefone validado" : "Verificar telefone",
      done: Boolean(data.user.phoneVerified || data.user.phoneVerifiedAt),
    },
    {
      label: data.user.document || data.user.verified ? "Documento validado" : "Verificar documento",
      done: Boolean(data.user.document || data.user.verified),
    },
  ];
  const verificationDone = verificationSteps.filter((step) => step.done).length;

  return (
    <div>
      <UserWelcomeCard name={data.user.name} image={data.user.image} city={data.city} />
      <QuickActionGrid credits={data.stats.credits} verificationDone={verificationDone} />
      <QuickStatsSection stats={data.stats} vip={data.vip} />
      <VerificationSection steps={verificationSteps} />
      <ListsSection />
      <HistorySection />
      <AchievementsSection />
      <ReviewsSection />
      <SafetyCard />
    </div>
  );
}

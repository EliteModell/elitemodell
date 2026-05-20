"use client";
import Link from "next/link";
import {
  ChevronRight,
  CircleAlert,
  MessageCircle,
  ShieldAlert,
  Users,
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

function Divider() {
  return <div className="mx-4 my-1 h-px bg-white/[0.06]" />;
}

/* ─── Account stats strip ─── */
function QuickStatsSection({
  stats,
  vip,
}: {
  stats: DashboardHomeData["stats"];
  vip: DashboardHomeData["vip"];
}) {
  return (
    <section className="px-4 pb-5 pt-2">
      <div className="flex overflow-hidden rounded-[10px] border border-white/[0.07] bg-white/[0.03]">
        <div className="flex flex-1 flex-col items-center py-4">
          <p className="text-[24px] font-black leading-none text-[#f5f0e4]">
            {stats.completedAppointments}
          </p>
          <p className="mt-1.5 text-[11px] text-[#f5f0e4]/44">Concluídos</p>
        </div>
        <div className="my-3.5 w-px bg-white/[0.08]" />
        <div className="flex flex-1 flex-col items-center py-4">
          <p className="text-[24px] font-black leading-none text-[#f5f0e4]">
            {stats.favoriteProfiles}
          </p>
          <p className="mt-1.5 text-[11px] text-[#f5f0e4]/44">Favoritos</p>
        </div>
        <div className="my-3.5 w-px bg-white/[0.08]" />
        <div className="flex flex-1 flex-col items-center py-4">
          <p className="truncate px-2 text-[15px] font-black leading-none text-[#f5d78c]">
            {vip.label}
          </p>
          <p className="mt-1.5 text-[11px] text-[#f5f0e4]/44">Nível VIP</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2.5">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[11px] text-[#f5f0e4]/38">{vip.description}</p>
          <p className="text-[11px] font-bold text-[#f5d78c]">{vip.progress}%</p>
        </div>
        <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#4d9b56] to-[#d4a843] transition-all duration-700"
            style={{ width: `${Math.max(3, vip.progress)}%` }}
          />
        </div>
      </div>
    </section>
  );
}

/* ─── Explore CTA (replaces fake recommended profiles) ─── */
function ExploreSection() {
  return (
    <section className="client-page-tight">
      <Link href="/dashboard/acompanhantes" className="block no-underline">
        <div className="client-panel flex items-center gap-4 p-5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[10px] border border-[#d4a843]/18 bg-[#d4a843]/8">
            <Users className="h-6 w-6 text-[#f5d78c]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="client-kicker">Descoberta</p>
            <h2 className="mt-0.5 text-[17px] font-bold text-[#f5f0e4]">Explorar acompanhantes</h2>
            <p className="mt-1 text-[13px] text-[#f5f0e4]/52">
              Perfis verificados por cidade e avaliações.
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-[#f5d78c]" />
        </div>
      </Link>
    </section>
  );
}

/* ─── Reviews prompt ─── */
function ReviewsSection() {
  return (
    <section className="client-page-tight">
      <div className="client-card p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] border border-white/[0.07] bg-white/[0.04] text-[#f5d78c]">
            <CircleAlert className="h-[20px] w-[20px]" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[16px] font-bold text-[#f5f0e4]">Você ainda não fez avaliações</h2>
            <p className="mt-1.5 text-[13px] leading-5 text-[#f5f0e4]/52">
              Avalie acompanhantes após uma contratação e ajude a comunidade.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/acompanhantes"
          className="client-secondary-button mt-5 flex items-center justify-center text-[14px] no-underline"
        >
          Explorar perfis
        </Link>
      </div>
    </section>
  );
}

/* ─── Safety card ─── */
function SafetyCard() {
  return (
    <section className="client-page-tight pb-10">
      <div className="client-panel p-5">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-[#d4a843]" />
          <h2 className="min-w-0 flex-1 text-[15px] font-bold text-[#f5f0e4]">Segurança da conta</h2>
          <ShieldAlert className="h-5 w-5 text-[#f5d78c]" />
        </div>
        <p className="mt-3 text-[13px] leading-5 text-[#f5f0e4]/52">
          Nunca informe senhas, códigos ou documentos fora da plataforma. Em caso de dúvida, fale com o suporte.
        </p>
        <Link
          href="/dashboard/atendimento"
          className="mt-4 inline-flex items-center gap-2 text-[13px] font-semibold text-[#f5d78c] no-underline"
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

  return (
    <div>
      <UserWelcomeCard
        name={data.user.name}
        image={data.user.image}
        city={data.city}
        credits={data.stats.credits}
      />
      <QuickStatsSection stats={data.stats} vip={data.vip} />
      <Divider />
      <VerificationSection steps={verificationSteps} />
      <Divider />
      <ExploreSection />
      <Divider />
      <ListsSection />
      <Divider />
      <HistorySection />
      <AchievementsSection />
      <Divider />
      <ReviewsSection />
      <SafetyCard />
    </div>
  );
}

"use client";
import Link from "next/link";
import {
  CalendarCheck,
  CircleAlert,
  ChevronRight,
  Heart,
  MessageCircle,
  ShieldAlert,
  Sparkles,
  Star,
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
  onboarding: Array<{
    label: string;
    done: boolean;
    detail: string;
  }>;
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
  return <div className="mx-4 my-1 h-px bg-[#d4a843]/10" />;
}

/* ─── Quick activity stats ─── */
function QuickStatsSection({ stats, vip }: { stats: DashboardHomeData["stats"]; vip: DashboardHomeData["vip"] }) {
  return (
    <section className="px-4 pb-5 pt-3">
      <div className="grid grid-cols-3 gap-2.5">
        <div className="client-stat-pill flex flex-col items-center py-3.5">
          <CalendarCheck className="mb-1.5 h-5 w-5 text-[#f5d78c]" />
          <p className="text-[20px] font-black leading-none text-[#f5f0e4]">
            {stats.completedAppointments}
          </p>
          <p className="mt-1 text-center text-[11px] leading-4 text-[#f5f0e4]/50">
            Concluídos
          </p>
        </div>
        <div className="client-stat-pill flex flex-col items-center py-3.5">
          <Heart className="mb-1.5 h-5 w-5 text-[#f5d78c]" />
          <p className="text-[20px] font-black leading-none text-[#f5f0e4]">
            {stats.favoriteProfiles}
          </p>
          <p className="mt-1 text-center text-[11px] leading-4 text-[#f5f0e4]/50">
            Favoritos
          </p>
        </div>
        <div className="client-stat-pill flex flex-col items-center py-3.5">
          <Star className="mb-1.5 h-5 w-5 fill-[#d4a843] text-[#d4a843]" />
          <p className="truncate px-1 text-[13px] font-black leading-none text-[#f5d78c]">
            {vip.label.split(" ")[0]}
          </p>
          <p className="mt-1 text-center text-[11px] leading-4 text-[#f5f0e4]/50">
            Nível VIP
          </p>
        </div>
      </div>

      {/* VIP progress bar */}
      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-[11px] font-semibold text-[#f5f0e4]/48">{vip.description}</p>
          <p className="text-[11px] font-bold text-[#f5d78c]">{vip.progress}%</p>
        </div>
        <div className="h-[4px] overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#4d9b56,#d4a843,#f5d78c)] transition-all duration-700"
            style={{ width: `${Math.max(4, vip.progress)}%` }}
          />
        </div>
      </div>
    </section>
  );
}

/* ─── Recommended profiles placeholder carousel ─── */
const PLACEHOLDER_PROFILES = [
  { name: "Valentina", city: "São Paulo", initials: "V", from: "#2b2211", to: "#c9843c" },
  { name: "Isabella", city: "Rio de Janeiro", initials: "I", from: "#1a0a12", to: "#8f1d24" },
  { name: "Gabriela", city: "Curitiba", initials: "G", from: "#0a121a", to: "#1d6b8f" },
  { name: "Sophia", city: "Belo Horizonte", initials: "S", from: "#0f1a0f", to: "#4d9b56" },
];

function RecommendedSection() {
  return (
    <section className="client-page-tight">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="client-kicker">Para você</p>
          <h2 className="mt-0.5 text-[20px] font-bold text-[#f5f0e4]">Recomendados</h2>
        </div>
        <Link
          href="/dashboard/acompanhantes"
          className="flex items-center gap-1 text-[13px] font-semibold text-[#f5d78c] no-underline"
        >
          Explorar
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {PLACEHOLDER_PROFILES.map((p) => (
          <Link key={p.name} href="/dashboard/acompanhantes" className="shrink-0 no-underline">
            <div
              className="relative h-[148px] w-[110px] overflow-hidden rounded-[10px] border border-[#d4a843]/16"
              style={{
                background: `linear-gradient(135deg, ${p.from}, ${p.to}55)`,
              }}
            >
              <div className="flex h-full w-full items-center justify-center">
                <span className="text-[38px] font-black text-[#f5d78c]/30">{p.initials}</span>
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-black/92 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-2.5">
                <p className="truncate text-[12px] font-bold text-white">{p.name}</p>
                <p className="truncate text-[11px] text-white/58">{p.city}</p>
              </div>
            </div>
          </Link>
        ))}

        {/* "Ver todos" tile */}
        <Link href="/dashboard/acompanhantes" className="shrink-0 no-underline">
          <div className="flex h-[148px] w-[90px] flex-col items-center justify-center rounded-[10px] border border-dashed border-[#d4a843]/24 bg-[#d4a843]/5 transition-colors active:bg-[#d4a843]/10">
            <Sparkles className="h-5 w-5 text-[#f5d78c]" />
            <p className="mt-2 text-center text-[11px] font-semibold leading-4 text-[#f5d78c]">
              Ver<br />todos
            </p>
          </div>
        </Link>
      </div>
    </section>
  );
}

/* ─── Reviews prompt ─── */
function ReviewsSection() {
  return (
    <section className="client-page-tight">
      <div className="client-card p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] border border-white/10 bg-white/[0.045] text-[#f5d78c]">
            <CircleAlert className="h-[20px] w-[20px]" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[16px] font-bold text-[#f5f0e4]">Você ainda não fez avaliações</h2>
            <p className="mt-1.5 text-[13px] leading-5 text-[#f5f0e4]/58">
              Sua avaliação ajuda clientes e acompanhantes.
            </p>
            <p className="mt-1.5 text-[13px] font-semibold text-[#f5d78c]">Contratou alguém?</p>
            <p className="mt-1.5 text-[13px] leading-5 text-[#f5f0e4]/58">
              Vá até o perfil e compartilhe sua experiência.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/acompanhantes"
          className="client-secondary-button mt-5 flex items-center justify-center text-[14px] no-underline transition-colors active:bg-white/10"
        >
          Avalie agora
        </Link>
      </div>
    </section>
  );
}

/* ─── Safety card ─── */
function SafetyCard() {
  return (
    <section className="client-page-tight pb-8">
      <div className="client-panel p-5">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#d4a843] shadow-[0_0_18px_rgba(212,168,67,0.5)]" />
          <h2 className="min-w-0 flex-1 text-[16px] font-bold text-[#f5f0e4]">Segurança da conta</h2>
          <ShieldAlert className="h-5 w-5 text-[#f5d78c]" />
        </div>
        <div className="client-panel-soft mt-4 p-4">
          <h3 className="text-[15px] font-bold text-[#f5f0e4]">Canais oficiais</h3>
          <p className="mt-1.5 text-[13px] leading-5 text-[#f5f0e4]/58">
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
      <RecommendedSection />
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

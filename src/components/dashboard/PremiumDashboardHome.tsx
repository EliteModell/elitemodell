"use client";
import Link from "next/link";
import { CircleAlert, MessageCircle, ShieldAlert } from "lucide-react";
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
  return <div className="h-[6px] bg-[#f0f3f5]" />;
}

function ReviewsSection() {
  return (
    <section className="bg-white px-4 py-8">
      <div className="flex items-start gap-3">
        <CircleAlert className="mt-0.5 h-[20px] w-[20px] shrink-0 text-[#5a6a71]" />
        <div className="min-w-0">
          <h2 className="text-[16px] font-bold text-[#1f2a30]">Você ainda não fez nenhuma avaliação</h2>
          <p className="mt-1.5 text-[13px] leading-5 text-[#566570]">Sua avaliação ajuda clientes e acompanhantes.</p>
          <p className="mt-1.5 text-[13px] font-semibold text-[#a9822d]">Contratou um(a) acompanhante?</p>
          <p className="mt-1.5 text-[13px] leading-5 text-[#566570]">
            Vá até o perfil e compartilhe como foi a experiência.
          </p>
        </div>
      </div>
      <Link
        href="/profissionais"
        className="mt-6 flex h-[46px] items-center justify-center rounded-[10px] border border-[#c9a84c] bg-white text-[14px] font-semibold text-[#a9822d] no-underline transition-colors active:bg-[#fef9f0]"
      >
        Avalie agora
      </Link>
    </section>
  );
}

function SafetyCard() {
  return (
    <section className="bg-[#f0f3f5] px-4 py-8">
      <div className="rounded-[14px] bg-white p-5 shadow-[0_2px_12px_rgba(20,31,36,0.06)]">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#c9a84c]" />
          <h2 className="min-w-0 flex-1 text-[16px] font-bold text-[#1f2a30]">Segurança da conta</h2>
          <ShieldAlert className="h-5 w-5 text-[#5a6a71]" />
        </div>
        <div className="mt-4 rounded-[10px] bg-[#f5f8f9] p-4">
          <h3 className="text-[15px] font-bold text-[#1f2a30]">Canais oficiais</h3>
          <p className="mt-1.5 text-[13px] leading-5 text-[#566570]">
            Nunca informe senhas, códigos ou documentos fora da plataforma. Em caso de dúvida, fale com o suporte.
          </p>
          <Link
            href="/dashboard/atendimento"
            className="mt-4 inline-flex items-center gap-2 text-[13px] font-semibold text-[#a9822d] no-underline"
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
      <Divider />
      <VerificationSection steps={verificationSteps} />
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

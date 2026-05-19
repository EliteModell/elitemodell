import Link from "next/link";
import { CircleAlert, MessageCircle, Plus, ShieldAlert, Volume2 } from "lucide-react";
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

function ReviewsSection() {
  return (
    <section id="avaliacoes" className="bg-white px-5 py-10">
      <div className="flex items-start gap-3">
        <CircleAlert className="mt-1 h-7 w-7 shrink-0 text-[#202a30]" />
        <div>
          <h2 className="text-[21px] font-black text-[#202a30]">Você ainda não fez nenhuma avaliação</h2>
          <p className="mt-4 text-[19px] leading-7 text-[#59666d]">Sua avaliação ajuda clientes e acompanhantes.</p>
          <p className="mt-3 text-[19px] font-bold text-[#a9822d]">Contratou um(a) acompanhante?</p>
          <p className="mt-3 text-[19px] leading-7 text-[#202a30]">
            Vá até o perfil do(a) acompanhante e compartilhe como foi a experiência do seu atendimento.
          </p>
        </div>
      </div>
      <Link
        href="/profissionais"
        className="mt-8 flex h-[60px] items-center justify-center rounded-[8px] border border-[#c9a84c] bg-white text-[18px] font-black text-[#a9822d] no-underline"
      >
        Avalie agora
      </Link>
    </section>
  );
}

function VoiceSection() {
  return (
    <section className="border-y border-[#dbe1e3] bg-white px-5 py-9">
      <h2 className="flex items-center gap-3 text-[24px] font-black text-[#202a30]">
        <Volume2 className="h-7 w-7" />
        Preferências de atendimento
      </h2>
      <button className="mt-7 flex h-[60px] w-full items-center justify-center gap-3 rounded-[8px] border-0 bg-[#c9a84c] text-[22px] font-black text-[#11191d]">
        <Plus className="h-7 w-7" />
        Ajustar minhas preferências
      </button>
    </section>
  );
}

function SafetyCard() {
  return (
    <section className="bg-[#e7edf0] px-5 py-9">
      <article className="rounded-[10px] bg-white p-6 shadow-[0_3px_16px_rgba(20,31,36,0.06)]">
        <div className="flex items-center gap-4">
          <span className="h-3 w-3 rounded-full bg-[#c9a84c]" />
          <h2 className="min-w-0 flex-1 text-[24px] font-black text-[#202a30]">
            Segurança da conta
          </h2>
          <ShieldAlert className="h-7 w-7 text-[#202a30]" />
        </div>
        <div className="mt-6 rounded-[8px] bg-[#f2f5f6] p-5">
          <h3 className="text-[25px] font-black text-[#202a30]">Canais oficiais</h3>
          <p className="mt-3 text-[19px] leading-7 text-[#4f5d64]">
            Nunca informe senhas, códigos ou documentos fora da plataforma. Em caso de dúvida, fale com o suporte.
          </p>
          <Link href="/dashboard/mensagens" className="mt-6 inline-flex items-center gap-2 text-[18px] font-black text-[#a9822d] no-underline">
            <MessageCircle className="h-5 w-5" />
            Falar com atendimento
          </Link>
        </div>
      </article>
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
    <div className="bg-white">
      <UserWelcomeCard
        name={data.user.name}
        image={data.user.image}
        city={data.city}
        credits={data.stats.credits}
      />
      <VerificationSection steps={verificationSteps} />
      <ListsSection />
      <HistorySection />
      <AchievementsSection />
      <ReviewsSection />
      <VoiceSection />
      <SafetyCard />
    </div>
  );
}

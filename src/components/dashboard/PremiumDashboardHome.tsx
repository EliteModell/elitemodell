"use client";

/* eslint-disable @next/next/no-img-element -- Cards mix uploads and remote profile images. */

import Link from "next/link";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  Camera,
  CheckCircle2,
  Clock3,
  Compass,
  Crown,
  Heart,
  LockKeyhole,
  MapPin,
  MessageCircle,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
} from "lucide-react";

export type DashboardHomeData = {
  user: {
    name: string | null;
    email: string | null;
    image: string | null;
    phone: string | null;
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
  }>;
  recommendedProfessionals: Array<{
    id: string;
    slug: string;
    name: string;
    city: string;
    state: string;
    rating: number;
    verified: boolean;
    featured: boolean;
    price: number | null;
    image: string | null;
    attendanceTypes: string[];
  }>;
};

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: "easeOut" } },
};

const professionalFallbacks = ["/model.jpeg", "/model1.jpg", "/model2.jpg"];

function initials(name?: string | null) {
  if (!name) return "EM";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function firstName(name?: string | null) {
  return name?.split(" ").filter(Boolean)[0] ?? "cliente";
}

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "Aguardando confirmação",
    CONFIRMED: "Confirmado",
    CANCELLED: "Cancelado",
    COMPLETED: "Concluído",
    NO_SHOW: "Não compareceu",
  };
  return labels[status] ?? status;
}

function onboardingProgress(data: DashboardHomeData["onboarding"]) {
  const done = data.filter((step) => step.done).length;
  return Math.round((done / Math.max(data.length, 1)) * 100);
}

function StatCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <motion.div
      variants={item}
      whileHover={{ y: -3 }}
      className="rounded-[8px] border border-white/10 bg-white/[0.045] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl transition-colors hover:border-[#d4a843]/35"
    >
      <span className="mb-4 grid h-10 w-10 place-items-center rounded-[8px] border border-[#d4a843]/20 bg-[#d4a843]/10 text-[#f5d78c]">
        {icon}
      </span>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-sm font-semibold text-white/74">{label}</p>
      <p className="mt-2 text-xs leading-5 text-white/40">{helper}</p>
    </motion.div>
  );
}

function SectionTitle({ eyebrow, title, href }: { eyebrow: string; title: string; href?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#d4a843]">
          {eyebrow}
        </p>
        <h2 className="text-lg font-black text-white">{title}</h2>
      </div>
      {href ? (
        <Link href={href} className="inline-flex items-center gap-1 text-sm font-bold text-[#f5d78c]">
          Ver
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

function EmptyMoment({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[8px] border border-dashed border-white/12 bg-black/18 p-5 text-center">
      <Sparkles className="mx-auto mb-3 h-5 w-5 text-[#d4a843]" />
      <p className="font-bold text-white">{title}</p>
      <p className="mt-1 text-sm leading-6 text-white/45">{body}</p>
    </div>
  );
}

export default function PremiumDashboardHome({ data }: { data: DashboardHomeData }) {
  const progress = onboardingProgress(data.onboarding);
  const name = firstName(data.user.name);
  const smartMessage =
    data.stats.favoriteProfiles > 0
      ? "Sua curadoria já começou. Continue salvando perfis para refinar recomendações e contatos."
      : "Explore profissionais verificados e monte uma curadoria discreta, segura e pessoal.";

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 pb-20 md:pb-0">
      <motion.section
        variants={item}
        className="relative overflow-hidden rounded-[8px] border border-white/10 bg-[linear-gradient(135deg,rgba(20,20,22,0.97),rgba(58,9,14,0.72)_48%,rgba(7,7,8,0.98))] p-4 shadow-[0_32px_110px_rgba(0,0,0,0.38)] sm:p-6"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(245,215,140,0.85),transparent)]" />
        <div className="relative grid gap-5 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#d4a843]/25 bg-black/25 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#f5d78c]">
              <Sparkles className="h-3.5 w-3.5" />
              Cliente premium
            </div>
            <h1 className="max-w-3xl text-3xl font-black leading-tight text-white sm:text-5xl">
              Olá, {name}. Sua curadoria discreta está pronta.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/62 sm:text-base">
              {smartMessage}
            </p>
            <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap">
              <Link
                href="/profissionais"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-[#d4a843] px-5 text-sm font-black text-[#100d09] shadow-[0_14px_34px_rgba(212,168,67,0.22)] transition hover:bg-[#f5d78c]"
              >
                <Compass className="h-4 w-4" />
                Explorar profissionais
              </Link>
              <Link
                href="/dashboard/reservas"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] border border-white/12 bg-white/[0.06] px-5 text-sm font-bold text-white transition hover:border-[#cc1f2f]/45 hover:bg-[#cc1f2f]/12"
              >
                <CalendarCheck className="h-4 w-4" />
                Meus agendamentos
              </Link>
            </div>
          </div>

          <div className="rounded-[8px] border border-white/10 bg-black/28 p-4 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[8px] border border-[#d4a843]/35 bg-[#d4a843]/12 sm:h-20 sm:w-20">
                {data.user.image ? (
                  <img src={data.user.image} alt={data.user.name ?? "Avatar"} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-xl font-black text-[#f5d78c]">
                    {initials(data.user.name)}
                  </div>
                )}
                <span className="absolute bottom-1.5 right-1.5 grid h-5 w-5 place-items-center rounded-full bg-[#0a0a0b] text-[#d4a843]">
                  <BadgeCheck className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-black text-white">{data.user.name ?? "Perfil Elite"}</p>
                <p className="truncate text-sm text-white/45">{data.user.email ?? "Email pendente"}</p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#d4a843]/25 bg-[#d4a843]/10 px-3 py-1 text-xs font-black text-[#f5d78c]">
                  <Crown className="h-3.5 w-3.5" />
                  {data.vip.label}
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-[76px_1fr] gap-4 sm:grid-cols-[92px_1fr]">
              <div
                className="grid h-[76px] w-[76px] place-items-center rounded-full sm:h-[92px] sm:w-[92px]"
                style={{
                  background: `conic-gradient(#d4a843 ${progress * 3.6}deg, rgba(255,255,255,0.1) 0deg)`,
                }}
              >
                <div className="grid h-[60px] w-[60px] place-items-center rounded-full bg-[#0b0b0c] text-base font-black text-white sm:h-[74px] sm:w-[74px] sm:text-lg">
                  {progress}%
                </div>
              </div>
              <div>
                <p className="text-sm font-black text-white">Onboarding</p>
                <p className="mt-1 text-xs leading-5 text-white/45">
                  Complete o perfil para receber recomendações mais pessoais.
                </p>
                <Link
                  href="/dashboard/perfil"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.16em] text-[#d4a843] hover:text-white"
                >
                  Ajustar perfil
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section variants={container} className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          icon={<CalendarCheck className="h-5 w-5" />}
          label="Ativos"
          value={String(data.stats.activeAppointments)}
          helper="Agendamentos em andamento."
        />
        <StatCard
          icon={<Heart className="h-5 w-5" />}
          label="Favoritos"
          value={String(data.stats.favoriteProfiles)}
          helper="Perfis salvos na curadoria."
        />
        <StatCard
          icon={<PhoneCall className="h-5 w-5" />}
          label="Contatos"
          value={String(data.stats.totalAppointments)}
          helper="Experiências iniciadas."
        />
        <StatCard
          icon={<Crown className="h-5 w-5" />}
          label="Nível"
          value={data.vip.label}
          helper={data.vip.description}
        />
      </motion.section>

      <motion.section variants={item} className="rounded-[8px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl sm:p-6">
        <SectionTitle eyebrow="Curadoria" title="Profissionais recomendadas" href="/profissionais" />
        <div className="-mx-4 grid auto-cols-[82%] grid-flow-col gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid-flow-row sm:grid-cols-2 sm:px-0 lg:grid-cols-4">
          {data.recommendedProfessionals.length > 0 ? (
            data.recommendedProfessionals.slice(0, 8).map((pro, index) => (
              <Link
                key={pro.id}
                href={`/profissionais/${pro.slug}`}
                className="group overflow-hidden rounded-[8px] border border-white/10 bg-black/22 transition hover:border-[#d4a843]/35 hover:bg-black/32"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-white/5">
                  <img
                    src={pro.image ?? professionalFallbacks[index % professionalFallbacks.length]}
                    alt={pro.name}
                    className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/35 to-transparent p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-base font-black text-white">{pro.name}</p>
                      {pro.verified ? <BadgeCheck className="h-4 w-4 shrink-0 text-[#d4a843]" /> : null}
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-xs text-white/70">
                      <MapPin className="h-3.5 w-3.5 text-[#d4a843]" />
                      {pro.city}, {pro.state}
                    </p>
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.07] px-2.5 py-1 font-bold text-white/75">
                      <Star className="h-3.5 w-3.5 fill-[#d4a843] text-[#d4a843]" />
                      {pro.rating.toFixed(1)}
                    </span>
                    {pro.featured ? (
                      <span className="rounded-full bg-[#cc1f2f]/15 px-2.5 py-1 font-bold text-[#ff9aa4]">
                        Destaque
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm font-black text-[#f5d78c]">
                    {pro.price ? `A partir de ${money(pro.price)}` : "Consulta reservada"}
                  </p>
                </div>
              </Link>
            ))
          ) : (
            <div className="sm:col-span-2 lg:col-span-4">
              <EmptyMoment
                title="Curadoria em construção"
                body="Novos perfis verificados entram aqui assim que forem aprovados."
              />
            </div>
          )}
        </div>
      </motion.section>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <motion.section variants={item} className="rounded-[8px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl sm:p-6">
          <SectionTitle eyebrow="Ritual" title="Próximos passos" />
          <div className="space-y-3">
            {data.onboarding.map((step) => (
              <div key={step.label} className="flex gap-3 rounded-[8px] border border-white/8 bg-black/18 p-3">
                <span
                  className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border ${
                    step.done
                      ? "border-[#d4a843]/40 bg-[#d4a843]/15 text-[#f5d78c]"
                      : "border-white/10 bg-white/[0.04] text-white/35"
                  }`}
                >
                  {step.done ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                </span>
                <div>
                  <p className="text-sm font-black text-white">{step.label}</p>
                  <p className="mt-1 text-xs leading-5 text-white/42">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section variants={item} className="rounded-[8px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl sm:p-6">
          <SectionTitle eyebrow="Agenda" title="Agendamentos recentes" href="/dashboard/reservas" />
          <div className="grid gap-3">
            {data.recentAppointments.length > 0 ? (
              data.recentAppointments.map((appointment, index) => (
                <Link
                  key={appointment.id}
                  href={`/profissionais/${appointment.slug}`}
                  className="group flex gap-3 rounded-[8px] border border-white/8 bg-black/18 p-3 transition hover:border-[#cc1f2f]/35"
                >
                  <div className="h-16 w-14 shrink-0 overflow-hidden rounded-[8px] bg-white/5">
                    <img
                      src={appointment.image ?? professionalFallbacks[index % professionalFallbacks.length]}
                      alt={appointment.name}
                      className="h-full w-full object-cover object-top"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-black text-white">{appointment.name}</p>
                      {appointment.verified ? <BadgeCheck className="h-4 w-4 shrink-0 text-[#d4a843]" /> : null}
                    </div>
                    <p className="mt-1 text-xs text-white/42">
                      {shortDate(appointment.date)} · {statusLabel(appointment.status)}
                    </p>
                    <p className="mt-1 text-xs text-white/35">
                      {appointment.city}, {appointment.state} · {appointment.duration} min
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <EmptyMoment
                title="Agenda limpa"
                body="Quando você iniciar contato com uma profissional, o histórico aparece aqui."
              />
            )}
          </div>
        </motion.section>
      </div>

      <motion.section
        variants={item}
        className="grid gap-4 rounded-[8px] border border-[#d4a843]/18 bg-[linear-gradient(135deg,rgba(212,168,67,0.10),rgba(204,31,47,0.08),rgba(255,255,255,0.035))] p-4 backdrop-blur-xl sm:grid-cols-3 sm:p-6"
      >
        <div className="sm:col-span-2">
          <p className="mb-2 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-[#f5d78c]">
            <MessageCircle className="h-4 w-4" />
            Experiência discreta
          </p>
          <h2 className="text-xl font-black text-white">Curadoria adulta premium, discreta e focada em profissionais.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/52">
            {data.city
              ? `Vamos priorizar perfis verificados em ${data.city}, com segurança, sigilo e curadoria visual.`
              : "Explore perfis, salve favoritos e agende experiências sem linguagem imobiliária no painel do cliente."}
          </p>
        </div>
        <div className="grid gap-2 text-sm">
          <div className="flex items-center gap-2 text-white/70">
            <ShieldCheck className="h-4 w-4 text-[#d4a843]" />
            Conta protegida
          </div>
          <div className="flex items-center gap-2 text-white/70">
            <LockKeyhole className="h-4 w-4 text-[#d4a843]" />
            Navegação discreta
          </div>
          <div className="flex items-center gap-2 text-white/70">
            <Camera className="h-4 w-4 text-[#d4a843]" />
            Perfis verificados
          </div>
          <div className="flex items-center gap-2 text-white/70">
            <UserRound className="h-4 w-4 text-[#d4a843]" />
            {data.stats.totalAppointments} contatos iniciados
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}

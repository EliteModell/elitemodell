"use client";

/* eslint-disable @next/next/no-img-element -- Cards mix local uploads and remote profile images. */

import Link from "next/link";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Compass,
  Crown,
  Eye,
  Heart,
  Home,
  LockKeyhole,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  WalletCards,
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
    activeBookings: number;
    completedBookings: number;
    favorites: number;
    credits: number;
    appointments: number;
  };
  onboarding: Array<{
    label: string;
    done: boolean;
    detail: string;
  }>;
  recentBookings: Array<{
    id: string;
    title: string;
    city: string;
    status: string;
    date: string;
    image: string | null;
  }>;
  recentFavorites: Array<{
    id: string;
    title: string;
    city: string;
    price: number;
    image: string | null;
  }>;
  recentAppointments: Array<{
    id: string;
    name: string;
    city: string;
    status: string;
    date: string;
    image: string | null;
  }>;
  recommendedProperties: Array<{
    id: string;
    title: string;
    city: string;
    bairro: string | null;
    price: number;
    rating: number;
    image: string | null;
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
  }>;
};

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

const propertyFallbacks = [
  "/property-bh-luxury.png",
  "/property-itauna-loft.png",
  "/property-itauna-country.png",
];

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
  }).format(new Date(value));
}

function onboardingProgress(data: DashboardHomeData["onboarding"]) {
  const done = data.filter((step) => step.done).length;
  return Math.round((done / Math.max(data.length, 1)) * 100);
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "Em análise",
    CONFIRMED: "Confirmada",
    CANCELLED: "Cancelada",
    COMPLETED: "Concluída",
    REJECTED: "Recusada",
    NO_SHOW: "Não compareceu",
  };
  return labels[status] ?? status;
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
      whileHover={{ y: -4, scale: 1.01 }}
      className="group rounded-[8px] border border-white/10 bg-white/[0.045] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl transition-colors hover:border-[#d4a843]/35"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="grid h-11 w-11 place-items-center rounded-[8px] border border-[#d4a843]/20 bg-[#d4a843]/10 text-[#f5d78c] shadow-[0_0_28px_rgba(212,168,67,0.12)]">
          {icon}
        </span>
        <ChevronRight className="h-4 w-4 text-white/20 transition-colors group-hover:text-[#d4a843]" />
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-sm font-semibold text-white/70">{label}</p>
      <p className="mt-2 text-xs leading-5 text-white/38">{helper}</p>
    </motion.div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  href,
}: {
  eyebrow?: string;
  title: string;
  href?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="mb-1 text-[11px] font-black uppercase tracking-[0.24em] text-[#d4a843]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-lg font-black text-white sm:text-xl">{title}</h2>
      </div>
      {href ? (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm font-bold text-[#f5d78c] transition hover:text-white"
        >
          Ver tudo
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
    data.stats.favorites > 0
      ? "Sua curadoria já está aprendendo seu gosto. Salvar novos perfis deixa as recomendações mais precisas."
      : "Comece salvando perfis e estadias favoritas para receber uma curadoria mais pessoal e discreta.";

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.section
        variants={item}
        className="relative overflow-hidden rounded-[8px] border border-white/10 bg-[linear-gradient(135deg,rgba(20,20,22,0.96),rgba(58,9,14,0.72)_48%,rgba(7,7,8,0.98))] p-5 shadow-[0_32px_110px_rgba(0,0,0,0.38)] sm:p-7"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(245,215,140,0.85),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(212,168,67,0.08)_38%,transparent_64%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d4a843]/25 bg-black/25 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#f5d78c]">
              <Sparkles className="h-3.5 w-3.5" />
              Concierge EliteModell
            </div>
            <h1 className="max-w-3xl text-3xl font-black leading-tight text-white sm:text-5xl">
              Boa experiência começa antes da reserva, {name}.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/62 sm:text-base">
              {smartMessage}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/profissionais"
                className="inline-flex h-11 items-center gap-2 rounded-[8px] bg-[#d4a843] px-5 text-sm font-black text-[#100d09] shadow-[0_14px_34px_rgba(212,168,67,0.22)] transition hover:bg-[#f5d78c]"
              >
                <Compass className="h-4 w-4" />
                Explorar curadoria
              </Link>
              <Link
                href="/imoveis"
                className="inline-flex h-11 items-center gap-2 rounded-[8px] border border-white/12 bg-white/[0.06] px-5 text-sm font-bold text-white transition hover:border-[#cc1f2f]/45 hover:bg-[#cc1f2f]/12"
              >
                <Home className="h-4 w-4" />
                Reservar estadia
              </Link>
            </div>
          </div>

          <div className="rounded-[8px] border border-white/10 bg-black/28 p-4 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[8px] border border-[#d4a843]/35 bg-[#d4a843]/12">
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

            <div className="mt-5 grid grid-cols-[92px_1fr] gap-4">
              <div
                className="grid h-[92px] w-[92px] place-items-center rounded-full"
                style={{
                  background: `conic-gradient(#d4a843 ${progress * 3.6}deg, rgba(255,255,255,0.1) 0deg)`,
                }}
              >
                <div className="grid h-[74px] w-[74px] place-items-center rounded-full bg-[#0b0b0c] text-lg font-black text-white">
                  {progress}%
                </div>
              </div>
              <div>
                <p className="text-sm font-black text-white">Onboarding premium</p>
                <p className="mt-1 text-xs leading-5 text-white/45">
                  Complete o perfil para liberar uma experiência mais pessoal.
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

      <motion.section variants={container} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<CalendarCheck className="h-5 w-5" />}
          label="Reservas ativas"
          value={String(data.stats.activeBookings)}
          helper="Agenda de estadias e experiências em andamento."
        />
        <StatCard
          icon={<Heart className="h-5 w-5" />}
          label="Favoritos"
          value={String(data.stats.favorites)}
          helper="Sua coleção privada de escolhas salvas."
        />
        <StatCard
          icon={<WalletCards className="h-5 w-5" />}
          label="Créditos"
          value={money(data.stats.credits)}
          helper="Saldo disponível para benefícios e upgrades."
        />
        <StatCard
          icon={<Crown className="h-5 w-5" />}
          label="Nível VIP"
          value={data.vip.label}
          helper={data.vip.description}
        />
      </motion.section>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <motion.section variants={item} className="rounded-[8px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl sm:p-6">
          <SectionTitle eyebrow="Curadoria" title="Recomendações para hoje" href="/profissionais" />
          <div className="grid gap-4 lg:grid-cols-2">
            {data.recommendedProfessionals.length > 0 ? (
              data.recommendedProfessionals.slice(0, 4).map((pro, index) => (
                <Link
                  key={pro.id}
                  href={`/profissionais/${pro.slug}`}
                  className="group overflow-hidden rounded-[8px] border border-white/10 bg-black/22 transition hover:border-[#d4a843]/35 hover:bg-black/32"
                >
                  <div className="flex gap-3 p-3">
                    <div className="h-24 w-20 shrink-0 overflow-hidden rounded-[8px] bg-white/5">
                      <img
                        src={pro.image ?? professionalFallbacks[index % professionalFallbacks.length]}
                        alt={pro.name}
                        className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-black text-white">{pro.name}</p>
                          <p className="mt-1 flex items-center gap-1 text-xs text-white/45">
                            <MapPin className="h-3.5 w-3.5 text-[#d4a843]" />
                            {pro.city}, {pro.state}
                          </p>
                        </div>
                        {pro.verified ? <BadgeCheck className="h-4 w-4 shrink-0 text-[#d4a843]" /> : null}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
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
                  </div>
                </Link>
              ))
            ) : (
              <div className="lg:col-span-2">
                <EmptyMoment
                  title="Curadoria em construção"
                  body="Novos perfis verificados entram aqui assim que forem aprovados."
                />
              </div>
            )}
          </div>
        </motion.section>

        <motion.section variants={item} className="rounded-[8px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl sm:p-6">
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
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <motion.section variants={item} className="rounded-[8px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl sm:p-6">
          <SectionTitle eyebrow="Estadias" title="Imóveis recomendados" href="/imoveis" />
          <div className="grid gap-3">
            {data.recommendedProperties.length > 0 ? (
              data.recommendedProperties.slice(0, 3).map((property, index) => (
                <Link
                  key={property.id}
                  href={`/imoveis/${property.id}`}
                  className="group flex gap-3 rounded-[8px] border border-white/8 bg-black/20 p-3 transition hover:border-[#d4a843]/35"
                >
                  <div className="h-24 w-28 shrink-0 overflow-hidden rounded-[8px] bg-white/5">
                    <img
                      src={property.image ?? propertyFallbacks[index % propertyFallbacks.length]}
                      alt={property.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 font-black text-white">{property.title}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-white/45">
                      <MapPin className="h-3.5 w-3.5 text-[#d4a843]" />
                      {property.bairro ? `${property.bairro}, ` : ""}
                      {property.city}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-sm font-black text-[#f5d78c]">{money(property.price)}/noite</span>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-white/70">
                        <Star className="h-3.5 w-3.5 fill-[#d4a843] text-[#d4a843]" />
                        {property.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <EmptyMoment
                title="Sem imóveis ativos"
                body="Quando os espaços premium forem aprovados, eles aparecerão aqui."
              />
            )}
          </div>
        </motion.section>

        <motion.section variants={item} className="rounded-[8px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl sm:p-6">
          <SectionTitle eyebrow="Histórico" title="Sua atividade recente" href="/dashboard/reservas" />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-black text-white/85">
                <CalendarCheck className="h-4 w-4 text-[#d4a843]" />
                Reservas
              </p>
              {data.recentBookings.length > 0 ? (
                data.recentBookings.map((booking, index) => (
                  <Link
                    key={booking.id}
                    href="/dashboard/reservas"
                    className="group flex gap-3 rounded-[8px] border border-white/8 bg-black/18 p-3 transition hover:border-[#cc1f2f]/35"
                  >
                    <div className="h-14 w-16 shrink-0 overflow-hidden rounded-[8px] bg-white/5">
                      <img
                        src={booking.image ?? propertyFallbacks[index % propertyFallbacks.length]}
                        alt={booking.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">{booking.title}</p>
                      <p className="mt-1 text-xs text-white/42">
                        {shortDate(booking.date)} · {statusLabel(booking.status)}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <EmptyMoment title="Agenda limpa" body="Nenhuma reserva ativa por enquanto." />
              )}
            </div>

            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-black text-white/85">
                <Eye className="h-4 w-4 text-[#d4a843]" />
                Últimas visualizações
              </p>
              {data.recentFavorites.length > 0 ? (
                data.recentFavorites.slice(0, 3).map((favorite, index) => (
                  <Link
                    key={favorite.id}
                    href={`/imoveis/${favorite.id}`}
                    className="group flex gap-3 rounded-[8px] border border-white/8 bg-black/18 p-3 transition hover:border-[#d4a843]/35"
                  >
                    <div className="h-14 w-16 shrink-0 overflow-hidden rounded-[8px] bg-white/5">
                      <img
                        src={favorite.image ?? propertyFallbacks[index % propertyFallbacks.length]}
                        alt={favorite.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">{favorite.title}</p>
                      <p className="mt-1 text-xs text-white/42">
                        {favorite.city} · {money(favorite.price)}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <EmptyMoment
                  title="Histórico discreto"
                  body="Explore perfis e imóveis para formar uma trilha privada."
                />
              )}
            </div>
          </div>
        </motion.section>
      </div>

      <motion.section
        variants={item}
        className="grid gap-4 rounded-[8px] border border-[#d4a843]/18 bg-[linear-gradient(135deg,rgba(212,168,67,0.10),rgba(204,31,47,0.08),rgba(255,255,255,0.035))] p-5 backdrop-blur-xl sm:grid-cols-3 sm:p-6"
      >
        <div className="sm:col-span-2">
          <p className="mb-2 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-[#f5d78c]">
            <MessageCircle className="h-4 w-4" />
            Mensagem inteligente
          </p>
          <h2 className="text-xl font-black text-white">Seu painel ficou pessoal, não genérico.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/52">
            {data.city
              ? `Vamos priorizar novidades elegantes em ${data.city}, com segurança, sigilo e curadoria visual.`
              : "Defina telefone, cidade preferida e favoritos para receber recomendações mais humanas."}
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
            Perfil com foto
          </div>
          <div className="flex items-center gap-2 text-white/70">
            <UserRound className="h-4 w-4 text-[#d4a843]" />
            {data.stats.appointments} agendamentos
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}

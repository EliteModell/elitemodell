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
  Clock3,
  Compass,
  Crown,
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
  show: { opacity: 1, transition: { staggerChildren: 0.055 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: "easeOut" } },
};

const professionalFallbacks = ["/model.jpeg", "/model1.jpg", "/model2.jpg"];
const propertyFallbacks = [
  "/property-bh-luxury.png",
  "/property-itauna-loft.png",
  "/property-itauna-country.png",
];

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
  return name?.split(" ").filter(Boolean)[0] ?? "você";
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

function onboardingProgress(steps: DashboardHomeData["onboarding"]) {
  const done = steps.filter((s) => s.done).length;
  return Math.round((done / Math.max(steps.length, 1)) * 100);
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-[#d4a843]/60">
      {children}
    </p>
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
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h2 className="text-base font-semibold tracking-tight text-white sm:text-lg">{title}</h2>
      </div>
      {href ? (
        <Link
          href={href}
          className="flex shrink-0 items-center gap-1 text-[12px] text-white/30 transition hover:text-white/60"
        >
          Ver todos
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/[0.07] p-6 text-center">
      <Sparkles className="mx-auto mb-3 h-4 w-4 text-[#d4a843]/35" />
      <p className="text-[13px] font-medium text-white/50">{title}</p>
      <p className="mt-1 text-[12px] leading-5 text-white/25">{body}</p>
    </div>
  );
}

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={`rounded-xl border border-white/[0.07] bg-white/[0.02] ${className ?? ""}`}
    >
      {children}
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
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">

      {/* ── Hero ── */}
      <motion.section
        variants={item}
        className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c0b0e] p-6 sm:p-8"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d4a843]/30 to-transparent" />

        <div className="relative grid gap-8 lg:grid-cols-[1fr_252px] lg:items-center">
          {/* Text */}
          <div className="max-w-xl">
            <Eyebrow>Concierge pessoal</Eyebrow>
            <h1 className="text-[1.65rem] font-bold leading-[1.2] tracking-tight text-white sm:text-[2.25rem]">
              Bem-vindo de volta,{" "}
              <span className="text-white/42">{name}.</span>
            </h1>
            <p className="mt-4 max-w-md text-[13px] leading-relaxed text-white/38">
              {smartMessage}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/profissionais"
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#d4a843] px-5 text-[13px] font-semibold text-[#0c0a06] shadow-[0_6px_20px_rgba(212,168,67,0.18)] transition hover:bg-[#e8c560] active:scale-[0.98]"
              >
                <Compass className="h-3.5 w-3.5" />
                Explorar curadoria
              </Link>
              <Link
                href="/imoveis"
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-5 text-[13px] font-medium text-white/60 transition hover:border-white/14 hover:text-white/82"
              >
                <Home className="h-3.5 w-3.5" />
                Reservar estadia
              </Link>
            </div>
          </div>

          {/* Member card */}
          <div className="rounded-xl border border-[#d4a843]/10 bg-gradient-to-br from-[#141210] via-[#110f0d] to-[#0d0b09] p-5">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.04]">
                {data.user.image ? (
                  <img
                    src={data.user.image}
                    alt={data.user.name ?? "Avatar"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white/40">
                    {initials(data.user.name)}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-white">
                  {data.user.name ?? "Perfil Elite"}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-white/30">
                  {data.user.email ?? "—"}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/30">Nível de acesso</span>
                <span className="font-semibold text-[#d4a843]">{data.vip.label}</span>
              </div>
              <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${data.vip.progress}%` }}
                  transition={{ duration: 0.7, ease: "easeOut", delay: 0.3 }}
                  className="h-full rounded-full bg-gradient-to-r from-[#cc1f2f] via-[#d4a843] to-[#f5d78c]"
                />
              </div>
              <p className="text-[10px] text-white/20">{data.vip.description}</p>
            </div>

            <Link
              href="/dashboard/perfil"
              className="mt-4 flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-2.5 text-[11px] text-white/30 transition hover:border-white/10 hover:text-white/55"
            >
              <span>Completar perfil · {progress}%</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </motion.section>

      {/* ── Stats ── */}
      <motion.section variants={container} className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          {
            icon: <CalendarCheck className="h-4 w-4" />,
            label: "Reservas ativas",
            value: String(data.stats.activeBookings),
            sub: "Em andamento",
          },
          {
            icon: <Heart className="h-4 w-4" />,
            label: "Favoritos",
            value: String(data.stats.favorites),
            sub: "Na sua coleção",
          },
          {
            icon: <WalletCards className="h-4 w-4" />,
            label: "Créditos",
            value: money(data.stats.credits),
            sub: "Disponível",
          },
          {
            icon: <Crown className="h-4 w-4" />,
            label: "Nível VIP",
            value: data.vip.label,
            sub: data.vip.description,
          },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            variants={item}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 transition-colors hover:border-white/10"
          >
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#d4a843]/[0.07] text-[#d4a843]">
              {stat.icon}
            </div>
            <p className="text-[1.35rem] font-bold tracking-tight text-white">{stat.value}</p>
            <p className="mt-0.5 text-[12px] font-medium text-white/50">{stat.label}</p>
            <p className="mt-1 line-clamp-1 text-[10px] text-white/25">{stat.sub}</p>
          </motion.div>
        ))}
      </motion.section>

      {/* ── Professionals — portrait grid ── */}
      <motion.section variants={item}>
        <Card className="p-5 sm:p-6">
          <SectionTitle eyebrow="Curadoria" title="Recomendações para você" href="/profissionais" />

          {data.recommendedProfessionals.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {data.recommendedProfessionals.slice(0, 4).map((pro, index) => (
                <Link
                  key={pro.id}
                  href={`/profissionais/${pro.slug}`}
                  className="group overflow-hidden rounded-xl border border-white/[0.06] transition hover:border-white/12"
                >
                  <div className="aspect-[3/4] overflow-hidden bg-white/[0.04]">
                    <img
                      src={pro.image ?? professionalFallbacks[index % professionalFallbacks.length]}
                      alt={pro.name}
                      className="h-full w-full object-cover object-top transition duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-[13px] font-semibold leading-snug text-white">
                        {pro.name}
                      </p>
                      {pro.verified ? (
                        <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#d4a843]" />
                      ) : null}
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-white/30">
                      <MapPin className="h-3 w-3" />
                      {pro.city}
                    </p>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[11px] text-white/35">
                        <Star className="h-3 w-3 fill-[#d4a843] text-[#d4a843]" />
                        {pro.rating.toFixed(1)}
                      </span>
                      {pro.price ? (
                        <span className="text-[11px] font-semibold text-[#e2c06a]">
                          {money(pro.price)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Curadoria em construção"
              body="Novos perfis verificados entram aqui assim que aprovados."
            />
          )}
        </Card>
      </motion.section>

      {/* ── Properties + Onboarding ── */}
      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        {/* Properties */}
        <motion.section variants={item}>
          <Card className="h-full p-5 sm:p-6">
            <SectionTitle eyebrow="Estadias" title="Imóveis em destaque" href="/imoveis" />
            <div className="space-y-3">
              {data.recommendedProperties.length > 0 ? (
                data.recommendedProperties.slice(0, 3).map((property, index) => (
                  <Link
                    key={property.id}
                    href={`/imoveis/${property.id}`}
                    className="group flex gap-3 rounded-xl border border-white/[0.06] p-3 transition hover:border-white/10"
                  >
                    <div className="h-[68px] w-[84px] shrink-0 overflow-hidden rounded-lg bg-white/[0.04]">
                      <img
                        src={property.image ?? propertyFallbacks[index % propertyFallbacks.length]}
                        alt={property.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="min-w-0 flex-1 py-0.5">
                      <p className="line-clamp-1 text-[13px] font-semibold text-white">
                        {property.title}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-white/30">
                        <MapPin className="h-3 w-3" />
                        {property.bairro ? `${property.bairro}, ` : ""}
                        {property.city}
                      </p>
                      <div className="mt-2.5 flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-[#e2c06a]">
                          {money(property.price)}/noite
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-white/30">
                          <Star className="h-3 w-3 fill-[#d4a843] text-[#d4a843]" />
                          {property.rating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <EmptyState
                  title="Sem imóveis ativos"
                  body="Quando os espaços premium forem aprovados, aparecem aqui."
                />
              )}
            </div>
          </Card>
        </motion.section>

        {/* Onboarding */}
        <motion.section variants={item}>
          <Card className="h-full p-5 sm:p-6">
            <SectionTitle eyebrow="Ritual" title="Próximos passos" />
            <div className="space-y-2">
              {data.onboarding.map((step) => (
                <div
                  key={step.label}
                  className={`flex gap-3 rounded-xl border p-3 transition-colors ${
                    step.done
                      ? "border-[#d4a843]/10 bg-[#d4a843]/[0.04]"
                      : "border-white/[0.05] bg-transparent"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                      step.done
                        ? "bg-[#d4a843]/15 text-[#d4a843]"
                        : "bg-white/[0.05] text-white/22"
                    }`}
                  >
                    {step.done ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <Clock3 className="h-3 w-3" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={`text-[12px] font-medium leading-snug ${
                        step.done ? "text-white" : "text-white/42"
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-4 text-white/22">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.section>
      </div>

      {/* ── Activity ── */}
      <motion.section variants={item}>
        <Card className="p-5 sm:p-6">
          <SectionTitle eyebrow="Histórico" title="Sua atividade recente" href="/dashboard/reservas" />
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Bookings */}
            <div className="space-y-2.5">
              <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-white/35">
                <CalendarCheck className="h-3.5 w-3.5 text-[#d4a843]/60" />
                Reservas
              </p>
              {data.recentBookings.length > 0 ? (
                data.recentBookings.map((booking, index) => (
                  <Link
                    key={booking.id}
                    href="/dashboard/reservas"
                    className="group flex gap-3 rounded-xl border border-white/[0.06] p-3 transition hover:border-white/10"
                  >
                    <div className="h-12 w-14 shrink-0 overflow-hidden rounded-lg bg-white/[0.04]">
                      <img
                        src={booking.image ?? propertyFallbacks[index % propertyFallbacks.length]}
                        alt={booking.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-medium text-white/75">
                        {booking.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-white/28">
                        {shortDate(booking.date)} · {statusLabel(booking.status)}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <EmptyState title="Agenda limpa" body="Nenhuma reserva ativa por enquanto." />
              )}
            </div>

            {/* Favorites */}
            <div className="space-y-2.5">
              <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-white/35">
                <Heart className="h-3.5 w-3.5 text-[#d4a843]/60" />
                Favoritos recentes
              </p>
              {data.recentFavorites.length > 0 ? (
                data.recentFavorites.slice(0, 3).map((favorite, index) => (
                  <Link
                    key={favorite.id}
                    href={`/imoveis/${favorite.id}`}
                    className="group flex gap-3 rounded-xl border border-white/[0.06] p-3 transition hover:border-white/10"
                  >
                    <div className="h-12 w-14 shrink-0 overflow-hidden rounded-lg bg-white/[0.04]">
                      <img
                        src={
                          favorite.image ?? propertyFallbacks[index % propertyFallbacks.length]
                        }
                        alt={favorite.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-medium text-white/75">
                        {favorite.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-white/28">
                        {favorite.city} · {money(favorite.price)}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <EmptyState
                  title="Histórico discreto"
                  body="Explore perfis e imóveis para formar uma trilha privada."
                />
              )}
            </div>
          </div>
        </Card>
      </motion.section>

      {/* ── Intelligence footer ── */}
      <motion.section
        variants={item}
        className="flex flex-col gap-5 rounded-xl border border-[#d4a843]/[0.08] bg-[#d4a843]/[0.035] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
        <div className="max-w-md">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-[#d4a843]/50">
            <MessageCircle className="h-3.5 w-3.5" />
            Mensagem do sistema
          </p>
          <h2 className="text-[15px] font-semibold text-white">
            Seu painel é pessoal, não genérico.
          </h2>
          <p className="mt-1.5 text-[12px] leading-relaxed text-white/32">
            {data.city
              ? `Priorizando novidades elegantes em ${data.city}, com segurança e curadoria visual.`
              : "Defina telefone, cidade preferida e favoritos para receber recomendações mais humanas."}
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-2 text-[12px] sm:grid-cols-1 sm:w-44">
          {[
            { icon: <ShieldCheck className="h-3.5 w-3.5" />, label: "Conta protegida" },
            { icon: <LockKeyhole className="h-3.5 w-3.5" />, label: "Navegação discreta" },
            { icon: <Camera className="h-3.5 w-3.5" />, label: "Perfil com foto" },
            {
              icon: <UserRound className="h-3.5 w-3.5" />,
              label: `${data.stats.appointments} agendamentos`,
            },
          ].map((feat) => (
            <div key={feat.label} className="flex items-center gap-2 text-white/32">
              <span className="text-[#d4a843]/50">{feat.icon}</span>
              {feat.label}
            </div>
          ))}
        </div>
      </motion.section>
    </motion.div>
  );
}

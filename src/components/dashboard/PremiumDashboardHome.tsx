"use client";

/* eslint-disable @next/next/no-img-element -- Profile images can come from uploads and remote providers. */

import Link from "next/link";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  BadgeCheck,
  CalendarCheck,
  ChevronRight,
  Crown,
  Eye,
  Heart,
  MapPin,
  MessageCircle,
  Pencil,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
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
    age: number | null;
  }>;
  recommendedProfessionals: Array<ProfessionalCardData>;
};

type ProfessionalCardData = {
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
  age: number | null;
};

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.34, ease: "easeOut" } },
};

function ComingSoonProfiles() {
  return (
    <motion.section variants={item} className="rounded-[8px] border border-[#d4a843]/20 bg-[linear-gradient(135deg,rgba(212,168,67,0.07),rgba(255,255,255,0.02))] p-8 text-center">
      <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-[8px] border border-[#d4a843]/25 bg-[#d4a843]/10 text-[#f5d78c]">
        <Sparkles className="h-7 w-7" />
      </div>
      <p className="mb-1 text-xs font-black uppercase tracking-[0.22em] text-[#d4a843]">Curadoria ativa</p>
      <h2 className="mb-3 text-2xl font-black text-white">Perfis em análise</h2>
      <p className="mx-auto max-w-sm text-sm leading-6 text-white/50">
        Cada perfil passa por verificação antes de aparecer aqui. Estamos avaliando os primeiros cadastros para garantir qualidade e autenticidade.
      </p>
      <Link
        href="/profissionais"
        className="mt-6 inline-flex items-center gap-2 rounded-[8px] bg-[#d4a843] px-5 py-3 text-sm font-black text-[#120d08] transition hover:bg-[#f5d78c]"
      >
        Ver área de profissionais
        <ChevronRight className="h-4 w-4" />
      </Link>
    </motion.section>
  );
}

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
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function appointmentStatus(status: string) {
  const labels: Record<string, string> = {
    PENDING: "Pendente",
    CONFIRMED: "Confirmado",
    CANCELLED: "Cancelado",
    COMPLETED: "Concluido",
    NO_SHOW: "Ausente",
  };
  return labels[status] ?? status;
}

function isOnline(index: number, featured?: boolean) {
  return featured || index % 3 !== 2;
}

function SectionHeader({
  title,
  href = "/profissionais",
  compact = false,
}: {
  title: string;
  href?: string;
  compact?: boolean;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 px-0.5">
      <h2 className={`${compact ? "text-base" : "text-lg"} font-black text-white`}>{title}</h2>
      <Link href={href} className="inline-flex items-center gap-1 text-xs font-black text-[#f5d78c]">
        Ver
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function ProfileCard({
  pro,
  index,
  large = false,
}: {
  pro: ProfessionalCardData;
  index: number;
  large?: boolean;
}) {
  const online = isOnline(index, pro.featured);
  const image = pro.image;

  return (
    <Link
      href={`/profissionais/${pro.slug}`}
      className="group block overflow-hidden rounded-[8px] border border-white/10 bg-[#111113] shadow-[0_22px_70px_rgba(0,0,0,0.34)] transition hover:border-[#d4a843]/45"
    >
      <div className={`relative overflow-hidden bg-[#1a1a1c] ${large ? "aspect-[3/4]" : "aspect-[4/5]"}`}>
        {image ? (
          <img
            src={image}
            alt={pro.name}
            className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-3xl font-black text-[#f5d78c]/30">
            {initials(pro.name)}
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ${
              online ? "bg-emerald-500/90 text-[#03130b]" : "bg-black/62 text-white/72"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-[#03130b]" : "bg-white/45"}`} />
            {online ? "Online" : "Hoje"}
          </span>
          {pro.verified ? (
            <span className="grid h-8 w-8 place-items-center rounded-full bg-black/58 text-[#f5d78c] backdrop-blur">
              <BadgeCheck className="h-4 w-4" />
            </span>
          ) : null}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/55 to-transparent p-3">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xl font-black text-white">{pro.name}</p>
              <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-white/72">
                <MapPin className="h-3.5 w-3.5 text-[#f5d78c]" />
                {pro.city}, {pro.state}
                {pro.age ? ` - ${pro.age} anos` : ""}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/12 px-2.5 py-1 text-xs font-black text-white">
              <Star className="h-3.5 w-3.5 fill-[#f5d78c] text-[#f5d78c]" />
              {pro.rating.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
      <div className="grid gap-3 p-3">
        <div className="flex min-h-7 flex-wrap gap-1.5">
          {pro.attendanceTypes.slice(0, 2).map((type) => (
            <span key={type} className="rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] font-bold text-white/68">
              {type}
            </span>
          ))}
          {pro.featured ? (
            <span className="rounded-full bg-[#cc1f2f]/18 px-2.5 py-1 text-[11px] font-black text-[#ff9aa4]">
              Destaque
            </span>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-sm font-black text-[#f5d78c]">
            {pro.price ? money(pro.price) : "Valor no perfil"}
          </p>
          <span className="inline-flex h-9 items-center justify-center rounded-[8px] bg-[#d4a843] px-3 text-xs font-black text-[#120d08]">
            Visualizar
          </span>
        </div>
      </div>
    </Link>
  );
}

function ProfileRail({
  title,
  profiles,
  href,
  large,
}: {
  title: string;
  profiles: ProfessionalCardData[];
  href?: string;
  large?: boolean;
}) {
  return (
    <motion.section variants={item}>
      <SectionHeader title={title} href={href} />
      <div className="-mx-4 grid auto-cols-[78%] grid-flow-col gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:auto-cols-[46%] sm:px-0 lg:grid-flow-row lg:grid-cols-4">
        {profiles.map((pro, index) => (
          <ProfileCard key={`${title}-${pro.id}`} pro={pro} index={index} large={large} />
        ))}
      </div>
    </motion.section>
  );
}

function MiniProfileRow({ pro, index }: { pro: ProfessionalCardData; index: number }) {
  const online = isOnline(index, pro.featured);

  return (
    <Link
      href={`/profissionais/${pro.slug}`}
      className="flex items-center gap-3 rounded-[8px] border border-white/10 bg-white/[0.045] p-2.5 transition hover:border-[#d4a843]/35"
    >
      <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-[8px] bg-[#1a1a1c]">
        {pro.image ? (
          <img src={pro.image} alt={pro.name} className="h-full w-full object-cover object-top" />
        ) : (
          <div className="grid h-full w-full place-items-center text-xs font-black text-[#f5d78c]/40">{initials(pro.name)}</div>
        )}
        <span className={`absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border border-black ${online ? "bg-emerald-400" : "bg-white/45"}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-black text-white">{pro.name}</p>
          {pro.verified ? <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[#f5d78c]" /> : null}
        </div>
        <p className="mt-1 truncate text-xs text-white/50">
          {pro.city} {pro.age ? `- ${pro.age} anos` : ""}
        </p>
        <p className="mt-1 text-xs font-bold text-[#f5d78c]">{online ? "Online agora" : "Disponível hoje"}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-white/28" />
    </Link>
  );
}

function Appointments({
  appointments,
  profiles,
}: {
  appointments: DashboardHomeData["recentAppointments"];
  profiles: ProfessionalCardData[];
}) {
  return (
    <motion.section variants={item} className="rounded-[8px] border border-white/10 bg-[#101012] p-4">
      <SectionHeader title="Agendamentos" href="/dashboard/reservas" compact />
      <div className="grid gap-2.5">
        {appointments.length > 0
          ? appointments.slice(0, 3).map((appointment) => (
              <Link
                key={appointment.id}
                href={`/profissionais/${appointment.slug}`}
                className="flex items-center gap-3 rounded-[8px] bg-black/22 p-2.5"
              >
                <div className="h-14 w-12 shrink-0 overflow-hidden rounded-[8px] bg-[#1a1a1c]">
                  {appointment.image ? (
                    <img src={appointment.image} alt={appointment.name} className="h-full w-full object-cover object-top" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-xs font-black text-[#f5d78c]/40">{initials(appointment.name)}</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-white">{appointment.name}</p>
                  <p className="mt-1 text-xs text-white/48">
                    {shortDate(appointment.date)} - {appointmentStatus(appointment.status)}
                  </p>
                </div>
                <CalendarCheck className="h-4 w-4 text-[#f5d78c]" />
              </Link>
            ))
          : profiles.slice(0, 2).map((pro) => (
              <Link
                key={`agenda-${pro.id}`}
                href={`/profissionais/${pro.slug}`}
                className="flex items-center gap-3 rounded-[8px] bg-black/22 p-2.5"
              >
                <div className="h-14 w-12 shrink-0 overflow-hidden rounded-[8px] bg-[#1a1a1c]">
                  {pro.image ? (
                    <img src={pro.image} alt={pro.name} className="h-full w-full object-cover object-top" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-xs font-black text-[#f5d78c]/40">{initials(pro.name)}</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-white">{pro.name}</p>
                  <p className="mt-1 text-xs text-white/48">Escolha um horário no perfil</p>
                </div>
                <ChevronRight className="h-4 w-4 text-white/28" />
              </Link>
            ))}
      </div>
    </motion.section>
  );
}

export default function PremiumDashboardHome({ data }: { data: DashboardHomeData }) {
  const name = firstName(data.user.name);
  const profiles = data.recommendedProfessionals;
  const hasProfiles = profiles.length > 0;
  const recommended = profiles.slice(0, 8);
  const favorites = profiles.filter((pro) => pro.featured || pro.verified).slice(0, 4);
  const recent = data.recentAppointments.length
    ? data.recentAppointments.map((appointment, index) => ({
        id: `recent-${appointment.id}`,
        slug: appointment.slug,
        name: appointment.name,
        city: appointment.city,
        state: appointment.state,
        rating: 4.9,
        verified: appointment.verified,
        featured: index === 0,
        price: null,
        image: appointment.image,
        attendanceTypes: ["Já visto", "Perfil salvo"],
        age: appointment.age,
      }))
    : [];
  const onlineNow = profiles.filter((pro, index) => isOnline(index, pro.featured)).slice(0, 6);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 pb-10">
      <motion.section variants={item} className="rounded-[8px] border border-white/10 bg-[#101012] p-4 shadow-[0_30px_100px_rgba(0,0,0,0.35)]">
        <div className="flex items-center gap-3">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[8px] border border-[#d4a843]/35 bg-[#d4a843]/12">
            {data.user.image ? (
              <img src={data.user.image} alt={data.user.name ?? "Avatar"} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-lg font-black text-[#f5d78c]">
                {initials(data.user.name)}
              </div>
            )}
            <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border border-[#101012] bg-emerald-400" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-black text-white">Oi, {name}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full border border-[#d4a843]/24 bg-[#d4a843]/10 px-2.5 py-1 text-[11px] font-black text-[#f5d78c]">
                <Crown className="h-3.5 w-3.5" />
                {data.vip.label}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-bold text-white/70">
                Saldo {money(data.user.credits)}
              </span>
            </div>
          </div>

          <Link
            href="/dashboard/perfil"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] border border-white/10 bg-white/[0.055] text-white/72 transition hover:border-[#d4a843]/35 hover:text-[#f5d78c]"
            aria-label="Editar perfil"
          >
            <Pencil className="h-4 w-4" />
          </Link>
        </div>

        <Link
          href="/profissionais"
          className="mt-4 flex h-12 items-center gap-3 rounded-[8px] border border-white/10 bg-[#0a0a0c] px-3 text-sm font-semibold text-white/52"
        >
          <Search className="h-4 w-4 text-[#f5d78c]" />
          Buscar profissionais
        </Link>
      </motion.section>

      {hasProfiles ? (
        <>
          <ProfileRail title="Profissionais recomendadas para você" profiles={recommended} large />

          <motion.section
            variants={item}
            className="grid gap-3 rounded-[8px] border border-[#d4a843]/18 bg-[linear-gradient(135deg,rgba(212,168,67,0.12),rgba(204,31,47,0.11),rgba(255,255,255,0.035))] p-4 sm:grid-cols-[1fr_auto]"
          >
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.18em] text-[#f5d78c]">
                <Sparkles className="h-4 w-4" />
                Premium
              </p>
              <h2 className="mt-2 text-xl font-black text-white">Perfis verificados perto de você</h2>
              <p className="mt-1 text-sm leading-6 text-white/55">Fotos em destaque, status online e acesso rápido ao perfil.</p>
            </div>
            <Link href="/profissionais" className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#d4a843] px-4 text-sm font-black text-[#120d08]">
              Explorar
              <ChevronRight className="h-4 w-4" />
            </Link>
          </motion.section>

          {favorites.length > 0 && <ProfileRail title="Favoritas" profiles={favorites} href="/dashboard/favoritos" />}

          {recent.length > 0 && (
            <div className="grid gap-5 xl:grid-cols-[1fr_0.86fr]">
              <motion.section variants={item}>
                <SectionHeader title="Visualizadas recentemente" />
                <div className="grid gap-2.5">
                  {recent.slice(0, 4).map((pro) => (
                    <Link
                      key={`recent-${pro.id}`}
                      href={`/profissionais/${pro.slug}`}
                      className="flex items-center gap-3 rounded-[8px] border border-white/10 bg-[#101012] p-2.5 transition hover:border-[#d4a843]/35"
                    >
                      <div className="h-20 w-16 shrink-0 overflow-hidden rounded-[8px] bg-[#1a1a1c]">
                        {pro.image ? (
                          <img src={pro.image} alt={pro.name} className="h-full w-full object-cover object-top" />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-sm font-black text-[#f5d78c]">{initials(pro.name)}</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-base font-black text-white">{pro.name}</p>
                          {pro.verified ? <BadgeCheck className="h-4 w-4 shrink-0 text-[#f5d78c]" /> : null}
                        </div>
                        <p className="mt-1 text-xs text-white/50">{pro.city}, {pro.state}{pro.age ? ` - ${pro.age} anos` : ""}</p>
                        <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-white/58">
                          <Eye className="h-3.5 w-3.5 text-[#f5d78c]" />
                          Ver novamente
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-white/28" />
                    </Link>
                  ))}
                </div>
              </motion.section>
              <Appointments appointments={data.recentAppointments} profiles={profiles} />
            </div>
          )}

          {onlineNow.length > 0 && (
            <motion.section variants={item} className="rounded-[8px] border border-white/10 bg-[#101012] p-4">
              <SectionHeader title="Profissionais online agora" />
              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {onlineNow.map((pro, index) => (
                  <MiniProfileRow key={`online-${pro.id}`} pro={pro} index={index} />
                ))}
              </div>
            </motion.section>
          )}
        </>
      ) : (
        <ComingSoonProfiles />
      )}

      <motion.section variants={item} className="grid gap-3 rounded-[8px] border border-white/10 bg-[#0d0d0f] p-4 sm:grid-cols-3">
        <Link href="/dashboard/favoritos" className="flex items-center gap-3 rounded-[8px] bg-[#141416] p-3">
          <Heart className="h-5 w-5 text-[#f5d78c]" />
          <span className="text-sm font-black text-white">Minhas favoritas</span>
        </Link>
        <Link href="/dashboard/mensagens" className="flex items-center gap-3 rounded-[8px] bg-[#141416] p-3">
          <MessageCircle className="h-5 w-5 text-[#f5d78c]" />
          <span className="text-sm font-black text-white">Mensagens</span>
        </Link>
        <Link href="/privacy" className="flex items-center gap-3 rounded-[8px] bg-[#141416] p-3">
          <ShieldCheck className="h-5 w-5 text-[#f5d78c]" />
          <span className="text-sm font-black text-white">Discreto e seguro</span>
        </Link>
      </motion.section>
    </motion.div>
  );
}

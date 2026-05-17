"use client";

/* eslint-disable @next/next/no-img-element -- Profile images can come from uploads and remote providers. */

import Link from "next/link";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  CalendarCheck,
  ChevronRight,
  CheckCircle2,
  Clock,
  Compass,
  Crown,
  Heart,
  MessageCircle,
  Pencil,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";

function VerificationBanner({ status }: { status?: string }) {
  if (status === "VERIFIED" || !status) return null;

  if (status === "PENDING_REVIEW") {
    return (
      <motion.section variants={item} className="rounded-[8px] border border-[#d4a843]/35 bg-[linear-gradient(135deg,rgba(212,168,67,0.10),rgba(212,168,67,0.03))] p-4">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 shrink-0 text-[#d4a843] mt-0.5" />
          <div>
            <p className="text-sm font-black text-white">Verificação em análise</p>
            <p className="mt-1 text-xs text-white/50 leading-5">
              Sua solicitação foi recebida. Assim que aprovada, você terá acesso completo à plataforma.
            </p>
          </div>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section variants={item} className="rounded-[8px] border border-[#cc1f2f]/35 bg-[rgba(204,31,47,0.07)] p-4">
      <div className="flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 shrink-0 text-[#ff9aa4] mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-black text-white">Verificação necessária</p>
          <p className="mt-1 text-xs text-white/50 leading-5">
            Confirme sua maioridade para acessar perfis, favoritos, mensagens e agendamentos.
          </p>
          <Link
            href="/dashboard/verificacao"
            className="mt-3 inline-flex items-center gap-1.5 rounded-[8px] bg-[#d4a843] px-3 py-2 text-xs font-black text-[#060e1b]"
          >
            Verificar agora
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </motion.section>
  );
}

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
  recommendedProfessionals: Array<unknown>;
};

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

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

function shortDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function appointmentStatus(status: string) {
  const labels: Record<string, string> = {
    PENDING: "Pendente",
    CONFIRMED: "Confirmado",
    CANCELLED: "Cancelado",
    COMPLETED: "Concluído",
    NO_SHOW: "Ausente",
  };
  return labels[status] ?? status;
}

export default function PremiumDashboardHome({ data, clientStatus }: { data: DashboardHomeData; clientStatus?: string }) {
  const name = firstName(data.user.name);
  const allDone = data.onboarding.every((s) => s.done);
  const pendingSteps = data.onboarding.filter((s) => !s.done);

  const navCards = [
    {
      href: "/profissionais",
      icon: <Compass className="h-5 w-5" />,
      label: "Explorar",
      desc: "Perfis verificados",
    },
    {
      href: "/dashboard/favoritos",
      icon: <Heart className="h-5 w-5" />,
      label: "Favoritos",
      desc: data.stats.favoriteProfiles > 0 ? `${data.stats.favoriteProfiles} salvos` : "Nenhum ainda",
    },
    {
      href: "/dashboard/mensagens",
      icon: <MessageCircle className="h-5 w-5" />,
      label: "Mensagens",
      desc: "Conversas",
    },
    {
      href: "/dashboard/reservas",
      icon: <CalendarCheck className="h-5 w-5" />,
      label: "Agendamentos",
      desc: data.stats.totalAppointments > 0 ? `${data.stats.totalAppointments} no total` : "Nenhum ainda",
    },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4 pb-10">

      <VerificationBanner status={clientStatus} />

      {/* Welcome card */}
      <motion.section variants={item} className="rounded-[8px] border border-white/10 bg-[#0d0d0f] p-5">
        <div className="flex items-center gap-4">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[8px] border border-[#d4a843]/35 bg-[#d4a843]/12">
            {data.user.image ? (
              <img src={data.user.image} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-base font-black text-[#f5d78c]">
                {initials(data.user.name)}
              </div>
            )}
            <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full border border-[#0d0d0f] bg-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black text-white">Olá, {name}</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <Crown className="h-3.5 w-3.5 text-[#d4a843]" />
              <span className="text-xs font-black text-[#f5d78c]">{data.vip.label}</span>
            </div>
          </div>
          <Link
            href="/dashboard/perfil"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] border border-white/10 bg-[#0a0a0c] text-white/45 transition hover:border-[#d4a843]/35 hover:text-[#f5d78c]"
            aria-label="Editar perfil"
          >
            <Pencil className="h-4 w-4" />
          </Link>
        </div>
        <p className="mt-4 text-sm leading-6 text-white/40">
          Explore profissionais verificados, salve favoritos e acompanhe suas conversas com total discrição.
        </p>
      </motion.section>

      {/* Nav cards */}
      <motion.div variants={item} className="grid grid-cols-2 gap-3">
        {navCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-[8px] border border-white/10 bg-[#0d0d0f] p-4 transition hover:border-[#d4a843]/35"
          >
            <div className="mb-3 grid h-10 w-10 place-items-center rounded-[8px] border border-[#d4a843]/20 bg-[#d4a843]/10 text-[#f5d78c] transition group-hover:bg-[#d4a843]/16">
              {card.icon}
            </div>
            <p className="font-black text-white">{card.label}</p>
            <p className="mt-0.5 text-xs text-white/38">{card.desc}</p>
          </Link>
        ))}
      </motion.div>

      {/* Minha conta */}
      <motion.section variants={item}>
        <Link
          href="/dashboard/perfil"
          className="flex items-center gap-3 rounded-[8px] border border-white/10 bg-[#0d0d0f] p-4 transition hover:border-[#d4a843]/35"
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] border border-[#d4a843]/20 bg-[#d4a843]/10 text-[#f5d78c]">
            <UserRound className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-black text-white">Minha conta</p>
            <p className="mt-0.5 truncate text-xs text-white/38">
              {data.user.name ?? "Perfil Elite"} · {data.user.email}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-white/20" />
        </Link>
      </motion.section>

      {/* Busca rápida */}
      <motion.section variants={item}>
        <Link
          href="/profissionais"
          className="flex h-12 items-center gap-3 rounded-[8px] border border-white/10 bg-[#0a0a0c] px-4 text-sm text-white/45 transition hover:border-[#d4a843]/25"
        >
          <Search className="h-4 w-4 text-[#d4a843]" />
          Buscar profissionais por nome ou cidade...
        </Link>
      </motion.section>

      {/* Agendamentos recentes */}
      {data.recentAppointments.length > 0 && (
        <motion.section variants={item} className="rounded-[8px] border border-white/10 bg-[#0d0d0f] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-black text-white">Agendamentos recentes</p>
            <Link href="/dashboard/reservas" className="text-xs font-black text-[#f5d78c]">
              Ver todos
            </Link>
          </div>
          <div className="space-y-2">
            {data.recentAppointments.slice(0, 3).map((a) => (
              <Link
                key={a.id}
                href={`/profissionais/${a.slug}`}
                className="flex items-center gap-3 rounded-[8px] bg-[#0a0a0c] p-3"
              >
                <div className="h-12 w-10 shrink-0 overflow-hidden rounded-[8px] bg-[#1a1a1c]">
                  {a.image ? (
                    <img src={a.image} alt={a.name} className="h-full w-full object-cover object-top" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-xs font-black text-[#f5d78c]/40">
                      {initials(a.name)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-white">{a.name}</p>
                  <p className="mt-0.5 text-xs text-white/40">
                    {shortDate(a.date)} · {appointmentStatus(a.status)}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-white/20" />
              </Link>
            ))}
          </div>
        </motion.section>
      )}

      {/* Primeiros passos */}
      {!allDone && (
        <motion.section variants={item} className="rounded-[8px] border border-white/10 bg-[#0d0d0f] p-4">
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#d4a843]">
            Primeiros passos
          </p>
          <div className="space-y-2">
            {pendingSteps.slice(0, 3).map((step) => (
              <div key={step.label} className="flex items-center gap-3 rounded-[8px] bg-[#0a0a0c] px-3 py-2.5">
                <Clock className="h-4 w-4 shrink-0 text-white/25" />
                <p className="text-sm text-white/70">{step.label}</p>
              </div>
            ))}
            {data.onboarding.filter((s) => s.done).map((step) => (
              <div key={step.label} className="flex items-center gap-3 rounded-[8px] px-3 py-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#d4a843]" />
                <p className="text-sm text-white/35 line-through">{step.label}</p>
              </div>
            ))}
          </div>
        </motion.section>
      )}

    </motion.div>
  );
}

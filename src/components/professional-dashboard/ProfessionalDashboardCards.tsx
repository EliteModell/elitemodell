"use client";

/* eslint-disable @next/next/no-img-element -- Fotos de perfil podem vir do Supabase ou OAuth remoto. */

import Link from "next/link";
import {
  CalendarClock,
  CalendarDays,
  Camera,
  Check,
  Crown,
  Eye,
  EyeOff,
  FileVideo,
  Gauge,
  Globe2,
  ImagePlus,
  ListChecks,
  Lock,
  MapPin,
  PhoneOff,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
} from "lucide-react";
import { EmptyState } from "@/components/professional-dashboard/EmptyState";
import { StatusBadge } from "@/components/professional-dashboard/StatusBadge";

export type DashboardAppointment = {
  id: string;
  clientLabel: string;
  date: Date;
  duration: number;
  status: string;
  price: number | null;
};

type Resource = {
  label: string;
  active: boolean;
  description: string;
};

function formatDate(date: Date | null | undefined) {
  if (!date) return "Nao informado";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatCurrency(value: number | null) {
  if (value === null) return "Valor nao informado";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ProfessionalMainCard({
  image,
  displayName,
  status,
  city,
  state,
  planName,
  planExpiresAt,
  completeness,
  rankingPosition,
  securityCode,
  slug,
  online,
}: {
  image: string | null;
  displayName: string;
  status: string;
  city: string | null;
  state: string | null;
  planName: string;
  planExpiresAt: Date | null;
  completeness: number;
  rankingPosition: number | null;
  securityCode: string | null;
  slug: string;
  online: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-[8px] border border-[#d4a843]/22 bg-[linear-gradient(150deg,rgba(22,22,24,0.98),rgba(7,7,8,0.98))] shadow-[0_28px_90px_rgba(0,0,0,0.34)]">
      <div className="border-b border-white/10 bg-[#d4a843]/[0.055] px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#d4a843]">Meu perfil profissional</p>
          <StatusBadge status={status} />
        </div>
      </div>

      <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-[8px] border border-[#d4a843]/30 bg-black/40 sm:h-32 sm:w-32">
            {image ? (
              <img src={image} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-[#f5d78c]">
                <UserRound className="h-10 w-10" />
              </div>
            )}
            <span className={`absolute bottom-2 right-2 h-3 w-3 rounded-full border-2 border-[#080808] ${online ? "bg-emerald-400" : "bg-white/30"}`} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="break-words text-2xl font-black leading-tight text-white sm:text-3xl">{displayName}</h1>
              <span className={`rounded-full px-2.5 py-1 text-xs font-black ${online ? "bg-emerald-400/10 text-emerald-200" : "bg-white/[0.06] text-white/45"}`}>
                {online ? "Online" : "Offline"}
              </span>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-white/58">
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#d4a843]" />
                {city && state ? `${city}, ${state}` : "Localizacao nao informada"}
              </span>
              <span className="inline-flex items-center gap-2">
                <Crown className="h-4 w-4 text-[#d4a843]" />
                {planName} {planExpiresAt ? `ate ${formatDate(planExpiresAt)}` : ""}
              </span>
              <span className="inline-flex items-center gap-2">
                <Trophy className="h-4 w-4 text-[#d4a843]" />
                {rankingPosition ? `${rankingPosition}a posicao na cidade` : "Posicao ainda nao disponivel"}
              </span>
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#d4a843]" />
                Codigo de seguranca: {securityCode ?? "nao disponivel"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid content-between gap-4 rounded-[8px] border border-white/10 bg-black/20 p-4">
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-white/42">Completude</span>
              <span className="text-sm font-black text-[#f5d78c]">{completeness}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,#d4a843,#f5d78c)]" style={{ width: `${completeness}%` }} />
            </div>
            <p className="mt-2 text-xs leading-5 text-white/42">Perfis completos tendem a converter melhor em contatos e agendamentos.</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <Link href={`/profissionais/${slug}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] border border-white/12 px-3 text-sm font-black text-white/72 no-underline transition hover:border-[#d4a843]/35 hover:text-[#f5d78c]">
              <Eye className="h-4 w-4" />
              Ver perfil
            </Link>
            <Link href="/profissional/perfil" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] border border-white/12 px-3 text-sm font-black text-white/72 no-underline transition hover:border-[#d4a843]/35 hover:text-[#f5d78c]">
              <Gauge className="h-4 w-4" />
              Editar
            </Link>
            <Link href="/profissional/planos" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] bg-[#d4a843] px-3 text-sm font-black text-[#080704] no-underline transition hover:bg-[#f5d78c]">
              <Sparkles className="h-4 w-4" />
              Impulsionar
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function RankingCard({ city, position }: { city: string | null; position: number | null }) {
  const tips = ["Completar perfil", "Manter fotos recentes", "Postar videos/stories", "Atualizar agenda", "Receber boas avaliacoes", "Manter plano ativo", "Comprar destaque/boost"];

  return (
    <section className="rounded-[8px] border border-[#d4a843]/20 bg-[linear-gradient(180deg,rgba(18,18,20,0.98),rgba(8,8,9,0.98))] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.28)] sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#d4a843]">Ranking e listagem</p>
          <h2 className="mt-1 text-xl font-black text-white">
            {position && city ? `Seu perfil esta na ${position}a posicao em ${city}` : "Posicao ainda nao disponivel"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
            A ordem considera sinais reais da plataforma, como boost ativo, destaque, avaliacao e atualizacao do perfil. Conteudo novo e agenda organizada ajudam o perfil a parecer mais confiavel para clientes.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:w-72 lg:grid-cols-1">
          <Link href="/profissional/perfil" className="inline-flex min-h-11 items-center justify-center rounded-[8px] bg-[#d4a843] px-4 text-sm font-black text-[#080704] no-underline transition hover:bg-[#f5d78c]">Melhorar posicao</Link>
          <Link href="/profissionais" className="inline-flex min-h-11 items-center justify-center rounded-[8px] border border-white/12 px-4 text-sm font-black text-white/70 no-underline transition hover:border-[#d4a843]/35 hover:text-[#f5d78c]">Ver minha listagem</Link>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
        {tips.map((tip) => (
          <div key={tip} className="flex min-h-16 items-center gap-2 rounded-[8px] border border-white/10 bg-white/[0.035] p-2 text-xs font-bold leading-5 text-white/62">
            <Check className="h-4 w-4 shrink-0 text-[#d4a843]" />
            {tip}
          </div>
        ))}
      </div>
    </section>
  );
}

export function QuickPostCard() {
  const actions = [
    { label: "Postar foto", href: "/profissional/fotos", icon: ImagePlus },
    { label: "Postar video", href: "/profissional/configuracoes", icon: FileVideo },
    { label: "Postar story", href: "/profissional/stories", icon: Camera },
    { label: "Atualizar agenda", href: "/profissional/agenda", icon: CalendarDays },
  ];

  return (
    <section className="rounded-[8px] border border-[#d4a843]/20 bg-[linear-gradient(135deg,rgba(212,168,67,0.12),rgba(255,255,255,0.035)_44%,rgba(8,8,9,0.98))] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.26)] sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#d4a843]">Atualize seu conteudo</p>
          <h2 className="mt-1 text-xl font-black text-white">Fotos recentes, videos e agenda em dia</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/58">Perfis com fotos recentes, videos e agenda atualizada tendem a receber mais visualizacoes.</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-[8px] border border-dashed border-[#d4a843]/32 bg-black/20 p-3 text-center text-sm font-black text-white no-underline transition hover:bg-[#d4a843]/10 hover:text-[#f5d78c]">
              <Icon className="h-6 w-6 text-[#f5d78c]" />
              {action.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function PlanResourcesCard({
  planName,
  statusLabel,
  expiresAt,
  resources,
  hasActivePlan,
}: {
  planName: string;
  statusLabel: string;
  expiresAt: Date | null;
  resources: Resource[];
  hasActivePlan: boolean;
}) {
  return (
    <section className="rounded-[8px] border border-[#d4a843]/20 bg-[linear-gradient(180deg,rgba(18,18,20,0.98),rgba(8,8,9,0.98))] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.28)] sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#d4a843]">Meus planos e recursos</p>
          <h2 className="mt-1 text-xl font-black text-white">{hasActivePlan ? planName : "Seu perfil esta no modo basico"}</h2>
          <p className="mt-2 text-sm leading-6 text-white/55">
            {hasActivePlan ? `Status: ${statusLabel}. Vencimento: ${formatDate(expiresAt)}.` : "Assine um plano para ganhar mais visibilidade na listagem."}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 lg:w-[420px]">
          <Link href="/profissional/planos" className="inline-flex min-h-11 items-center justify-center rounded-[8px] bg-[#d4a843] px-4 text-sm font-black text-[#080704] no-underline transition hover:bg-[#f5d78c]">{hasActivePlan ? "Renovar plano" : "Conhecer planos"}</Link>
          <Link href="/profissional/planos" className="inline-flex min-h-11 items-center justify-center rounded-[8px] border border-white/12 px-4 text-sm font-black text-white/70 no-underline transition hover:border-[#d4a843]/35 hover:text-[#f5d78c]">Comprar destaque</Link>
          <Link href="/profissional/planos" className="inline-flex min-h-11 items-center justify-center rounded-[8px] border border-white/12 px-4 text-sm font-black text-white/70 no-underline transition hover:border-[#d4a843]/35 hover:text-[#f5d78c]">Ver planos</Link>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {resources.map((resource) => (
          <div key={resource.label} className="rounded-[8px] border border-white/10 bg-white/[0.035] p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm font-black text-white">{resource.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ${resource.active ? "bg-emerald-400/10 text-emerald-200" : "bg-white/[0.06] text-white/38"}`}>
                {resource.active ? "Ativo" : "Inativo"}
              </span>
            </div>
            <p className="text-xs leading-5 text-white/45">{resource.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PrivacyBoostCard({
  hideAge,
  hidePhone,
  isPaused,
  isVisible,
  boostActive,
}: {
  hideAge: boolean;
  hidePhone: boolean;
  isPaused: boolean;
  isVisible: boolean;
  boostActive: boolean;
}) {
  const options = [
    { label: "Pausar perfil temporariamente", active: isPaused, description: "Quando pausado, o perfil deixa de aparecer na busca publica pelo periodo escolhido.", icon: EyeOff },
    { label: "Ocultar idade", active: hideAge, description: "A idade nao aparece publicamente quando este controle esta ativo.", icon: Lock },
    { label: "Ocultar telefone", active: hidePhone, description: "Seu telefone nao aparece publicamente, mas clientes ainda podem entrar em contato pelos canais permitidos.", icon: PhoneOff },
    { label: "Exibicao na listagem", active: isVisible, description: "Controla se o perfil aparece para clientes na cidade e nos filtros publicos.", icon: Globe2 },
    { label: "Boost por periodo", active: boostActive, description: "Impulsionamento preparado por diaria ou periodo, conforme regra comercial ativa.", icon: Sparkles },
  ];

  return (
    <section className="rounded-[8px] border border-[#d4a843]/20 bg-[linear-gradient(180deg,rgba(18,18,20,0.98),rgba(8,8,9,0.98))] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.28)] sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#d4a843]">Privacidade e boost</p>
          <h2 className="mt-1 text-xl font-black text-white">Controle sua presenca publica</h2>
        </div>
        <Link href="/profissional/configuracoes" className="inline-flex min-h-11 items-center justify-center rounded-[8px] bg-[#d4a843] px-4 text-sm font-black text-[#080704] no-underline transition hover:bg-[#f5d78c]">Configurar</Link>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <div key={option.label} className="rounded-[8px] border border-white/10 bg-white/[0.035] p-3">
              <div className="mb-3 flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-[8px] bg-[#d4a843]/10 text-[#f5d78c]">
                  <Icon className="h-4 w-4" />
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ${option.active ? "bg-emerald-400/10 text-emerald-200" : "bg-white/[0.06] text-white/38"}`}>{option.active ? "Ativo" : "Inativo"}</span>
              </div>
              <h3 className="text-sm font-black text-white">{option.label}</h3>
              <p className="mt-1 text-xs leading-5 text-white/45">{option.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function PendingAppointmentsCard({ appointments }: { appointments: DashboardAppointment[] }) {
  return (
    <section className="rounded-[8px] border border-[#d4a843]/20 bg-[linear-gradient(180deg,rgba(18,18,20,0.98),rgba(8,8,9,0.98))] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.28)] sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#d4a843]">Agenda comercial</p>
          <h2 className="mt-1 text-xl font-black text-white">Agendamentos pendentes</h2>
        </div>
        <Link href="/profissional/agendamentos" className="text-sm font-black text-[#f5d78c] no-underline">Ver todos</Link>
      </div>

      {appointments.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Nenhum agendamento pendente"
          description="Quando clientes solicitarem horarios, eles aparecerao aqui para voce aceitar, recusar ou ver detalhes."
          actionHref="/profissional/agenda"
          actionLabel="Atualizar agenda"
        />
      ) : (
        <div className="grid gap-3">
          {appointments.map((appointment) => (
            <div key={appointment.id} className="rounded-[8px] border border-white/10 bg-white/[0.035] p-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-sm font-black text-white">{appointment.clientLabel}</h3>
                  <p className="mt-1 text-xs leading-5 text-white/48">
                    {appointment.date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })} as {appointment.date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} - {appointment.duration} min - {formatCurrency(appointment.price)}
                  </p>
                  <span className="mt-2 inline-flex rounded-full bg-[#d4a843]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#f5d78c]">Pendente</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-3 lg:w-80">
                  <Link href="/profissional/agendamentos" className="inline-flex min-h-10 items-center justify-center rounded-[8px] bg-emerald-400/12 px-3 text-xs font-black text-emerald-100 no-underline">Aceitar</Link>
                  <Link href="/profissional/agendamentos" className="inline-flex min-h-10 items-center justify-center rounded-[8px] border border-red-400/20 px-3 text-xs font-black text-red-100 no-underline">Recusar</Link>
                  <Link href="/profissional/agendamentos" className="inline-flex min-h-10 items-center justify-center rounded-[8px] border border-white/12 px-3 text-xs font-black text-white/65 no-underline">Detalhes</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function QuickManagementGrid() {
  const links = [
    { href: "/profissional/perfil", label: "Editar perfil", desc: "Bio, valores, atendimento e contatos", icon: ListChecks },
    { href: "/profissional/estatisticas", label: "Estatisticas", desc: "Relatorios e sinais de procura", icon: Gauge },
    { href: "/profissional/avaliacoes", label: "Avaliacoes", desc: "Respostas, nota media e disputas", icon: ShieldCheck },
    { href: "/profissional/fotos", label: "Galeria", desc: "Fotos de capa e portfolio", icon: ImagePlus },
    { href: "/profissional/agenda", label: "Agenda", desc: "Dias e horarios disponiveis", icon: CalendarDays },
    { href: "/profissional/planos", label: "Planos", desc: "Renovacao, destaque e pontos", icon: Crown },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <Link key={link.href} href={link.href} className="rounded-[8px] border border-[#d4a843]/18 bg-white/[0.035] p-4 no-underline transition hover:border-[#d4a843]/38 hover:bg-[#d4a843]/[0.075]">
            <div className="mb-3 grid h-9 w-9 place-items-center rounded-[8px] bg-[#d4a843]/10 text-[#f5d78c]">
              <Icon className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-black text-white">{link.label}</h3>
            <p className="mt-1 text-xs leading-5 text-white/45">{link.desc}</p>
          </Link>
        );
      })}
    </section>
  );
}

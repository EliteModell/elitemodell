"use client";

/* eslint-disable @next/next/no-img-element -- Profile photos can come from Google or user-provided URLs. */

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import toast from "react-hot-toast";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  Camera,
  CheckCircle2,
  Building2,
  Crown,
  Edit3,
  Heart,
  History,
  KeyRound,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";

export type PremiumProfileData = {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    phone: string | null;
    role: string;
    verified: boolean;
    credits: number;
    emailVerified: string | null;
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
  metrics: {
    favorites: number;
    bookings: number;
    activeBookings: number;
    appointments: number;
    reviews: number;
  };
  onboarding: Array<{
    label: string;
    done: boolean;
    detail: string;
  }>;
  recentHistory: Array<{
    id: string;
    type: "Reserva" | "Favorito" | "Agendamento";
    title: string;
    detail: string;
    date: string;
  }>;
};

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.44, ease: "easeOut" } },
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

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function profileCompletion(data: PremiumProfileData) {
  const checks = [
    Boolean(data.user.name),
    Boolean(data.user.email),
    Boolean(data.user.image),
    Boolean(data.user.phone),
    Boolean(data.city),
    Boolean(data.user.birthDate),
    Boolean(data.user.termsConsent && data.user.lgpdConsent),
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function Field({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[8px] border border-white/8 bg-black/18 p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#d4a843]">
        {icon}
        {label}
      </div>
      <p className="break-words text-sm font-bold text-white/82">{value}</p>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <motion.div
      variants={item}
      whileHover={{ y: -4 }}
      className="rounded-[8px] border border-white/10 bg-white/[0.045] p-4 backdrop-blur-xl transition hover:border-[#d4a843]/35"
    >
      <div className="mb-4 grid h-11 w-11 place-items-center rounded-[8px] border border-[#d4a843]/20 bg-[#d4a843]/10 text-[#f5d78c]">
        {icon}
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-sm text-white/48">{label}</p>
    </motion.div>
  );
}

export default function PremiumProfile({ data }: { data: PremiumProfileData }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(data.user);
  const [form, setForm] = useState({
    name: data.user.name ?? "",
    phone: data.user.phone ?? "",
    image: data.user.image ?? "",
  });

  const completion = useMemo(() => profileCompletion({ ...data, user: profile }), [data, profile]);
  const accountAge = dateLabel(profile.createdAt);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.replace(/\D/g, ""),
        image: form.image.trim() || undefined,
      };

      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Não foi possível atualizar o perfil.");

      const updated = await res.json();
      setProfile((current) => ({
        ...current,
        name: updated.name ?? current.name,
        phone: updated.phone ?? null,
        image: updated.image ?? null,
      }));
      setEditing(false);
      toast.success("Perfil atualizado.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.section
        variants={item}
        className="relative overflow-hidden rounded-[8px] border border-white/10 bg-[linear-gradient(135deg,rgba(8,8,9,0.98),rgba(64,12,18,0.68)_48%,rgba(18,16,12,0.96))] p-5 shadow-[0_32px_110px_rgba(0,0,0,0.38)] sm:p-7"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(245,215,140,0.9),transparent)]" />
        <div className="relative grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-end">
            <div className="relative h-36 w-36 overflow-hidden rounded-[8px] border border-[#d4a843]/35 bg-[#d4a843]/10 shadow-[0_22px_60px_rgba(0,0,0,0.38)]">
              {profile.image ? (
                <img src={profile.image} alt={profile.name ?? "Avatar"} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-4xl font-black text-[#f5d78c]">
                  {initials(profile.name)}
                </div>
              )}
              <span className="absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-full border border-[#d4a843]/25 bg-[#0a0a0b] text-[#d4a843]">
                <Camera className="h-4 w-4" />
              </span>
            </div>

            <div className="min-w-0">
              <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#d4a843]/25 bg-black/25 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#f5d78c]">
                <Crown className="h-3.5 w-3.5" />
                {data.vip.label}
              </p>
              <h1 className="text-3xl font-black leading-tight text-white sm:text-5xl">
                {profile.name ?? "Perfil Elite"}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/55">
                Conta criada em {accountAge}. Sua experiência fica mais precisa conforme seu perfil, favoritos e reservas evoluem.
              </p>
            </div>
          </div>

          <div className="rounded-[8px] border border-white/10 bg-black/25 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black text-white">Status da conta</p>
                <p className="mt-1 text-xs leading-5 text-white/45">{data.vip.description}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-[#f5d78c]">{completion}%</p>
                <p className="text-xs uppercase tracking-[0.16em] text-white/35">perfil</p>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completion}%` }}
                transition={{ duration: 0.75, ease: "easeOut" }}
                className="h-full rounded-full bg-[linear-gradient(90deg,#cc1f2f,#d4a843,#f5d78c)]"
              />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <ShieldCheck className="h-4 w-4 text-[#d4a843]" />
                {profile.emailVerified ? "Email verificado" : "Email pendente"}
              </div>
              <div className="flex items-center gap-2 text-sm text-white/70">
                <LockKeyhole className="h-4 w-4 text-[#d4a843]" />
                Navegação discreta
              </div>
              <div className="flex items-center gap-2 text-sm text-white/70">
                <BadgeCheck className="h-4 w-4 text-[#d4a843]" />
                {profile.verified ? "Identidade validada" : "Validação disponível"}
              </div>
              <div className="flex items-center gap-2 text-sm text-white/70">
                <WalletCards className="h-4 w-4 text-[#d4a843]" />
                {money(profile.credits)} em créditos
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section variants={container} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={<Heart className="h-5 w-5" />} label="Favoritos" value={String(data.metrics.favorites)} />
        <Metric icon={<CalendarCheck className="h-5 w-5" />} label="Reservas" value={String(data.metrics.bookings)} />
        <Metric icon={<Sparkles className="h-5 w-5" />} label="Ativas" value={String(data.metrics.activeBookings)} />
        <Metric icon={<UserRound className="h-5 w-5" />} label="Agendamentos" value={String(data.metrics.appointments)} />
        <Metric icon={<Star className="h-5 w-5" />} label="Avaliações" value={String(data.metrics.reviews)} />
      </motion.section>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
        <motion.section variants={item} className="rounded-[8px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="mb-1 text-[11px] font-black uppercase tracking-[0.24em] text-[#d4a843]">
                Meu perfil
              </p>
              <h2 className="text-xl font-black text-white">Dados principais</h2>
            </div>
            <button
              type="button"
              onClick={() => setEditing((value) => !value)}
              className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-[#d4a843]/25 bg-[#d4a843]/10 px-4 text-sm font-black text-[#f5d78c] transition hover:border-[#d4a843]/45 hover:bg-[#d4a843]/16"
            >
              {editing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
              {editing ? "Cancelar" : "Editar perfil"}
            </button>
          </div>

          {editing ? (
            <form onSubmit={saveProfile} className="grid gap-4">
              <label className="grid gap-2 text-sm font-bold text-white/72">
                Nome
                <input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  className="h-12 rounded-[8px] border border-white/10 bg-black/30 px-4 text-white outline-none transition focus:border-[#d4a843]/55"
                  placeholder="Seu nome"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-white/72">
                Telefone
                <input
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  className="h-12 rounded-[8px] border border-white/10 bg-black/30 px-4 text-white outline-none transition focus:border-[#d4a843]/55"
                  placeholder="(11) 99999-9999"
                  inputMode="tel"
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-white/72">
                URL da foto
                <input
                  value={form.image}
                  onChange={(event) => setForm({ ...form, image: event.target.value })}
                  className="h-12 rounded-[8px] border border-white/10 bg-black/30 px-4 text-white outline-none transition focus:border-[#d4a843]/55"
                  placeholder="https://..."
                />
              </label>
              <button
                disabled={saving}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-[#d4a843] px-5 text-sm font-black text-[#100d09] transition hover:bg-[#f5d78c] disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
              >
                <Save className="h-4 w-4" />
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>
            </form>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field icon={<UserRound className="h-4 w-4" />} label="Nome" value={profile.name ?? "Adicionar nome"} />
              <Field icon={<Mail className="h-4 w-4" />} label="Email" value={profile.email ?? "Email não informado"} />
              <Field icon={<Phone className="h-4 w-4" />} label="Telefone" value={profile.phone ?? "Adicionar telefone"} />
              <Field icon={<Building2 className="h-4 w-4" />} label="Cidade" value={data.city ?? "Definir pela sua próxima busca"} />
              <Field icon={<BadgeCheck className="h-4 w-4" />} label="Verificação" value={profile.verified ? "Conta verificada" : "Verificação pendente"} />
              <Field icon={<KeyRound className="h-4 w-4" />} label="Acesso" value={profile.emailVerified ? "Google ou email confirmado" : "Confirmação recomendada"} />
            </div>
          )}
        </motion.section>

        <motion.section variants={item} className="rounded-[8px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl sm:p-6">
          <p className="mb-1 text-[11px] font-black uppercase tracking-[0.24em] text-[#d4a843]">
            Onboarding
          </p>
          <h2 className="mb-5 text-xl font-black text-white">Experiência personalizada</h2>
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
                  {step.done ? <CheckCircle2 className="h-4 w-4" /> : <History className="h-4 w-4" />}
                </span>
                <div>
                  <p className="text-sm font-black text-white">{step.label}</p>
                  <p className="mt-1 text-xs leading-5 text-white/42">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/profissionais"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-[#cc1f2f]/25 bg-[#cc1f2f]/10 px-4 py-3 text-sm font-black text-[#ff9aa4] transition hover:border-[#cc1f2f]/45 hover:bg-[#cc1f2f]/15"
          >
            Continuar curadoria
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1fr]">
        <motion.section variants={item} className="rounded-[8px] border border-[#d4a843]/18 bg-[linear-gradient(135deg,rgba(212,168,67,0.10),rgba(255,255,255,0.035))] p-5 backdrop-blur-xl sm:p-6">
          <p className="mb-1 text-[11px] font-black uppercase tracking-[0.24em] text-[#d4a843]">
            Badges
          </p>
          <h2 className="mb-5 text-xl font-black text-white">Identidade Elite</h2>
          <div className="grid gap-3">
            {[
              { label: data.vip.label, icon: <Crown className="h-4 w-4" />, active: true },
              { label: profile.emailVerified ? "Email verificado" : "Email pendente", icon: <ShieldCheck className="h-4 w-4" />, active: Boolean(profile.emailVerified) },
              { label: profile.image ? "Foto conectada" : "Foto pendente", icon: <Camera className="h-4 w-4" />, active: Boolean(profile.image) },
              { label: data.metrics.favorites > 0 ? "Curadoria iniciada" : "Curadoria vazia", icon: <Heart className="h-4 w-4" />, active: data.metrics.favorites > 0 },
            ].map((badge) => (
              <div
                key={badge.label}
                className={`flex items-center gap-3 rounded-[8px] border p-3 ${
                  badge.active
                    ? "border-[#d4a843]/25 bg-[#d4a843]/10 text-[#f5d78c]"
                    : "border-white/8 bg-black/16 text-white/38"
                }`}
              >
                {badge.icon}
                <span className="text-sm font-black">{badge.label}</span>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section variants={item} className="rounded-[8px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl sm:p-6">
          <p className="mb-1 text-[11px] font-black uppercase tracking-[0.24em] text-[#d4a843]">
            Histórico
          </p>
          <h2 className="mb-5 text-xl font-black text-white">Últimos movimentos</h2>
          {data.recentHistory.length > 0 ? (
            <div className="space-y-3">
              {data.recentHistory.map((entry) => (
                <div key={`${entry.type}-${entry.id}`} className="flex gap-3 rounded-[8px] border border-white/8 bg-black/18 p-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] border border-[#d4a843]/20 bg-[#d4a843]/10 text-[#f5d78c]">
                    {entry.type === "Reserva" ? <CalendarCheck className="h-4 w-4" /> : entry.type === "Favorito" ? <Heart className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="truncate text-sm font-black text-white">{entry.title}</p>
                      <span className="text-xs text-white/35">{dateLabel(entry.date)}</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-white/45">
                      {entry.type} · {entry.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[8px] border border-dashed border-white/12 bg-black/18 p-6 text-center">
              <MapPin className="mx-auto mb-3 h-5 w-5 text-[#d4a843]" />
              <p className="font-black text-white">Histórico em branco</p>
              <p className="mt-1 text-sm leading-6 text-white/45">
                Favoritos, reservas e agendamentos aparecerão aqui.
              </p>
            </div>
          )}
        </motion.section>
      </div>
    </motion.div>
  );
}

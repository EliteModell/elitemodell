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
  show: { opacity: 1, transition: { staggerChildren: 0.055 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: "easeOut" } },
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

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-[#d4a843]/60">
      {children}
    </p>
  );
}

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-xl border border-white/[0.07] bg-white/[0.02] ${className ?? ""}`}>
      {children}
    </div>
  );
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
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
      <div className="mb-2.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-[#d4a843]/55">
        {icon}
        {label}
      </div>
      <p className="break-words text-[13px] font-medium text-white/70">{value}</p>
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
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 transition-colors hover:border-white/10"
    >
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#d4a843]/[0.07] text-[#d4a843]">
        {icon}
      </div>
      <p className="text-[1.35rem] font-bold tracking-tight text-white">{value}</p>
      <p className="mt-0.5 text-[12px] text-white/42">{label}</p>
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
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">

      {/* ── Hero ── */}
      <motion.section
        variants={item}
        className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c0b0e] p-6 sm:p-8"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d4a843]/30 to-transparent" />

        <div className="relative grid gap-8 lg:grid-cols-[1fr_260px] lg:items-end">
          {/* Avatar + name */}
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
            <div className="relative h-32 w-32 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.04] shadow-2xl sm:h-36 sm:w-36">
              {profile.image ? (
                <img
                  src={profile.image}
                  alt={profile.name ?? "Avatar"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-white/25">
                  {initials(profile.name)}
                </div>
              )}
              <span className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.08] bg-[#0c0b0e] text-[#d4a843]">
                <Camera className="h-3.5 w-3.5" />
              </span>
            </div>

            <div className="min-w-0">
              <Eyebrow>{data.vip.label}</Eyebrow>
              <h1 className="text-[1.65rem] font-bold leading-[1.15] tracking-tight text-white sm:text-[2.25rem]">
                {profile.name ?? "Perfil Elite"}
              </h1>
              <p className="mt-3 max-w-md text-[12px] leading-relaxed text-white/35">
                Conta criada em {accountAge}. Sua experiência evolui conforme seu perfil, favoritos
                e reservas crescem.
              </p>
            </div>
          </div>

          {/* Status card */}
          <div className="rounded-xl border border-[#d4a843]/10 bg-gradient-to-br from-[#141210] to-[#0d0b09] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[13px] font-semibold text-white">Status da conta</p>
                <p className="mt-0.5 text-[11px] leading-5 text-white/30">{data.vip.description}</p>
              </div>
              <div className="text-right">
                <p className="text-[2rem] font-bold leading-none text-[#e2c06a]">{completion}%</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/25">perfil</p>
              </div>
            </div>
            <div className="mt-4 h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completion}%` }}
                transition={{ duration: 0.75, ease: "easeOut", delay: 0.2 }}
                className="h-full rounded-full bg-gradient-to-r from-[#cc1f2f] via-[#d4a843] to-[#f5d78c]"
              />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                {
                  icon: <ShieldCheck className="h-3.5 w-3.5" />,
                  label: profile.emailVerified ? "Email verificado" : "Email pendente",
                },
                { icon: <LockKeyhole className="h-3.5 w-3.5" />, label: "Navegação discreta" },
                {
                  icon: <BadgeCheck className="h-3.5 w-3.5" />,
                  label: profile.verified ? "Identidade validada" : "Validação disponível",
                },
                {
                  icon: <WalletCards className="h-3.5 w-3.5" />,
                  label: `${money(profile.credits)} em créditos`,
                },
              ].map((feat) => (
                <div key={feat.label} className="flex items-center gap-2 text-[12px] text-white/35">
                  <span className="text-[#d4a843]/50">{feat.icon}</span>
                  {feat.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Metrics ── */}
      <motion.section variants={container} className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <Metric icon={<Heart className="h-4 w-4" />} label="Favoritos" value={String(data.metrics.favorites)} />
        <Metric icon={<CalendarCheck className="h-4 w-4" />} label="Reservas" value={String(data.metrics.bookings)} />
        <Metric icon={<Sparkles className="h-4 w-4" />} label="Ativas" value={String(data.metrics.activeBookings)} />
        <Metric icon={<UserRound className="h-4 w-4" />} label="Agendamentos" value={String(data.metrics.appointments)} />
        <Metric icon={<Star className="h-4 w-4" />} label="Avaliações" value={String(data.metrics.reviews)} />
      </motion.section>

      {/* ── Data + Onboarding ── */}
      <div className="grid gap-5 xl:grid-cols-[1fr_0.75fr]">
        {/* Data section */}
        <motion.section variants={item}>
          <Card className="p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <Eyebrow>Meu perfil</Eyebrow>
                <h2 className="text-base font-semibold tracking-tight text-white sm:text-lg">
                  Dados principais
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditing((v) => !v)}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-4 text-[12px] font-medium text-white/55 transition hover:border-white/12 hover:text-white/80"
              >
                {editing ? (
                  <X className="h-3.5 w-3.5" />
                ) : (
                  <Edit3 className="h-3.5 w-3.5" />
                )}
                {editing ? "Cancelar" : "Editar"}
              </button>
            </div>

            {editing ? (
              <form onSubmit={saveProfile} className="grid gap-4">
                {[
                  {
                    label: "Nome",
                    value: form.name,
                    key: "name" as const,
                    placeholder: "Seu nome",
                    type: "text",
                    required: true,
                  },
                  {
                    label: "Telefone",
                    value: form.phone,
                    key: "phone" as const,
                    placeholder: "(11) 99999-9999",
                    type: "tel",
                    required: false,
                  },
                  {
                    label: "URL da foto",
                    value: form.image,
                    key: "image" as const,
                    placeholder: "https://...",
                    type: "url",
                    required: false,
                  },
                ].map((field) => (
                  <label key={field.key} className="grid gap-1.5 text-[12px] font-medium text-white/45">
                    {field.label}
                    <input
                      type={field.type}
                      value={field.value}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                      className="h-11 rounded-lg border border-white/[0.07] bg-white/[0.025] px-4 text-[13px] text-white placeholder-white/20 outline-none transition focus:border-[#d4a843]/35 focus:bg-white/[0.035]"
                      placeholder={field.placeholder}
                      required={field.required}
                    />
                  </label>
                ))}
                <button
                  disabled={saving}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#d4a843] px-5 text-[13px] font-semibold text-[#0c0a06] shadow-[0_6px_20px_rgba(212,168,67,0.18)] transition hover:bg-[#e8c560] disabled:cursor-not-allowed disabled:opacity-55 sm:w-fit"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? "Salvando..." : "Salvar alterações"}
                </button>
              </form>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  icon={<UserRound className="h-3.5 w-3.5" />}
                  label="Nome"
                  value={profile.name ?? "Adicionar nome"}
                />
                <Field
                  icon={<Mail className="h-3.5 w-3.5" />}
                  label="Email"
                  value={profile.email ?? "Email não informado"}
                />
                <Field
                  icon={<Phone className="h-3.5 w-3.5" />}
                  label="Telefone"
                  value={profile.phone ?? "Adicionar telefone"}
                />
                <Field
                  icon={<Building2 className="h-3.5 w-3.5" />}
                  label="Cidade"
                  value={data.city ?? "Definir pela sua próxima busca"}
                />
                <Field
                  icon={<BadgeCheck className="h-3.5 w-3.5" />}
                  label="Verificação"
                  value={profile.verified ? "Conta verificada" : "Verificação pendente"}
                />
                <Field
                  icon={<KeyRound className="h-3.5 w-3.5" />}
                  label="Acesso"
                  value={
                    profile.emailVerified
                      ? "Google ou email confirmado"
                      : "Confirmação recomendada"
                  }
                />
              </div>
            )}
          </Card>
        </motion.section>

        {/* Onboarding */}
        <motion.section variants={item}>
          <Card className="h-full p-5 sm:p-6">
            <div className="mb-5">
              <Eyebrow>Onboarding</Eyebrow>
              <h2 className="text-base font-semibold tracking-tight text-white sm:text-lg">
                Experiência personalizada
              </h2>
            </div>
            <div className="space-y-2">
              {data.onboarding.map((step) => (
                <div
                  key={step.label}
                  className={`flex gap-3 rounded-xl border p-3 ${
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
                      <History className="h-3 w-3" />
                    )}
                  </span>
                  <div>
                    <p
                      className={`text-[12px] font-medium ${
                        step.done ? "text-white" : "text-white/40"
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-4 text-white/22">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link
              href="/profissionais"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#cc1f2f]/15 bg-[#cc1f2f]/[0.06] px-4 py-2.5 text-[12px] font-medium text-[#ff9aa4]/70 transition hover:border-[#cc1f2f]/25 hover:text-[#ff9aa4]"
            >
              Continuar curadoria
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Card>
        </motion.section>
      </div>

      {/* ── Badges + History ── */}
      <div className="grid gap-5 xl:grid-cols-[0.75fr_1fr]">
        {/* Badges */}
        <motion.section variants={item}>
          <Card className="p-5 sm:p-6">
            <div className="mb-5">
              <Eyebrow>Badges</Eyebrow>
              <h2 className="text-base font-semibold tracking-tight text-white sm:text-lg">
                Identidade Elite
              </h2>
            </div>
            <div className="space-y-2.5">
              {[
                { label: data.vip.label, icon: <Crown className="h-4 w-4" />, active: true },
                {
                  label: profile.emailVerified ? "Email verificado" : "Email pendente",
                  icon: <ShieldCheck className="h-4 w-4" />,
                  active: Boolean(profile.emailVerified),
                },
                {
                  label: profile.image ? "Foto conectada" : "Foto pendente",
                  icon: <Camera className="h-4 w-4" />,
                  active: Boolean(profile.image),
                },
                {
                  label:
                    data.metrics.favorites > 0 ? "Curadoria iniciada" : "Curadoria vazia",
                  icon: <Heart className="h-4 w-4" />,
                  active: data.metrics.favorites > 0,
                },
              ].map((badge) => (
                <div
                  key={badge.label}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-[13px] font-medium ${
                    badge.active
                      ? "border-[#d4a843]/12 bg-[#d4a843]/[0.04] text-[#e2c06a]"
                      : "border-white/[0.05] bg-transparent text-white/25"
                  }`}
                >
                  {badge.icon}
                  {badge.label}
                </div>
              ))}
            </div>
          </Card>
        </motion.section>

        {/* History */}
        <motion.section variants={item}>
          <Card className="p-5 sm:p-6">
            <div className="mb-5">
              <Eyebrow>Histórico</Eyebrow>
              <h2 className="text-base font-semibold tracking-tight text-white sm:text-lg">
                Últimos movimentos
              </h2>
            </div>
            {data.recentHistory.length > 0 ? (
              <div className="space-y-2.5">
                {data.recentHistory.map((entry) => (
                  <div
                    key={`${entry.type}-${entry.id}`}
                    className="flex gap-3 rounded-xl border border-white/[0.06] p-3"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#d4a843]/[0.07] text-[#d4a843]">
                      {entry.type === "Reserva" ? (
                        <CalendarCheck className="h-3.5 w-3.5" />
                      ) : entry.type === "Favorito" ? (
                        <Heart className="h-3.5 w-3.5" />
                      ) : (
                        <UserRound className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="truncate text-[12px] font-medium text-white/75">
                          {entry.title}
                        </p>
                        <span className="text-[10px] text-white/25">{dateLabel(entry.date)}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] leading-4 text-white/32">
                        {entry.type} · {entry.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/[0.07] p-6 text-center">
                <MapPin className="mx-auto mb-3 h-4 w-4 text-[#d4a843]/35" />
                <p className="text-[13px] font-medium text-white/45">Histórico em branco</p>
                <p className="mt-1 text-[12px] leading-5 text-white/22">
                  Favoritos, reservas e agendamentos aparecerão aqui.
                </p>
              </div>
            )}
          </Card>
        </motion.section>
      </div>
    </motion.div>
  );
}

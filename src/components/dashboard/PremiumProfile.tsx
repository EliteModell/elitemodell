"use client";

/* eslint-disable @next/next/no-img-element -- Profile photos can come from Google or user-provided URLs. */

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import toast from "react-hot-toast";
import { signOut } from "next-auth/react";
import {
  BadgeCheck,
  Camera,
  CheckCircle2,
  Clock,
  Crown,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { supabaseAuth } from "@/lib/supabase-client";

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
    favoriteProfiles: number;
    appointments: number;
    activeAppointments: number;
    completedAppointments: number;
    reviews: number;
  };
  onboarding: Array<{
    label: string;
    done: boolean;
    detail: string;
  }>;
  recentHistory: Array<{
    id: string;
    type: "Agendamento";
    title: string;
    detail: string;
    date: string;
  }>;
};

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" } },
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

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/6 last:border-0">
      <span className="text-[#d4a843]">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-white/40 mb-0.5">{label}</p>
        <p className="text-sm font-bold text-white truncate">{value}</p>
      </div>
    </div>
  );
}

export default function PremiumProfile({ data }: { data: PremiumProfileData }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [profile, setProfile] = useState(data.user);
  const [form, setForm] = useState({ name: data.user.name ?? "", phone: data.user.phone ?? "" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const completion = useMemo(() => profileCompletion({ ...data, user: profile }), [data, profile]);
  const allDone = data.onboarding.every((s) => s.done);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // Usa o UID do Supabase Auth (UUID) — necessário para a RLS policy do storage
      const { data: authData } = await supabaseAuth.auth.getUser();
      const uid = authData.user?.id;
      if (!uid) throw new Error("Sessão expirada. Faça login novamente.");
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${uid}/avatar.${ext}`;
      const { error: uploadError } = await supabaseAuth.storage
        .from("profiles")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabaseAuth.storage.from("profiles").getPublicUrl(path);
      const imageUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageUrl }),
      });
      if (!res.ok) throw new Error("Erro ao salvar foto.");
      setProfile((current) => ({ ...current, image: imageUrl }));
      toast.success("Foto atualizada!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar foto.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), phone: form.phone.replace(/\D/g, "") }),
      });
      if (!res.ok) throw new Error("Não foi possível atualizar o perfil.");
      const updated = await res.json();
      setProfile((current) => ({
        ...current,
        name: updated.name ?? current.name,
        phone: updated.phone ?? null,
      }));
      setEditing(false);
      toast.success("Perfil atualizado.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    await supabaseAuth.auth.signOut();
    await signOut({ callbackUrl: "/" });
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4 pb-10">

      {/* Photo + name header */}
      <motion.section variants={item} className="rounded-[8px] border border-white/10 bg-[#0d0d0f] p-5">
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[8px] border border-[#d4a843]/35 bg-[#d4a843]/12">
            {profile.image ? (
              <img src={profile.image} alt={profile.name ?? "Avatar"} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-2xl font-black text-[#f5d78c]">
                {initials(profile.name)}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              aria-label="Alterar foto"
              className="absolute bottom-1.5 right-1.5 grid h-7 w-7 place-items-center rounded-full border border-[#d4a843]/30 bg-[#0a0a0b] text-[#d4a843] transition hover:border-[#d4a843]/55 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoUpload} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-1.5">
              <Crown className="h-3.5 w-3.5 text-[#d4a843]" />
              <span className="text-xs font-black text-[#f5d78c]">{data.vip.label}</span>
            </div>
            <h1 className="text-xl font-black text-white truncate">{profile.name ?? "Perfil Elite"}</h1>
            <p className="mt-0.5 text-xs text-white/40 truncate">{profile.email}</p>
            {profile.emailVerified && (
              <p className="mt-1 flex items-center gap-1 text-xs text-emerald-400">
                <BadgeCheck className="h-3.5 w-3.5" />
                Email verificado
              </p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-xs text-white/38">Perfil completo</p>
            <p className="text-xs font-black text-[#f5d78c]">{completion}%</p>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completion}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="h-full rounded-full bg-[linear-gradient(90deg,#cc1f2f,#d4a843,#f5d78c)]"
            />
          </div>
        </div>
      </motion.section>

      {/* Dados pessoais */}
      <motion.section variants={item} className="rounded-[8px] border border-white/10 bg-[#0d0d0f] p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-black text-white">Dados pessoais</p>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-black text-[#d4a843]"
          >
            {editing ? <><X className="h-3.5 w-3.5" /> Cancelar</> : "Editar"}
          </button>
        </div>

        {editing ? (
          <form onSubmit={saveProfile} className="space-y-3">
            <label className="block">
              <span className="text-xs text-white/45">Nome</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 h-11 w-full rounded-[8px] border border-white/10 bg-black/30 px-3 text-sm text-white outline-none transition focus:border-[#d4a843]/45"
                placeholder="Seu nome completo"
                required
              />
            </label>
            <label className="block">
              <span className="text-xs text-white/45">Telefone</span>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-1 h-11 w-full rounded-[8px] border border-white/10 bg-black/30 px-3 text-sm text-white outline-none transition focus:border-[#d4a843]/45"
                placeholder="(11) 99999-9999"
                inputMode="tel"
              />
            </label>
            <p className="text-[11px] text-white/28">Para alterar a foto, toque no ícone da câmera acima.</p>
            <button
              type="submit"
              disabled={saving}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-[#d4a843] text-sm font-black text-[#100d09] transition hover:bg-[#f5d78c] disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </form>
        ) : (
          <div>
            <Row icon={<UserRound className="h-4 w-4" />} label="Nome" value={profile.name ?? "–"} />
            <Row icon={<Mail className="h-4 w-4" />} label="Email" value={profile.email ?? "–"} />
            <Row icon={<Phone className="h-4 w-4" />} label="Telefone" value={profile.phone ?? "Não informado"} />
            <Row icon={<MapPin className="h-4 w-4" />} label="Cidade" value={data.city ?? "Definir pela próxima busca"} />
          </div>
        )}
      </motion.section>

      {/* Segurança e privacidade */}
      <motion.section variants={item} className="rounded-[8px] border border-white/10 bg-[#0d0d0f] p-5">
        <p className="mb-4 font-black text-white">Segurança e privacidade</p>
        <div>
          <Row
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Verificação"
            value={profile.verified ? "Conta verificada" : "Verificação pendente"}
          />
          <Row
            icon={<KeyRound className="h-4 w-4" />}
            label="Acesso"
            value={profile.emailVerified ? "Google ou email confirmado" : "Confirmação recomendada"}
          />
          <Row
            icon={<BadgeCheck className="h-4 w-4" />}
            label="Privacidade"
            value="Navegação discreta ativa"
          />
        </div>
        <Link href="/privacy" className="mt-3 block text-xs text-[#d4a843]">
          Ver Política de Privacidade →
        </Link>
      </motion.section>

      {/* Primeiros passos */}
      {!allDone && (
        <motion.section variants={item} className="rounded-[8px] border border-white/10 bg-[#0d0d0f] p-5">
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#d4a843]">
            Primeiros passos
          </p>
          <div className="space-y-2">
            {data.onboarding.map((step) => (
              <div
                key={step.label}
                className={`flex items-start gap-3 rounded-[8px] p-3 ${step.done ? "bg-[#d4a843]/05" : "bg-[#0a0a0c]"}`}
              >
                <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${step.done ? "border-[#d4a843]/40 bg-[#d4a843]/15 text-[#f5d78c]" : "border-white/12 text-white/25"}`}>
                  {step.done ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                </span>
                <div>
                  <p className={`text-sm font-black ${step.done ? "text-white/40 line-through" : "text-white"}`}>{step.label}</p>
                  {!step.done && <p className="mt-0.5 text-xs text-white/32">{step.detail}</p>}
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Status da conta */}
      <motion.section variants={item} className="rounded-[8px] border border-[#d4a843]/15 bg-[linear-gradient(135deg,rgba(212,168,67,0.07),rgba(255,255,255,0.01))] p-5">
        <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#d4a843]">
          Status da conta
        </p>
        <div className="space-y-2">
          {[
            { label: data.vip.label, icon: <Crown className="h-4 w-4" />, active: true },
            { label: profile.emailVerified ? "Email verificado" : "Email não confirmado", icon: <ShieldCheck className="h-4 w-4" />, active: Boolean(profile.emailVerified) },
            { label: profile.image ? "Foto adicionada" : "Sem foto", icon: <Camera className="h-4 w-4" />, active: Boolean(profile.image) },
            { label: data.metrics.favoriteProfiles > 0 ? "Favoritos salvos" : "Nenhum favorito", icon: <BadgeCheck className="h-4 w-4" />, active: data.metrics.favoriteProfiles > 0 },
          ].map((badge) => (
            <div
              key={badge.label}
              className={`flex items-center gap-3 rounded-[8px] border p-3 ${badge.active ? "border-[#d4a843]/22 bg-[#d4a843]/08 text-[#f5d78c]" : "border-white/6 bg-[#0a0a0c] text-white/30"}`}
            >
              {badge.icon}
              <span className="text-sm font-black">{badge.label}</span>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Atividades recentes */}
      <motion.section variants={item} className="rounded-[8px] border border-white/10 bg-[#0d0d0f] p-5">
        <p className="mb-3 font-black text-white">Atividades recentes</p>
        {data.recentHistory.length > 0 ? (
          <div className="space-y-2">
            {data.recentHistory.map((entry) => (
              <div key={`${entry.type}-${entry.id}`} className="flex gap-3 rounded-[8px] bg-[#0a0a0c] p-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] border border-[#d4a843]/18 bg-[#d4a843]/08 text-[#f5d78c]">
                  <BadgeCheck className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="truncate text-sm font-black text-white">{entry.title}</p>
                    <span className="text-xs text-white/30">{dateLabel(entry.date)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-white/38">{entry.detail}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/30">Favoritos, contatos e agendamentos aparecem aqui.</p>
        )}
      </motion.section>

      {/* Sair da conta */}
      <motion.section variants={item}>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[8px] border border-white/10 bg-[#0d0d0f] text-sm font-black text-white/50 transition hover:border-[#cc1f2f]/35 hover:text-[#ff9aa4] disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          {signingOut ? "Saindo..." : "Sair da conta"}
        </button>
      </motion.section>

    </motion.div>
  );
}

"use client";

/* eslint-disable @next/next/no-img-element -- Avatar can come from remote OAuth/Supabase URLs. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Crown, Menu, Search, ShieldCheck, WalletCards } from "lucide-react";
import { StatusBadge } from "@/components/professional-dashboard/StatusBadge";

type HeaderProfile = {
  name: string;
  email: string;
  image: string | null;
  city: string | null;
  state: string | null;
  status: string;
  planLabel: string;
};

type MeResponse = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  premiumUntil?: string | null;
  professional?: {
    displayName?: string | null;
    image?: string | null;
    city?: string | null;
    state?: string | null;
    status?: string | null;
  } | null;
};

function planLabel(premiumUntil?: string | null) {
  if (!premiumUntil) return "Anunciante";
  const expiresAt = new Date(premiumUntil);
  return expiresAt > new Date() ? "Premium" : "Anunciante";
}

export function ProfessionalTopHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const [profile, setProfile] = useState<HeaderProfile | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function loadProfile() {
      try {
        const res = await fetch("/api/users/me", { signal: controller.signal });
        if (!res.ok) return;
        const data = (await res.json()) as MeResponse | null;
        if (!data) return;
        const professional = data.professional;
        setProfile({
          name: professional?.displayName ?? data.name ?? "Profissional Elite",
          email: data.email ?? "Conta profissional",
          image: professional?.image ?? data.image ?? null,
          city: professional?.city ?? null,
          state: professional?.state ?? null,
          status: professional?.status ?? "PENDING_REVIEW",
          planLabel: planLabel(data.premiumUntil),
        });
      } catch {
        if (!controller.signal.aborted) setProfile(null);
      }
    }
    void loadProfile();
    return () => controller.abort();
  }, []);

  const location = profile?.city && profile.state ? `${profile.city}, ${profile.state}` : profile?.email ?? "Conta profissional";

  return (
    <header className="professional-header sticky top-0 z-30 border-b border-[#d4a843]/25 bg-[#050506]/94 px-3 pb-3 pt-[max(10px,env(safe-area-inset-top))] shadow-[0_18px_50px_rgba(0,0,0,0.34)] backdrop-blur-2xl sm:px-6 md:px-8">
      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-3">
        <div className="grid h-12 grid-cols-[44px_minmax(0,1fr)_92px] items-center gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
          <button
            onClick={onMenuClick}
            className="grid h-11 w-11 place-items-center rounded-[8px] border border-[#d4a843]/24 bg-white/[0.045] text-[#f5d78c] md:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/profissional" className="flex min-w-0 items-center justify-center gap-2 no-underline md:justify-start">
            <span className="hidden h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-[8px] bg-black md:grid">
              <img src="/brand/elite-modell-source.png" alt="Elite Modell" className="h-full w-full object-contain" />
            </span>
            <span className="min-w-0 truncate text-[21px] font-black leading-none">
              <span className="bg-[linear-gradient(135deg,#ffe5a0,#d4a843_32%,#f5d78c_62%,#9e7b2a)] bg-clip-text text-transparent">elite</span>
              <span className="text-white">modell</span>
            </span>
          </Link>

          <div className="flex justify-end gap-2">
            <Link
              href="/profissional/planos"
              className="grid h-11 w-11 place-items-center rounded-[8px] border border-[#d4a843]/24 bg-[#d4a843]/10 text-[#f5d78c] no-underline"
              aria-label="Planos e financeiro"
            >
              <WalletCards className="h-5 w-5" />
            </Link>
            <div className="relative">
              <button
                onClick={() => setNotifOpen((value) => !value)}
                className="relative grid h-11 w-11 place-items-center rounded-[8px] border border-[#d4a843]/24 bg-white/[0.045] text-white/76"
                aria-label="Notificações"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#d4a843]" />
              </button>
              {notifOpen ? (
                <div className="absolute right-0 top-12 z-50 w-[280px] rounded-[8px] border border-[#d4a843]/18 bg-[#0b0b0d] p-3 shadow-[0_22px_70px_rgba(0,0,0,0.62)]">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#d4a843]">Notificações</p>
                  <div className="mt-3 rounded-[8px] border border-white/10 bg-white/[0.035] p-3">
                    <p className="text-sm font-black text-white">Painel atualizado</p>
                    <p className="mt-1 text-xs leading-5 text-white/48">Alertas de plano, verificação e desempenho aparecem aqui.</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_360px] md:items-center">
          <div className="flex min-w-0 items-center gap-3 rounded-[8px] border border-white/10 bg-white/[0.04] p-2">
            <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[8px] border border-[#d4a843]/25 bg-[#d4a843]/10">
              {profile?.image ? <img src={profile.image} alt={profile.name} className="h-full w-full object-cover" /> : <ShieldCheck className="h-5 w-5 text-[#f5d78c]" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-white">{profile ? `Olá, ${profile.name}` : "Olá, profissional Elite"}</p>
              <p className="truncate text-xs text-white/44">{location}</p>
            </div>
            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              <span className="inline-flex items-center gap-1 rounded-full border border-[#d4a843]/22 bg-[#d4a843]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#f5d78c]">
                <Crown className="h-3.5 w-3.5" />
                {profile?.planLabel ?? "Anunciante"}
              </span>
              <StatusBadge status={profile?.status ?? "PENDING_REVIEW"} />
            </div>
          </div>

          <Link
            href="/profissionais"
            className="hidden h-12 items-center gap-3 rounded-[8px] border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-white/48 no-underline transition hover:border-[#d4a843]/25 hover:text-[#f5d78c] lg:flex"
          >
            <Search className="h-4 w-4 text-[#d4a843]" />
            Ver minha listagem pública
          </Link>
        </div>
      </div>
    </header>
  );
}

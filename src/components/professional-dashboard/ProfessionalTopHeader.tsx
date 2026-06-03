"use client";

/* eslint-disable @next/next/no-img-element -- Avatar can come from remote OAuth/Supabase URLs. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Camera, ChevronRight, Mail, MapPin, Menu, UserRound } from "lucide-react";

type HeaderProfile = {
  name: string;
  email: string;
  image: string | null;
  city: string | null;
  state: string | null;
};

type MeResponse = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  professional?: {
    displayName?: string | null;
    image?: string | null;
    city?: string | null;
    state?: string | null;
  } | null;
};

export function ProfessionalTopHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const [profile, setProfile] = useState<HeaderProfile | null>(null);
  const pathname = usePathname() ?? "";
  const inProfessionalArea = pathname.startsWith("/profissional");
  const messagesHref = inProfessionalArea ? "/profissional/mensagens" : "/dashboard/mensagens";
  const notificationsHref = inProfessionalArea ? "/profissional/notificacoes" : "/notifications";

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
    <header className="sticky top-0 z-30 bg-[#050505]/82 px-4 pb-4 pt-[max(18px,env(safe-area-inset-top))] backdrop-blur-2xl sm:px-6 md:px-8">
      <div className="mx-auto flex w-full max-w-[960px] flex-col gap-5">
        <div className="grid h-[64px] grid-cols-[58px_minmax(0,1fr)_116px] items-center gap-3">
          <button
            onClick={onMenuClick}
            className="grid h-14 w-14 place-items-center rounded-[18px] border border-[#D6A83A]/38 bg-white/[0.035] text-[#F5D46B] shadow-[0_12px_34px_rgba(0,0,0,0.34)]"
            aria-label="Abrir menu"
          >
            <Menu className="h-7 w-7" />
          </button>

          <Link href="/profissional" className="relative flex min-w-0 items-center justify-center no-underline" aria-label="Elite Modell">
            <span className="absolute -top-4 text-[16px] leading-none text-[#F5D46B]">♛</span>
            <span className="truncate text-[28px] font-black leading-none sm:text-[34px]">
              <span className="bg-[linear-gradient(135deg,#ffe5a0,#D6A83A_34%,#F5D46B_64%,#8A671F)] bg-clip-text text-transparent">elite</span>
              <span className="text-white">modell</span>
            </span>
          </Link>

          <div className="flex justify-end gap-3">
            <Link
              href={messagesHref}
              className="grid h-14 w-14 place-items-center rounded-[18px] border border-[#D6A83A]/38 bg-white/[0.035] text-[#F5D46B] no-underline shadow-[0_12px_34px_rgba(0,0,0,0.34)]"
              aria-label="Mensagens"
            >
              <Mail className="h-6 w-6" />
            </Link>
            <Link
              href={notificationsHref}
              className="relative grid h-14 w-14 place-items-center rounded-[18px] border border-[#D6A83A]/38 bg-white/[0.035] text-[#F5D46B] no-underline shadow-[0_12px_34px_rgba(0,0,0,0.34)]"
              aria-label="Notificações"
            >
              <Bell className="h-6 w-6" />
            </Link>
          </div>
        </div>

        <Link href="/profissional/perfil" className="premium-profile-row">
          <span className="premium-avatar">
            {profile?.image ? <img src={profile.image} alt={profile.name} /> : <UserRound size={42} color="#F5D46B" />}
            <span className="premium-avatar-camera">
              <Camera size={16} />
            </span>
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[28px] font-black text-white sm:text-[34px]">
              Olá, {profile?.name ?? "Profissional Elite"}
            </span>
            <span className="mt-2 flex min-w-0 items-center gap-2 text-[16px] text-[#B8B8B8]">
              <MapPin className="h-5 w-5 shrink-0 text-white/82" />
              <span className="truncate">{location}</span>
            </span>
          </span>
          <ChevronRight className="h-7 w-7 text-white/52" />
        </Link>
      </div>
    </header>
  );
}

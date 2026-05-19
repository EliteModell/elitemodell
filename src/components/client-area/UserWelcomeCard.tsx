/* eslint-disable @next/next/no-img-element -- User avatars can be remote or uploaded URLs. */

"use client";
import Link from "next/link";
import { ChevronRight, EyeOff, MapPin, ShieldCheck, UserRound } from "lucide-react";

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

export default function UserWelcomeCard({
  name,
  image,
  city,
  credits,
}: {
  name: string | null;
  image: string | null;
  city: string | null;
  credits: number;
}) {
  return (
    <section className="client-page-header">
      <div className="client-panel relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-[#d4a843]/16 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-5 h-36 w-36 rounded-full bg-[#8f1d24]/18 blur-3xl" />

        <div className="relative flex items-center gap-4">
          <div className="relative h-[68px] w-[68px] shrink-0">
            <div className="h-full w-full overflow-hidden rounded-full border-[2.5px] border-[#d4a843]/60 bg-[#1b1d1f] shadow-[0_0_36px_rgba(212,168,67,0.16)]">
              {image ? (
                <img src={image} alt={name ?? "Avatar"} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-[18px] font-black text-[#f5d78c]">
                  {initials(name)}
                </div>
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 grid h-[22px] w-[22px] place-items-center rounded-full border-2 border-white bg-[#4d9b56] text-white">
              <ShieldCheck className="h-3 w-3" />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="client-kicker">Área cliente</p>
            <h1 className="mt-1 truncate text-[24px] font-black leading-7 text-[#f5f0e4]">{firstName(name)}</h1>
            <Link href="/dashboard/acompanhantes" className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#f5f0e4]/62 no-underline">
              <MapPin className="h-3.5 w-3.5" />
              {city ? "Editar cidade" : "Definir cidade"}
            </Link>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-2 gap-3">
          <Link
            href="/dashboard/acompanhantes"
            className="client-primary-button flex items-center justify-center gap-2 text-[14px] no-underline"
          >
            Explorar
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            href="/dashboard/perfil"
            className="client-secondary-button flex items-center justify-center gap-2 text-[14px] no-underline"
          >
            <UserRound className="h-4 w-4" />
            Perfil
          </Link>
        </div>

        <Link
          href="/dashboard/carteira"
          className="client-panel-soft relative mt-3 flex min-h-[58px] items-center px-4 no-underline transition-colors active:bg-white/10"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-[#f5f0e4]/50">Carteira discreta</p>
            <p className="mt-0.5 text-[18px] font-bold text-[#f5f0e4]">
              {credits > 0
                ? credits.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                : "R$ ••••••••"}
            </p>
          </div>
          <EyeOff className="h-5 w-5 text-[#f5f0e4]/40" />
          <ChevronRight className="ml-3 h-5 w-5 text-[#f5d78c]" />
        </Link>
      </div>
    </section>
  );
}

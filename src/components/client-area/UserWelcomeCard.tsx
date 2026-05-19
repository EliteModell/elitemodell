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
    <section className="bg-[#f0f3f5] px-4 pt-5 pb-1">
      <div className="rounded-[14px] bg-white p-5 shadow-[0_2px_16px_rgba(20,31,36,0.08)]">
        {/* User row */}
        <div className="flex items-center gap-4">
          <div className="relative h-[68px] w-[68px] shrink-0">
            <div className="h-full w-full overflow-hidden rounded-full border-[2.5px] border-[#c9a84c]/55 bg-[#d9e0e3]">
              {image ? (
                <img src={image} alt={name ?? "Avatar"} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-[18px] font-black text-[#8b6b25]">
                  {initials(name)}
                </div>
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 grid h-[22px] w-[22px] place-items-center rounded-full border-2 border-white bg-[#4d9b56] text-white">
              <ShieldCheck className="h-3 w-3" />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-[#6a7a81]">Boas-vindas,</p>
            <h1 className="truncate text-[20px] font-bold leading-6 text-[#1f2a30]">{firstName(name)}</h1>
            <Link href="/buscar" className="mt-1 inline-flex items-center gap-1 text-[13px] font-medium text-[#4a5a61] no-underline">
              <MapPin className="h-3.5 w-3.5" />
              {city ? "Editar cidade" : "Definir cidade"}
            </Link>
          </div>
        </div>

        {/* Ver perfil */}
        <Link
          href="/dashboard/perfil"
          className="mt-5 flex h-[50px] items-center justify-center gap-2 rounded-[10px] border border-[#d0d7da] bg-white text-[15px] font-semibold text-[#1f2a30] no-underline transition-colors active:bg-[#f5f8f9]"
        >
          <UserRound className="h-5 w-5" />
          Ver perfil
        </Link>

        {/* Balance */}
        <Link
          href="/dashboard/carteira"
          className="mt-3 flex min-h-[56px] items-center rounded-[10px] border border-[#d0d7da] bg-white px-4 no-underline transition-colors active:bg-[#f5f8f9]"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-[#6a7a81]">Seu saldo</p>
            <p className="mt-0.5 text-[18px] font-bold text-[#1f2a30]">
              {credits > 0
                ? credits.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                : "R$ ••••••••"}
            </p>
          </div>
          <EyeOff className="h-5 w-5 text-[#7a8a91]" />
          <ChevronRight className="ml-3 h-5 w-5 text-[#4a5a61]" />
        </Link>
      </div>
    </section>
  );
}

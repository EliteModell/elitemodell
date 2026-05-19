/* eslint-disable @next/next/no-img-element -- User avatars can be remote or uploaded URLs. */

import Link from "next/link";
import { ChevronRight, EyeOff, MapPin, UserRound } from "lucide-react";

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
    <section className="bg-[#e7edf0] px-5 py-8">
      <div className="rounded-[8px] bg-white p-5 shadow-[0_1px_0_rgba(20,31,36,0.05)]">
        <div className="flex items-center gap-4">
          <div className="relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-full bg-[#d9e0e3]">
            {image ? (
              <img src={image} alt={name ?? "Avatar"} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-xl font-black text-[#8b6b25]">{initials(name)}</div>
            )}
            <span className="absolute bottom-1 right-1 grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-[#d5dee1] text-[#88a0a8]">
              <UserRound className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[17px] leading-5 text-[#5b686f]">Boas-vindas,</p>
            <h1 className="truncate text-[22px] font-black leading-7 text-[#1f2a30]">{firstName(name)}</h1>
            <Link href="/buscar" className="mt-1 inline-flex items-center gap-1.5 text-[16px] font-bold text-[#34434a] no-underline">
              <MapPin className="h-4 w-4" />
              {city ? "Editar cidade" : "Definir cidade"}
            </Link>
          </div>
        </div>

        <Link
          href="/dashboard/perfil"
          className="mt-6 flex h-[58px] items-center justify-center gap-3 rounded-[8px] border border-[#cbd2d4] bg-white text-[20px] font-black text-[#1f2a30] no-underline"
        >
          <UserRound className="h-7 w-7" />
          Ver perfil
        </Link>

        <div className="mt-3 flex min-h-[68px] items-center rounded-[8px] border border-[#cbd2d4] bg-white px-5">
          <div className="min-w-0 flex-1">
            <p className="text-[17px] text-[#59656b]">Seu saldo</p>
            <p className="mt-1 text-[23px] font-black text-[#11191d]">
              {credits > 0 ? credits.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ ********"}
            </p>
          </div>
          <EyeOff className="h-7 w-7 text-[#1f2a30]" />
          <ChevronRight className="ml-7 h-8 w-8 text-[#11191d]" />
        </div>
      </div>
    </section>
  );
}

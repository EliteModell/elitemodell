/* eslint-disable @next/next/no-img-element -- User avatars can be remote or uploaded URLs. */

"use client";
import Link from "next/link";
import { MapPin, ShieldCheck, UserRound } from "lucide-react";

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
}: {
  name: string | null;
  image: string | null;
  city: string | null;
}) {
  return (
    <section className="client-page-header">
      <div className="client-panel p-4">
        <div className="flex items-center gap-3">
          <div className="relative h-[54px] w-[54px] shrink-0">
            <div className="h-full w-full overflow-hidden rounded-full border-2 border-[#d4a843]/48 bg-[#1b1d1f]">
              {image ? (
                <img src={image} alt={name ?? "Avatar"} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-[15px] font-black text-[#f5d78c]">
                  {initials(name)}
                </div>
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 grid h-[19px] w-[19px] place-items-center rounded-full border-2 border-[#101214] bg-[#4d9b56] text-white">
              <ShieldCheck className="h-3 w-3" />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="client-kicker">Area cliente</p>
            <h1 className="mt-0.5 truncate text-[21px] font-black leading-6 text-[#f5f0e4]">
              {firstName(name)}
            </h1>
            <Link
              href="/dashboard/acompanhantes"
              className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#f5f0e4]/58 no-underline"
            >
              <MapPin className="h-3.5 w-3.5" />
              {city ? "Editar cidade" : "Definir cidade"}
            </Link>
          </div>

          <Link
            href="/dashboard/perfil"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] border border-white/10 bg-white/[0.045] text-[#f5f0e4]/70"
            aria-label="Abrir perfil"
          >
            <UserRound className="h-4.5 w-4.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

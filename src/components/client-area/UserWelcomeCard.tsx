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
    <section
      style={{
        background: "linear-gradient(145deg, #1c1e22 0%, #111214 55%, #0c0d0f 100%)",
        padding: "22px 18px 24px",
        borderBottom: "1px solid rgba(212, 168, 67, 0.14)",
      }}
    >
      <div className="flex items-center gap-3.5">
        <div className="relative h-[56px] w-[56px] shrink-0">
          <div className="h-full w-full overflow-hidden rounded-full border-2 border-[#d4a843]/52 bg-[#1b1d1f] shadow-[0_0_28px_rgba(212,168,67,0.14)]">
            {image ? (
              <img src={image} alt={name ?? "Avatar"} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-[16px] font-black text-[#d4a843]">
                {initials(name)}
              </div>
            )}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 grid h-[20px] w-[20px] place-items-center rounded-full border-2 border-[#0c0d0f] bg-[#4d9b56] text-white">
            <ShieldCheck className="h-3 w-3" />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p
            style={{ color: "#d4a843", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}
          >
            Area cliente
          </p>
          <h1 style={{ color: "#f5f0e4", fontSize: 22, fontWeight: 900, lineHeight: 1.15, marginTop: 2 }}>
            {firstName(name)}
          </h1>
          <Link
            href="/dashboard/acompanhantes"
            className="mt-1.5 inline-flex items-center gap-1.5 no-underline"
            style={{ color: "rgba(245,240,228,0.45)", fontSize: 12, fontWeight: 600 }}
          >
            <MapPin className="h-3.5 w-3.5" />
            {city ? "Editar cidade" : "Definir cidade"}
          </Link>
        </div>

        <Link
          href="/dashboard/perfil"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px]"
          style={{
            border: "1px solid rgba(212,168,67,0.22)",
            background: "rgba(212,168,67,0.10)",
            color: "rgba(245,240,228,0.72)",
          }}
          aria-label="Abrir perfil"
        >
          <UserRound className="h-[18px] w-[18px]" />
        </Link>
      </div>
    </section>
  );
}

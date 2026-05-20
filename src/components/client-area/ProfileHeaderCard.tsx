"use client";

/* eslint-disable @next/next/no-img-element -- User profile photos can be remote or uploaded URLs. */

import { Camera, Loader2, Pencil, ShieldCheck } from "lucide-react";

function initials(name?: string | null) {
  if (!name) return "EM";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function ProfileHeaderCard({
  name,
  email,
  image,
  verified,
  uploading,
  onChoosePhoto,
  onEdit,
}: {
  name: string | null;
  email: string | null;
  image: string | null;
  verified: boolean;
  uploading: boolean;
  onChoosePhoto: () => void;
  onEdit: () => void;
}) {
  return (
    <section className="client-page-header">
      <div className="client-panel relative overflow-hidden p-7 text-center">
        <div className="pointer-events-none absolute inset-x-10 top-0 h-40 bg-[#d4a843]/10 blur-3xl" />
        <div className="relative mx-auto h-[138px] w-[138px] overflow-hidden rounded-full border-4 border-[#d4a843]/30 bg-[#1b1d1f] shadow-[0_0_46px_rgba(212,168,67,0.16)]">
          {image ? (
            <img src={image} alt={name ?? "Avatar"} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-3xl font-black text-[#f5d78c]">{initials(name)}</div>
          )}
        </div>
        <h1 className="relative mt-6 text-[32px] font-black text-[#f5f0e4]">{name ?? "Cliente Elite"}</h1>
        <p className="relative mt-2 break-words text-[15px] text-[#f5f0e4]/56">{email ?? "Conta discreta"}</p>
        <p className="relative mx-auto mt-3 inline-flex items-center gap-2 rounded-full border border-[#4d9b56]/30 bg-[#4d9b56]/12 px-4 py-2 text-sm font-black text-[#7ed58a]">
          <ShieldCheck className="h-4 w-4" />
          {verified ? "Conta verificada" : "Verificação em andamento"}
        </p>

        <div className="mt-8 grid gap-4">
          <button
            type="button"
            onClick={onChoosePhoto}
            disabled={uploading}
            className="client-secondary-button flex min-h-[54px] items-center justify-center gap-3 text-[16px] disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
            {uploading ? "Enviando foto..." : "Trocar foto"}
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="client-primary-button flex min-h-[54px] items-center justify-center gap-3 text-[16px]"
          >
            <Pencil className="h-5 w-5" />
            Editar dados
          </button>
        </div>
      </div>
    </section>
  );
}

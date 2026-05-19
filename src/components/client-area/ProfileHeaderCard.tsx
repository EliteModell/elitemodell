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
    <section className="bg-[#e7edf0] px-5 py-8">
      <div className="rounded-[8px] bg-white p-6 text-center shadow-[0_1px_0_rgba(20,31,36,0.05)]">
        <div className="mx-auto h-[126px] w-[126px] overflow-hidden rounded-full border-4 border-white bg-[#d9e0e3] shadow-[0_8px_26px_rgba(28,38,43,0.12)]">
          {image ? (
            <img src={image} alt={name ?? "Avatar"} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-3xl font-black text-[#8b6b25]">{initials(name)}</div>
          )}
        </div>
        <h1 className="mt-5 text-[28px] font-black text-[#202a30]">{name ?? "Cliente Elite"}</h1>
        <p className="mt-1 break-words text-[16px] text-[#64727a]">{email ?? "Conta discreta"}</p>
        <p className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full bg-[#eef7ef] px-4 py-2 text-sm font-black text-[#3e8d4a]">
          <ShieldCheck className="h-4 w-4" />
          {verified ? "Conta verificada" : "Verificação em andamento"}
        </p>

        <div className="mt-7 grid gap-3">
          <button
            type="button"
            onClick={onChoosePhoto}
            disabled={uploading}
            className="flex h-[56px] items-center justify-center gap-3 rounded-[8px] border border-[#202a30] bg-white text-[17px] font-black text-[#202a30] disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
            {uploading ? "Enviando foto..." : "Trocar foto"}
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="flex h-[56px] items-center justify-center gap-3 rounded-[8px] border-0 bg-[#c9a84c] text-[17px] font-black text-[#11191d]"
          >
            <Pencil className="h-5 w-5" />
            Editar dados
          </button>
        </div>
      </div>
    </section>
  );
}

"use client";
import Link from "next/link";
import { CirclePlus, UserRound } from "lucide-react";

export default function HistorySection() {
  return (
    <section className="client-page-tight">
      <div className="mb-5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d4a843]/24 bg-[#d4a843]/12 px-3 py-1 text-[12px] font-semibold text-[#f5d78c]">
          exclusivo premium
        </span>
      </div>

      <h2 className="text-[24px] font-black text-[#f5f0e4]">Historico de perfis</h2>

      <div className="client-empty mt-6 px-6 py-11 text-center">
        <div className="mx-auto grid h-[62px] w-[62px] place-items-center rounded-[8px] border border-white/10 bg-white/[0.045]">
          <UserRound className="h-8 w-8 stroke-[1.5] text-[#f5d78c]" />
        </div>
        <p className="mx-auto mt-6 max-w-[300px] text-[15px] leading-7 text-[#f5f0e4]/62">
          Voce ainda nao possui nenhum perfil acessado no seu historico.
        </p>
        <Link
          href="/dashboard/acompanhantes"
          className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-bold text-[#f5d78c] underline underline-offset-2"
        >
          <CirclePlus className="h-4 w-4" />
          Encontre acompanhantes
        </Link>
      </div>
    </section>
  );
}

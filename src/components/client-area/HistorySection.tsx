"use client";
import Link from "next/link";
import { CirclePlus, UserRound } from "lucide-react";

export default function HistorySection() {
  return (
    <section className="client-page-tight client-dashboard-section">
      <div className="mb-5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d4a843]/24 bg-[#d4a843]/12 px-3 py-1 text-[12px] font-semibold text-[#f5d78c]">
          exclusivo premium
        </span>
      </div>

      <h2 className="text-[30px] font-black leading-8 text-[#f5f0e4]">Histórico de perfis</h2>

      <div className="client-empty mt-6 px-6 py-12 text-center">
        <div className="client-dashboard-history-art mx-auto grid h-[70px] w-[70px] place-items-center rounded-[8px] border border-white/10 bg-white/[0.045]">
          <UserRound className="h-9 w-9 stroke-[1.5] text-[#f5d78c]" />
        </div>
        <p className="mx-auto mt-6 max-w-[320px] text-[17px] leading-8 text-[#f5f0e4]/62">
          Voce ainda nao possui nenhum perfil acessado no seu historico.
        </p>
        <Link
          href="/dashboard/acompanhantes"
          className="mt-7 inline-flex items-center gap-2 text-[15px] font-black text-[#f5d78c] underline underline-offset-2"
        >
          <CirclePlus className="h-4 w-4" />
          Encontre acompanhantes
        </Link>
      </div>
    </section>
  );
}

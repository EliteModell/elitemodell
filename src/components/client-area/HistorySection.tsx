"use client";
import Link from "next/link";
import { CirclePlus, UserRound } from "lucide-react";

export default function HistorySection() {
  return (
    <section className="client-page-tight">
      <div className="mb-4">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d4a843]/24 bg-[#d4a843]/12 px-3 py-1 text-[12px] font-semibold text-[#f5d78c]">
          ✦ exclusivo premium
        </span>
      </div>

      <h2 className="text-[20px] font-bold text-[#f5f0e4]">Histórico de perfis</h2>

      <div className="client-empty mt-5 px-5 py-9 text-center">
        <div className="mx-auto grid h-[62px] w-[62px] place-items-center rounded-[8px] border border-white/10 bg-white/[0.045]">
          <UserRound className="h-8 w-8 stroke-[1.5] text-[#f5d78c]" />
        </div>
        <p className="mx-auto mt-5 max-w-[280px] text-[14px] leading-6 text-[#f5f0e4]/62">
          Você ainda não possui nenhum perfil acessado no seu histórico.
        </p>
        <Link
          href="/dashboard/acompanhantes"
          className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#f5d78c] underline underline-offset-2"
        >
          <CirclePlus className="h-4 w-4" />
          Encontre acompanhantes
        </Link>
      </div>
    </section>
  );
}

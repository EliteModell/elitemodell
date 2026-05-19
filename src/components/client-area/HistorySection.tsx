"use client";
import Link from "next/link";
import { CirclePlus, UserRound } from "lucide-react";

export default function HistorySection() {
  return (
    <section className="bg-[#f0f3f5] px-4 py-8">
      <div className="mb-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fef3d6] px-3 py-1 text-[12px] font-semibold text-[#a9822d]">
          ✦ exclusivo premium
        </span>
      </div>

      <h2 className="text-[18px] font-bold text-[#1f2a30]">Histórico de perfis</h2>

      <div className="py-10 text-center">
        <div className="mx-auto grid h-[62px] w-[62px] place-items-center rounded-full bg-[#e4eaec]">
          <UserRound className="h-8 w-8 stroke-[1.5] text-[#8fa0a8]" />
        </div>
        <p className="mx-auto mt-5 max-w-[260px] text-[14px] leading-6 text-[#566570]">
          Você ainda não possui nenhum perfil acessado no seu histórico.
        </p>
        <Link
          href="/profissionais"
          className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#566570] underline underline-offset-2"
        >
          <CirclePlus className="h-4 w-4" />
          Encontre acompanhantes
        </Link>
      </div>
    </section>
  );
}

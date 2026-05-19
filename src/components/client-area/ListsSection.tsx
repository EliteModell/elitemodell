"use client";
import Link from "next/link";
import { UserRound } from "lucide-react";

function ListCard({ title }: { title: string }) {
  return (
    <article className="overflow-hidden rounded-[12px] border border-[#e4eaec] bg-white shadow-[0_2px_8px_rgba(22,32,38,0.06)]">
      <div className="grid aspect-square grid-cols-2">
        <div className="bg-[#c8cdd0]" />
        <div className="bg-[#d5d9db]" />
        <div className="bg-[#d5d9db]" />
        <div className="grid place-items-center bg-[#b8bdc0] text-[22px] font-black tracking-[0.14em] text-white">
          ···
        </div>
      </div>
      <div className="p-3.5">
        <h3 className="min-h-[40px] text-[13px] font-semibold leading-5 text-[#1f2a30]">{title}</h3>
        <p className="mt-1.5 text-[12px] text-[#6a7a81]">Automática</p>
        <p className="mt-1 flex items-center gap-1 text-[12px] text-[#6a7a81]">
          <UserRound className="h-3.5 w-3.5" />
          0 perfil
        </p>
      </div>
    </article>
  );
}

export default function ListsSection() {
  return (
    <section className="bg-white px-4 py-8">
      <h2 className="text-[18px] font-bold text-[#1f2a30]">Listas</h2>
      <p className="mt-2 text-[13px] leading-5 text-[#566570]">
        Crie listas para salvar e organizar suas publicações favoritas. Só você terá acesso às listas criadas.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <ListCard title="Perfis de fotos curtidas" />
        <ListCard title="Perfis seguidos" />
      </div>

      <div className="mt-6 space-y-0">
        <button
          type="button"
          className="h-[48px] w-full rounded-[10px] border border-[#1f2a30] bg-white text-[15px] font-semibold text-[#1f2a30] transition-colors active:bg-[#f5f8f9]"
        >
          Criar Lista
        </button>
        <Link
          href="/dashboard/favoritos"
          className="block py-4 text-center text-[15px] font-semibold text-[#1f2a30] no-underline"
        >
          Mostrar todas
        </Link>
      </div>
    </section>
  );
}

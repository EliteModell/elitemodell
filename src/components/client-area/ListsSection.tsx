"use client";
import Link from "next/link";
import { UserRound } from "lucide-react";

function ListCard({ title }: { title: string }) {
  return (
    <article className="overflow-hidden rounded-[10px] border border-[#e0e4e5] bg-white shadow-[0_2px_10px_rgba(22,32,38,0.05)]">
      <div className="grid aspect-square grid-cols-2 bg-[#c6cbcc]">
        <div className="bg-[#9a9d9e]" />
        <div className="bg-[#c8cdce]" />
        <div className="bg-[#c8cdce]" />
        <div className="grid place-items-center bg-[#969a9b] text-3xl font-black tracking-[0.18em] text-white">...</div>
      </div>
      <div className="p-4">
        <h3 className="min-h-[54px] text-[20px] font-black leading-6 text-[#202a30]">{title}</h3>
        <p className="mt-2 text-[15px] text-[#69747a]">Automática</p>
        <p className="mt-3 flex items-center gap-1.5 text-[15px] text-[#69747a]">
          <UserRound className="h-4 w-4" /> 0 perfil
        </p>
      </div>
    </article>
  );
}

export default function ListsSection() {
  return (
    <section className="bg-white px-5 py-12">
      <h2 className="text-[30px] font-black text-[#202a30]">Listas</h2>
      <p className="mt-4 text-[20px] leading-7 text-[#4c5960]">
        Crie listas para salvar e organizar suas publicações favoritas. Só você terá acesso às listas criadas.
      </p>

      <div className="mx-auto mt-11 grid max-w-[520px] grid-cols-2 gap-4">
        <ListCard title="Perfis de fotos curtidas" />
        <ListCard title="Perfis seguidos" />
      </div>

      <div className="mx-auto mt-10 max-w-[520px]">
        <button type="button" className="h-[60px] w-full rounded-[8px] border border-[#11191d] bg-white text-[22px] font-black text-[#202a30]">
          Criar lista
        </button>
        <Link href="/dashboard/favoritos" className="mt-8 block text-center text-[22px] font-black text-[#202a30] no-underline">
          Mostrar todas
        </Link>
      </div>
    </section>
  );
}

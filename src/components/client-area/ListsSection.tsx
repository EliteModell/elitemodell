"use client";
import Link from "next/link";
import { UserRound } from "lucide-react";

function ListCard({ title }: { title: string }) {
  return (
    <article className="client-panel-soft overflow-hidden">
      <div className="grid aspect-square grid-cols-2">
        <div className="bg-[linear-gradient(135deg,#2b2211,#d4a843)] opacity-80" />
        <div className="bg-[linear-gradient(135deg,#191b1d,#3d3430)]" />
        <div className="bg-[linear-gradient(135deg,#18191b,#8f1d24)] opacity-75" />
        <div className="grid place-items-center bg-[#111315] text-[22px] font-black text-[#f5d78c]">
          ···
        </div>
      </div>
      <div className="p-3.5">
        <h3 className="min-h-[40px] text-[13px] font-semibold leading-5 text-[#f5f0e4]">{title}</h3>
        <p className="mt-1.5 text-[12px] text-[#f5f0e4]/46">Automática</p>
        <p className="mt-1 flex items-center gap-1 text-[12px] text-[#f5f0e4]/46">
          <UserRound className="h-3.5 w-3.5" />
          0 perfil
        </p>
      </div>
    </article>
  );
}

export default function ListsSection() {
  return (
    <section className="client-page-tight">
      <div className="mb-4">
        <p className="client-kicker">Coleções privadas</p>
        <h2 className="mt-1 text-[20px] font-bold text-[#f5f0e4]">Listas</h2>
      </div>
      <p className="text-[13px] leading-5 text-[#f5f0e4]/58">
        Crie listas para salvar e organizar suas publicações favoritas. Só você terá acesso às listas criadas.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <ListCard title="Perfis de fotos curtidas" />
        <ListCard title="Perfis seguidos" />
      </div>

      <div className="mt-6 space-y-0">
        <button
          type="button"
          className="client-secondary-button w-full text-[15px]"
        >
          Criar Lista
        </button>
        <Link
          href="/dashboard/favoritos"
          className="block py-4 text-center text-[15px] font-semibold text-[#f5d78c] no-underline"
        >
          Mostrar todas
        </Link>
      </div>
    </section>
  );
}

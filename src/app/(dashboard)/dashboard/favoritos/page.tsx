"use client";

import Link from "next/link";
import { Heart, Plus, UserRound } from "lucide-react";

function EmptyListCard({ title }: { title: string }) {
  return (
    <article className="client-card p-5">
      <div className="grid h-24 w-24 place-items-center rounded-[8px] border border-[#d4a843]/16 bg-white/[0.045] text-[#f5d78c]">
        <Heart className="h-9 w-9" />
      </div>
      <h2 className="mt-5 text-[20px] font-black text-[#f5f0e4]">{title}</h2>
      <p className="mt-2 text-[14px] leading-6 text-[#f5f0e4]/56">0 perfil salvo</p>
    </article>
  );
}

export default function FavoritosPage() {
  return (
    <div className="client-page">
      <p className="client-kicker">Coleções privadas</p>
      <h1 className="client-title mt-1">Listas e favoritos</h1>
      <p className="client-subtitle mt-3">
        Organize perfis salvos em listas privadas. Ninguém além de você tem acesso a essas informações.
      </p>

      <div className="mt-6 grid gap-4">
        <EmptyListCard title="Perfis curtidos" />
        <EmptyListCard title="Perfis seguidos" />
      </div>

      <button type="button" className="client-secondary-button mt-5 flex w-full items-center justify-center gap-3 text-[16px]">
        <Plus className="h-6 w-6" />
        Criar lista
      </button>

      <div className="client-empty mt-6 px-5 py-9 text-center">
        <UserRound className="mx-auto h-14 w-14 text-[#f5d78c]" />
        <p className="mt-6 text-[21px] font-black text-[#f5f0e4]">Você ainda não salvou perfis.</p>
        <p className="mt-3 text-[15px] leading-6 text-[#f5f0e4]/58">Explore acompanhantes e toque em favorito para montar sua lista.</p>
        <Link href="/dashboard/acompanhantes" className="client-primary-button mt-6 flex items-center justify-center text-[16px] no-underline">
          Explorar acompanhantes
        </Link>
      </div>
    </div>
  );
}

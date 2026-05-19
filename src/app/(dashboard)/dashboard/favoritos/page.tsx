"use client";

import Link from "next/link";
import { Heart, Plus, UserRound } from "lucide-react";

function EmptyListCard({ title }: { title: string }) {
  return (
    <article className="rounded-[10px] border border-[#dfe5e7] bg-white p-5 shadow-[0_2px_12px_rgba(20,31,36,0.05)]">
      <div className="grid h-24 w-24 place-items-center rounded-[8px] bg-[#edf2f4] text-[#6a7980]">
        <Heart className="h-9 w-9" />
      </div>
      <h2 className="mt-5 text-[22px] font-black text-[#202a30]">{title}</h2>
      <p className="mt-2 text-[16px] leading-6 text-[#64727a]">0 perfil salvo</p>
    </article>
  );
}

export default function FavoritosPage() {
  return (
    <div className="bg-white px-5 py-8">
      <h1 className="text-[34px] font-black text-[#202a30]">Listas e favoritos</h1>
      <p className="mt-4 text-[19px] leading-7 text-[#59666d]">
        Organize perfis salvos em listas privadas. Ninguém além de você tem acesso a essas informações.
      </p>

      <div className="mt-8 grid gap-4">
        <EmptyListCard title="Perfis curtidos" />
        <EmptyListCard title="Perfis seguidos" />
      </div>

      <button type="button" className="mt-8 flex h-[60px] w-full items-center justify-center gap-3 rounded-[8px] border border-[#202a30] bg-white text-[20px] font-black text-[#202a30]">
        <Plus className="h-6 w-6" />
        Criar lista
      </button>

      <div className="mt-12 rounded-[10px] bg-[#edf2f4] px-5 py-10 text-center">
        <UserRound className="mx-auto h-16 w-16 text-[#617781]" />
        <p className="mt-6 text-[22px] font-black text-[#202a30]">Você ainda não salvou perfis.</p>
        <p className="mt-3 text-[17px] leading-6 text-[#64727a]">Explore acompanhantes e toque em favorito para montar sua lista.</p>
        <Link href="/profissionais" className="mt-7 flex h-[56px] items-center justify-center rounded-[8px] bg-[#c9a84c] text-[17px] font-black text-[#11191d] no-underline">
          Explorar acompanhantes
        </Link>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { ChevronRight, Heart, Plus, Users } from "lucide-react";

function ListRow({ title, count = 0 }: { title: string; count?: number }) {
  return (
    <div className="client-card flex items-center gap-4 p-4">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] border border-[#d4a843]/16 bg-[#d4a843]/8">
        <Heart className="h-5 w-5 text-[#f5d78c]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-[#f5f0e4]">{title}</p>
        <p className="mt-0.5 text-[12px] text-[#f5f0e4]/44">{count} perfil salvo</p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-[#f5f0e4]/28" />
    </div>
  );
}

export default function FavoritosPage() {
  return (
    <div className="px-4 pb-6 pt-5">
      <p className="client-kicker">Coleções privadas</p>
      <h1 className="client-title mt-1">Listas</h1>
      <p className="client-subtitle mt-2">
        Organize perfis em listas privadas. Só você tem acesso.
      </p>

      <div className="mt-6 space-y-3">
        <ListRow title="Perfis curtidos" />
        <ListRow title="Perfis seguidos" />
      </div>

      <button
        type="button"
        className="client-secondary-button mt-4 flex w-full items-center justify-center gap-2.5 text-[14px] font-semibold"
      >
        <Plus className="h-5 w-5" />
        Criar nova lista
      </button>

      {/* Empty state */}
      <div className="mt-8 flex min-h-[240px] flex-col items-center justify-center rounded-[12px] border border-white/[0.06] bg-white/[0.02] px-5 py-10 text-center">
        <div className="mb-5 grid h-16 w-16 place-items-center rounded-full border border-[#d4a843]/16 bg-[#d4a843]/8">
          <Users className="h-8 w-8 text-[#f5d78c]" />
        </div>
        <p className="text-[17px] font-bold text-[#f5f0e4]">Nenhum perfil salvo</p>
        <p className="mt-2 max-w-[260px] text-[13px] leading-5 text-[#f5f0e4]/50">
          Explore acompanhantes e salve os perfis que mais gostou.
        </p>
        <Link
          href="/dashboard/acompanhantes"
          className="client-primary-button mt-6 flex items-center gap-2 px-8 text-[14px] no-underline"
        >
          Explorar acompanhantes
        </Link>
      </div>
    </div>
  );
}

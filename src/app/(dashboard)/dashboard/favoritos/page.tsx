"use client";

import Link from "next/link";
import { Compass, Heart, Sparkles } from "lucide-react";

export default function FavoritosPage() {
  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <section className="rounded-[8px] border border-white/10 bg-[linear-gradient(135deg,rgba(20,20,22,0.97),rgba(58,9,14,0.65),rgba(7,7,8,0.98))] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.35)] sm:p-6">
        <p className="mb-2 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-[#f5d78c]">
          <Heart className="h-4 w-4" />
          Curadoria pessoal
        </p>
        <h1 className="text-3xl font-black text-white">Perfis favoritos</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/52">
          Sua lista privada de profissionais salvas aparecerá aqui.
        </p>
      </section>

      <div className="rounded-[8px] border border-dashed border-white/12 bg-white/[0.04] p-6 text-center">
        <Sparkles className="mx-auto mb-3 h-6 w-6 text-[#d4a843]" />
        <p className="text-lg font-black text-white">Favoritos de perfis em preparação</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/45">
          Continue explorando a curadoria e monte uma lista discreta com os perfis que combinam com você.
        </p>
        <Link
          href="/profissionais"
          className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-[#d4a843] px-5 text-sm font-black text-[#100d09] transition hover:bg-[#f5d78c]"
        >
          <Compass className="h-4 w-4" />
          Explorar profissionais
        </Link>
      </div>
    </div>
  );
}

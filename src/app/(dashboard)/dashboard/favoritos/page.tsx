"use client";

import Link from "next/link";
import { CheckCircle2, ChevronRight, Heart, Plus, Search, UserRoundCheck, Users } from "lucide-react";

function CollectionCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="client-card flex items-start gap-4 p-4">
      <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[10px] border border-[#d4a843]/18 bg-[#d4a843]/10 text-[#f5d78c]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="min-w-0 flex-1 text-[17px] font-black text-[#f5f0e4]">{title}</h2>
          <ChevronRight className="h-4 w-4 shrink-0 text-[#f5d78c]/60" />
        </div>
        <p className="mt-1.5 text-[13px] leading-5 text-[#f5f0e4]/56">{description}</p>
        <p className="mt-3 text-[11px] font-bold uppercase text-[#f5f0e4]/36">0 perfil salvo</p>
      </div>
    </article>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#f5d78c]" />
      <span className="text-[14px] leading-6 text-[#f5f0e4]/60">{children}</span>
    </li>
  );
}

export default function FavoritosPage() {
  return (
    <div className="client-page space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="client-kicker">Colecoes privadas</p>
          <h1 className="client-title mt-1">Listas</h1>
          <p className="client-subtitle mt-2">
            Salve perfis reais, acompanhe favoritos e organize escolhas sem exposicao.
          </p>
        </div>
        <button
          type="button"
          className="client-secondary-button flex min-h-0 shrink-0 items-center gap-1.5 px-3 py-2 text-[12px] font-bold"
          title="Recurso de listas personalizadas em breve"
        >
          <Plus className="h-4 w-4" />
          Lista
        </button>
      </div>

      <div className="grid gap-4">
        <CollectionCard
          title="Perfis curtidos"
          description="Acompanhantes que voce marcar com coracao aparecerao aqui."
          icon={<Heart className="h-5 w-5" />}
        />
        <CollectionCard
          title="Perfis seguidos"
          description="Use esta area para acompanhar novidades de perfis salvos."
          icon={<UserRoundCheck className="h-5 w-5" />}
        />
      </div>

      <section className="client-empty px-6 py-10 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-[8px] border border-[#d4a843]/18 bg-[#d4a843]/10 text-[#f5d78c]">
          <Users className="h-8 w-8" />
        </div>
        <h2 className="mt-5 text-[22px] font-black text-[#f5f0e4]">Comece salvando perfis</h2>
        <p className="mx-auto mt-3 max-w-[310px] text-[14px] leading-6 text-[#f5f0e4]/56">
          Quando encontrar acompanhantes reais que combinam com sua busca, salve para voltar depois com rapidez.
        </p>
        <Link
          href="/dashboard/acompanhantes"
          className="client-primary-button mx-auto mt-5 inline-flex min-h-0 items-center gap-2 px-5 py-2.5 text-[13px] no-underline"
        >
          <Search className="h-4 w-4" />
          Explorar cidade
        </Link>
      </section>

      <section className="client-card p-5">
        <h2 className="text-[20px] font-black text-[#f5f0e4]">Como usar suas listas</h2>
        <ul className="mt-5 space-y-4">
          <Tip>Curta perfis para criar uma selecao privada de interesse.</Tip>
          <Tip>Siga perfis para acompanhar atualizacoes quando houver publicacoes reais.</Tip>
          <Tip>Use listas personalizadas para separar cidades, estilos ou momentos.</Tip>
        </ul>
      </section>
    </div>
  );
}

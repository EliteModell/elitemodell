"use client";
import Link from "next/link";
import { ChevronRight, Heart, ListPlus, UserRoundCheck } from "lucide-react";

function ListCard({
  title,
  text,
  icon,
}: {
  title: string;
  text: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="client-card p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] border border-[#d4a843]/18 bg-[#d4a843]/10 text-[#f5d78c]">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-bold leading-5 text-[#f5f0e4]">{title}</h3>
          <p className="mt-1 text-[12px] leading-5 text-[#f5f0e4]/50">{text}</p>
          <p className="mt-2 text-[11px] font-bold uppercase text-[#f5f0e4]/38">0 perfil salvo</p>
        </div>
      </div>
    </article>
  );
}

export default function ListsSection() {
  return (
    <section className="client-page-tight">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="client-kicker">Colecoes privadas</p>
          <h2 className="mt-1 text-[20px] font-bold text-[#f5f0e4]">Listas</h2>
        </div>
        <Link
          href="/dashboard/favoritos"
          className="shrink-0 text-[13px] font-bold text-[#f5d78c] no-underline"
        >
          Ver tudo
        </Link>
      </div>
      <p className="mt-3 text-[13px] leading-5 text-[#f5f0e4]/56">
        Organize perfis reais quando comecar a salvar acompanhantes.
      </p>

      <div className="mt-4 grid gap-3">
        <ListCard
          title="Perfis curtidos"
          text="Os perfis marcados com coracao ficarao agrupados aqui."
          icon={<Heart className="h-5 w-5" />}
        />
        <ListCard
          title="Perfis seguidos"
          text="Acompanhe novidades sem misturar com sua lista de curtidos."
          icon={<UserRoundCheck className="h-5 w-5" />}
        />
      </div>

      <Link
        href="/dashboard/favoritos"
        className="client-secondary-button mb-5 mt-6 flex min-h-0 items-center justify-center gap-2 py-3 text-[13px] no-underline"
      >
        <ListPlus className="h-4 w-4" />
        Criar lista
        <ChevronRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

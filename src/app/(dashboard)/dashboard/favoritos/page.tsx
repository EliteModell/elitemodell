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
    <article className="client-card flex items-start gap-4 p-5">
      <span className="grid h-[56px] w-[56px] shrink-0 place-items-center rounded-[8px] border border-[#d4a843]/18 bg-[#d4a843]/10 text-[#f5d78c]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="min-w-0 flex-1 text-[21px] font-black leading-6 text-[#f5f0e4]">{title}</h2>
          <ChevronRight className="h-4 w-4 shrink-0 text-[#f5d78c]/60" />
        </div>
        <p className="mt-2 text-[15px] leading-7 text-[#f5f0e4]/56">{description}</p>
        <p className="mt-3 text-[11px] font-bold uppercase text-[#f5f0e4]/36">0 perfil salvo</p>
      </div>
    </article>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#f5d78c]" />
      <span className="text-[15px] leading-7 text-[#f5f0e4]/60">{children}</span>
    </li>
  );
}

export default function FavoritosPage() {
  return (
    <>
      {/* ── Hero escuro edge-to-edge ── */}
      <section className="px-0 pb-5">
        <div className="client-explore-hero" style={{ minHeight: 220 }}>
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p
                style={{ color: "rgba(212,168,67,0.88)", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}
              >
                Colecoes privadas
              </p>
              <div className="mt-2.5 h-px w-9 bg-[#d4a843]/50" />
              <h1 className="mt-3 bg-[linear-gradient(135deg,#fff8e8_0%,#f5f0e4_22%,#f5d78c_55%,#d4a843_100%)] bg-clip-text text-[54px] font-black leading-[0.90] text-transparent">
                Listas
              </h1>
              <p
                style={{ color: "rgba(245,240,228,0.52)", fontSize: 13, lineHeight: 1.65, marginTop: 14, maxWidth: 240 }}
              >
                Salve, acompanhe e organize perfis favoritos com privacidade.
              </p>
            </div>
            <button
              type="button"
              title="Recurso de listas personalizadas em breve"
              style={{
                border: "1px solid rgba(212,168,67,0.30)",
                background: "rgba(212,168,67,0.12)",
                color: "#d4a843",
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexShrink: 0,
              }}
            >
              <Plus className="h-4 w-4" />
              Lista
            </button>
          </div>
        </div>
      </section>

      {/* ── Conteúdo ── */}
      <div className="client-page" style={{ display: "grid", gap: 58, paddingTop: 34, paddingBottom: 240 }}>
        {/* Cards de coleção */}
        <div className="grid gap-6">
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

        {/* Empty state — flex col para centralizar o ícone de verdade */}
        <section className="client-empty overflow-hidden pb-24 pt-14">
          <div className="flex flex-col items-center px-6 text-center">
            <div className="grid h-[64px] w-[64px] place-items-center rounded-[14px] border border-[#d4a843]/22 bg-[#d4a843]/12 text-[#f5d78c] shadow-[0_14px_36px_rgba(212,168,67,0.12)]">
              <Users className="h-8 w-8" />
            </div>
            <h2 className="mt-6 text-[28px] font-black leading-tight text-[#f5f0e4]">Comece salvando perfis</h2>
            <p className="mx-auto mt-4 max-w-[310px] text-[15px] leading-7 text-[#f5f0e4]/56">
              Quando encontrar acompanhantes que combinam, salve para voltar depois com rapidez.
            </p>
            <Link
              href="/dashboard/acompanhantes"
              className="client-primary-button mt-7 flex min-h-0 w-full max-w-[320px] items-center justify-center gap-2 py-3.5 text-[15px] font-black no-underline"
            >
              <Search className="h-4 w-4" />
              Explorar cidade
            </Link>
          </div>
        </section>

        {/* Como usar */}
        <section className="client-card p-5 pb-12 pt-7">
          <h2 className="text-[24px] font-black text-[#f5f0e4]">Como usar suas listas</h2>
          <ul className="mt-5 space-y-5">
            <Tip>Curta perfis para criar uma selecao privada de interesse.</Tip>
            <Tip>Siga perfis para acompanhar atualizacoes quando houver publicacoes reais.</Tip>
            <Tip>Use listas personalizadas para separar cidades, estilos ou momentos.</Tip>
          </ul>
        </section>
      </div>
    </>
  );
}

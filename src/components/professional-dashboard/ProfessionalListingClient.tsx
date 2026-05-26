"use client";

/* eslint-disable @next/next/no-img-element -- Preview uses the professional public image URL. */

import Link from "next/link";
import { Camera, Check, Crown, Eye, Gauge, ImagePlus, MapPin, Sparkles, Star, Trophy, UserRound } from "lucide-react";

export type ProfessionalListingViewData = {
  displayName: string;
  cityLabel: string;
  categoryLabel: string;
  planLabel: string;
  planStatus: string;
  listingStatus: string;
  rankingLabel: string;
  publicProfileHref: string;
  image: string | null;
  services: string[];
  ratingLabel: string;
  priceLabel: string;
  isHighlighted: boolean;
  tips: Array<{ label: string; done: boolean }>;
};

export function ProfessionalListingClient({ data }: { data: ProfessionalListingViewData }) {
  return (
    <div className="grid gap-5" data-dashboard-version="professional-listing-v1">
      <section className="rounded-[8px] border border-[#d4a843]/20 bg-[linear-gradient(145deg,rgba(18,18,20,0.98),rgba(8,8,9,0.98))] p-4 shadow-[0_26px_80px_rgba(0,0,0,0.34)] sm:p-5">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#d4a843]">Listagem profissional</p>
        <h1 className="mt-1 text-3xl font-black leading-tight text-white sm:text-4xl">Minha posicao na listagem</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">
          Seu perfil esta aparecendo em {data.cityLabel}. Acompanhe sua posicao, veja como seu card publico aparece e use os atalhos para ganhar mais visibilidade.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Posicao atual", value: data.rankingLabel, icon: Trophy },
          { label: "Cidade exibida", value: data.cityLabel, icon: MapPin },
          { label: "Plano ativo", value: data.planStatus, icon: Crown },
          { label: "Status na listagem", value: data.listingStatus, icon: Gauge },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className="min-h-28 rounded-[8px] border border-[#d4a843]/18 bg-white/[0.035] p-4">
              <div className="mb-3 grid h-9 w-9 place-items-center rounded-[8px] bg-[#d4a843]/10 text-[#f5d78c]">
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/36">{item.label}</p>
              <strong className="mt-1 block text-lg font-black leading-tight text-white">{item.value}</strong>
            </article>
          );
        })}
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="overflow-hidden rounded-[8px] border border-[#d4a843]/22 bg-[linear-gradient(180deg,rgba(17,18,21,0.98),rgba(8,8,9,0.98))] shadow-[0_22px_70px_rgba(0,0,0,0.30)]">
          <div className="border-b border-white/10 px-4 py-3">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#d4a843]">Previa do card publico</p>
          </div>
          <div className="p-4">
            <div className="relative min-h-[320px] overflow-hidden rounded-[8px] border border-white/12 bg-[linear-gradient(145deg,#10131a,#080809)] p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#d4a843] px-3 py-1 text-xs font-black text-[#080704]">
                  <Star className="h-3.5 w-3.5" />
                  {data.isHighlighted ? "Destaque" : data.planLabel}
                </span>
                <span className="rounded-full border border-[#d4a843]/30 bg-black/30 px-3 py-1 text-xs font-black text-[#f5d78c]">
                  {data.categoryLabel}
                </span>
              </div>
              <div className="mx-auto mt-10 grid h-28 w-28 place-items-center overflow-hidden rounded-full border border-[#d4a843]/35 bg-[#d4a843]/10">
                {data.image ? <img src={data.image} alt={data.displayName} className="h-full w-full object-cover" /> : <UserRound className="h-12 w-12 text-[#f5d78c]" />}
              </div>
              <div className="mt-10">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="min-w-0 break-words text-xl font-black text-white">{data.displayName}</h2>
                  <span className="inline-flex items-center gap-1 text-sm font-black text-[#f5d78c]">
                    <Star className="h-4 w-4" />
                    {data.ratingLabel}
                  </span>
                </div>
                <p className="mt-1 text-sm text-white/45">{data.cityLabel}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {data.services.map((service) => (
                    <span key={service} className="rounded-full border border-[#d4a843]/25 bg-[#d4a843]/10 px-3 py-1 text-xs font-black text-[#f5d78c]">
                      {service}
                    </span>
                  ))}
                </div>
                <div className="mt-5 flex items-end justify-between gap-3">
                  <p className="text-sm text-white/50">
                    A partir de <strong className="text-lg font-black text-[#f5d78c]">{data.priceLabel}</strong>
                  </p>
                  <Link href={data.publicProfileHref} className="professional-primary-action inline-flex min-h-11 items-center justify-center rounded-[8px] bg-[#d4a843] px-4 text-sm font-black text-[#080704] no-underline">
                    Ver perfil
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-[8px] border border-[#d4a843]/20 bg-[linear-gradient(180deg,rgba(18,18,20,0.98),rgba(8,8,9,0.98))] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.28)] sm:p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#d4a843]">Como aparecer melhor</p>
          <h2 className="mt-1 text-2xl font-black text-white">Dicas de visibilidade</h2>
          <p className="mt-2 text-sm leading-6 text-white/55">
            Perfis com mais fotos, agenda ativa, contatos claros e plano de destaque aparecem com mais forca e convertem melhor.
          </p>
          <div className="mt-5 grid gap-3">
            {data.tips.map((tip) => (
              <div key={tip.label} className="flex items-center gap-3 rounded-[8px] border border-white/10 bg-white/[0.035] p-3">
                <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-[8px] ${tip.done ? "bg-emerald-400/10 text-emerald-200" : "bg-[#d4a843]/10 text-[#f5d78c]"}`}>
                  {tip.done ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                </div>
                <span className="text-sm font-bold text-white/70">{tip.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Link href={data.publicProfileHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] border border-white/12 px-4 text-sm font-black text-white/72 no-underline transition hover:border-[#d4a843]/35 hover:text-[#f5d78c]">
              <Eye className="h-4 w-4" />
              Ver perfil publico
            </Link>
            <Link href="/profissional/perfil" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] border border-white/12 px-4 text-sm font-black text-white/72 no-underline transition hover:border-[#d4a843]/35 hover:text-[#f5d78c]">
              <Gauge className="h-4 w-4" />
              Editar perfil
            </Link>
            <Link href="/profissional/fotos" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] border border-white/12 px-4 text-sm font-black text-white/72 no-underline transition hover:border-[#d4a843]/35 hover:text-[#f5d78c]">
              <ImagePlus className="h-4 w-4" />
              Adicionar fotos
            </Link>
            <Link href="/profissional/planos" className="professional-primary-action inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] bg-[#d4a843] px-4 text-sm font-black text-[#080704] no-underline transition hover:bg-[#f5d78c]">
              <Crown className="h-4 w-4" />
              Ver planos
            </Link>
            <Link href="/profissional/planos" className="professional-primary-action inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] bg-[#d4a843] px-4 text-sm font-black text-[#080704] no-underline transition hover:bg-[#f5d78c] sm:col-span-2">
              <Camera className="h-4 w-4" />
              Ativar destaque
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}

"use client";

import { useState } from "react";
import { CalendarCheck, Eye, Heart, MessageCircle, MousePointerClick, Phone, Star, Trophy } from "lucide-react";

export type PerformancePeriod = "today" | "7d" | "30d" | "all";

export type PerformanceSnapshot = {
  views: number;
  contactClicks: number;
  phoneClicks: number | null;
  favorites: number;
  appointments: number;
  reviews: number;
  rating: number;
  rankingPosition: number | null;
  highlightPoints: number | null;
};

const periodLabels: Record<PerformancePeriod, string> = {
  today: "Hoje",
  "7d": "7 dias",
  "30d": "30 dias",
  all: "Tudo",
};

function valueLabel(value: number | null, suffix = "") {
  if (value === null) return "Indisp.";
  return `${value.toLocaleString("pt-BR")}${suffix}`;
}

export function PerformanceStats({ snapshots }: { snapshots: Record<PerformancePeriod, PerformanceSnapshot> }) {
  const [period, setPeriod] = useState<PerformancePeriod>("7d");
  const current = snapshots[period];
  const stats = [
    { label: "Visualizacoes", value: valueLabel(current.views), icon: Eye },
    { label: "Cliques contato", value: valueLabel(current.contactClicks), icon: MousePointerClick },
    { label: "WhatsApp/telefone", value: current.phoneClicks === null ? "Dados indisponiveis" : valueLabel(current.phoneClicks), icon: Phone },
    { label: "Favoritos", value: valueLabel(current.favorites), icon: Heart },
    { label: "Agendamentos", value: valueLabel(current.appointments), icon: CalendarCheck },
    { label: "Avaliacoes", value: valueLabel(current.reviews), icon: MessageCircle },
    { label: "Nota media", value: current.rating > 0 ? current.rating.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "Sem dados ainda", icon: Star },
    { label: "Posicao", value: current.rankingPosition ? `${current.rankingPosition}a` : "Indisp.", icon: Trophy },
  ];

  return (
    <section className="rounded-[8px] border border-[#d4a843]/20 bg-[linear-gradient(180deg,rgba(18,18,20,0.98),rgba(8,8,9,0.98))] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.30)] sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#d4a843]">Desempenho do perfil</p>
          <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">Sinais comerciais</h2>
        </div>
        <div className="grid grid-cols-4 gap-1 rounded-[8px] border border-white/10 bg-black/22 p-1">
          {(Object.keys(periodLabels) as PerformancePeriod[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className={`min-h-9 rounded-[8px] px-2 text-xs font-black transition ${
                period === key ? "bg-[#d4a843] text-[#080704]" : "text-white/52 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              {periodLabels[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="min-h-[112px] rounded-[8px] border border-white/10 bg-white/[0.035] p-3">
              <div className="mb-3 grid h-8 w-8 place-items-center rounded-[8px] bg-[#d4a843]/10 text-[#f5d78c]">
                <Icon className="h-4 w-4" />
              </div>
              <div className="break-words text-lg font-black leading-tight text-white">{stat.value}</div>
              <div className="mt-1 text-xs leading-5 text-white/45">{stat.label}</div>
            </div>
          );
        })}
      </div>
      {current.highlightPoints === null ? (
        <p className="mt-4 text-xs leading-5 text-white/38">Pontos de destaque ainda nao possuem fonte dedicada no banco. O painel usa plano ativo, boost e destaque como sinais reais.</p>
      ) : null}
    </section>
  );
}

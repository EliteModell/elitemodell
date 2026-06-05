"use client";

import { useState } from "react";
import { CirclePlay, Eye, Gem, Heart, Images, MessageCircle, MousePointerClick, Star, Trophy } from "lucide-react";

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
  if (value === null) return "Indisponível";
  return `${value.toLocaleString("pt-BR")}${suffix}`;
}

export function PerformanceStats({ snapshots }: { snapshots: Record<PerformancePeriod, PerformanceSnapshot> }) {
  const [period, setPeriod] = useState<PerformancePeriod>("7d");
  const current = snapshots[period];
  const stats = [
    { label: "Visualizações", value: valueLabel(current.views), icon: Eye, note: periodLabels[period] },
    { label: "Cliques no contato", value: valueLabel(current.contactClicks), icon: MousePointerClick, note: "Aberturas de contato" },
    { label: "Contatos recebidos", value: valueLabel(current.appointments), icon: MessageCircle, note: "Solicitações e agenda" },
    { label: "Favoritos", value: valueLabel(current.favorites), icon: Heart, note: "Clientes que salvaram" },
    { label: "Stories vistos", value: current.reviews > 0 ? valueLabel(current.reviews) : "Sem leitura ainda", icon: CirclePlay, note: "Conteúdo recente" },
    { label: "Fotos abertas", value: current.phoneClicks === null ? "Sem leitura ainda" : valueLabel(current.phoneClicks), icon: Images, note: "Interesse na galeria" },
    { label: "Nota média", value: current.rating > 0 ? current.rating.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "Sem dados ainda", icon: Star, note: "Avaliações" },
    { label: "Posição", value: current.rankingPosition ? `${current.rankingPosition}ª` : "Em acompanhamento", icon: Trophy, note: "Na cidade" },
    { label: "Pontos de destaque", value: current.highlightPoints === null ? "Em preparo" : valueLabel(current.highlightPoints), icon: Gem, note: "Força comercial" },
  ];

  return (
    <section className="premium-lower-card p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#d4a843]">Desempenho do perfil</p>
          <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">Sinais comerciais</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/55">Acompanhe os sinais que indicam procura, interesse e visibilidade do seu perfil.</p>
        </div>
        <div className="grid grid-cols-4 gap-1.5 rounded-[14px] border border-white/10 bg-black/22 p-1">
          {(Object.keys(periodLabels) as PerformancePeriod[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className={`min-h-10 rounded-[12px] px-2 text-xs font-black transition ${
                period === key ? "bg-[#d4a843] text-[#080704]" : "text-white/52 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              {periodLabels[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="min-h-[140px] rounded-[18px] border border-[#d4a843]/18 bg-[linear-gradient(145deg,rgba(255,255,255,0.045),rgba(214,168,58,0.025))] p-4">
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-[14px] border border-[#d4a843]/24 bg-[#d4a843]/10 text-[#f5d78c]">
                <Icon className="h-4 w-4" />
              </div>
              <div className="break-words text-lg font-black leading-tight text-white">{stat.value}</div>
              <div className="mt-1 text-xs leading-5 text-white/45">{stat.label}</div>
              <div className="mt-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#f5d78c]/70">{stat.note}</div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs leading-5 text-white/38">Os pontos de destaque combinam sinais reais do perfil, como plano ativo, boost, destaque e galeria recente.</p>
    </section>
  );
}

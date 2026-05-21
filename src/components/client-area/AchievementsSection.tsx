"use client";
import { ChevronRight, Star, ThumbsUp } from "lucide-react";

function HexBadge({ children, done }: { children: React.ReactNode; done?: boolean }) {
  return (
    <div className="relative mx-auto h-[60px] w-[60px]">
      <svg viewBox="0 0 60 60" className="absolute inset-0 h-full w-full" fill="none">
        <polygon
          points="30,3 54,16 54,44 30,57 6,44 6,16"
          fill={done ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.06)"}
          stroke={done ? "rgba(201,168,76,0.5)" : "rgba(255,255,255,0.15)"}
          strokeWidth="1.5"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-[#7a8e95]">
        {children}
      </div>
    </div>
  );
}

function AchievementCard({
  icon,
  title,
  text,
  total,
  rewardIcon,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  total: number;
  rewardIcon: React.ReactNode;
}) {
  return (
    <article className="client-card p-5">
      <div className="flex gap-4">
        <div className="w-[76px] shrink-0 text-center">
          <HexBadge>{icon}</HexBadge>
          <p className="mt-2 text-[12px] font-semibold text-[#f5f0e4]/52">Nivel 0</p>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 text-[18px] font-black leading-6 text-[#f5f0e4]">{title}</h3>
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[#f5d78c]" />
          </div>
          <p className="mt-2 text-[14px] leading-6 text-[#f5f0e4]/58">{text}</p>
          <p className="mt-3 text-[14px] font-bold text-[#f5f0e4]">0 de {total} concluidos</p>
          <button type="button" className="mt-1 text-[12px] font-medium underline underline-offset-2 text-[#f5d78c]">
            Mostrar progresso
          </button>
        </div>
      </div>
      <div className="mt-5 flex items-end gap-3">
        <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-[8%] rounded-full bg-[#d4a843]" />
        </div>
        <div className="text-center">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-[#d4a843]/14">
            {rewardIcon}
          </div>
          <p className="mt-1 text-[10px] font-semibold text-[#f5f0e4]/50">Nivel 1</p>
        </div>
      </div>
    </article>
  );
}

export default function AchievementsSection() {
  return (
    <section className="client-page-tight text-white">
      <div className="client-panel mb-7 flex items-start gap-5 p-5">
        <div className="min-w-0 flex-1">
          <p className="client-kicker">Status privado</p>
          <h2 className="mt-1 text-[24px] font-black text-white">Conquistas</h2>
          <p className="mt-3 text-[14px] leading-6 text-white/60">
            Manter sua conta ativa adiciona conquistas ao seu perfil e aumentam o seu nivel.
          </p>
        </div>
        <div className="grid h-[68px] w-[68px] shrink-0 place-items-center rounded-[8px] bg-[#c9a84c]/10 shadow-[0_0_40px_rgba(201,168,76,0.18)]">
          <Star className="h-8 w-8 fill-[#c9a84c] text-[#c9a84c]" />
        </div>
      </div>

      <div className="space-y-5">
        <AchievementCard
          icon={<Star className="h-6 w-6 text-[#7a8e95]" />}
          title="Escreva avaliacoes"
          text="Avalie 5 perfis de acompanhantes para chegar ao Nivel 1"
          total={5}
          rewardIcon={<Star className="h-4 w-4 fill-[#c9a84c] text-[#c9a84c]" />}
        />
        <AchievementCard
          icon={<ThumbsUp className="h-6 w-6 text-[#7a8e95]" />}
          title="Curta avaliacoes"
          text="Curta 10 avaliacoes para chegar ao Nivel 1"
          total={10}
          rewardIcon={<ThumbsUp className="h-4 w-4 fill-[#c9a84c] text-[#c9a84c]" />}
        />
      </div>

      <button
        type="button"
        className="client-primary-button mt-6 w-full text-[15px] transition-opacity active:opacity-90"
      >
        Mostrar mais
      </button>
    </section>
  );
}

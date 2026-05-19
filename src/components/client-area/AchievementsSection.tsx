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
    <article className="rounded-[14px] bg-white p-4 shadow-[0_6px_24px_rgba(5,10,15,0.30)]">
      <div className="flex gap-4">
        <div className="w-[76px] shrink-0 text-center">
          <HexBadge>{icon}</HexBadge>
          <p className="mt-2 text-[12px] font-semibold text-[#566570]">Nível 0</p>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 text-[16px] font-bold leading-5 text-[#1f2a30]">{title}</h3>
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[#7a8a91]" />
          </div>
          <p className="mt-1.5 text-[13px] leading-5 text-[#566570]">{text}</p>
          <p className="mt-2 text-[13px] font-semibold text-[#1f2a30]">0 de {total} concluídos</p>
          <button type="button" className="mt-1 text-[12px] font-medium underline underline-offset-2 text-[#566570]">
            Mostrar progresso
          </button>
        </div>
      </div>
      {/* Progress bar */}
      <div className="mt-5 flex items-end gap-3">
        <div className="h-[4px] flex-1 overflow-hidden rounded-full bg-[#eaecee]">
          <div className="h-full w-[8%] rounded-full bg-[#8a9aa1]" />
        </div>
        <div className="text-center">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-[#fef3d6]">
            {rewardIcon}
          </div>
          <p className="mt-1 text-[10px] font-semibold text-[#6a7a81]">Nível 1</p>
        </div>
      </div>
    </article>
  );
}

export default function AchievementsSection() {
  return (
    <section className="bg-[#0d1318] px-4 py-10 text-white">
      {/* Header */}
      <div className="mb-8 flex items-start gap-5">
        <div className="min-w-0 flex-1">
          <h2 className="text-[22px] font-bold text-white">Conquistas</h2>
          <p className="mt-2.5 text-[13px] leading-6 text-white/60">
            Manter sua conta ativa adiciona conquistas ao seu perfil e aumentam o seu nível!
          </p>
        </div>
        <div className="grid h-[68px] w-[68px] shrink-0 place-items-center rounded-[18px] bg-[#c9a84c]/10 shadow-[0_0_40px_rgba(201,168,76,0.18)]">
          <Star className="h-8 w-8 fill-[#c9a84c] text-[#c9a84c]" />
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-4">
        <AchievementCard
          icon={<Star className="h-6 w-6 text-[#7a8e95]" />}
          title="Escreva avaliações"
          text="Avalie 5 perfis de acompanhantes para chegar ao Nível 1"
          total={5}
          rewardIcon={<Star className="h-4 w-4 fill-[#c9a84c] text-[#c9a84c]" />}
        />
        <AchievementCard
          icon={<ThumbsUp className="h-6 w-6 text-[#7a8e95]" />}
          title="Curta avaliações"
          text="Curta 10 avaliações para chegar ao Nível 1"
          total={10}
          rewardIcon={<ThumbsUp className="h-4 w-4 fill-[#c9a84c] text-[#c9a84c]" />}
        />
      </div>

      <button
        type="button"
        className="mt-7 h-[50px] w-full rounded-[10px] bg-[#c9a84c] text-[15px] font-bold text-[#0d1318] transition-opacity active:opacity-90"
      >
        Mostrar mais
      </button>
    </section>
  );
}

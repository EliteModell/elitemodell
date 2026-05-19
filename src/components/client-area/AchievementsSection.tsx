"use client";
import { ChevronRight, Star, ThumbsUp } from "lucide-react";

function AchievementCard({
  icon,
  title,
  text,
  total,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  total: number;
}) {
  return (
    <article className="rounded-[12px] bg-white p-5 text-[#11191d] shadow-[0_8px_24px_rgba(15,25,30,0.12)]">
      <div className="flex gap-4">
        <div className="w-[92px] shrink-0 text-center">
          <div className="mx-auto grid h-[70px] w-[70px] place-items-center rounded-[18px] border border-[#e0e6e8] bg-[#f3f6f7] text-[#b8c4c8]">
            {icon}
          </div>
          <p className="mt-2 text-[17px] font-black">Nível 0</p>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h3 className="min-w-0 flex-1 text-[24px] font-black leading-7">{title}</h3>
            <ChevronRight className="h-8 w-8 shrink-0" />
          </div>
          <p className="mt-2 text-[19px] leading-6">{text}</p>
          <p className="mt-3 text-[18px] font-black">0 de {total} concluídos</p>
          <button type="button" className="mt-2 text-[18px] font-bold underline">Mostrar progresso</button>
        </div>
      </div>
      <div className="mt-8 flex items-end gap-4">
        <div className="h-4 flex-1 overflow-hidden rounded-full bg-[#edf1f2]">
          <div className="h-full w-[14%] rounded-full bg-[#68777d]" />
        </div>
        <span className="text-center text-xs font-bold text-[#7a858b]">
          <Star className="mx-auto h-9 w-9 fill-[#c9a84c] text-[#c9a84c]" />
          Nível 1
        </span>
      </div>
    </article>
  );
}

export default function AchievementsSection() {
  return (
    <section className="bg-[#1f2a30] px-5 py-12 text-white">
      <div className="mx-auto max-w-[520px]">
        <div className="flex items-start gap-7">
          <div className="min-w-0 flex-1">
            <h2 className="text-[30px] font-black">Conquistas</h2>
            <p className="mt-5 text-[21px] leading-8 text-white/86">
              Manter sua conta ativa adiciona conquistas ao seu perfil e aumenta seu nível.
            </p>
          </div>
          <div className="grid h-[94px] w-[94px] shrink-0 place-items-center rounded-[28px] bg-[#c9a84c]/18 text-[#f4d98c] shadow-[0_0_44px_rgba(201,168,76,0.26)]">
            <Star className="h-12 w-12 fill-current" />
          </div>
        </div>

        <div className="mt-10 grid gap-7">
          <AchievementCard
            icon={<Star className="h-9 w-9" />}
            title="Escreva avaliações"
            text="Avalie 5 perfis para chegar ao Nível 1"
            total={5}
          />
          <AchievementCard
            icon={<ThumbsUp className="h-9 w-9" />}
            title="Curta avaliações"
            text="Curta 10 avaliações para chegar ao Nível 1"
            total={10}
          />
        </div>

        <button type="button" className="mt-8 h-[60px] w-full rounded-[8px] border-0 bg-[#c9a84c] text-[22px] font-black text-[#11191d]">
          Mostrar mais
        </button>
      </div>
    </section>
  );
}

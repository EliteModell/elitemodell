"use client";

import Link from "next/link";
import { Camera, FileVideo, ImagePlus } from "lucide-react";

export function ProfessionalStoriesClient() {
  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#d4a843]">Conteúdo rápido</p>
        <h1 className="mt-1 text-3xl font-black text-white">Stories profissionais</h1>
        <p className="mt-2 text-sm leading-6 text-white/52">
          Área preparada para publicação de stories. O envio final ainda será liberado com validação de mídia, expiração e moderação antes da exibição pública.
        </p>
      </div>

      <section className="rounded-[18px] border border-[#d4a843]/22 bg-[linear-gradient(180deg,rgba(18,18,20,0.98),rgba(8,8,9,0.98))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] sm:p-6">
        <div className="grid h-14 w-14 place-items-center rounded-[16px] border border-[#d4a843]/24 bg-[#d4a843]/10 text-[#f5d78c]">
          <Camera className="h-7 w-7" />
        </div>
        <h2 className="mt-5 text-xl font-black text-white">Publique conteúdo temporário</h2>
        <p className="mt-2 text-sm leading-6 text-white/52">
          Para a reunião, a interface fica pronta e direciona para os canais já disponíveis. Quando o upload de stories for ativado, esta tela receberá o envio direto.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Link href="/profissional/fotos" className="professional-primary-action inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] bg-[#d4a843] px-4 text-sm font-black text-[#080704] no-underline transition hover:bg-[#f5d78c]">
            <ImagePlus className="h-4 w-4" />
            Postar foto
          </Link>
          <Link href="/profissional/configuracoes" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] border border-white/12 px-4 text-sm font-black text-white/72 no-underline transition hover:border-[#d4a843]/35 hover:text-[#f5d78c]">
            <FileVideo className="h-4 w-4" />
            Enviar vídeo
          </Link>
        </div>
      </section>
    </div>
  );
}

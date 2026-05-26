"use client";

import Link from "next/link";
import { ArrowRight, Camera, CalendarDays, FileVideo, ImagePlus, Sparkles } from "lucide-react";

export function ProfessionalPostClient() {
  const actions = [
    {
      href: "/profissional/fotos",
      label: "Postar foto",
      description: "Atualize capa e galeria para aumentar confiança no perfil.",
      icon: ImagePlus,
      helper: "Galeria e capa",
    },
    {
      href: "/profissional/configuracoes",
      label: "Postar vídeo",
      description: "Prepare um vídeo de apresentação quando o recurso estiver disponível.",
      icon: FileVideo,
      helper: "Apresentação",
    },
    {
      href: "/profissional/stories",
      label: "Postar story",
      description: "Publique conteúdo temporário para manter o perfil ativo.",
      icon: Camera,
      helper: "Conteúdo rápido",
    },
    {
      href: "/profissional/agenda",
      label: "Atualizar agenda",
      description: "Horários claros aumentam a chance de novos agendamentos.",
      icon: CalendarDays,
      helper: "Disponibilidade",
    },
  ];

  return (
    <div className="grid gap-6">
      <section className="rounded-[18px] border border-[#d4a843]/20 bg-[radial-gradient(circle_at_top_left,rgba(212,168,67,0.16),transparent_32%),linear-gradient(145deg,rgba(18,18,20,0.98),rgba(8,8,9,0.98))] p-5 shadow-[0_26px_80px_rgba(0,0,0,0.34)] sm:p-6">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#d4a843]">Conteúdo profissional</p>
        <h1 className="mt-2 text-3xl font-black leading-tight text-white sm:text-4xl">Postar conteúdo</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">
          Perfis que atualizam fotos, vídeos, stories e agenda passam mais confiança e tendem a receber mais visualizações.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="group min-h-[168px] rounded-[18px] border border-[#d4a843]/18 bg-[linear-gradient(160deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018)_44%,rgba(212,168,67,0.055))] p-5 text-white no-underline shadow-[0_18px_50px_rgba(0,0,0,0.22)] transition hover:border-[#d4a843]/42 hover:bg-[#d4a843]/[0.075]"
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-[14px] border border-[#d4a843]/22 bg-[#d4a843]/10 text-[#f5d78c] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-white/48">
                  {action.helper}
                </span>
              </div>
              <h2 className="text-xl font-black text-white">{action.label}</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-white/55">{action.description}</p>
              <span className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-[12px] border border-[#d4a843]/25 bg-[#d4a843]/10 px-4 text-sm font-black text-[#f5d78c] transition group-hover:bg-[#d4a843] group-hover:text-[#080704]">
                Abrir
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          );
        })}
      </section>

      <section className="rounded-[18px] border border-[#d4a843]/20 bg-[linear-gradient(135deg,rgba(212,168,67,0.12),rgba(255,255,255,0.035)_44%,rgba(8,8,9,0.98))] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-[#d4a843]/10 text-[#f5d78c]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Mantenha o perfil em movimento</h2>
            <p className="mt-1 text-sm leading-6 text-white/55">
              Fotos recentes, agenda configurada e plano ativo ajudam seu perfil a parecer mais confiável para clientes.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

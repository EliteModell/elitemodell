"use client";

import Link from "next/link";
import { Camera, CalendarDays, FileVideo, ImagePlus, Sparkles } from "lucide-react";

export function ProfessionalPostClient() {
  const actions = [
    {
      href: "/profissional/fotos",
      label: "Postar foto",
      description: "Atualize capa e galeria para melhorar confianca.",
      icon: ImagePlus,
      primary: true,
    },
    {
      href: "/profissional/configuracoes",
      label: "Postar video",
      description: "Prepare um video de apresentacao quando disponivel.",
      icon: FileVideo,
      primary: false,
    },
    {
      href: "/profissional/stories",
      label: "Postar story",
      description: "Publique conteudo temporario para manter o perfil vivo.",
      icon: Camera,
      primary: false,
    },
    {
      href: "/profissional/agenda",
      label: "Atualizar agenda",
      description: "Horarios claros aumentam a chance de agendamento.",
      icon: CalendarDays,
      primary: false,
    },
  ];

  return (
    <div className="grid gap-5">
      <section className="rounded-[8px] border border-[#d4a843]/20 bg-[linear-gradient(145deg,rgba(18,18,20,0.98),rgba(8,8,9,0.98))] p-4 shadow-[0_26px_80px_rgba(0,0,0,0.34)] sm:p-5">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#d4a843]">Conteudo profissional</p>
        <h1 className="mt-1 text-3xl font-black leading-tight text-white sm:text-4xl">Postar conteudo</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">
          Perfis que atualizam fotos, videos, stories e agenda passam mais confianca e tendem a receber mais visualizacoes.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className={`min-h-44 rounded-[8px] border p-4 no-underline transition ${
                action.primary
                  ? "professional-primary-action border-[#d4a843]/35 bg-[#d4a843] text-[#080704] hover:bg-[#f5d78c]"
                  : "border-[#d4a843]/18 bg-white/[0.035] text-white/72 hover:border-[#d4a843]/35 hover:bg-[#d4a843]/[0.075]"
              }`}
            >
              <div className={`mb-4 grid h-11 w-11 place-items-center rounded-[8px] ${action.primary ? "bg-black/10" : "bg-[#d4a843]/10 text-[#f5d78c]"}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h2 className={`text-lg font-black ${action.primary ? "text-[#080704]" : "text-white"}`}>{action.label}</h2>
              <p className={`mt-2 text-sm leading-6 ${action.primary ? "text-[#080704]/75" : "text-white/48"}`}>{action.description}</p>
            </Link>
          );
        })}
      </section>

      <section className="rounded-[8px] border border-[#d4a843]/20 bg-[linear-gradient(135deg,rgba(212,168,67,0.12),rgba(255,255,255,0.035)_44%,rgba(8,8,9,0.98))] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-[#d4a843]/10 text-[#f5d78c]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Mantenha o perfil em movimento</h2>
            <p className="mt-1 text-sm leading-6 text-white/55">
              Fotos recentes, agenda configurada e plano ativo ajudam seu perfil a parecer mais confiavel para clientes.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

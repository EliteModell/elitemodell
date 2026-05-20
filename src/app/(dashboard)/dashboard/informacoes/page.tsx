"use client";
import { ChevronDown } from "lucide-react";
import Link from "next/link";

const sections = [
  {
    title: "Termos de Uso",
    summary: "Ao usar a plataforma, você concorda com nossos termos de uso. Leia com atenção antes de continuar.",
    href: "/terms",
  },
  {
    title: "Política de Privacidade",
    summary: "Saiba como coletamos, usamos e protegemos seus dados pessoais conforme a LGPD.",
    href: "/privacy",
  },
  {
    title: "Como funciona a plataforma",
    summary:
      "A Elite Modell é uma plataforma de anúncios de acompanhantes adultos. Todo o contato e negociação ocorre diretamente entre os usuários.",
    href: null,
  },
  {
    title: "Segurança e privacidade",
    summary:
      "Suas informações são criptografadas e nunca compartilhadas com terceiros. Nunca forneça dados fora da plataforma.",
    href: null,
  },
  {
    title: "Política de reembolso",
    summary:
      "Créditos adquiridos têm validade de 12 meses. Solicitações de reembolso devem ser feitas em até 7 dias após a compra.",
    href: null,
  },
];

export default function InformacoesPage() {
  return (
    <div className="client-page space-y-5">
      <div className="mb-2">
        <p className="client-kicker">Transparência</p>
        <h1 className="client-title mt-1">Informações importantes</h1>
        <p className="client-subtitle mt-2">Documentos e políticas da plataforma Elite Modell.</p>
      </div>

      {sections.map((section) => (
        <details
          key={section.title}
          className="client-card group p-6"
        >
          <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-[18px] font-black text-[#f5f0e4]">{section.title}</h2>
              <p className="mt-2 text-[14px] leading-6 text-[#f5f0e4]/60">{section.summary}</p>
            </div>
            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-[#f5d78c] transition-transform group-open:rotate-180" />
          </summary>
          <p className="mt-5 border-t border-white/10 pt-5 text-[14px] leading-7 text-[#f5f0e4]/56">
            Consulte esta orientação sempre que precisar. As políticas completas ficam disponíveis para leitura nos links oficiais.
          </p>
          {section.href && (
            <Link
              href={section.href}
              className="mt-4 inline-block text-[13px] font-semibold text-[#f5d78c] no-underline"
            >
              Ler completo →
            </Link>
          )}
        </details>
      ))}

      <p className="pt-2 text-center text-[12px] text-[#f5f0e4]/38">
        Elite Modell © {new Date().getFullYear()} — Todos os direitos reservados.
      </p>
    </div>
  );
}

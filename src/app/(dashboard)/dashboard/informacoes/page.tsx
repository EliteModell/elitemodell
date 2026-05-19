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
    <div className="px-4 py-6 space-y-3">
      <div className="mb-4">
        <h1 className="text-[20px] font-bold text-[#1f2a30]">Informações importantes</h1>
        <p className="mt-1 text-[13px] text-[#566570]">Documentos e políticas da plataforma Elite Modell.</p>
      </div>

      {sections.map((section) => (
        <div
          key={section.title}
          className="rounded-[14px] bg-white p-5 shadow-[0_2px_8px_rgba(20,31,36,0.06)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-bold text-[#1f2a30]">{section.title}</h2>
              <p className="mt-1.5 text-[13px] leading-5 text-[#566570]">{section.summary}</p>
            </div>
            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-[#9aabaf]" />
          </div>
          {section.href && (
            <Link
              href={section.href}
              className="mt-4 inline-block text-[13px] font-semibold text-[#a9822d] no-underline"
            >
              Ler completo →
            </Link>
          )}
        </div>
      ))}

      <p className="pt-2 text-center text-[12px] text-[#8fa0a8]">
        Elite Modell © {new Date().getFullYear()} — Todos os direitos reservados.
      </p>
    </div>
  );
}

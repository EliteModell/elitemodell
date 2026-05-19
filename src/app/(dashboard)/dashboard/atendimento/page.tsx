"use client";
import { ChevronRight, Mail, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";

function ContactCard({
  icon,
  title,
  subtitle,
  href,
  external,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  href: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="flex min-h-[70px] items-center gap-4 rounded-[14px] border border-[#e4eaec] bg-white p-4 no-underline shadow-[0_2px_8px_rgba(20,31,36,0.05)] transition-colors active:bg-[#f5f8f9]"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-[#fef3d6] text-[#a9822d]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-[#1f2a30]">{title}</p>
        <p className="mt-0.5 text-[12px] text-[#6a7a81]">{subtitle}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#9aabaf]" />
    </a>
  );
}

export default function AtendimentoPage() {
  return (
    <div className="px-4 py-6 space-y-5">
      <div>
        <h1 className="text-[20px] font-bold text-[#1f2a30]">Central de Atendimento</h1>
        <p className="mt-1 text-[13px] text-[#566570]">
          Nossa equipe está disponível para ajudar de forma segura e discreta.
        </p>
      </div>

      {/* Notice */}
      <div className="rounded-[14px] border border-[#f0d88a]/40 bg-[#fef9f0] p-4">
        <p className="text-[13px] font-semibold text-[#a9822d]">Atenção</p>
        <p className="mt-1 text-[13px] leading-5 text-[#7a6020]">
          Nunca peça ou forneça dados pessoais fora dos canais oficiais abaixo. A Elite Modell nunca solicita senhas.
        </p>
      </div>

      {/* Contact options */}
      <div className="space-y-3">
        <ContactCard
          icon={<MessageCircle className="h-5 w-5" />}
          title="Chat no aplicativo"
          subtitle="Resposta em até 2 horas"
          href="/dashboard/mensagens"
        />
        <ContactCard
          icon={<Mail className="h-5 w-5" />}
          title="E-mail"
          subtitle="suporte@elitemodell.com"
          href="mailto:suporte@elitemodell.com"
          external
        />
        <ContactCard
          icon={<Phone className="h-5 w-5" />}
          title="WhatsApp"
          subtitle="Disponível em horário comercial"
          href="https://wa.me/5511999999999"
          external
        />
      </div>

      {/* FAQ */}
      <div className="rounded-[14px] bg-white p-5 shadow-[0_2px_12px_rgba(20,31,36,0.06)]">
        <h2 className="text-[15px] font-bold text-[#1f2a30]">Dúvidas frequentes</h2>
        {[
          "Como funciona a verificação de conta?",
          "Como cancelar meu plano?",
          "Meus dados são seguros?",
          "Como solicitar reembolso?",
        ].map((faq) => (
          <div key={faq} className="mt-3 flex items-center gap-3 border-t border-[#f0f3f5] pt-3">
            <p className="flex-1 text-[13px] text-[#566570]">{faq}</p>
            <ChevronRight className="h-4 w-4 shrink-0 text-[#9aabaf]" />
          </div>
        ))}
      </div>

      <Link
        href="/dashboard/informacoes"
        className="block text-center text-[13px] font-semibold text-[#a9822d] no-underline"
      >
        Ver informações importantes →
      </Link>
    </div>
  );
}

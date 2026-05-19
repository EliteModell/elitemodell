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
      className="client-card flex min-h-[72px] items-center gap-4 p-4 no-underline transition-colors active:bg-white/10"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] border border-[#d4a843]/18 bg-[#d4a843]/12 text-[#f5d78c]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-[#f5f0e4]">{title}</p>
        <p className="mt-0.5 text-[12px] text-[#f5f0e4]/50">{subtitle}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#f5d78c]" />
    </a>
  );
}

export default function AtendimentoPage() {
  return (
    <div className="client-page space-y-5">
      <div>
        <p className="client-kicker">Suporte seguro</p>
        <h1 className="client-title mt-1">Central de Atendimento</h1>
        <p className="client-subtitle mt-2">
          Nossa equipe está disponível para ajudar de forma segura e discreta.
        </p>
      </div>

      {/* Notice */}
      <div className="client-panel p-4">
        <p className="text-[13px] font-semibold text-[#f5d78c]">Atenção</p>
        <p className="mt-1 text-[13px] leading-5 text-[#f5f0e4]/60">
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
      <div className="client-card p-5">
        <h2 className="text-[18px] font-bold text-[#f5f0e4]">Dúvidas frequentes</h2>
        {[
          "Como funciona a verificação de conta?",
          "Como cancelar meu plano?",
          "Meus dados são seguros?",
          "Como solicitar reembolso?",
        ].map((faq, index) => (
          <details key={faq} className="group mt-3 border-t border-white/10 pt-3">
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-3 text-[14px] font-semibold text-[#f5f0e4]">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-white/[0.045] text-[12px] text-[#f5d78c]">
                {index + 1}
              </span>
              <span className="flex-1">{faq}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-[#f5d78c] transition-transform group-open:rotate-90" />
            </summary>
            <p className="pb-2 pl-11 pr-1 text-[13px] leading-5 text-[#f5f0e4]/56">
              Nossa equipe orienta pelo canal oficial e mantém sua privacidade em todas as etapas.
            </p>
          </details>
        ))}
      </div>

      <Link
        href="/dashboard/informacoes"
        className="block text-center text-[13px] font-semibold text-[#f5d78c] no-underline"
      >
        Ver informações importantes →
      </Link>
    </div>
  );
}

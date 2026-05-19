"use client";

import Link from "next/link";
import { CircleHelp, MessageCircle, Search } from "lucide-react";

export default function MensagensPage() {
  return (
    <main className="client-page">
      <p className="client-kicker">Conversas</p>
      <h1 className="client-title mt-1">Central de atendimento</h1>
      <p className="client-subtitle mt-3">
        Encontre ajuda, acompanhe conversas e tire dúvidas sobre sua conta.
      </p>

      <section className="client-card mt-6 p-5">
        <div className="flex items-start gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[8px] border border-[#d4a843]/16 bg-white/[0.045] text-[#f5d78c]">
            <MessageCircle className="h-7 w-7" />
          </span>
          <div>
            <h2 className="text-[22px] font-black text-[#f5f0e4]">Nenhuma conversa ativa</h2>
            <p className="mt-3 text-[15px] leading-6 text-[#f5f0e4]/58">
              Quando você iniciar contato com um perfil ou com o suporte, a conversa aparecerá aqui.
            </p>
          </div>
        </div>

        <Link href="/dashboard/acompanhantes" className="client-primary-button mt-7 flex items-center justify-center gap-2 text-[16px] no-underline">
          <Search className="h-5 w-5" />
          Explorar acompanhantes
        </Link>
      </section>

      <section className="client-panel mt-5 p-5">
        <h2 className="flex items-center gap-3 text-[22px] font-black text-[#f5f0e4]">
          <CircleHelp className="h-7 w-7" />
          Precisa de ajuda?
        </h2>
        <p className="mt-4 text-[15px] leading-6 text-[#f5f0e4]/58">
          Nossa equipe responde por canais oficiais. Nunca envie senhas, códigos ou documentos fora da plataforma.
        </p>
        <button type="button" className="client-secondary-button mt-6 w-full text-[16px]">
          Abrir chamado
        </button>
      </section>
    </main>
  );
}

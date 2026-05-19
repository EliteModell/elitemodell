"use client";

import Link from "next/link";
import { CircleHelp, MessageCircle, Search } from "lucide-react";

export default function MensagensPage() {
  return (
    <main className="bg-white px-5 py-8">
      <h1 className="text-[34px] font-black text-[#202a30]">Central de atendimento</h1>
      <p className="mt-4 text-[19px] leading-7 text-[#59666d]">
        Encontre ajuda, acompanhe conversas e tire dúvidas sobre sua conta.
      </p>

      <section className="mt-8 rounded-[10px] border border-[#e0e5e7] bg-white p-5">
        <div className="flex items-start gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#edf2f4] text-[#617781]">
            <MessageCircle className="h-7 w-7" />
          </span>
          <div>
            <h2 className="text-[24px] font-black text-[#202a30]">Nenhuma conversa ativa</h2>
            <p className="mt-3 text-[17px] leading-6 text-[#64727a]">
              Quando você iniciar contato com um perfil ou com o suporte, a conversa aparecerá aqui.
            </p>
          </div>
        </div>

        <Link href="/profissionais" className="mt-7 flex h-[56px] items-center justify-center gap-2 rounded-[8px] bg-[#c9a84c] text-[17px] font-black text-[#11191d] no-underline">
          <Search className="h-5 w-5" />
          Explorar acompanhantes
        </Link>
      </section>

      <section className="mt-7 rounded-[10px] bg-[#edf2f4] p-5">
        <h2 className="flex items-center gap-3 text-[24px] font-black text-[#202a30]">
          <CircleHelp className="h-7 w-7" />
          Precisa de ajuda?
        </h2>
        <p className="mt-4 text-[17px] leading-6 text-[#64727a]">
          Nossa equipe responde por canais oficiais. Nunca envie senhas, códigos ou documentos fora da plataforma.
        </p>
        <button type="button" className="mt-6 h-[56px] w-full rounded-[8px] border border-[#202a30] bg-white text-[17px] font-black text-[#202a30]">
          Abrir chamado
        </button>
      </section>
    </main>
  );
}

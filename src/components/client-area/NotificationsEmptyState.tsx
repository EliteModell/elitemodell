"use client";

import Link from "next/link";
import { Bell, Inbox } from "lucide-react";

export default function NotificationsEmptyState() {
  return (
    <section className="min-h-[calc(100vh-220px)] bg-[#edf2f4] px-5 py-6">
      <p className="text-[16px] text-[#59666d]">
        Página inicial <span className="mx-1">›</span> <strong className="text-[#202a30]">Notificações</strong>
      </p>
      <div className="mt-12 border-t border-[#cbd4d7] pt-10">
        <h1 className="text-[36px] font-black text-[#202a30]">Notificações</h1>
      </div>

      <div className="flex min-h-[480px] flex-col items-center justify-center text-center">
        <div className="relative">
          <span className="absolute -right-5 -top-5 h-28 w-28 rounded-full bg-[#fff4da]" />
          <Inbox className="relative h-36 w-36 stroke-[1.7] text-[#c9a84c]" />
          <Bell className="absolute -right-1 top-2 h-9 w-9 text-[#a9822d]" />
        </div>
        <p className="mt-8 text-[25px] font-black text-[#202a30]">Você ainda não tem notificações.</p>
        <p className="mt-3 max-w-[360px] text-[17px] leading-6 text-[#64727a]">
          Avisos importantes e atualizações da sua conta aparecerão aqui.
        </p>
      </div>

      <Link
        href="/dashboard"
        className="flex h-[60px] items-center justify-center rounded-[8px] bg-[#c9a84c] text-[18px] font-black text-[#11191d] no-underline"
      >
        Voltar
      </Link>
    </section>
  );
}

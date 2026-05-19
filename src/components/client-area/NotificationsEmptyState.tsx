"use client";

import Link from "next/link";
import { Bell, Inbox } from "lucide-react";

export default function NotificationsEmptyState() {
  return (
    <section className="client-page min-h-[calc(100vh-220px)]">
      <p className="text-[13px] text-[#f5f0e4]/48">
        Página inicial <span className="mx-1">›</span> <strong className="text-[#f5d78c]">Notificações</strong>
      </p>
      <div className="mt-8 border-t border-[#d4a843]/12 pt-7">
        <p className="client-kicker">Central discreta</p>
        <h1 className="client-title mt-1">Notificações</h1>
      </div>

      <div className="client-empty mt-6 flex min-h-[380px] flex-col items-center justify-center px-5 py-10 text-center">
        <div className="relative">
          <span className="absolute -right-5 -top-5 h-28 w-28 rounded-full bg-[#d4a843]/12 blur-xl" />
          <Inbox className="relative h-32 w-32 stroke-[1.7] text-[#d4a843]" />
          <Bell className="absolute -right-1 top-2 h-9 w-9 text-[#f5d78c]" />
        </div>
        <p className="mt-8 text-[22px] font-black text-[#f5f0e4]">Você ainda não tem notificações.</p>
        <p className="mt-3 max-w-[360px] text-[15px] leading-6 text-[#f5f0e4]/58">
          Avisos importantes e atualizações da sua conta aparecerão aqui.
        </p>
      </div>

      <Link
        href="/dashboard/acompanhantes"
        className="client-primary-button mt-5 flex items-center justify-center text-[16px] no-underline"
      >
        Voltar para explorar
      </Link>
    </section>
  );
}

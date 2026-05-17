"use client";

import Link from "next/link";
import { MessageCircle, Search } from "lucide-react";

/* eslint-disable @next/next/no-img-element -- Local profile previews keep this route lightweight. */

const quickContacts = [
  { name: "Lora", city: "Sao Paulo", image: "/model.jpeg", slug: "lora" },
  { name: "Amanda R.", city: "Belo Horizonte", image: "/model1.jpg", slug: "amanda-r" },
  { name: "Leticia M.", city: "Rio de Janeiro", image: "/model2.jpg", slug: "leticia-m" },
];

export default function MensagensPage() {
  return (
    <main className="space-y-5 pb-24 md:pb-0">
      <section className="rounded-[8px] border border-white/10 bg-[#101012] p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-[8px] bg-[#d4a843]/12 text-[#f5d78c]">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-black text-white">Mensagens</h1>
            <p className="mt-1 text-sm text-white/50">Seus contatos aparecem aqui.</p>
          </div>
        </div>

        <Link
          href="/profissionais"
          className="mt-4 flex h-12 items-center gap-3 rounded-[8px] border border-white/10 bg-black/24 px-3 text-sm font-semibold text-white/52"
        >
          <Search className="h-4 w-4 text-[#f5d78c]" />
          Buscar profissionais
        </Link>
      </section>

      <section className="rounded-[8px] border border-white/10 bg-[#101012] p-4">
        <h2 className="mb-3 text-base font-black text-white">Comece uma conversa</h2>
        <div className="grid gap-2.5">
          {quickContacts.map((contact) => (
            <Link
              key={contact.slug}
              href={`/profissionais/${contact.slug}`}
              className="flex items-center gap-3 rounded-[8px] border border-white/10 bg-white/[0.045] p-2.5"
            >
              <div className="h-16 w-14 shrink-0 overflow-hidden rounded-[8px] bg-white/8">
                <img src={contact.image} alt={contact.name} className="h-full w-full object-cover object-top" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-white">{contact.name}</p>
                <p className="mt-1 text-xs text-white/50">{contact.city}</p>
                <p className="mt-1 text-xs font-bold text-[#f5d78c]">Ver perfil</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

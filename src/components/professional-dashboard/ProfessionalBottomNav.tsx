"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Crown, LayoutDashboard, List, PlusCircle } from "lucide-react";

const items = [
  { label: "Painel", href: "/profissional", icon: LayoutDashboard },
  { label: "Postar", href: "/profissional/fotos", icon: PlusCircle },
  { label: "Agenda", href: "/profissional/agenda", icon: CalendarDays },
  { label: "Listagem", href: "/profissionais", icon: List },
  { label: "Planos", href: "/profissional/planos", icon: Crown },
];

export function ProfessionalBottomNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#d4a843]/20 bg-[#070708]/96 px-2 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-18px_55px_rgba(0,0,0,0.42)] backdrop-blur-xl md:hidden" aria-label="Atalhos profissionais">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/profissional" ? pathname === item.href || pathname === "/painel/acompanhante" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-[8px] text-[11px] font-black no-underline transition ${
                active ? "bg-[#d4a843]/12 text-[#f5d78c]" : "text-white/45 hover:bg-white/[0.05] hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

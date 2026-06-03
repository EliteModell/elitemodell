"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crown, Grid2X2, List, PlusCircle, UserRound } from "lucide-react";

const items = [
  { label: "Painel", href: "/profissional", icon: Grid2X2 },
  { label: "Postar", href: "/profissional/postar", icon: PlusCircle },
  { label: "Listagem", href: "/profissional/listagem", icon: List },
  { label: "Planos", href: "/profissional/planos", icon: Crown },
  { label: "Perfil", href: "/profissional/perfil", icon: UserRound },
];

export function ProfessionalBottomNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav className="professional-bottom-nav md:hidden" aria-label="Atalhos profissionais">
      <div className="professional-bottom-nav-inner">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/profissional"
            ? pathname === item.href || pathname === "/painel/acompanhante"
            : pathname.startsWith(item.href);

          return (
            <Link key={item.href} href={item.href} className={active ? "active" : ""}>
              <Icon />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

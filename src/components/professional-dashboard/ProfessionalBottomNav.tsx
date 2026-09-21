"use client";

import { NoPrefetchLink as Link } from "@/components/NoPrefetchLink";
import { usePathname } from "next/navigation";
import { Crown, Grid2X2, List, PlusCircle, UserRound } from "lucide-react";
import styles from "@/app/(dashboard)/profissional/professional-dashboard.module.css";

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
    <nav className={styles.bottomNav} aria-label="Atalhos profissionais">
      <div className={styles.bottomNavInner}>
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/profissional"
            ? pathname === item.href || pathname === "/painel/acompanhante"
            : pathname.startsWith(item.href);

          return (
            <Link key={item.href} href={item.href} className={active ? styles.bottomNavActive : ""}>
              <Icon />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

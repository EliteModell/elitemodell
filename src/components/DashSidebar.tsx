"use client";

/* eslint-disable @next/next/no-img-element -- Avatars can be remote Google/Supabase URLs. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { signOut, useSession } from "next-auth/react";
import {
  BadgePlus,
  Building2,
  CalendarCheck,
  Crown,
  Heart,
  Home,
  LayoutDashboard,
  LogOut,
  Sparkles,
  TicketPercent,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { supabaseAuth } from "@/lib/supabase-client";

type NavItem = { label: string; href: string; icon: React.ReactNode };

const guestNav: NavItem[] = [
  { label: "Início", href: "/dashboard", icon: <LayoutDashboard className="h-[15px] w-[15px]" /> },
  { label: "Reservas", href: "/dashboard/reservas", icon: <CalendarCheck className="h-[15px] w-[15px]" /> },
  { label: "Favoritos", href: "/dashboard/favoritos", icon: <Heart className="h-[15px] w-[15px]" /> },
  { label: "Meu perfil", href: "/dashboard/perfil", icon: <UserRound className="h-[15px] w-[15px]" /> },
];

const hostNav: NavItem[] = [
  { label: "Painel", href: "/anfitriao", icon: <LayoutDashboard className="h-[15px] w-[15px]" /> },
  { label: "Imóveis", href: "/anfitriao/imoveis", icon: <Home className="h-[15px] w-[15px]" /> },
  { label: "Reservas", href: "/anfitriao/reservas", icon: <CalendarCheck className="h-[15px] w-[15px]" /> },
  { label: "Ganhos", href: "/anfitriao/ganhos", icon: <WalletCards className="h-[15px] w-[15px]" /> },
  { label: "Meu perfil", href: "/dashboard/perfil", icon: <UserRound className="h-[15px] w-[15px]" /> },
];

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: <LayoutDashboard className="h-[15px] w-[15px]" /> },
  { label: "Usuários", href: "/admin/usuarios", icon: <UsersRound className="h-[15px] w-[15px]" /> },
  { label: "Imóveis", href: "/admin/imoveis", icon: <Building2 className="h-[15px] w-[15px]" /> },
  { label: "Profissionais", href: "/admin/profissionais", icon: <UserRound className="h-[15px] w-[15px]" /> },
  { label: "Reservas", href: "/admin/reservas", icon: <CalendarCheck className="h-[15px] w-[15px]" /> },
  { label: "Cupons", href: "/admin/cupons", icon: <TicketPercent className="h-[15px] w-[15px]" /> },
];

const professionalNav: NavItem[] = [
  { label: "Painel", href: "/profissional", icon: <LayoutDashboard className="h-[15px] w-[15px]" /> },
  { label: "Meu perfil", href: "/profissional/perfil", icon: <UserRound className="h-[15px] w-[15px]" /> },
  { label: "Planos", href: "/profissional/planos", icon: <Crown className="h-[15px] w-[15px]" /> },
  { label: "Fotos", href: "/profissional/fotos", icon: <Sparkles className="h-[15px] w-[15px]" /> },
  { label: "Agenda", href: "/profissional/agenda", icon: <CalendarCheck className="h-[15px] w-[15px]" /> },
  { label: "Agendamentos", href: "/profissional/agendamentos", icon: <UsersRound className="h-[15px] w-[15px]" /> },
  { label: "Novo anúncio", href: "/profissional/novo", icon: <BadgePlus className="h-[15px] w-[15px]" /> },
];

function initials(name?: string | null) {
  if (!name) return "EM";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function roleBadge(role?: string) {
  if (role === "ADMIN") return "Administrador";
  if (role === "HOST") return "Anfitrião";
  if (role === "PROFESSIONAL") return "Profissional";
  return "Membro Elite";
}

interface Props {
  mobileOpen: boolean;
  onClose: () => void;
}

export default function DashSidebar({ mobileOpen, onClose }: Props) {
  const { data: session } = useSession();
  const pathname = usePathname();

  async function handleSignOut() {
    await supabaseAuth.auth.signOut();
    await signOut({ callbackUrl: "/" });
  }

  const role = session?.user?.role;
  const path = pathname ?? "";
  const isProfessionalArea = path.startsWith("/profissional");
  const nav =
    role === "ADMIN"
      ? adminNav
      : isProfessionalArea
        ? professionalNav
        : role === "HOST"
          ? hostNav
          : guestNav;

  return (
    <>
      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm md:hidden"
          />
        ) : null}
      </AnimatePresence>

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col border-r border-white/[0.06] bg-[#060608] transition-transform duration-300 ease-in-out md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-[60px] shrink-0 items-center border-b border-white/[0.06] px-5">
          <Link href="/" onClick={onClose} className="flex items-center gap-2.5 no-underline">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#d4a843]/10 text-[13px] font-bold text-[#d4a843]">
              E
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.015em] text-white">
              elite<span className="text-white/30">modell</span>
            </span>
          </Link>
        </div>

        {/* User */}
        <div className="shrink-0 border-b border-white/[0.06] px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-white/[0.06]">
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name ?? "Avatar"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white/45">
                  {initials(session?.user?.name)}
                </div>
              )}
              <span className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full border border-[#060608] bg-[#d4a843]" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-white">
                {session?.user?.name ?? "Perfil Elite"}
              </p>
              <p className="mt-0.5 text-[11px] text-white/30">{roleBadge(role)}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-[0.18em] text-white/18">
            Menu
          </p>
          <div className="space-y-0.5">
            {nav.map((navItem) => {
              const active =
                path === navItem.href ||
                (navItem.href !== "/dashboard" &&
                  navItem.href !== "/anfitriao" &&
                  navItem.href !== "/admin" &&
                  path.startsWith(navItem.href));

              return (
                <Link
                  key={navItem.href}
                  href={navItem.href}
                  onClick={onClose}
                  className={`flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-all duration-150 ${
                    active
                      ? "bg-white/[0.07] font-medium text-white"
                      : "font-normal text-white/38 hover:bg-white/[0.04] hover:text-white/68"
                  }`}
                >
                  <span className={active ? "text-[#d4a843]" : "text-inherit"}>
                    {navItem.icon}
                  </span>
                  <span className="flex-1 truncate">{navItem.label}</span>
                  {active ? (
                    <span className="h-1 w-1 shrink-0 rounded-full bg-[#d4a843]" />
                  ) : null}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Logout */}
        <div className="shrink-0 border-t border-white/[0.06] p-3">
          <button
            onClick={handleSignOut}
            className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-white/28 transition hover:bg-white/[0.04] hover:text-white/55"
          >
            <LogOut className="h-[15px] w-[15px]" />
            Sair da conta
          </button>
        </div>
      </aside>
    </>
  );
}

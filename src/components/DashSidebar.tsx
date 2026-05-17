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
  Compass,
  Crown,
  Heart,
  Home,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Sparkles,
  TicketPercent,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { supabaseAuth } from "@/lib/supabase-client";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

type NavItem = { label: string; href: string; icon: React.ReactNode; accent?: string };

const guestNav: NavItem[] = [
  { label: "Início", href: ACCOUNT_ROUTES.painelCliente, icon: <LayoutDashboard className="h-4 w-4" />, accent: "Hoje" },
  { label: "Explorar", href: "/profissionais", icon: <Compass className="h-4 w-4" /> },
  { label: "Favoritas", href: "/dashboard/favoritos", icon: <Heart className="h-4 w-4" /> },
  { label: "Mensagens", href: "/dashboard/mensagens", icon: <MessageCircle className="h-4 w-4" /> },
  { label: "Perfil", href: "/dashboard/perfil", icon: <UserRound className="h-4 w-4" /> },
];

const hostNav: NavItem[] = [
  { label: "Painel", href: ACCOUNT_ROUTES.painelAnfitriao, icon: <LayoutDashboard className="h-4 w-4" />, accent: "Imóvel" },
  { label: "Meus espaços", href: "/anfitriao/imoveis", icon: <Home className="h-4 w-4" /> },
  { label: "Reservas", href: "/anfitriao/reservas", icon: <CalendarCheck className="h-4 w-4" /> },
  { label: "Ganhos", href: "/anfitriao/ganhos", icon: <WalletCards className="h-4 w-4" /> },
  { label: "Meu Perfil", href: "/dashboard/perfil", icon: <UserRound className="h-4 w-4" /> },
];

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: <LayoutDashboard className="h-4 w-4" />, accent: "Admin" },
  { label: "Usuários", href: "/admin/usuarios", icon: <UsersRound className="h-4 w-4" /> },
  { label: "Espaços", href: "/admin/imoveis", icon: <Building2 className="h-4 w-4" /> },
  { label: "Profissionais", href: "/admin/profissionais", icon: <UserRound className="h-4 w-4" /> },
  { label: "Reservas", href: "/admin/reservas", icon: <CalendarCheck className="h-4 w-4" /> },
  { label: "Cupons", href: "/admin/cupons", icon: <TicketPercent className="h-4 w-4" /> },
];

const professionalNav: NavItem[] = [
  { label: "Painel", href: ACCOUNT_ROUTES.painelAcompanhante, icon: <LayoutDashboard className="h-4 w-4" />, accent: "Pro" },
  { label: "Meu perfil", href: "/profissional/perfil", icon: <UserRound className="h-4 w-4" /> },
  { label: "Planos", href: "/profissional/planos", icon: <Crown className="h-4 w-4" /> },
  { label: "Fotos", href: "/profissional/fotos", icon: <Sparkles className="h-4 w-4" /> },
  { label: "Agenda", href: "/profissional/agenda", icon: <CalendarCheck className="h-4 w-4" /> },
  { label: "Agendamentos", href: "/profissional/agendamentos", icon: <UsersRound className="h-4 w-4" /> },
  { label: "Perfil de anunciante", href: "/profissional/perfil", icon: <BadgePlus className="h-4 w-4" /> },
];

interface Props {
  mobileOpen: boolean;
  onClose: () => void;
}

function initials(name?: string | null) {
  if (!name) return "EM";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function roleLabel(role?: string) {
  if (role === "ADMIN") return "Administrador";
  if (role === "HOST") return "Anunciante";
  return "Cliente premium";
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
    role === "ADMIN" ? adminNav : isProfessionalArea ? professionalNav : role === "HOST" ? hostNav : guestNav;

  return (
    <>
      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/78 backdrop-blur-sm md:hidden"
          />
        ) : null}
      </AnimatePresence>

      <aside
        className={`dash-sidebar fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-white/10 bg-[#070708]/92 shadow-[24px_0_90px_rgba(0,0,0,0.42)] backdrop-blur-2xl transition-transform duration-300 md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(245,215,140,0.9),transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(212,168,67,0.08),transparent_34%,rgba(204,31,47,0.08))]" />

        <div className="relative border-b border-white/10 p-5">
          <Link href="/" onClick={onClose} className="inline-flex items-center gap-2 no-underline">
            <span className="grid h-10 w-10 place-items-center rounded-[8px] border border-[#d4a843]/30 bg-[#d4a843]/10 text-sm font-black text-[#f5d78c]">
              EM
            </span>
            <span className="text-xl font-black tracking-[-0.02em]">
              <span className="bg-[linear-gradient(135deg,#ffe5a0,#d4a843_30%,#f5d78c_58%,#9e7b2a)] bg-clip-text text-transparent">
                elite
              </span>
              <span className="text-white">modell</span>
            </span>
          </Link>
        </div>

        <div className="relative border-b border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[8px] border border-[#d4a843]/28 bg-[#d4a843]/12">
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name ?? "Avatar"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-sm font-black text-[#f5d78c]">
                  {initials(session?.user?.name)}
                </div>
              )}
              <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border border-[#070708] bg-[#d4a843]" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-white">{session?.user?.name ?? "Perfil Elite"}</p>
              <p className="mt-0.5 truncate text-xs text-white/42">{session?.user?.email ?? roleLabel(role)}</p>
              <p className="mt-2 inline-flex items-center gap-1 rounded-full border border-[#d4a843]/20 bg-[#d4a843]/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#f5d78c]">
                <Crown className="h-3 w-3" />
                {roleLabel(role)}
              </p>
            </div>
          </div>
        </div>

        <nav className="relative flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.26em] text-white/28">
            {isProfessionalArea ? "Área profissional" : role === "HOST" ? "Área anunciante" : "Área cliente"}
          </p>
          <div className="space-y-1.5">
            {nav.map((navItem) => {
              const active =
                path === navItem.href ||
                (navItem.href === ACCOUNT_ROUTES.painelCliente && path === ACCOUNT_ROUTES.dashboardCliente) ||
                (navItem.href === ACCOUNT_ROUTES.painelAnfitriao && path === ACCOUNT_ROUTES.dashboardAnfitriao) ||
                (navItem.href === ACCOUNT_ROUTES.painelAcompanhante && path === ACCOUNT_ROUTES.dashboardAcompanhante) ||
                (navItem.href !== ACCOUNT_ROUTES.painelCliente &&
                  navItem.href !== ACCOUNT_ROUTES.painelAnfitriao &&
                  navItem.href !== ACCOUNT_ROUTES.painelAcompanhante &&
                  navItem.href !== "/admin" &&
                  path.startsWith(navItem.href));

              return (
                <Link
                  key={navItem.href}
                  href={navItem.href}
                  onClick={onClose}
                  className={`group relative flex h-11 items-center gap-3 rounded-[8px] px-3 text-sm font-bold transition ${
                    active
                      ? "border border-[#d4a843]/25 bg-[#d4a843]/12 text-white shadow-[0_12px_34px_rgba(212,168,67,0.08)]"
                      : "border border-transparent text-white/48 hover:border-white/8 hover:bg-white/[0.045] hover:text-white/82"
                  }`}
                >
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-[8px] transition ${
                      active ? "bg-[#d4a843]/15 text-[#f5d78c]" : "bg-white/[0.04] text-white/42 group-hover:text-[#f5d78c]"
                    }`}
                  >
                    {navItem.icon}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{navItem.label}</span>
                  {navItem.accent ? (
                    <span className="rounded-full bg-[#cc1f2f]/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#ff9aa4]">
                      {navItem.accent}
                    </span>
                  ) : null}
                  {active ? (
                    <motion.span
                      layoutId="sidebar-active"
                      className="absolute right-2 h-1.5 w-1.5 rounded-full bg-[#d4a843] shadow-[0_0_18px_rgba(212,168,67,0.95)]"
                    />
                  ) : null}
                </Link>
              );
            })}
          </div>

          {isProfessionalArea ? (
            <div className="mt-5 rounded-[8px] border border-[#d4a843]/18 bg-[linear-gradient(135deg,rgba(212,168,67,0.10),rgba(204,31,47,0.06))] p-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f5d78c]">
                Perfil profissional
              </p>
              <p className="mt-2 text-xs leading-5 text-white/48">
                Gerencie agenda, fotos, disponibilidade e presença premium.
              </p>
              <Link
                href="/profissional/perfil"
                onClick={onClose}
                className="mt-3 inline-flex w-full items-center justify-center rounded-[8px] bg-[#d4a843] px-3 py-2 text-xs font-black text-[#100d09] transition hover:bg-[#f5d78c]"
              >
                Atualizar perfil
              </Link>
            </div>
          ) : role === "GUEST" ? (
            <div className="mt-5 rounded-[8px] border border-[#d4a843]/18 bg-[linear-gradient(135deg,rgba(212,168,67,0.10),rgba(204,31,47,0.06))] p-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f5d78c]">
                Encontre profissionais
              </p>
              <p className="mt-2 text-xs leading-5 text-white/48">
                Veja perfis verificados, favoritas e mensagens em poucos toques.
              </p>
              <Link
                href="/profissionais"
                onClick={onClose}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-[#d4a843] px-3 py-2 text-xs font-black text-[#100d09] transition hover:bg-[#f5d78c]"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Ver profissionais
              </Link>
            </div>
          ) : null}
        </nav>

        <div className="relative border-t border-white/10 p-3">
          <button
            onClick={handleSignOut}
            className="flex h-11 w-full items-center gap-3 rounded-[8px] px-3 text-sm font-bold text-white/45 transition hover:bg-[#cc1f2f]/10 hover:text-[#ff9aa4]"
          >
            <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-white/[0.04]">
              <LogOut className="h-4 w-4" />
            </span>
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}

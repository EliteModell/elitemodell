"use client";

/* eslint-disable @next/next/no-img-element -- User avatars can come from uploaded public URLs. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import {
  Bell,
  ChevronRight,
  CircleHelp,
  Clock3,
  CreditCard,
  Heart,
  Info,
  LayoutDashboard,
  List,
  LogOut,
  Menu,
  Search,
  Settings,
  Star,
  Users,
  Video,
  UserRound,
  X,
} from "lucide-react";
import { supabaseAuth } from "@/lib/supabase-client";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

function initials(name?: string | null) {
  if (!name) return "EM";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function BrandLogo() {
  return (
    <Link href={ACCOUNT_ROUTES.mainClientFeed} className="relative inline-flex items-center no-underline" aria-label="Elite Modell">
      <span className="relative inline-flex items-center rounded-[8px] border border-[#d4a843]/30 bg-white/[0.045] px-3 py-1.5 shadow-[0_12px_28px_rgba(0,0,0,0.22)]">
        <span className="pointer-events-none absolute -right-1 -top-2 select-none text-[12px] leading-none text-[#f5d78c]">✦</span>
        <span className="text-[18px] font-black leading-none">
          <span className="bg-[linear-gradient(135deg,#ffe5a0_0%,#d4a843_42%,#f5d78c_100%)] bg-clip-text text-transparent">elite</span>
          <span className="text-[#f5f0e4]">modell</span>
        </span>
      </span>
    </Link>
  );
}

export function LocationSearchBar() {
  return (
    <Link
      href={ACCOUNT_ROUTES.mainClientFeed}
      className="client-input flex h-[48px] items-center px-4 text-[14px] no-underline"
    >
      <Search className="mr-2 h-4 w-4 shrink-0 text-[#d4a843]" />
      <span className="min-w-0 flex-1 truncate text-[#f5f0e4]/62">Explorar por cidade, nome ou estilo</span>
    </Link>
  );
}

export function MobileHeader({
  onMenu,
  backHref,
}: {
  onMenu: () => void;
  backHref?: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#d4a843]/14 bg-[#08090a]/88 shadow-[0_12px_38px_rgba(0,0,0,0.26)] backdrop-blur-2xl">
      <div className="mx-auto max-w-[760px] px-4 pb-3 pt-3">
        <div className="grid h-11 grid-cols-[44px_1fr_44px] items-center">
          {backHref ? (
            <Link href={backHref} className="grid h-10 w-10 place-items-center rounded-[8px] border border-white/10 bg-white/[0.045] text-[#f5f0e4]/72" aria-label="Voltar">
              <ChevronRight className="h-6 w-6 rotate-180" />
            </Link>
          ) : (
            <button type="button" onClick={onMenu} className="grid h-10 w-10 place-items-center rounded-[8px] border border-white/10 bg-white/[0.045] text-[#f5f0e4]/72" aria-label="Abrir menu">
              <Menu className="h-6 w-6" />
            </button>
          )}
          <div className="flex justify-center">
            <BrandLogo />
          </div>
          <Link href="/notifications" className="grid h-10 w-10 place-items-center justify-self-end rounded-[8px] border border-white/10 bg-white/[0.045] text-[#f5f0e4]/72" aria-label="Notificações">
            <Bell className="h-5 w-5" />
          </Link>
        </div>
        <div className="mt-3">
          <LocationSearchBar />
        </div>
      </div>
    </header>
  );
}

function DrawerItem({
  href,
  icon,
  label,
  active,
  expandable,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  expandable?: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`mx-3 flex min-h-[52px] items-center gap-3 rounded-[8px] px-3 text-[14px] no-underline transition-colors active:bg-white/10 ${
        active ? "border border-[#d4a843]/26 bg-[#d4a843]/12 font-bold text-[#f5d78c]" : "text-[#f5f0e4]/72"
      }`}
    >
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[8px] ${active ? "bg-[#d4a843]/16 text-[#f5d78c]" : "bg-white/[0.045] text-[#f5f0e4]/52"}`}>{icon}</span>
      <span className="min-w-0 flex-1">{label}</span>
      {expandable ? <span className="text-[16px] leading-none text-[#f5f0e4]/34">›</span> : null}
    </Link>
  );
}

export function SideDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: session } = useSession();
  const pathname = usePathname();

  async function handleSignOut() {
    await supabaseAuth.auth.signOut();
    await signOut({ callbackUrl: "/" });
  }

  const nav = [
    { href: "/dashboard/acompanhantes", label: "Explorar acompanhantes", icon: <Users className="h-5 w-5" /> },
    { href: "/dashboard/shots", label: "Shots", icon: <Video className="h-5 w-5" /> },
    { href: "/dashboard/favoritos", label: "Listas e favoritos", icon: <List className="h-5 w-5" /> },
    { href: "/dashboard/avaliacoes", label: "Avaliações", icon: <Star className="h-5 w-5" /> },
    { href: "/dashboard", label: "Painel da conta", icon: <LayoutDashboard className="h-5 w-5" /> },
    { href: "/dashboard/perfil", label: "Perfil", icon: <UserRound className="h-5 w-5" /> },
    { href: "/dashboard/reservas", label: "Histórico", icon: <Clock3 className="h-5 w-5" /> },
    { href: "/dashboard/planos", label: "Elite Premium", icon: <Star className="h-5 w-5" /> },
    { href: "/dashboard/carteira", label: "Carteira", icon: <CreditCard className="h-5 w-5" /> },
    { href: "/dashboard/configuracoes", label: "Configurações", icon: <Settings className="h-5 w-5" />, expandable: true },
    { href: "/dashboard/atendimento", label: "Atendimento", icon: <CircleHelp className="h-5 w-5" />, expandable: true },
    { href: "/dashboard/informacoes", label: "Informações importantes", icon: <Info className="h-5 w-5" />, expandable: true },
  ];

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[84vw] max-w-[390px] overflow-y-auto border-r border-[#d4a843]/14 bg-[#090a0b] shadow-[26px_0_80px_rgba(0,0,0,0.48)] transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="sticky top-0 z-10 border-b border-white/10 bg-[#090a0b]/92 px-4 py-3 backdrop-blur-2xl">
          <div className="grid grid-cols-[40px_1fr_40px] items-center">
            <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-[8px] border border-white/10 bg-white/[0.045] text-[#f5f0e4]/72" aria-label="Fechar menu">
              <X className="h-5 w-5" />
            </button>
            <div className="flex justify-center">
              <BrandLogo />
            </div>
            <Link href="/notifications" onClick={onClose} className="grid h-9 w-9 place-items-center justify-self-end rounded-[8px] border border-white/10 bg-white/[0.045] text-[#f5f0e4]/72" aria-label="Notificações">
              <Bell className="h-5 w-5" />
            </Link>
          </div>
        </div>

        {/* User info */}
        <div className="mx-3 mt-4 flex items-center gap-3.5 rounded-[8px] border border-[#d4a843]/16 bg-white/[0.055] p-4">
          <div className="h-[58px] w-[58px] shrink-0 overflow-hidden rounded-full border-2 border-[#d4a843]/50 bg-[#1b1d1f] shadow-[0_0_32px_rgba(212,168,67,0.14)]">
            {session?.user?.image ? (
              <img src={session.user.image} alt={session.user.name ?? "Avatar"} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-[17px] font-black text-[#f5d78c]">{initials(session?.user?.name)}</div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[16px] font-bold text-[#f5f0e4]">{session?.user?.name ?? "Cliente Elite"}</p>
            <p className="mt-0.5 truncate text-[12px] text-[#f5f0e4]/48">{session?.user?.email ?? "Conta discreta"}</p>
            <p className="mt-2 inline-flex rounded-full border border-[#d4a843]/22 bg-[#d4a843]/10 px-2.5 py-1 text-[10px] font-bold uppercase text-[#f5d78c]">
              acesso cliente
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-4 space-y-1 pb-2">
          {nav.map((item) => (
            <DrawerItem
              key={`${item.href}-${item.label}`}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href + "/"))}
              expandable={item.expandable}
              onClick={onClose}
            />
          ))}
          <button
            type="button"
            onClick={handleSignOut}
            className="mx-3 flex min-h-[52px] w-[calc(100%-1.5rem)] items-center gap-3 rounded-[8px] px-3 text-left text-[14px] font-medium text-[#f5f0e4]/72 transition-colors active:bg-white/10"
          >
            <span className="grid h-9 w-9 place-items-center rounded-[8px] bg-white/[0.045] text-[#f5f0e4]/52">
              <LogOut className="h-5 w-5" />
            </span>
            Sair
          </button>
        </nav>

        {/* Footer */}
        <div className="px-5 pb-8 pt-6 text-center">
          <p className="text-[11px] font-bold uppercase text-[#f5f0e4]/45">
            Siga a <span className="text-[#f5d78c]">Elite Modell</span>
          </p>
          <div className="mt-4 flex justify-center gap-3">
            {["IG", "X", "TG", "TK"].map((item) => (
              <span key={item} className="grid h-9 w-9 place-items-center rounded-full border border-[#d4a843]/18 bg-white/[0.045] text-[10px] font-black text-[#f5d78c]">
                {item}
              </span>
            ))}
          </div>
          <div className="mt-5 flex justify-center gap-5 text-[12px] text-[#f5f0e4]/46">
            <Link href="/terms" onClick={onClose} className="text-inherit underline">Termos</Link>
            <Link href="/privacy" onClick={onClose} className="text-inherit underline">Privacidade</Link>
          </div>
        </div>
      </aside>
    </>
  );
}

export function ClientBottomNav() {
  const pathname = usePathname();
  const items = [
    { href: "/dashboard/acompanhantes", label: "Explorar", icon: <Users className="h-[22px] w-[22px]" /> },
    { href: "/dashboard/shots", label: "Shots", icon: <Video className="h-[22px] w-[22px]" /> },
    { href: "/dashboard/favoritos", label: "Listas", icon: <Heart className="h-[22px] w-[22px]" /> },
    { href: "/dashboard", label: "Painel", icon: <LayoutDashboard className="h-[22px] w-[22px]" /> },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] md:hidden">
      <div className="mx-auto grid h-[66px] max-w-[720px] grid-cols-4 rounded-[8px] border border-[#d4a843]/18 bg-[#090a0b]/92 p-1 shadow-[0_-18px_50px_rgba(0,0,0,0.36)] backdrop-blur-2xl">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname?.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center gap-1 rounded-[8px] text-[10px] font-bold no-underline transition-colors ${
                active ? "bg-[#d4a843]/14 text-[#f5d78c]" : "text-[#f5f0e4]/46"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function ClientAreaShell({
  children,
  backHref,
}: {
  children: React.ReactNode;
  backHref?: string;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="client-premium min-h-screen">
      <MobileHeader onMenu={() => setDrawerOpen(true)} backHref={backHref} />
      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <main className="client-shell-content mx-auto w-full max-w-[760px] pb-[calc(86px+env(safe-area-inset-bottom)+12px)]">
        {children}
      </main>
      <ClientBottomNav />
      <style>{`
        body { background: #070809; }
      `}</style>
    </div>
  );
}

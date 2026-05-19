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
    <Link href="/dashboard" className="relative inline-flex items-center no-underline" aria-label="Elite Modell">
      <span className="relative inline-flex items-center rounded-[8px] border border-[#c9a84c]/30 bg-[#c9a84c]/[0.06] px-3 py-1.5">
        <span className="pointer-events-none absolute -right-1 -top-2.5 select-none text-[13px] leading-none text-[#c9a84c]">✦</span>
        <span className="text-[18px] font-black leading-none tracking-[-0.04em]">
          <span className="bg-[linear-gradient(135deg,#c9a84c_0%,#a9822d_50%,#c9a84c_100%)] bg-clip-text text-transparent">elite</span>
          <span className="text-[#202a30]">modell</span>
        </span>
      </span>
    </Link>
  );
}

export function LocationSearchBar() {
  return (
    <Link
      href="/buscar"
      className="flex h-[50px] items-center rounded-[10px] border border-[#d0d7da] bg-white px-4 text-[15px] text-[#7a858b] no-underline shadow-[0_1px_4px_rgba(30,42,48,0.06)]"
    >
      <span className="min-w-0 flex-1 truncate">Selecionar cidade</span>
      <Search className="h-5 w-5 shrink-0 text-[#202a30]" />
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
    <header className="sticky top-0 z-30 border-b border-[#c9a84c]/20 bg-white shadow-[0_1px_8px_rgba(20,31,36,0.07)]">
      <div className="mx-auto max-w-[760px] px-4 pb-3 pt-4">
        <div className="grid h-11 grid-cols-[44px_1fr_44px] items-center">
          {backHref ? (
            <Link href={backHref} className="grid h-10 w-10 place-items-center text-[#64727a]" aria-label="Voltar">
              <ChevronRight className="h-6 w-6 rotate-180" />
            </Link>
          ) : (
            <button type="button" onClick={onMenu} className="grid h-10 w-10 place-items-center text-[#64727a]" aria-label="Abrir menu">
              <Menu className="h-6 w-6" />
            </button>
          )}
          <div className="flex justify-center">
            <BrandLogo />
          </div>
          <Link href="/notifications" className="grid h-10 w-10 place-items-center justify-self-end text-[#60747b]" aria-label="Notificações">
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
      className={`flex min-h-[56px] items-center gap-3.5 border-b border-[#e8edef] px-5 text-[15px] no-underline transition-colors active:bg-[#f5f8f9] ${
        active ? "font-semibold text-[#a9822d]" : "font-medium text-[#1f2a30]"
      }`}
    >
      <span className={`grid h-6 w-6 shrink-0 place-items-center ${active ? "text-[#a9822d]" : "text-[#5a6a71]"}`}>{icon}</span>
      <span className="min-w-0 flex-1">{label}</span>
      {expandable ? <span className="text-[16px] leading-none text-[#9aabaf]">›</span> : null}
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
    { href: "/dashboard", label: "Painel", icon: <LayoutDashboard className="h-[18px] w-[18px]" /> },
    { href: "/dashboard/perfil", label: "Perfil", icon: <UserRound className="h-[18px] w-[18px]" /> },
    { href: "/dashboard/favoritos", label: "Listas", icon: <List className="h-[18px] w-[18px]" /> },
    { href: "/dashboard/reservas", label: "Histórico", icon: <Clock3 className="h-[18px] w-[18px]" /> },
    { href: "/profissionais", label: "Acompanhantes", icon: <Heart className="h-[18px] w-[18px]" /> },
    { href: "/dashboard/planos", label: "Seja Elite Premium", icon: <Star className="h-[18px] w-[18px]" /> },
    { href: "/dashboard/carteira", label: "Carteira", icon: <CreditCard className="h-[18px] w-[18px]" /> },
    { href: "/dashboard/planos", label: "Gerenciar planos", icon: <Settings className="h-[18px] w-[18px]" /> },
    { href: "/dashboard/configuracoes", label: "Configurações do cadastro", icon: <Settings className="h-[18px] w-[18px]" />, expandable: true },
    { href: "/dashboard/atendimento", label: "Central de Atendimento", icon: <CircleHelp className="h-[18px] w-[18px]" />, expandable: true },
    { href: "/dashboard/informacoes", label: "Informações importantes", icon: <Info className="h-[18px] w-[18px]" />, expandable: true },
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
        className={`fixed inset-y-0 left-0 z-50 w-[80vw] max-w-[380px] overflow-y-auto bg-[#f5f8f9] shadow-[20px_0_60px_rgba(16,24,28,0.22)] transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="sticky top-0 z-10 border-b border-[#dde3e5] bg-white/96 px-4 py-3 backdrop-blur">
          <div className="grid grid-cols-[40px_1fr_40px] items-center">
            <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center text-[#64727a]" aria-label="Fechar menu">
              <X className="h-5 w-5" />
            </button>
            <div className="flex justify-center">
              <BrandLogo />
            </div>
            <Link href="/notifications" onClick={onClose} className="grid h-9 w-9 place-items-center justify-self-end text-[#60747b]" aria-label="Notificações">
              <Bell className="h-5 w-5" />
            </Link>
          </div>
        </div>

        {/* User info */}
        <div className="flex items-center gap-3.5 border-b border-[#dde3e5] bg-white px-5 py-5">
          <div className="h-[60px] w-[60px] shrink-0 overflow-hidden rounded-full border-2 border-[#c9a84c]/40 bg-[#d7dee1] shadow-sm">
            {session?.user?.image ? (
              <img src={session.user.image} alt={session.user.name ?? "Avatar"} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-[17px] font-black text-[#8b6b25]">{initials(session?.user?.name)}</div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[16px] font-bold text-[#1f2a30]">{session?.user?.name ?? "Cliente Elite"}</p>
            <p className="mt-0.5 truncate text-[12px] text-[#6a7a81]">{session?.user?.email ?? "Conta discreta"}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-2 bg-white">
          {nav.map((item) => (
            <DrawerItem
              key={`${item.href}-${item.label}`}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={pathname === item.href && item.href !== "/dashboard/planos"}
              expandable={item.expandable}
              onClick={onClose}
            />
          ))}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex min-h-[56px] w-full items-center gap-3.5 border-b border-[#e8edef] px-5 text-left text-[15px] font-medium text-[#1f2a30] transition-colors active:bg-[#f5f8f9]"
          >
            <span className="grid h-6 w-6 place-items-center text-[#5a6a71]">
              <LogOut className="h-[18px] w-[18px]" />
            </span>
            Sair
          </button>
        </nav>

        {/* Footer */}
        <div className="px-5 py-8 text-center">
          <p className="text-[12px] uppercase tracking-[0.14em] text-[#5c686e]">
            Siga a <span className="font-bold text-[#a9822d]">Elite Modell</span>
          </p>
          <div className="mt-4 flex justify-center gap-3">
            {["IG", "FB", "X", "SP", "TG", "TK"].map((item) => (
              <span key={item} className="grid h-8 w-8 place-items-center rounded-full bg-[#e8eef0] text-[10px] font-black text-[#4a5a61] shadow-sm">
                {item}
              </span>
            ))}
          </div>
          <div className="mt-5 flex justify-center gap-5 text-[12px] text-[#56646b]">
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
    { href: "/dashboard", label: "Meu painel", icon: <LayoutDashboard className="h-[22px] w-[22px]" /> },
    { href: "/dashboard/acompanhantes", label: "Acompanhantes", icon: <Users className="h-[22px] w-[22px]" /> },
    { href: "/dashboard/shots", label: "Shots", icon: <Video className="h-[22px] w-[22px]" /> },
    { href: "/dashboard/avaliacoes", label: "Avaliações", icon: <Star className="h-[22px] w-[22px]" /> },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#d7dddf] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(19,31,36,0.09)] md:hidden">
      <div className="mx-auto grid h-[62px] max-w-[760px] grid-cols-4">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname?.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center gap-1 text-[11px] font-semibold no-underline ${
                active ? "text-[#a9822d]" : "text-[#6b7a81]"
              }`}
            >
              {active ? (
                <span className="absolute left-[22%] right-[22%] top-0 h-[2.5px] rounded-b-full bg-[#c9a84c]" />
              ) : null}
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
    <div className="min-h-screen bg-[#f0f3f5] text-[#202a30]">
      <MobileHeader onMenu={() => setDrawerOpen(true)} backHref={backHref} />
      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <main className="mx-auto w-full max-w-[760px] pb-[calc(62px+env(safe-area-inset-bottom)+12px)]">
        {children}
      </main>
      <ClientBottomNav />
      <style>{`
        body { background: #f0f3f5; }
      `}</style>
    </div>
  );
}

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
  Compass,
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

function InstagramMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

function XMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M5 4h4.2l3.4 4.9L16.8 4H20l-5.9 6.8L21 20h-4.2l-3.9-5.5L8.2 20H5l6.4-7.4L5 4Zm2.2 1.8 10.5 12.5h1.1L8.3 5.8H7.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function TelegramMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M21 4.7 18 19.1c-.2 1-1 1.2-1.8.7l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.4-4.9 8.9-8c.4-.3-.1-.5-.6-.2L5.7 12.8.9 11.3c-1-.3-1-1 .2-1.5L19.8 2.6c.9-.3 1.6.2 1.2 2.1Z"
        fill="currentColor"
      />
    </svg>
  );
}

function TikTokMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M15.4 3c.4 3 2.1 4.8 4.9 5v3.3a8.3 8.3 0 0 1-4.8-1.5v5.9c0 3.2-2.2 5.4-5.4 5.4-3 0-5.4-2.1-5.4-5.1 0-3.3 2.5-5.5 6.2-5.2v3.4c-1.7-.3-2.8.4-2.8 1.8 0 1.2.9 2 2.1 2 1.3 0 2-.8 2-2.4V3h3.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

const socialLinks = [
  { label: "Instagram", icon: <InstagramMark /> },
  { label: "X", icon: <XMark /> },
  { label: "Telegram", icon: <TelegramMark /> },
  { label: "TikTok", icon: <TikTokMark /> },
];

/* ─── Search bar in header ─── */
export function LocationSearchBar() {
  return (
    <Link
      href={ACCOUNT_ROUTES.mainClientFeed}
      className="group flex min-h-[50px] items-center gap-3 rounded-[10px] border border-white/[0.10] bg-white/[0.07] px-4 text-[14px] no-underline backdrop-blur-sm transition-all duration-200 active:scale-[0.985] active:bg-white/[0.10]"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[7px] border border-[#d4a843]/22 bg-[#d4a843]/14 text-[#f5d78c] transition-transform duration-200 group-active:scale-105">
        <Search className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-[#f5f0e4]/55">
        Cidade, nome ou estilo
      </span>
      <span className="shrink-0 rounded-[7px] border border-[#d4a843]/28 bg-[#d4a843]/16 px-3 py-1.5 text-[11px] font-black uppercase text-[#f5d78c]">
        Buscar
      </span>
    </Link>
  );
}

/* ─── Mobile sticky header ─── */
export function MobileHeader({
  onMenu,
  backHref,
}: {
  onMenu: () => void;
  backHref?: string;
}) {
  const pathname = usePathname();
  const isExplore = pathname === ACCOUNT_ROUTES.mainClientFeed;
  const isShots = pathname === "/dashboard/shots";
  const showHeaderSearch = !isExplore && !isShots;

  return (
    <header className="sticky top-0 z-30 border-b border-[#d4a843]/14 bg-[#08090a]/92 shadow-[0_16px_46px_rgba(0,0,0,0.30)] backdrop-blur-2xl">
      <div className={`mx-auto max-w-[760px] px-4 pt-4 ${isExplore ? "pb-3" : "pb-4"}`}>
        <div className="grid h-11 grid-cols-[44px_1fr_44px] items-center">
          {backHref ? (
            <Link
              href={backHref}
              className="grid h-10 w-10 place-items-center rounded-[8px] border border-white/10 bg-white/[0.045] text-[#f5f0e4]/72"
              aria-label="Voltar"
            >
              <ChevronRight className="h-6 w-6 rotate-180" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={onMenu}
              className="grid h-10 w-10 place-items-center rounded-[8px] border border-white/10 bg-white/[0.045] text-[#f5f0e4]/72 transition-colors active:bg-white/10"
              aria-label="Abrir menu"
            >
              <Menu className="h-6 w-6" />
            </button>
          )}
          <div className="flex justify-center">
            <BrandLogo />
          </div>
          <Link
            href="/notifications"
            className="grid h-10 w-10 place-items-center justify-self-end rounded-[8px] border border-white/10 bg-white/[0.045] text-[#f5f0e4]/72"
            aria-label="Notificações"
          >
            <Bell className="h-5 w-5" />
          </Link>
        </div>
        {showHeaderSearch && (
          <div className="mt-4">
            <LocationSearchBar />
          </div>
        )}
      </div>
    </header>
  );
}

/* ─── Drawer nav item ─── */
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
      className={`mx-3 flex min-h-[50px] items-center gap-3 rounded-[8px] px-3 text-[14px] no-underline transition-all duration-150 active:scale-[0.98] active:bg-white/8 ${
        active
          ? "border border-[#d4a843]/26 bg-[#d4a843]/12 font-bold text-[#f5d78c]"
          : "text-[#f5f0e4]/70"
      }`}
    >
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-[8px] transition-colors ${
          active ? "bg-[#d4a843]/18 text-[#f5d78c]" : "bg-white/[0.045] text-[#f5f0e4]/50"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 leading-5">{label}</span>
      {expandable ? <ChevronRight className="h-4 w-4 text-[#f5f0e4]/28" /> : null}
    </Link>
  );
}

/* ─── Drawer section label ─── */
function DrawerSectionLabel({ label }: { label: string }) {
  return (
    <div className="mx-3 mb-1.5 mt-4 px-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#f5f0e4]/34">{label}</p>
    </div>
  );
}

/* ─── Side drawer ─── */
export function SideDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: session } = useSession();
  const pathname = usePathname();

  async function handleSignOut() {
    await supabaseAuth.auth.signOut();
    await signOut({ callbackUrl: "/" });
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === href;
    return pathname === href || pathname?.startsWith(href + "/");
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[84vw] max-w-[390px] overflow-y-auto border-r border-[#d4a843]/14 bg-[#090a0b] shadow-[26px_0_80px_rgba(0,0,0,0.52)] transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="sticky top-0 z-10 border-b border-white/8 bg-[#090a0b]/95 px-4 py-3 backdrop-blur-2xl">
          <div className="grid grid-cols-[40px_1fr_40px] items-center">
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-[8px] border border-white/10 bg-white/[0.045] text-[#f5f0e4]/72 transition-colors active:bg-white/10"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex justify-center">
              <BrandLogo />
            </div>
            <Link
              href="/notifications"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center justify-self-end rounded-[8px] border border-white/10 bg-white/[0.045] text-[#f5f0e4]/72"
              aria-label="Notificações"
            >
              <Bell className="h-5 w-5" />
            </Link>
          </div>
        </div>

        {/* User info card */}
        <div className="mx-3 mt-4 overflow-hidden rounded-[10px] border border-[#d4a843]/18 bg-gradient-to-br from-white/[0.07] to-[#d4a843]/[0.03] p-4 shadow-[0_14px_40px_rgba(0,0,0,0.22)]">
          <div className="flex items-center gap-3.5">
            <div className="relative h-[56px] w-[56px] shrink-0 overflow-hidden rounded-full border-2 border-[#d4a843]/52 bg-[#1b1d1f] shadow-[0_0_28px_rgba(212,168,67,0.16)]">
              {session?.user?.image ? (
                <img src={session.user.image} alt={session.user.name ?? "Avatar"} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-[17px] font-black text-[#f5d78c]">
                  {initials(session?.user?.name)}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold text-[#f5f0e4]">{session?.user?.name ?? "Cliente Elite"}</p>
              <p className="mt-0.5 truncate text-[12px] text-[#f5f0e4]/46">{session?.user?.email ?? "Conta discreta"}</p>
              <p className="mt-2 inline-flex rounded-full border border-[#d4a843]/22 bg-[#d4a843]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#f5d78c]">
                acesso cliente
              </p>
            </div>
          </div>
        </div>

        {/* Navigation with section groups */}
        <nav className="mt-3 pb-2">
          <DrawerSectionLabel label="Descoberta" />
          <DrawerItem href="/dashboard/acompanhantes" label="Explorar acompanhantes" icon={<Users className="h-5 w-5" />} active={isActive("/dashboard/acompanhantes")} onClick={onClose} />
          <DrawerItem href="/dashboard/shots" label="Shots" icon={<Video className="h-5 w-5" />} active={isActive("/dashboard/shots")} onClick={onClose} />

          <DrawerSectionLabel label="Coleções" />
          <DrawerItem href="/dashboard/favoritos" label="Listas e favoritos" icon={<List className="h-5 w-5" />} active={isActive("/dashboard/favoritos")} onClick={onClose} />
          <DrawerItem href="/dashboard/avaliacoes" label="Avaliações" icon={<Star className="h-5 w-5" />} active={isActive("/dashboard/avaliacoes")} onClick={onClose} />

          <DrawerSectionLabel label="Minha conta" />
          <DrawerItem href="/dashboard" label="Painel da conta" icon={<LayoutDashboard className="h-5 w-5" />} active={pathname === "/dashboard"} onClick={onClose} />
          <DrawerItem href="/dashboard/perfil" label="Perfil" icon={<UserRound className="h-5 w-5" />} active={isActive("/dashboard/perfil")} onClick={onClose} />
          <DrawerItem href="/dashboard/reservas" label="Histórico" icon={<Clock3 className="h-5 w-5" />} active={isActive("/dashboard/reservas")} onClick={onClose} />
          <DrawerItem href="/dashboard/planos" label="Elite Premium" icon={<Heart className="h-5 w-5" />} active={isActive("/dashboard/planos")} onClick={onClose} />
          <DrawerItem href="/dashboard/carteira" label="Carteira" icon={<CreditCard className="h-5 w-5" />} active={isActive("/dashboard/carteira")} onClick={onClose} />

          <DrawerSectionLabel label="Suporte" />
          <DrawerItem href="/dashboard/configuracoes" label="Configurações" icon={<Settings className="h-5 w-5" />} active={isActive("/dashboard/configuracoes")} expandable onClick={onClose} />
          <DrawerItem href="/dashboard/atendimento" label="Atendimento" icon={<CircleHelp className="h-5 w-5" />} active={isActive("/dashboard/atendimento")} expandable onClick={onClose} />
          <DrawerItem href="/dashboard/informacoes" label="Informações importantes" icon={<Info className="h-5 w-5" />} active={isActive("/dashboard/informacoes")} expandable onClick={onClose} />

          {/* Separator */}
          <div className="mx-3 my-3 h-px bg-white/[0.07]" />

          <button
            type="button"
            onClick={handleSignOut}
            className="mx-3 flex min-h-[50px] w-[calc(100%-1.5rem)] items-center gap-3 rounded-[8px] px-3 text-left text-[14px] font-medium text-[#f5f0e4]/62 transition-all duration-150 active:scale-[0.98] active:bg-white/8"
          >
            <span className="grid h-9 w-9 place-items-center rounded-[8px] bg-white/[0.045] text-[#f5f0e4]/48">
              <LogOut className="h-5 w-5" />
            </span>
            Sair da conta
          </button>
        </nav>

        {/* Drawer footer */}
        <div className="px-5 pb-10 pt-5 text-center">
          <div className="mx-3 mb-5 h-px bg-white/[0.07]" />
          <Link href="/" onClick={onClose} className="mx-auto inline-flex items-center rounded-[8px] border border-[#d4a843]/34 bg-[#d4a843]/10 px-4 py-2 no-underline shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
            <span className="text-[17px] font-black leading-none">
              <span className="bg-[linear-gradient(135deg,#ffe5a0_0%,#d4a843_42%,#f5d78c_100%)] bg-clip-text text-transparent">elite</span>
              <span className="text-[#f5f0e4]">modell</span>
            </span>
          </Link>
          <Link
            href="/"
            onClick={onClose}
            className="mx-auto mt-3 flex h-10 max-w-[210px] items-center justify-center rounded-[8px] border border-[#d4a843]/40 bg-transparent text-[13px] font-bold text-[#f5d78c] no-underline transition-colors active:bg-[#d4a843]/12"
          >
            Voltar ao início
          </Link>
          <p className="mt-6 text-[11px] font-bold uppercase tracking-wide text-[#f5f0e4]/40">
            Siga a <span className="text-[#f5d78c]">Elite Modell</span>
          </p>
          <div className="mt-3.5 flex justify-center gap-3">
            {socialLinks.map((item) => (
              <span
                key={item.label}
                aria-label={item.label}
                title={item.label}
                className="grid h-11 w-11 place-items-center rounded-full border border-[#d4a843]/22 bg-white/[0.045] text-[#f5d78c] shadow-[0_10px_28px_rgba(0,0,0,0.22)]"
              >
                {item.icon}
              </span>
            ))}
          </div>
          <div className="mt-5 flex justify-center gap-5 text-[12px] text-[#f5f0e4]/40">
            <Link href="/terms" onClick={onClose} className="text-inherit underline">Termos</Link>
            <Link href="/privacy" onClick={onClose} className="text-inherit underline">Privacidade</Link>
          </div>
        </div>
      </aside>
    </>
  );
}

/* ─── Bottom navigation ─── */
export function ClientBottomNav() {
  const pathname = usePathname();
  const items = [
    { href: "/dashboard/acompanhantes", label: "Explorar", icon: <Compass className="h-[23px] w-[23px]" /> },
    { href: "/dashboard/shots", label: "Shots", icon: <Video className="h-[23px] w-[23px]" /> },
    { href: "/dashboard/favoritos", label: "Listas", icon: <Heart className="h-[23px] w-[23px]" /> },
    { href: "/dashboard", label: "Painel", icon: <LayoutDashboard className="h-[23px] w-[23px]" /> },
  ];

  return (
    <nav className="client-bottom-nav fixed inset-x-0 bottom-0 z-40 px-3 pb-[env(safe-area-inset-bottom)] transition-all duration-200 md:hidden">
      <div className="mx-auto grid h-[60px] max-w-[720px] grid-cols-4 rounded-[14px] border border-[#d4a843]/18 bg-[#090a0b]/94 p-1 shadow-[0_-12px_30px_rgba(0,0,0,0.30)] backdrop-blur-2xl">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname?.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center gap-1 rounded-[11px] text-[11px] font-bold leading-none no-underline transition-all duration-200 ${
                active
                  ? "border border-[#d4a843]/28 bg-[#d4a843]/15 text-[#f5d78c] shadow-[0_10px_24px_rgba(212,168,67,0.10)]"
                  : "text-[#f5f0e4]/48"
              }`}
            >
              {active && (
                <span className="absolute inset-x-5 top-0.5 h-[2px] rounded-full bg-[#d4a843] shadow-[0_0_8px_rgba(212,168,67,0.65)]" />
              )}
              <span
                className={`transition-transform duration-200 ${active ? "scale-110" : "scale-100"}`}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/* ─── Main shell ─── */
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
      <main className="client-shell-content mx-auto w-full max-w-[760px] pb-[calc(260px+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <ClientBottomNav />
      <style>{`body { background: #f2f2f3; }`}</style>
    </div>
  );
}

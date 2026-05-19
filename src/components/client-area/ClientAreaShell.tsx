"use client";

/* eslint-disable @next/next/no-img-element -- User avatars can come from uploaded public URLs. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Heart,
  Info,
  LayoutDashboard,
  List,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Star,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { supabaseAuth } from "@/lib/supabase-client";

const BRAND = "#c9a84c";
const INK = "#202a30";

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
    <Link href="/dashboard" className="inline-flex items-baseline gap-1 no-underline" aria-label="Elite Modell">
      <span className="font-serif text-[25px] font-semibold tracking-[-0.06em] text-[#a9822d]">EM</span>
      <span className="text-[22px] font-black tracking-[-0.03em] text-[#202a30]">Elite Modell</span>
    </Link>
  );
}

export function LocationSearchBar() {
  return (
    <Link
      href="/buscar"
      className="flex h-[68px] items-center rounded-[8px] border border-[#cbd2d4] bg-white px-5 text-[17px] text-[#7a858b] no-underline shadow-[0_1px_0_rgba(30,42,48,0.02)]"
    >
      <span className="min-w-0 flex-1 truncate">Selecionar cidade</span>
      <Search className="h-7 w-7 shrink-0 text-[#11191d]" />
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
    <header className="sticky top-0 z-30 border-b border-[#d9dee0] bg-white shadow-[0_2px_14px_rgba(20,31,36,0.08)]">
      <div className="mx-auto max-w-[760px] px-5 pt-5 pb-4">
        <div className="grid h-12 grid-cols-[48px_1fr_48px] items-center">
          {backHref ? (
            <Link href={backHref} className="grid h-11 w-11 place-items-center text-[#64727a]" aria-label="Voltar">
              <ChevronRight className="h-7 w-7 rotate-180" />
            </Link>
          ) : (
            <button type="button" onClick={onMenu} className="grid h-11 w-11 place-items-center text-[#64727a]" aria-label="Abrir menu">
              <Menu className="h-8 w-8" />
            </button>
          )}
          <div className="text-center">
            <BrandLogo />
          </div>
          <Link href="/notifications" className="grid h-11 w-11 place-items-center justify-self-end text-[#60747b]" aria-label="Notificações">
            <Bell className="h-6 w-6" />
          </Link>
        </div>
        <div className="mt-5">
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
      className={`flex min-h-[66px] items-center gap-4 border-b border-[#d5dcdf] px-6 text-[22px] font-black no-underline ${
        active ? "text-[#a9822d]" : "text-[#11191d]"
      }`}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center text-[#11191d]">{icon}</span>
      <span className="min-w-0 flex-1">{label}</span>
      {expandable ? <ChevronDown className="h-5 w-5 text-[#61757c]" /> : null}
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
    { href: "/dashboard", label: "Painel", icon: <LayoutDashboard className="h-7 w-7" /> },
    { href: "/dashboard/perfil", label: "Perfil", icon: <UserRound className="h-7 w-7" /> },
    { href: "/dashboard/favoritos", label: "Favoritos / Listas", icon: <List className="h-7 w-7" /> },
    { href: "/dashboard/reservas", label: "Histórico", icon: <Clock3 className="h-7 w-7" /> },
    { href: "/profissionais", label: "Acompanhantes", icon: <Heart className="h-7 w-7" /> },
    { href: "/dashboard", label: "Carteira", icon: <WalletCards className="h-7 w-7" /> },
    { href: "/dashboard", label: "Planos", icon: <Star className="h-7 w-7" /> },
    { href: "/dashboard/perfil", label: "Configurações do cadastro", icon: <Settings className="h-7 w-7" />, expandable: true },
    { href: "/dashboard/mensagens", label: "Central de atendimento", icon: <CircleHelp className="h-7 w-7" />, expandable: true },
    { href: "/privacy", label: "Informações importantes", icon: <Info className="h-7 w-7" />, expandable: true },
  ];

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-[#111827]/56 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[78vw] max-w-[560px] overflow-y-auto bg-[#edf2f4] shadow-[18px_0_70px_rgba(16,24,28,0.25)] transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="sticky top-0 z-10 border-b border-[#d5dcdf] bg-white/92 px-5 py-4 backdrop-blur">
          <div className="grid grid-cols-[48px_1fr_48px] items-center">
            <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center text-[#64727a]" aria-label="Fechar menu">
              <X className="h-8 w-8" />
            </button>
            <div className="text-center">
              <BrandLogo />
            </div>
            <Link href="/notifications" onClick={onClose} className="grid h-11 w-11 place-items-center justify-self-end text-[#60747b]" aria-label="Notificações">
              <Bell className="h-6 w-6" />
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4 border-b border-[#d5dcdf] px-6 py-6">
          <div className="h-[74px] w-[74px] overflow-hidden rounded-full border-4 border-white bg-[#d7dee1] shadow-sm">
            {session?.user?.image ? (
              <img src={session.user.image} alt={session.user.name ?? "Avatar"} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-xl font-black text-[#8b6b25]">{initials(session?.user?.name)}</div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[22px] font-black text-[#11191d]">{session?.user?.name ?? "Cliente Elite"}</p>
            <p className="mt-1 truncate text-sm text-[#6a767c]">{session?.user?.email ?? "Conta discreta"}</p>
          </div>
        </div>

        <nav>
          {nav.map((item) => (
            <DrawerItem
              key={`${item.href}-${item.label}`}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={pathname === item.href}
              expandable={item.expandable}
              onClick={onClose}
            />
          ))}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex min-h-[66px] w-full items-center gap-4 border-b border-[#d5dcdf] px-6 text-left text-[22px] font-black text-[#11191d]"
          >
            <span className="grid h-8 w-8 place-items-center">
              <LogOut className="h-7 w-7" />
            </span>
            Sair
          </button>
        </nav>

        <div className="px-6 py-8 text-center">
          <p className="text-[18px] tracking-[0.14em] text-[#5c686e]">
            SIGA A <span className="font-black tracking-normal text-[#a9822d]">Elite Modell</span>
          </p>
          <div className="mt-5 flex justify-center gap-5 text-[#1d282e]">
            {["IG", "FB", "X", "SP", "TG"].map((item) => (
              <span key={item} className="grid h-9 w-9 place-items-center rounded-full bg-white text-xs font-black shadow-sm">
                {item}
              </span>
            ))}
          </div>
          <div className="mt-7 grid gap-3 text-[15px] text-[#56646b]">
            <Link href="/terms" onClick={onClose} className="text-inherit underline">Termos de Uso</Link>
            <Link href="/privacy" onClick={onClose} className="text-inherit underline">Política de Privacidade</Link>
          </div>
        </div>
      </aside>
    </>
  );
}

export function ClientBottomNav() {
  const pathname = usePathname();
  const items = [
    { href: "/dashboard", label: "Meu painel", icon: <LayoutDashboard className="h-6 w-6" /> },
    { href: "/profissionais", label: "Acompanhantes", icon: <Heart className="h-6 w-6" /> },
    { href: "/dashboard/favoritos", label: "Listas", icon: <List className="h-6 w-6" /> },
    { href: "/dashboard/reservas", label: "Atividade", icon: <ShieldCheck className="h-6 w-6" /> },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#d7dddf] bg-white/96 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(19,31,36,0.08)] backdrop-blur md:hidden">
      <div className="mx-auto grid h-[74px] max-w-[760px] grid-cols-4">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center gap-1.5 text-[13px] font-bold no-underline ${
                active ? "text-[#a9822d]" : "text-[#1f2a30]"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
              {active ? <span className="absolute bottom-0 h-[4px] w-full bg-[#c9a84c]" /> : null}
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
    <div className="min-h-screen bg-[#edf2f4] text-[#202a30]">
      <MobileHeader onMenu={() => setDrawerOpen(true)} backHref={backHref} />
      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <main className="mx-auto w-full max-w-[760px] pb-28 md:pb-10">{children}</main>
      <ClientBottomNav />
      <style>{`
        body {
          background: #edf2f4;
        }
        :root {
          --client-brand: ${BRAND};
          --client-ink: ${INK};
        }
      `}</style>
    </div>
  );
}

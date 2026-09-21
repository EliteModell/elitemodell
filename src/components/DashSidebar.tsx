"use client";

/* eslint-disable @next/next/no-img-element -- Avatars can be remote Google/Supabase URLs. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  BadgePlus,
  Banknote,
  Bell,
  CalendarCheck,
  ClipboardList,
  Compass,
  Crown,
  FileCheck,
  ExternalLink,
  Headphones,
  Heart,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Scale,
  Settings,
  ShieldAlert,
  Sparkles,
  TicketPercent,
  UserCog,
  UserRound,
  UsersRound,
} from "lucide-react";
import { loadSupabaseAuth } from "@/lib/supabase-auth-loader";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

type NavItem = { label: string; href: string; icon: React.ReactNode; accent?: string };

const guestNav: NavItem[] = [
  { label: "Início", href: ACCOUNT_ROUTES.painelCliente, icon: <LayoutDashboard className="h-4 w-4" />, accent: "Hoje" },
  { label: "Explorar", href: "/profissionais", icon: <Compass className="h-4 w-4" /> },
  { label: "Favoritas", href: "/dashboard/favoritos", icon: <Heart className="h-4 w-4" /> },
  { label: "Mensagens", href: "/dashboard/mensagens", icon: <MessageCircle className="h-4 w-4" /> },
  { label: "Perfil", href: "/dashboard/perfil", icon: <UserRound className="h-4 w-4" /> },
];

const hostNav: NavItem[] = guestNav;
const hostOnboardingNav: NavItem[] = guestNav;

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: <LayoutDashboard className="h-4 w-4" />, accent: "Admin" },
  { label: "Profissionais", href: "/admin/profissionais", icon: <UserRound className="h-4 w-4" /> },
  { label: "Avaliações", href: "/admin/avaliacoes", icon: <MessageCircle className="h-4 w-4" /> },
  { label: "KYC", href: "/admin/kyc", icon: <FileCheck className="h-4 w-4" /> },
  { label: "Clientes", href: "/admin/clientes", icon: <UsersRound className="h-4 w-4" /> },
  { label: "Denúncias", href: "/admin/denuncias", icon: <ShieldAlert className="h-4 w-4" /> },
  { label: "Suporte", href: "/admin/suporte", icon: <Headphones className="h-4 w-4" /> },
  { label: "Financeiro", href: "/admin/financeiro", icon: <Banknote className="h-4 w-4" /> },
  { label: "Funcionários", href: "/admin/funcionarios", icon: <UserCog className="h-4 w-4" /> },
  { label: "Auditoria", href: "/admin/auditoria", icon: <ClipboardList className="h-4 w-4" /> },
  { label: "Jurídico", href: "/admin/juridico", icon: <Scale className="h-4 w-4" /> },
  { label: "Configurações", href: "/admin/configuracoes", icon: <Settings className="h-4 w-4" /> },
  { label: "Cupons", href: "/admin/cupons", icon: <TicketPercent className="h-4 w-4" /> },
];

const professionalNav: NavItem[] = [
  { label: "Painel", href: ACCOUNT_ROUTES.dashboardAcompanhante, icon: <LayoutDashboard className="h-4 w-4" />, accent: "Pro" },
  { label: "Meu perfil", href: "/profissional/perfil", icon: <UserRound className="h-4 w-4" /> },
  { label: "Estatísticas", href: "/profissional/estatisticas", icon: <ClipboardList className="h-4 w-4" /> },
  { label: "Avaliações", href: "/profissional/avaliacoes", icon: <MessageCircle className="h-4 w-4" /> },
  { label: "Configurações", href: "/profissional/configuracoes", icon: <Settings className="h-4 w-4" /> },
  { label: "Planos", href: "/profissional/planos", icon: <Crown className="h-4 w-4" /> },
  { label: "Fotos", href: "/profissional/fotos", icon: <Sparkles className="h-4 w-4" /> },
  { label: "Agenda", href: "/profissional/agenda", icon: <CalendarCheck className="h-4 w-4" /> },
  { label: "Agendamentos", href: "/profissional/agendamentos", icon: <UsersRound className="h-4 w-4" /> },
  { label: "Mensagens", href: "/profissional/mensagens", icon: <MessageCircle className="h-4 w-4" /> },
  { label: "Perfil de anunciante", href: "/profissional/perfil", icon: <BadgePlus className="h-4 w-4" /> },
  { label: "Notificações", href: "/profissional/notificacoes", icon: <Bell className="h-4 w-4" /> },
];

type ProfessionalMenuProfile = {
  displayName: string;
  email: string;
  image: string | null;
  status: string;
  planLabel: string;
};

type MeResponse = {
  email?: string | null;
  premiumUntil?: string | null;
  professional?: {
    displayName?: string | null;
    image?: string | null;
    status?: string | null;
  } | null;
};

function professionalPlanLabel(premiumUntil?: string | null) {
  if (!premiumUntil) return "Anunciante";
  return new Date(premiumUntil) > new Date() ? "Premium" : "Anunciante";
}

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
  return "Conta Elite";
}

export default function DashSidebar({ mobileOpen, onClose }: Props) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [professionalProfile, setProfessionalProfile] = useState<ProfessionalMenuProfile | null>(null);

  async function handleSignOut() {
    const supabaseAuth = await loadSupabaseAuth();
    await supabaseAuth.auth.signOut();
    await signOut({ callbackUrl: "/" });
  }

  const role = session?.user?.role;
  const path = pathname ?? "";
  const isAdminArea = path === "/admin" || path.startsWith("/admin/");
  const isProfessionalArea = path.startsWith("/profissional");
  const isHostFlow = path.startsWith("/anfitriao") || path.startsWith("/verificacao/anfitriao");
  const hostStatus = session?.user?.hostStatus;
  const isRegisteredHostArea = isHostFlow && Boolean(hostStatus && hostStatus !== "NO_REQUEST");
  // Admin routes are already protected by the proxy and by their Server Components.
  // Using the pathname here avoids waiting for the client session before rendering
  // the correct, lightweight navigation.
  const isAdmin = role === "ADMIN" || isAdminArea;
  const nav =
    isAdmin ? adminNav : isProfessionalArea ? professionalNav : isRegisteredHostArea ? hostNav : isHostFlow ? hostOnboardingNav : guestNav;
  const sectionLabel = isAdmin
    ? "Área admin"
    : isProfessionalArea
    ? "Área profissional"
    : isRegisteredHostArea
      ? "ÁREA ANFITRIÃO"
      : isHostFlow
        ? "CADASTRO DE ANFITRIÃO"
        : "Área cliente";
  const logoHref = isAdminArea || isAdmin
    ? ACCOUNT_ROUTES.admin
    : isProfessionalArea
      ? ACCOUNT_ROUTES.dashboardAcompanhante
      : isRegisteredHostArea || isHostFlow
        ? ACCOUNT_ROUTES.dashboardAnfitriao
        : "/";

  useEffect(() => {
    if (!isProfessionalArea) {
      const clearTimer = window.setTimeout(() => setProfessionalProfile(null), 0);
      return () => window.clearTimeout(clearTimer);
    }
    const controller = new AbortController();
    async function loadProfessionalProfile() {
      try {
        const res = await fetch("/api/users/me", { signal: controller.signal });
        if (!res.ok) return;
        const data = (await res.json()) as MeResponse | null;
        if (!data?.professional) return;
        setProfessionalProfile({
          displayName: data.professional.displayName ?? session?.user?.name ?? "Perfil Elite",
          email: data.email ?? session?.user?.email ?? "Conta profissional",
          image: data.professional.image ?? null,
          status: data.professional.status ?? "PENDING_REVIEW",
          planLabel: professionalPlanLabel(data.premiumUntil),
        });
      } catch {
        if (!controller.signal.aborted) setProfessionalProfile(null);
      }
    }
    void loadProfessionalProfile();
    return () => controller.abort();
  }, [isProfessionalArea, session?.user?.email, session?.user?.name]);

  const sidebarName = professionalProfile?.displayName ?? session?.user?.name ?? "Perfil Elite";
  const sidebarEmail = professionalProfile?.email ?? session?.user?.email ?? roleLabel(role);
  const sidebarImage = professionalProfile?.image ?? session?.user?.image ?? null;
  const sidebarPlan = professionalProfile?.planLabel ?? roleLabel(role);

  return (
    <>
      {mobileOpen ? (
        <div onClick={onClose} className="fixed inset-0 z-40 bg-[#141212]/45 backdrop-blur-sm md:hidden" />
      ) : null}

      <aside
        className={`dash-sidebar fixed inset-y-0 left-0 z-50 flex w-[80vw] max-w-[320px] flex-col border-r border-[#fcf7ff] bg-white shadow-[14px_0_42px_rgba(37, 31, 32,0.08)] transition-transform duration-300 md:w-[280px] md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="relative border-b border-[#fcf7ff] p-4">
          <div className="flex items-center justify-between">
          <Link href={logoHref} onClick={onClose} className="inline-flex w-[176px] items-center no-underline" aria-label="Elite Modell">
            <img src="/brand/elite-modell-logo.png" alt="Elite Modell" className="h-auto w-full object-contain opacity-100" />
          </Link>
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-lg border border-[#fcf7ff] text-[#737684] transition hover:border-[#e1a6ff] hover:text-[#b72cff] md:hidden"
              aria-label="Fechar menu"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="relative border-b border-[#fcf7ff] p-4">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[8px] border border-[#b72cff]/28 bg-[#b72cff]/12">
              {sidebarImage ? (
                <img
                  src={sidebarImage}
                  alt={sidebarName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-sm font-black text-[#e1a6ff]">
                  {initials(sidebarName)}
                </div>
              )}
              <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border border-[#070708] bg-[#b72cff]" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#141212]">{sidebarName}</p>
              <p className="mt-0.5 truncate text-xs text-[#737684]">{sidebarEmail}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <p className="inline-flex items-center gap-1 rounded-full border border-[#b72cff]/20 bg-[#b72cff]/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#e1a6ff]">
                  <Crown className="h-3 w-3" />
                  {sidebarPlan}
                </p>
                {professionalProfile ? (
                  <p className="inline-flex rounded-full border border-white/10 bg-white/[0.045] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-white/48">
                    {professionalProfile.status === "ACTIVE"
                      ? "Ativo"
                      : professionalProfile.status === "PAUSED"
                        ? "Pausado"
                        : professionalProfile.status === "SUSPENDED"
                          ? "Suspenso"
                          : professionalProfile.status === "REJECTED"
                            ? "Reprovado"
                            : "Em análise"}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <nav className="relative flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-[10px] font-bold text-[#8a8d98]">
            {sectionLabel}
          </p>
          <div className="space-y-1.5">
            {nav.map((navItem) => {
              const active =
                path === navItem.href ||
                (navItem.href === ACCOUNT_ROUTES.painelCliente && path === ACCOUNT_ROUTES.dashboardCliente) ||
                (navItem.href === ACCOUNT_ROUTES.dashboardAnfitriao && path === ACCOUNT_ROUTES.painelAnfitriao) ||
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
                  prefetch={isAdmin ? false : null}
                  onClick={onClose}
                  className={`group relative flex h-11 items-center gap-3 rounded-[8px] px-3 text-sm font-bold transition ${
                    active
                      ? "border border-[#e1a6ff] bg-[#fcf7ff] text-[#8f1fd1]"
                      : "border border-transparent text-[#62687a] hover:border-[#fcf7ff] hover:bg-[#fcf7ff] hover:text-[#141212]"
                  }`}
                >
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-[8px] transition ${
                      active ? "bg-white text-[#b72cff]" : "bg-[#fcf7ff] text-[#777b88] group-hover:text-[#b72cff]"
                    }`}
                  >
                    {navItem.icon}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{navItem.label}</span>
                  {navItem.accent ? (
                    <span className="rounded-full bg-[#b72cff]/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#e1a6ff]">
                      {navItem.accent}
                    </span>
                  ) : null}
                  {active ? (
                    <span className="absolute right-2 h-1.5 w-1.5 rounded-full bg-[#b72cff] shadow-[0_0_18px_rgba(183, 44, 255,0.95)]" />
                  ) : null}
                </Link>
              );
            })}
          </div>

          {isAdmin ? (
            <div className="mt-5 rounded-[8px] border border-[#b72cff]/18 bg-[linear-gradient(135deg,rgba(183, 44, 255,0.10),rgba(255,255,255,0.03))] p-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#e1a6ff]">
                Navegação segura
              </p>
              <p className="mt-2 text-xs leading-5 text-white/48">
                O logo permanece no painel administrativo.
              </p>
              <Link
                href="/"
                onClick={onClose}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-[#b72cff]/28 px-3 py-2 text-xs font-black text-[#e1a6ff] transition hover:bg-[#b72cff]/10"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Ver site público
              </Link>
            </div>
          ) : isProfessionalArea ? (
            <div className="mt-5 rounded-[8px] border border-[#b72cff]/18 bg-[linear-gradient(135deg,rgba(183,44,255,0.12),rgba(225,166,255,0.04))] p-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#e1a6ff]">
                Perfil profissional
              </p>
              <p className="mt-2 text-xs leading-5 text-white/48">
                Gerencie agenda, fotos, disponibilidade e presença premium.
              </p>
              <Link
                href="/profissional/planos"
                onClick={onClose}
                className="mt-3 inline-flex w-full items-center justify-center rounded-[8px] bg-[#b72cff] px-3 py-2 text-xs font-black text-[#100d09] transition hover:bg-[#e1a6ff]"
              >
                Atualizar plano
              </Link>
            </div>
          ) : role === "GUEST" && !isHostFlow ? (
            <div className="mt-5 rounded-[8px] border border-[#b72cff]/18 bg-[linear-gradient(135deg,rgba(183,44,255,0.12),rgba(225,166,255,0.04))] p-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#e1a6ff]">
                Encontre profissionais
              </p>
              <p className="mt-2 text-xs leading-5 text-white/48">
                Veja perfis verificados, favoritas e mensagens em poucos toques.
              </p>
              <Link
                href="/profissionais"
                onClick={onClose}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-[#b72cff] px-3 py-2 text-xs font-black text-[#100d09] transition hover:bg-[#e1a6ff]"
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

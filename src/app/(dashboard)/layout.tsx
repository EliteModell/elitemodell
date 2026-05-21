"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Menu, Search, ShieldCheck, Sparkles } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import DashSidebar from "@/components/DashSidebar";
import ClientAreaShell from "@/components/client-area/ClientAreaShell";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

function LoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#050506] px-5 text-white">
      <div className="w-full max-w-sm rounded-[8px] border border-[#d4a843]/18 bg-white/[0.04] p-6 text-center shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-[8px] border border-[#d4a843]/28 bg-[#d4a843]/10 text-[#f5d78c]">
          <Sparkles className="h-6 w-6 animate-pulse" />
        </div>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d4a843]">EliteModell</p>
        <h1 className="mt-2 text-xl font-black">Preparando sua conta</h1>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="premium-loading-bar h-full w-1/2 rounded-full bg-[linear-gradient(90deg,#cc1f2f,#d4a843,#f5d78c)]" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notifOpen]);
  const isPublicPropertyDraft = pathname === ACCOUNT_ROUTES.onboardingAnfitriao;
  const isClientArea = pathname === ACCOUNT_ROUTES.dashboardCliente || pathname.startsWith(`${ACCOUNT_ROUTES.dashboardCliente}/`);

  useEffect(() => {
    if (status === "unauthenticated" && !isPublicPropertyDraft) {
      router.push(ACCOUNT_ROUTES.login);
    }
  }, [isPublicPropertyDraft, status, router]);

  if (status === "loading" && !isPublicPropertyDraft) {
    return <LoadingScreen />;
  }

  if (status === "unauthenticated" && !isPublicPropertyDraft) return null;

  if (isPublicPropertyDraft && status !== "authenticated") {
    return (
      <div className="min-h-screen overflow-x-hidden bg-[#050505] text-white">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,168,67,0.10),transparent_34%)]" />
        <main className="relative min-h-screen px-4 py-5 sm:px-6 sm:py-7">
          {children}
        </main>
      </div>
    );
  }

  if (isClientArea) {
    return <ClientAreaShell>{children}</ClientAreaShell>;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050506] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,168,67,0.10),transparent_34%)]" />

      <DashSidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="relative flex min-h-screen flex-col md:ml-[280px]">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#050506]/72 px-4 py-3 backdrop-blur-2xl sm:px-6 md:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="grid h-10 w-10 place-items-center rounded-[8px] border border-white/10 bg-white/[0.045] text-white md:hidden"
                aria-label="Abrir menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="hidden min-w-0 items-center gap-3 rounded-[8px] border border-white/10 bg-white/[0.045] px-3 py-2 text-white/45 lg:flex">
                <Search className="h-4 w-4 text-[#d4a843]" />
                <span className="text-sm">Buscar profissionais, favoritos e agendamentos</span>
              </div>
              <div className="min-w-0 lg:hidden">
                <p className="text-sm font-black">
                  <span className="bg-[linear-gradient(135deg,#ffe5a0_0%,#d4a843_22%,#f5d78c_50%,#9e7b2a_100%)] bg-clip-text text-transparent">elite</span>
                  <span className="text-white">modell</span>
                </p>
                <p className="truncate text-xs text-white/38">{session?.user?.email ?? "Conta discreta"}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-full border border-[#d4a843]/20 bg-[#d4a843]/10 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#f5d78c] sm:flex">
                <ShieldCheck className="h-4 w-4" />
                Ambiente seguro
              </div>
              <div ref={notifRef} className="relative">
                <button
                  onClick={() => setNotifOpen((v) => !v)}
                  className="grid h-10 w-10 place-items-center rounded-[8px] border border-white/10 bg-white/[0.045] text-white/70 transition hover:border-[#d4a843]/35 hover:text-[#f5d78c]"
                  aria-label="Notificações"
                >
                  <Bell className="h-4 w-4" />
                </button>
                {notifOpen && (
                  <div className="absolute right-0 top-12 z-50 w-72 rounded-[8px] border border-white/10 bg-[#0d0d0f] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
                    <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#d4a843]">Notificações</p>
                    <div className="rounded-[8px] border border-dashed border-white/10 p-4 text-center">
                      <Bell className="mx-auto mb-2 h-5 w-5 text-white/20" />
                      <p className="text-sm font-black text-white/50">Nenhuma notificação</p>
                      <p className="mt-1 text-xs text-white/28">Novidades e alertas aparecem aqui.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="dashboard-content relative flex-1 px-4 py-5 pb-8 sm:px-6 sm:py-6 md:px-8 lg:px-10">
          <div className="mx-auto w-full max-w-[1480px]">{children}</div>
        </main>

      </div>
      <style>{`
        .dashboard-content {
          animation: dashboard-fade-in 180ms ease-out both;
        }
        @keyframes dashboard-fade-in {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .dashboard-content {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

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
  const isProfessionalArea = pathname === ACCOUNT_ROUTES.dashboardAcompanhante || pathname.startsWith(`${ACCOUNT_ROUTES.dashboardAcompanhante}/`);
  const isHostArea = pathname === ACCOUNT_ROUTES.dashboardAnfitriao || pathname.startsWith(`${ACCOUNT_ROUTES.dashboardAnfitriao}/`);
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  const roleAreaClass = isProfessionalArea ? "professional" : isHostArea ? "host" : isAdminArea ? "admin" : "";

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
    <div className={roleAreaClass ? `${roleAreaClass}-shell min-h-screen overflow-x-hidden bg-[#050506] text-white` : "min-h-screen overflow-x-hidden bg-[#050506] text-white"}>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,168,67,0.10),transparent_34%)]" />

      <DashSidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={roleAreaClass ? `${roleAreaClass}-layout relative flex min-h-screen flex-col md:ml-[280px]` : "relative flex min-h-screen flex-col md:ml-[280px]"}>
        <header className={roleAreaClass ? `${roleAreaClass}-header sticky top-0 z-30 border-b border-white/10 bg-[#050506]/72 px-4 py-3 backdrop-blur-2xl sm:px-6 md:px-8` : "sticky top-0 z-30 border-b border-white/10 bg-[#050506]/72 px-4 py-3 backdrop-blur-2xl sm:px-6 md:px-8"}>
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

        <main className={roleAreaClass ? `dashboard-content ${roleAreaClass}-page relative flex-1 px-4 py-5 pb-8 sm:px-6 sm:py-6 md:px-8 lg:px-10` : "dashboard-content relative flex-1 px-4 py-5 pb-8 sm:px-6 sm:py-6 md:px-8 lg:px-10"}>
          <div className={roleAreaClass ? `${roleAreaClass}-content mx-auto w-full max-w-[1480px]` : "mx-auto w-full max-w-[1480px]"}>{children}</div>
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
        .professional-shell {
          background:
            radial-gradient(circle at 20% 10%, rgba(214,168,58,0.16), transparent 32%),
            radial-gradient(circle at 85% 35%, rgba(214,168,58,0.10), transparent 34%),
            #050505;
        }
        .host-shell {
          background:
            radial-gradient(circle at 20% 10%, rgba(214,168,58,0.16), transparent 32%),
            radial-gradient(circle at 85% 35%, rgba(214,168,58,0.10), transparent 34%),
            #050505;
        }
        .host-shell * {
          box-sizing: border-box;
        }
        .host-shell img,
        .host-shell video,
        .host-shell svg {
          max-width: 100%;
          height: auto;
        }
        .host-header {
          border-bottom-color: rgba(214,168,58,0.25) !important;
          background: rgba(5,5,5,0.92) !important;
          padding-top: max(12px, env(safe-area-inset-top)) !important;
          box-shadow: 0 18px 50px rgba(0,0,0,0.34);
        }
        .host-page {
          width: 100%;
          max-width: 100%;
          min-height: 100dvh;
          overflow-x: hidden;
          padding-left: 8px !important;
          padding-right: 8px !important;
          padding-bottom: calc(150px + env(safe-area-inset-bottom)) !important;
        }
        .host-content {
          width: 100%;
          max-width: 430px !important;
          margin: 0 auto;
        }
        .host-content > div {
          width: 100%;
          max-width: 430px !important;
          margin-left: auto;
          margin-right: auto;
        }
        .host-content h1 {
          color: #fff !important;
          font-size: clamp(28px, 8vw, 38px) !important;
          line-height: 1.04 !important;
          font-weight: 950 !important;
          letter-spacing: 0 !important;
          margin-bottom: 8px !important;
          text-wrap: balance;
        }
        .host-content h2,
        .host-content h3,
        .host-content strong {
          color: #fff !important;
        }
        .host-content p,
        .host-content li {
          color: #b8b8b8 !important;
          line-height: 1.6;
        }
        .host-content p,
        .host-content span,
        .host-content li,
        .host-content div,
        .host-content section,
        .host-content article {
          border-color: rgba(214,168,58,0.25);
        }
        .host-content a {
          color: #d6a83a;
        }
        .host-content > div > div,
        .host-content section,
        .host-content article,
        .host-content form,
        .host-content [style*="background: #fff"],
        .host-content [style*="background: white"],
        .host-content [style*="background: #111"],
        .host-content [style*="background: #0d0d0d"],
        .host-content [style*="background: #101010"],
        .host-content [style*="background: #0b1420"],
        .host-content [style*="background: #060e1b"],
        .host-content [style*="background: rgba(212,168,67"],
        .host-content [style*="background: rgba(34,197,94"] {
          background: linear-gradient(180deg, rgba(20,20,20,0.98), rgba(11,11,13,0.98)) !important;
          border-color: rgba(214,168,58,0.25) !important;
          box-shadow: 0 22px 60px rgba(0,0,0,0.28);
        }
        .host-content [style*="borderRadius: 16"],
        .host-content [style*="borderRadius: 14"],
        .host-content [style*="borderRadius: 12"],
        .host-content [style*="borderRadius: 10"],
        .host-content [style*="borderRadius: 8"],
        .host-content [style*="border-radius: 16"],
        .host-content [style*="border-radius: 14"],
        .host-content [style*="border-radius: 12"],
        .host-content [style*="border-radius: 10"],
        .host-content [style*="border-radius: 8"] {
          border-radius: 18px !important;
        }
        .host-content input,
        .host-content textarea,
        .host-content select {
          min-height: 58px !important;
          width: 100%;
          border: 1px solid rgba(214,168,58,0.28) !important;
          border-radius: 18px !important;
          background: rgba(11,11,13,0.94) !important;
          color: #fff !important;
          padding: 15px 16px !important;
          outline: none !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.03) !important;
          scroll-margin-bottom: 160px;
        }
        .host-content textarea {
          min-height: 150px !important;
        }
        .host-content input::placeholder,
        .host-content textarea::placeholder {
          color: rgba(184,184,184,0.55) !important;
        }
        .host-content input:focus,
        .host-content textarea:focus,
        .host-content select:focus {
          border-color: rgba(245,184,59,0.72) !important;
          box-shadow: 0 0 0 4px rgba(214,168,58,0.12) !important;
        }
        .host-content label,
        .host-content [style*="textTransform"],
        .host-content [style*="uppercase"] {
          color: #d6a83a !important;
        }
        .host-content button {
          min-height: 44px;
          border-radius: 18px !important;
        }
        .host-content button[style*="background: #d4a843"],
        .host-content button[style*="background: rgb(212, 168, 67)"],
        .host-content button[style*="background: #D6A83A"],
        .host-content button[style*="background: #F5B83B"],
        .host-content a[style*="background: #d4a843"],
        .host-content a[style*="background: rgb(212, 168, 67)"] {
          background: linear-gradient(135deg, #f5d77a, #d6a83a 45%, #a77818) !important;
          color: #070707 !important;
          box-shadow: 0 18px 46px rgba(214,168,58,0.22) !important;
        }
        .host-content [style*="gridTemplateColumns"] {
          gap: 16px !important;
        }
        .host-content [style*="repeat(auto-fit"] {
          grid-template-columns: 1fr !important;
        }
        .host-content [style*="1fr 1fr 1fr"],
        .host-content [style*="1fr 1fr"],
        .host-content [style*="2fr 1fr"] {
          grid-template-columns: 1fr !important;
        }
        .host-content .premium-empty-state,
        .host-content .premium-card {
          border: 1px solid rgba(214,168,58,0.25) !important;
          background: linear-gradient(180deg, rgba(20,20,20,0.98), rgba(11,11,13,0.98)) !important;
        }
        @media (min-width: 480px) {
          .host-page {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }
        }
        @media (min-width: 768px) {
          .host-content,
          .host-content > div {
            max-width: 760px !important;
          }
          .host-content [style*="repeat(auto-fit"] {
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)) !important;
          }
        }
        .professional-shell * {
          box-sizing: border-box;
        }
        .professional-shell img,
        .professional-shell video,
        .professional-shell svg {
          max-width: 100%;
          height: auto;
        }
        .professional-header {
          border-bottom-color: rgba(214,168,58,0.25) !important;
          background: rgba(5,5,5,0.92) !important;
          padding-top: max(12px, env(safe-area-inset-top)) !important;
          box-shadow: 0 18px 50px rgba(0,0,0,0.34);
        }
        .professional-page {
          width: 100%;
          max-width: 100%;
          min-height: 100dvh;
          overflow-x: hidden;
          padding-left: 8px !important;
          padding-right: 8px !important;
          padding-bottom: calc(150px + env(safe-area-inset-bottom)) !important;
        }
        .professional-content {
          width: 100%;
          max-width: 430px !important;
          margin: 0 auto;
        }
        .professional-content > div {
          width: 100%;
          max-width: 430px !important;
          margin-left: auto;
          margin-right: auto;
        }
        .professional-content h1 {
          color: #fff !important;
          font-size: clamp(28px, 8vw, 38px) !important;
          line-height: 1.04 !important;
          font-weight: 950 !important;
          letter-spacing: 0 !important;
          margin-bottom: 8px !important;
          text-wrap: balance;
        }
        .professional-content h2,
        .professional-content h3,
        .professional-content strong {
          color: #fff !important;
        }
        .professional-content p,
        .professional-content span,
        .professional-content li,
        .professional-content div {
          border-color: rgba(214,168,58,0.25);
        }
        .professional-content p,
        .professional-content li {
          color: #b8b8b8 !important;
          line-height: 1.6;
        }
        .professional-content a {
          color: #d6a83a;
        }
        .professional-content > div > div,
        .professional-content section,
        .professional-content article,
        .professional-content form,
        .professional-content [style*="background: #111"],
        .professional-content [style*="background: #0d0d0d"],
        .professional-content [style*="background: #0b1420"],
        .professional-content [style*="background: #060e1b"],
        .professional-content [style*="background: rgba(212,168,67"],
        .professional-content [style*="background: rgba(34,197,94"] {
          background: linear-gradient(180deg, rgba(20,20,20,0.98), rgba(11,11,13,0.98)) !important;
          border-color: rgba(214,168,58,0.25) !important;
          box-shadow: 0 22px 60px rgba(0,0,0,0.28);
        }
        .professional-content [style*="borderRadius: 12"],
        .professional-content [style*="borderRadius: 10"],
        .professional-content [style*="borderRadius: 8"],
        .professional-content [style*="border-radius: 12"],
        .professional-content [style*="border-radius: 10"],
        .professional-content [style*="border-radius: 8"] {
          border-radius: 18px !important;
        }
        .professional-content input,
        .professional-content textarea,
        .professional-content select {
          min-height: 58px !important;
          width: 100%;
          border: 1px solid rgba(214,168,58,0.28) !important;
          border-radius: 18px !important;
          background: rgba(11,11,13,0.94) !important;
          color: #fff !important;
          padding: 15px 16px !important;
          outline: none !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.03) !important;
          scroll-margin-bottom: 160px;
        }
        .professional-content textarea {
          min-height: 150px !important;
        }
        .professional-content input::placeholder,
        .professional-content textarea::placeholder {
          color: rgba(184,184,184,0.55) !important;
        }
        .professional-content input:focus,
        .professional-content textarea:focus,
        .professional-content select:focus {
          border-color: rgba(245,184,59,0.72) !important;
          box-shadow: 0 0 0 4px rgba(214,168,58,0.12) !important;
        }
        .professional-content label,
        .professional-content [style*="textTransform"],
        .professional-content [style*="uppercase"] {
          color: #d6a83a !important;
        }
        .professional-content button {
          min-height: 44px;
          border-radius: 18px !important;
        }
        .professional-content button[style*="background: #cc0000"],
        .professional-content button[style*="background: #d4a843"],
        .professional-content button[style*="background: rgb(212, 168, 67)"],
        .professional-content button[style*="background: GOLD"] {
          background: linear-gradient(135deg, #f5d77a, #d6a83a 45%, #a77818) !important;
          color: #070707 !important;
          box-shadow: 0 18px 46px rgba(214,168,58,0.22) !important;
        }
        .professional-content [style*="gridTemplateColumns"] {
          gap: 16px !important;
        }
        .professional-content [style*="repeat(auto-fit"] {
          grid-template-columns: 1fr !important;
        }
        .professional-content [style*="1fr 1fr 1fr"],
        .professional-content [style*="1fr 1fr"],
        .professional-content [style*="2fr 1fr"] {
          grid-template-columns: 1fr !important;
        }
        .professional-content [style*="overflow: hidden"] {
          overflow: hidden;
        }
        .professional-content .premium-empty-state,
        .professional-content .premium-card {
          border: 1px solid rgba(214,168,58,0.25) !important;
          background: linear-gradient(180deg, rgba(20,20,20,0.98), rgba(11,11,13,0.98)) !important;
        }
        @media (min-width: 480px) {
          .professional-page {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }
        }
        @media (min-width: 768px) {
          .professional-content,
          .professional-content > div {
            max-width: 760px !important;
          }
          .professional-content [style*="repeat(auto-fit"] {
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)) !important;
          }
        }
        .admin-shell * {
          box-sizing: border-box;
        }
        .admin-shell img,
        .admin-shell video,
        .admin-shell svg {
          max-width: 100%;
          height: auto;
        }
        .admin-page {
          overflow-x: hidden !important;
        }
        @media (max-width: 900px) {
          .admin-content [style*="1.25fr"] {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 640px) {
          .admin-content h1 {
            font-size: clamp(18px, 5.5vw, 24px) !important;
            line-height: 1.2 !important;
          }
          .admin-content [style*="minmax(190px"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 400px) {
          .admin-content [style*="minmax(190px"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

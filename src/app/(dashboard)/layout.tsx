"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Menu, Search, ShieldCheck, Sparkles } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DashSidebar from "@/components/DashSidebar";

function LoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#050506] px-5 text-white">
      <div className="w-full max-w-sm rounded-[8px] border border-[#d4a843]/18 bg-white/[0.04] p-6 text-center shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-[8px] border border-[#d4a843]/28 bg-[#d4a843]/10 text-[#f5d78c]">
          <Sparkles className="h-6 w-6 animate-pulse" />
        </div>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d4a843]">EliteModell</p>
        <h1 className="mt-2 text-xl font-black">Preparando seu painel</h1>
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return <LoadingScreen />;
  }

  if (status === "unauthenticated") return null;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050506] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(135deg,rgba(204,31,47,0.12),transparent_28%,rgba(212,168,67,0.09)_58%,transparent)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />

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
                <span className="text-sm">Buscar perfis, estadias e reservas</span>
              </div>
              <div className="min-w-0 lg:hidden">
                <p className="text-sm font-black text-white">EliteModell</p>
                <p className="truncate text-xs text-white/38">{session?.user?.email ?? "Painel premium"}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-full border border-[#d4a843]/20 bg-[#d4a843]/10 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#f5d78c] sm:flex">
                <ShieldCheck className="h-4 w-4" />
                Ambiente seguro
              </div>
              <button
                className="grid h-10 w-10 place-items-center rounded-[8px] border border-white/10 bg-white/[0.045] text-white/70 transition hover:border-[#d4a843]/35 hover:text-[#f5d78c]"
                aria-label="Notificações"
              >
                <Bell className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <motion.main
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative flex-1 px-4 py-5 sm:px-6 sm:py-6 md:px-8 lg:px-10"
        >
          <div className="mx-auto w-full max-w-[1480px]">{children}</div>
        </motion.main>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Menu, Search, Sparkles } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DashSidebar from "@/components/DashSidebar";

function LoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#060608] px-5 text-white">
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.07] bg-white/[0.025] p-7 text-center shadow-2xl backdrop-blur-xl">
        <div className="mx-auto mb-5 grid h-11 w-11 place-items-center rounded-xl border border-[#d4a843]/15 bg-[#d4a843]/[0.08] text-[#d4a843]">
          <Sparkles className="h-5 w-5 animate-pulse" />
        </div>
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#d4a843]/70">
          EliteModell
        </p>
        <h1 className="mt-2 text-base font-semibold tracking-tight text-white">
          Preparando seu painel
        </h1>
        <div className="mt-5 h-[2px] overflow-hidden rounded-full bg-white/[0.07]">
          <div className="premium-loading-bar h-full w-1/3 rounded-full bg-gradient-to-r from-[#d4a843] to-[#f5d78c]" />
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

  if (status === "loading") return <LoadingScreen />;
  if (status === "unauthenticated") return null;

  return (
    <div className="min-h-screen bg-[#060608] text-white">
      <DashSidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="relative flex min-h-screen flex-col md:ml-[240px]">
        <header className="sticky top-0 z-30 flex h-[60px] items-center justify-between border-b border-white/[0.06] bg-[#060608]/85 px-4 backdrop-blur-2xl sm:px-6 md:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.07] bg-white/[0.03] text-white/50 transition hover:text-white/80 md:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="h-[15px] w-[15px]" />
            </button>
            <div className="hidden items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3.5 py-2 text-white/30 transition hover:border-white/10 hover:text-white/50 lg:flex cursor-text">
              <Search className="h-3.5 w-3.5 text-[#d4a843]/60" />
              <span className="text-[12px]">Buscar perfis e estadias</span>
            </div>
            <div className="text-[13px] text-white/40 lg:hidden">
              {session?.user?.email ?? "EliteModell"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-white/38 transition hover:border-white/12 hover:text-white/65"
              aria-label="Notificações"
            >
              <Bell className="h-[15px] w-[15px]" />
            </button>
          </div>
        </header>

        <motion.main
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="flex-1 px-4 py-6 sm:px-6 md:px-8 lg:px-10"
        >
          <div className="mx-auto w-full max-w-[1480px]">{children}</div>
        </motion.main>
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import DashSidebar from "@/components/DashSidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d0d0d" }}>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 40,
              height: 40,
              border: "3px solid #222",
              borderTopColor: "#cc0000",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <span style={{ color: "#666", fontSize: 14 }}>Carregando...</span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0a0a0a" }}>
      <DashSidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div
        style={{
          flex: 1,
          marginLeft: 240,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
        className="dash-content"
      >
        {/* Top bar mobile */}
        <header
          style={{
            display: "none",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 20px",
            height: 56,
            background: "#0d0d0d",
            borderBottom: "1px solid #1e1e1e",
            position: "sticky",
            top: 0,
            zIndex: 30,
          }}
          className="dash-topbar"
        >
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 4 }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <span style={{ fontWeight: 800, fontSize: 18, color: "#fff" }}>
            elite<span style={{ color: "#cc0000" }}>modell</span>
          </span>
          <div style={{ width: 30 }} />
        </header>

        <main style={{ flex: 1, padding: "32px 32px" }} className="dash-main">
          {children}
        </main>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .dash-content { margin-left: 0 !important; }
          .dash-topbar { display: flex !important; }
          .dash-main { padding: 20px 16px !important; }
        }
      `}</style>
    </div>
  );
}

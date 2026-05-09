"use client";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(6,14,27,0.97)", backdropFilter: "blur(16px)", borderBottom: "1px solid #1e293b", height: 64 }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "100%" }}>

        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none", position: "relative", display: "inline-block", padding: "6px 16px", border: "1.5px solid rgba(201,168,76,0.35)", borderRadius: 8, background: "rgba(201,168,76,0.04)" }}>
          <span style={{ position: "absolute", top: -10, right: -5, color: "#c9a84c", fontSize: 16, lineHeight: 1, userSelect: "none" }}>✦</span>
          <span style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-1px" }}>
            <span style={{ color: "#cc0000" }}>elite</span>
            <span style={{ color: "#f1f5f9" }}>modell</span>
          </span>
        </Link>

        {/* Nav links — desktop */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Link href="/?tab=acompanhantes"
            style={{ padding: "8px 16px", borderRadius: 8, color: "#94a3b8", textDecoration: "none", fontSize: 14, fontWeight: 500, transition: "all 0.2s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#f1f5f9"; (e.currentTarget as HTMLElement).style.background = "#1e293b"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#94a3b8"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
            Acompanhantes
          </Link>
          <Link href="/?tab=imoveis"
            style={{ padding: "8px 16px", borderRadius: 8, color: "#94a3b8", textDecoration: "none", fontSize: 14, fontWeight: 500, transition: "all 0.2s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#f1f5f9"; (e.currentTarget as HTMLElement).style.background = "#1e293b"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#94a3b8"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
            Imóveis
          </Link>
        </div>

        {/* Auth buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {session ? (
            <>
              <Link href="/dashboard" style={{ padding: "8px 16px", borderRadius: 8, color: "#94a3b8", textDecoration: "none", fontSize: 14, fontWeight: 500, border: "1px solid #1e293b" }}>
                {session.user?.name?.split(" ")[0] ?? "Minha conta"}
              </Link>
              <button onClick={() => signOut()} style={{ padding: "8px 16px", borderRadius: 8, background: "transparent", border: "1px solid #cc0000", color: "#cc0000", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
                Sair
              </button>
            </>
          ) : (
            <>
              <Link href="/login" style={{ padding: "8px 16px", borderRadius: 8, color: "#94a3b8", textDecoration: "none", fontSize: 14, fontWeight: 500, border: "1px solid #1e293b", transition: "all 0.2s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#f1f5f9"; (e.currentTarget as HTMLElement).style.borderColor = "#334155"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#94a3b8"; (e.currentTarget as HTMLElement).style.borderColor = "#1e293b"; }}>
                Login
              </Link>
              <Link href="/cadastro" style={{ padding: "8px 20px", borderRadius: 8, background: "#cc0000", color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 700, transition: "background 0.2s" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#e00000")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#cc0000")}>
                Cadastrar
              </Link>
            </>
          )}

          {/* Menu mobile */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ display: "none", padding: "8px", background: "transparent", border: "1px solid #1e293b", borderRadius: 8, color: "#94a3b8", cursor: "pointer", marginLeft: 4 }}
            className="mobile-menu-btn"
            aria-label="Menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen
                ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                : <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>
              }
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div style={{ background: "#0b1420", borderBottom: "1px solid #1e293b", padding: "16px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
          <Link href="/?tab=acompanhantes" onClick={() => setMenuOpen(false)} style={{ padding: "10px 14px", borderRadius: 8, color: "#94a3b8", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>
            Acompanhantes
          </Link>
          <Link href="/?tab=imoveis" onClick={() => setMenuOpen(false)} style={{ padding: "10px 14px", borderRadius: 8, color: "#94a3b8", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>
            Imóveis
          </Link>
          {!session && (
            <>
              <Link href="/login" onClick={() => setMenuOpen(false)} style={{ padding: "10px 14px", borderRadius: 8, color: "#94a3b8", textDecoration: "none", fontSize: 14 }}>Login</Link>
              <Link href="/cadastro" onClick={() => setMenuOpen(false)} style={{ padding: "10px 14px", borderRadius: 8, background: "#cc0000", color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 700, textAlign: "center" }}>Cadastrar</Link>
            </>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-btn { display: flex !important; }
          .desktop-nav { display: none !important; }
        }
      `}</style>
    </nav>
  );
}

"use client";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(10,10,10,0.97)", backdropFilter: "blur(12px)", borderBottom: "1px solid #1e1e1e", height: 64 }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "100%" }}>

        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none", position: "relative", display: "inline-block", padding: "6px 16px", border: "1.5px solid rgba(212,170,99,0.5)", borderRadius: 8, background: "rgba(8,4,0,0.6)" }}>
          <span style={{ position: "absolute", top: -10, right: -5, color: "#d4a843", fontSize: 16, lineHeight: 1, userSelect: "none" }}>✦</span>
          <span style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-1px" }}>
            <span style={{ color: "#cc0000" }}>elite</span>
            <span style={{ color: "#fff" }}>modell</span>
          </span>
        </Link>

        {/* Nav links — desktop */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }} className="desktop-nav">
          <Link href="/?tab=acompanhantes" style={{ padding: "8px 16px", borderRadius: 8, color: "#ccc", textDecoration: "none", fontSize: 14, fontWeight: 500, transition: "all 0.2s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.background = "#1a1a1a"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#ccc"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
            Acompanhantes
          </Link>
          <Link href="/?tab=imoveis" style={{ padding: "8px 16px", borderRadius: 8, color: "#ccc", textDecoration: "none", fontSize: 14, fontWeight: 500, transition: "all 0.2s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.background = "#1a1a1a"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#ccc"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
            Imóveis
          </Link>
        </div>

        {/* Auth buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {session ? (
            <>
              <Link href="/dashboard" style={{ padding: "8px 16px", borderRadius: 8, color: "#ccc", textDecoration: "none", fontSize: 14, fontWeight: 500, border: "1px solid #2a2a2a" }}>
                {session.user?.name?.split(" ")[0] ?? "Minha conta"}
              </Link>
              <button onClick={() => signOut()} style={{ padding: "8px 16px", borderRadius: 8, background: "transparent", border: "1px solid #cc0000", color: "#cc0000", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
                Sair
              </button>
            </>
          ) : (
            <>
              <Link href="/login" style={{ padding: "8px 16px", borderRadius: 8, color: "#ccc", textDecoration: "none", fontSize: 14, fontWeight: 500, border: "1px solid #2a2a2a" }}
                className="desktop-nav">
                Login
              </Link>
              <Link href="/cadastro" style={{ padding: "8px 18px", borderRadius: 8, background: "#cc0000", color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
                Cadastrar
              </Link>
            </>
          )}

          {/* Hamburger */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="mobile-menu-btn"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", padding: 4, marginLeft: 4 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen ? (<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>) : (<><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>)}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ background: "#111", borderTop: "1px solid #1e1e1e", padding: "16px 24px 24px" }}>
          {[{ href: "/?tab=acompanhantes", label: "Acompanhantes" }, { href: "/?tab=imoveis", label: "Imóveis" }].map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
              style={{ display: "block", padding: "12px 0", color: "#ccc", textDecoration: "none", fontSize: 15, borderBottom: "1px solid #1e1e1e" }}>
              {l.label}
            </Link>
          ))}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <Link href="/login" style={{ flex: 1, padding: "12px", textAlign: "center", border: "1px solid #2a2a2a", borderRadius: 8, color: "#ccc", textDecoration: "none", fontSize: 14 }}>Login</Link>
            <Link href="/cadastro" style={{ flex: 1, padding: "12px", textAlign: "center", background: "#cc0000", borderRadius: 8, color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>Cadastrar</Link>
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 768px) { .desktop-nav { display: flex !important; } .mobile-menu-btn { display: none !important; } }
        @media (max-width: 767px) { .desktop-nav { display: none !important; } }
      `}</style>
    </nav>
  );
}

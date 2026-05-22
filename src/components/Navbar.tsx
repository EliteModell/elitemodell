"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { EntryChoiceCards, EntryChoiceSheet, EntryChoiceStyles } from "@/components/EntryChoiceSheet";

const NavbarSessionControls = dynamic(() => import("@/components/NavbarSessionControls"), {
  ssr: false,
});

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [entryChoice, setEntryChoice] = useState<"login" | "register" | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setMenuOpen(false);
    setEntryChoice(null);
  }, [pathname]);

  function openEntryChoice(mode: "login" | "register") {
    setMenuOpen(false);
    setEntryChoice(mode);
  }

  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(5,5,5,0.94)", backdropFilter: "blur(18px)", borderBottom: "1px solid rgba(212,168,67,0.16)", height: 64 }}>
      <div className="navbar-inner" style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "100%", gap: 12 }}>

        {/* Logo */}
        <Link className="brand-mark" href="/" style={{ textDecoration: "none", position: "relative", display: "inline-block", padding: "6px 16px", border: "1.5px solid rgba(212,168,67,0.34)", borderRadius: 8, background: "rgba(255,255,255,0.025)" }}>
          <span style={{ position: "absolute", top: -10, right: -5, color: "#d4a843", fontSize: 16, lineHeight: 1, userSelect: "none" }}>✦</span>
          <span className="brand-text" style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-1px" }}>
            <span style={{
              background: "linear-gradient(135deg, #ffe5a0 0%, #d4a843 22%, #f5d78c 50%, #9e7b2a 75%, #d4a843 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>elite</span>
            <span style={{ color: "#f4f1ea" }}>modell</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Link href="/buscar?tab=acompanhantes"
            style={{ padding: "8px 16px", borderRadius: 8, color: "#b8b1a6", textDecoration: "none", fontSize: 14, fontWeight: 500, transition: "all 0.2s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#f4f1ea"; (e.currentTarget as HTMLElement).style.background = "rgba(212,168,67,0.06)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#b8b1a6"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
            Acompanhantes
          </Link>
          <NavbarSessionControls variant="desktopLinks" />
        </div>

        {/* Auth */}
        <div className="auth-actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <NavbarSessionControls
            variant="authActions"
            onLoginChoice={() => openEntryChoice("login")}
            onRegisterChoice={() => openEntryChoice("register")}
          />

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ display: "none", padding: "8px", background: "transparent", border: "1px solid rgba(212,168,67,0.2)", borderRadius: 8, color: "#b8b1a6", cursor: "pointer", marginLeft: 4 }}
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

      {menuOpen && (
        <div className="mobile-entry-menu">
          <div className="mobile-entry-brand">
            <span>elite</span><strong>modell</strong>
          </div>
          <Link href="/buscar?tab=acompanhantes" onClick={() => setMenuOpen(false)} className="mobile-entry-link">Acompanhantes</Link>
          <NavbarSessionControls
            variant="mobileMenu"
            onNavigate={() => setMenuOpen(false)}
            onLoginChoice={() => openEntryChoice("login")}
            onRegisterChoice={() => openEntryChoice("register")}
            showGuestActions={false}
          />
          <div className="mobile-entry-section">
            <p>Cadastre-se grátis</p>
            <EntryChoiceCards mode="register" onNavigate={() => setMenuOpen(false)} />
          </div>
          <div className="mobile-entry-section">
            <p>Login</p>
            <EntryChoiceCards mode="login" onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      )}

      <EntryChoiceSheet mode={entryChoice} open={entryChoice !== null} onClose={() => setEntryChoice(null)} />
      <EntryChoiceStyles />

      <style>{`
        .mobile-entry-menu {
          background: #050505;
          border-bottom: 1px solid rgba(212,168,67,0.22);
          padding: 16px 8px calc(18px + env(safe-area-inset-bottom));
          display: flex;
          flex-direction: column;
          gap: 12px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.5);
        }
        .mobile-entry-brand {
          display: inline-flex;
          align-items: baseline;
          gap: 1px;
          padding: 0 8px 2px;
          font-size: 20px;
          font-weight: 950;
        }
        .mobile-entry-brand span {
          background: linear-gradient(135deg, #ffe5a0 0%, #d4a843 22%, #f5d78c 50%, #9e7b2a 75%, #d4a843 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .mobile-entry-brand strong {
          color: #fff;
          font: inherit;
        }
        .mobile-entry-link {
          padding: 12px 14px;
          border-radius: 16px;
          color: #b8b8b8;
          text-decoration: none;
          font-size: 14px;
          border: 1px solid rgba(214,168,58,0.14);
          background: rgba(16,16,20,0.72);
        }
        .mobile-entry-section {
          display: grid;
          gap: 10px;
          padding-top: 4px;
        }
        .mobile-entry-section p {
          margin: 0;
          padding: 0 8px;
          color: #f5b83b;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        @media (max-width: 768px) {
          .navbar-inner {
            padding: 0 10px !important;
            gap: 8px !important;
          }

          .brand-mark {
            padding: 7px 10px !important;
            border-radius: 10px !important;
            flex-shrink: 0;
          }

          .brand-text {
            font-size: 19px !important;
            letter-spacing: -0.8px !important;
          }

          .auth-actions {
            gap: 6px !important;
            min-width: 0;
          }

          .nav-auth-link {
            padding: 8px 11px !important;
            border-radius: 10px !important;
            font-size: 13px !important;
          }

          .signup-link {
            padding-left: 13px !important;
            padding-right: 13px !important;
          }

          .mobile-menu-btn { display: flex !important; }
          .desktop-nav { display: none !important; }
          .mobile-menu-btn {
            width: 40px !important;
            height: 40px !important;
            align-items: center;
            justify-content: center;
            padding: 0 !important;
            margin-left: 0 !important;
            border-radius: 11px !important;
            background: rgba(255,255,255,0.03) !important;
          }
        }

        @media (max-width: 380px) {
          .navbar-inner {
            padding: 0 8px !important;
            gap: 6px !important;
          }

          .brand-mark {
            padding: 7px 8px !important;
          }

          .brand-text {
            font-size: 18px !important;
          }

          .nav-auth-link {
            padding: 8px 9px !important;
            font-size: 12.5px !important;
          }

          .signup-link {
            padding-left: 10px !important;
            padding-right: 10px !important;
          }

          .mobile-menu-btn {
            width: 38px !important;
            height: 38px !important;
          }
        }
      `}</style>
    </nav>
  );
}

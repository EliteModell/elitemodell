"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { accountHomePathFromSession } from "@/lib/account-routes";
import { supabaseAuth } from "@/lib/supabase-client";

type Variant = "desktopLinks" | "authActions" | "mobileMenu";

const navLinkStyle = {
  padding: "8px 16px",
  borderRadius: 8,
  color: "#b8b1a6",
  textDecoration: "none",
  fontSize: 14,
  fontWeight: 500,
  transition: "all 0.2s",
};

function canSeeLocations(session: ReturnType<typeof useSession>["data"]) {
  return (
    session?.user?.role === "ADMIN" ||
    session?.user?.accountType === "model" ||
    session?.user?.accountType === "professional" ||
    session?.user?.isProfessional === true
  );
}

function isIncompleteProfessionalSession(session: ReturnType<typeof useSession>["data"]) {
  if (!session?.user) return false;
  const status = session.user.professionalStatus;
  if (session.user.activeProfileType === "CLIENTE") return false;
  const isProfessional =
    session.user.activeProfileType === "PROFESSIONAL" ||
    (!session.user.activeProfileType &&
      (session.user.accountType === "model" ||
        session.user.accountType === "professional" ||
        session.user.isProfessional === true));

  return isProfessional && status !== "ACTIVE" && status !== "PAUSED";
}

export default function NavbarSessionControls({
  variant,
  onNavigate,
  onLoginChoice,
  onRegisterChoice,
  showGuestActions = true,
}: {
  variant: Variant;
  onNavigate?: () => void;
  onLoginChoice?: () => void;
  onRegisterChoice?: () => void;
  showGuestActions?: boolean;
}) {
  const { data: session, status } = useSession();
  const hasValidSession = status === "authenticated" && Boolean(session?.user?.id);
  const safeSession = hasValidSession ? session : null;
  const showLocations = canSeeLocations(safeSession);
  const accountHref = accountHomePathFromSession(safeSession?.user);
  const incompleteProfessional = isIncompleteProfessionalSession(safeSession);

  async function handleSignOut() {
    await supabaseAuth.auth.signOut();
    await signOut({ callbackUrl: "/" });
  }

  if (variant === "desktopLinks") {
    if (!showLocations) return null;
    return (
      <Link
        href="/buscar?tab=imoveis"
        style={navLinkStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#f4f1ea";
          e.currentTarget.style.background = "rgba(212,168,67,0.06)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#b8b1a6";
          e.currentTarget.style.background = "transparent";
        }}
      >
        Locais
      </Link>
    );
  }

  if (variant === "mobileMenu") {
    return (
      <>
        {showLocations ? (
          <Link href="/buscar?tab=imoveis" onClick={onNavigate} style={{ padding: "10px 14px", borderRadius: 8, color: "#b8b1a6", textDecoration: "none", fontSize: 14 }}>
            Locais
          </Link>
        ) : null}
        {status === "loading" ? null : hasValidSession ? (
          <>
            <Link href={accountHref} onClick={onNavigate} style={{ padding: "10px 14px", borderRadius: 8, color: "#d4a843", textDecoration: "none", fontSize: 14, border: "1px solid rgba(212,168,67,0.2)" }}>
              Minha área
            </Link>
            <button type="button" onClick={handleSignOut} style={{ padding: "10px 14px", borderRadius: 8, color: "#d4a843", background: "transparent", fontSize: 14, border: "1px solid rgba(212,168,67,0.2)", textAlign: "left" }}>
              Sair
            </button>
          </>
        ) : showGuestActions ? (
          <>
            <button type="button" onClick={onLoginChoice} style={{ padding: "10px 14px", borderRadius: 8, color: "#d4a843", background: "transparent", textDecoration: "none", fontSize: 14, border: "1px solid rgba(212,168,67,0.2)", textAlign: "left" }}>
              Entrar
            </button>
            <button type="button" onClick={onRegisterChoice} style={{ padding: "10px 14px", borderRadius: 8, background: "#d4a843", color: "#080704", textDecoration: "none", fontSize: 14, fontWeight: 800, textAlign: "center", border: 0 }}>
              Cadastrar
            </button>
          </>
        ) : null}
      </>
    );
  }

  if (status === "loading") {
    return <span className="hidden h-9 w-[142px] rounded-[8px] border border-[rgba(212,168,67,0.14)] bg-white/[0.025] sm:block" aria-hidden="true" />;
  }

  if (hasValidSession) {
    return (
      <>
        <Link className="nav-auth-link" href={accountHref} style={{ padding: "8px 18px", borderRadius: 8, color: "#b8b1a6", textDecoration: "none", fontSize: 14, fontWeight: 500, border: "1px solid rgba(212,168,67,0.2)" }}>
          {incompleteProfessional ? "Continuar cadastro" : session.user?.name?.split(" ")[0] ?? "Explorar"}
        </Link>
        <button className="nav-auth-link" onClick={handleSignOut} style={{ padding: "8px 18px", borderRadius: 8, background: "transparent", border: "1px solid rgba(212,168,67,0.3)", color: "#d4a843", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          Sair
        </button>
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        className="nav-auth-link login-link"
        onClick={onLoginChoice}
        style={{ padding: "8px 22px", borderRadius: 8, color: "#d4a843", textDecoration: "none", fontSize: 14, fontWeight: 600, border: "1px solid rgba(212,168,67,0.3)", transition: "all 0.2s", background: "transparent" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(212,168,67,0.07)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        Entrar
      </button>
      <button
        type="button"
        className="nav-auth-link signup-link"
        onClick={onRegisterChoice}
        style={{ padding: "8px 22px", borderRadius: 8, background: "linear-gradient(135deg, #f5d78c, #d4a843)", color: "#080704", textDecoration: "none", fontSize: 14, fontWeight: 800, transition: "background 0.2s" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#e8bb47";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#d4a843";
        }}
      >
        Cadastrar
      </button>
    </>
  );
}

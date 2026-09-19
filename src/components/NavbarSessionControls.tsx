"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { accountHomePathFromSession } from "@/lib/account-routes";
import { supabaseAuth } from "@/lib/supabase-client";

type Variant = "desktopLinks" | "authActions" | "mobileMenu";

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
  const accountHref = accountHomePathFromSession(safeSession?.user);
  const incompleteProfessional = isIncompleteProfessionalSession(safeSession);

  async function handleSignOut() {
    await supabaseAuth.auth.signOut();
    await signOut({ callbackUrl: "/" });
  }

  if (variant === "desktopLinks") {
    return null;
  }

  if (variant === "mobileMenu") {
    return (
      <>
        {status === "loading" ? null : hasValidSession ? (
          <>
            <Link className={`elite-button ${incompleteProfessional ? "elite-button--resume" : "elite-button--outline"}`} href={accountHref} onClick={onNavigate} style={{ padding: "10px 14px", fontSize: 14 }}>
              Minha área
            </Link>
            <button className="elite-button elite-button--outline" type="button" onClick={handleSignOut} style={{ padding: "10px 14px", fontSize: 14, textAlign: "left" }}>
              Sair
            </button>
          </>
        ) : showGuestActions ? (
          <>
            <button className="elite-button elite-button--outline" type="button" onClick={onLoginChoice} style={{ padding: "10px 14px", fontSize: 14, textAlign: "left" }}>
              Entrar
            </button>
            <button className="elite-button elite-button--primary" type="button" onClick={onRegisterChoice} style={{ padding: "10px 14px", fontSize: 14, textAlign: "center" }}>
              Cadastrar
            </button>
          </>
        ) : null}
      </>
    );
  }

  if (status === "loading") {
    return <span className="hidden h-9 w-[142px] rounded-[8px] border border-[rgba(183, 44, 255,0.14)] bg-white/[0.025] sm:block" aria-hidden="true" />;
  }

  if (hasValidSession) {
    return (
      <>
        <Link className={`nav-auth-link elite-button ${incompleteProfessional ? "elite-button--resume" : "elite-button--outline"}`} href={accountHref} style={{ padding: "8px 18px", fontSize: 14 }}>
          {incompleteProfessional ? "Continuar cadastro" : session.user?.name?.split(" ")[0] ?? "Explorar"}
        </Link>
        <button className="nav-auth-link elite-button elite-button--outline" onClick={handleSignOut} style={{ padding: "8px 18px", fontSize: 14, cursor: "pointer" }}>
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
        style={{ padding: "8px 22px", borderRadius: 8, color: "#b72cff", textDecoration: "none", fontSize: 14, fontWeight: 600, border: "1px solid rgba(183, 44, 255,0.3)", transition: "all 0.2s", background: "transparent" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(183, 44, 255,0.07)";
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
        style={{ padding: "8px 22px", borderRadius: 8, background: "linear-gradient(135deg, #e1a6ff, #b72cff)", color: "#080704", textDecoration: "none", fontSize: 14, fontWeight: 800, transition: "background 0.2s" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#d77bff";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#b72cff";
        }}
      >
        Cadastrar
      </button>
    </>
  );
}

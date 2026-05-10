"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

type NavItem = { label: string; href: string; icon: React.ReactNode };

const guestNav: NavItem[] = [
  {
    label: "Início",
    href: "/dashboard",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>,
  },
  {
    label: "Minhas Reservas",
    href: "/dashboard/reservas",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  },
  {
    label: "Favoritos",
    href: "/dashboard/favoritos",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  },
  {
    label: "Meu Perfil",
    href: "/dashboard/perfil",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  },
];

const hostNav: NavItem[] = [
  {
    label: "Painel",
    href: "/anfitriao",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  },
  {
    label: "Meus Imóveis",
    href: "/anfitriao/imoveis",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>,
  },
  {
    label: "Reservas",
    href: "/anfitriao/reservas",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  },
  {
    label: "Ganhos",
    href: "/anfitriao/ganhos",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  },
  {
    label: "Meu Perfil",
    href: "/dashboard/perfil",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  },
];

const adminNav: NavItem[] = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  },
  {
    label: "Usuários",
    href: "/admin/usuarios",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="8" r="3"/><path d="M1 20c0-3.3 3-6 8-6"/><path d="M15 20c0-3.3 3-6 6-6"/><path d="M9 14c2.7 0 5 2 5 5"/></svg>,
  },
  {
    label: "Imóveis",
    href: "/admin/imoveis",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/></svg>,
  },
  {
    label: "Profissionais",
    href: "/admin/profissionais",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  },
  {
    label: "Reservas",
    href: "/admin/reservas",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  },
  {
    label: "Cupons",
    href: "/admin/cupons",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><circle cx="7" cy="7" r="1" fill="currentColor"/></svg>,
  },
];

const professionalNav: NavItem[] = [
  {
    label: "Painel",
    href: "/profissional",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  },
  {
    label: "Meu perfil",
    href: "/profissional/perfil",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  },
  {
    label: "Planos e assinaturas",
    href: "/profissional/planos",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  },
  {
    label: "Fotos",
    href: "/profissional/fotos",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  },
  {
    label: "Agenda",
    href: "/profissional/agenda",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  },
  {
    label: "Agendamentos",
    href: "/profissional/agendamentos",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  },
  {
    label: "Novo anúncio",
    href: "/profissional/novo",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  },
];

interface Props {
  mobileOpen: boolean;
  onClose: () => void;
}

export default function DashSidebar({ mobileOpen, onClose }: Props) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const role = session?.user?.role;
  const pathname_str = pathname ?? "";
  const isProfessionalArea = pathname_str.startsWith("/profissional");
  const nav = role === "ADMIN" ? adminNav
    : isProfessionalArea ? professionalNav
    : role === "HOST" ? hostNav
    : guestNav;

  return (
    <>
      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 40,
          }}
        />
      )}

      <aside
        style={{
          width: 240,
          background: "#0d0d0d",
          borderRight: "1px solid #1e1e1e",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0,
          left: mobileOpen ? 0 : undefined,
          bottom: 0,
          zIndex: 50,
          transition: "transform 0.2s",
        }}
        className={`dash-sidebar ${mobileOpen ? "mobile-open" : ""}`}
      >
        {/* Logo */}
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(212,168,67,0.12)" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <span style={{ fontWeight: 900, fontSize: 20, letterSpacing: "-0.5px" }}>
              <span style={{ background: "linear-gradient(135deg, #ffe5a0 0%, #d4a843 22%, #f5d78c 45%, #9e7b2a 72%, #d4a843 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>elite</span>
              <span style={{ color: "#f1f5f9" }}>modell</span>
            </span>
          </Link>
        </div>

        {/* User info */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1a1a1a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "#d4a843",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 700,
                color: "#fff",
                flexShrink: 0,
              }}
            >
              {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {session?.user?.name ?? "Usuário"}
              </div>
              <div style={{ fontSize: 11, color: "#666" }}>
                {role === "ADMIN" ? "Administrador" : role === "HOST" ? "Anfitrião" : "Hóspede"}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
          {nav.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && item.href !== "/anfitriao" && item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 8,
                  textDecoration: "none",
                  color: active ? "#fff" : "#777",
                  background: active ? "rgba(212,168,67,0.12)" : "transparent",
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  marginBottom: 2,
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget as HTMLElement).style.color = "#ccc";
                }}
                onMouseLeave={(e) => {
                  if (!active) (e.currentTarget as HTMLElement).style.color = "#777";
                }}
              >
                <span style={{ color: active ? "#d4a843" : "inherit" }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}

          {/* Switch role links */}
          {role === "HOST" && (
            <Link
              href="/dashboard"
              onClick={onClose}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, textDecoration: "none", color: "#555", fontSize: 13, marginTop: 16 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Área do hóspede
            </Link>
          )}
          {role === "GUEST" || role === "HOST" ? (
            <Link
              href={role === "HOST" ? "/anfitriao" : "/cadastro"}
              onClick={onClose}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, textDecoration: "none", color: "#555", fontSize: 13 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/></svg>
              {role === "HOST" ? "Área do anfitrião" : "Virar anfitrião"}
            </Link>
          ) : null}
        </nav>

        {/* Footer */}
        <div style={{ padding: "12px 10px", borderTop: "1px solid #1a1a1a" }}>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 8,
              background: "none",
              border: "none",
              color: "#666",
              fontSize: 14,
              cursor: "pointer",
              width: "100%",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#d4a843")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#666")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sair
          </button>
        </div>
      </aside>

      <style>{`
        .dash-sidebar {
          transform: translateX(0);
        }
        @media (max-width: 767px) {
          .dash-sidebar {
            transform: translateX(-100%);
          }
          .dash-sidebar.mobile-open {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}

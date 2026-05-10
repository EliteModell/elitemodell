"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

const GOLD = "#d4a843";
const GOLD_DIM = "rgba(212,168,67,0.12)";

export default function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const tab = searchParams.get("tab") ?? "";

  const items = [
    {
      href: "/buscar?tab=acompanhantes",
      label: "Buscar",
      active: pathname === "/buscar" && !tab,
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? GOLD : "#475569"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      ),
    },
    {
      href: "/buscar?tab=acompanhantes",
      label: "Acomp.",
      active: pathname === "/buscar" && tab === "acompanhantes",
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? GOLD : "#475569"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
      ),
    },
    {
      href: "/buscar?tab=imoveis",
      label: "Imóveis",
      active: pathname === "/buscar" && tab === "imoveis",
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? GOLD : "#475569"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/>
        </svg>
      ),
    },
    {
      href: session ? "/dashboard" : "/login",
      label: session ? "Perfil" : "Entrar",
      active: pathname === "/dashboard" || pathname === "/login",
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? GOLD : "#475569"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
      ),
    },
  ];

  return (
    <>
      <nav
        className="bottom-nav"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 55,
          background: "rgba(6,14,27,0.98)", backdropFilter: "blur(16px)",
          borderTop: `1px solid ${GOLD_DIM}`,
          alignItems: "stretch",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {items.map((item) => (
          <Link key={item.label} href={item.href} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 3, padding: "10px 4px 8px", textDecoration: "none",
            borderTop: `2px solid ${item.active ? GOLD : "transparent"}`,
            transition: "border-color 0.2s",
            WebkitTapHighlightColor: "rgba(212,168,67,0.15)",
          }}>
            {item.icon(item.active)}
            <span style={{
              fontSize: 10, fontWeight: item.active ? 700 : 500,
              color: item.active ? GOLD : "#475569",
              transition: "color 0.2s",
            }}>
              {item.label}
            </span>
          </Link>
        ))}
      </nav>
      <div className="bottom-nav-spacer" />
      <style>{`
        .bottom-nav { display: none; }
        .bottom-nav-spacer { display: none; }
        @media (max-width: 768px) {
          .bottom-nav { display: flex !important; }
          .bottom-nav-spacer { display: block !important; height: 62px; }
        }
      `}</style>
    </>
  );
}

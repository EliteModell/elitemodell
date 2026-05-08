"use client";
import { useSession } from "next-auth/react";
import Link from "next/link";

const statCards = [
  { label: "Reservas ativas", value: "0", color: "#cc0000", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  { label: "Viagens realizadas", value: "0", color: "#cc0000", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
  { label: "Favoritos", value: "0", color: "#cc0000", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg> },
  { label: "Créditos disponíveis", value: "R$ 0,00", color: "#cc0000", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg> },
];

const quickActions = [
  { label: "Buscar imóveis", href: "/imoveis", desc: "Encontre o imóvel perfeito" },
  { label: "Minhas reservas", href: "/dashboard/reservas", desc: "Gerencie suas reservas" },
  { label: "Favoritos", href: "/dashboard/favoritos", desc: "Seus imóveis salvos" },
  { label: "Meu perfil", href: "/dashboard/perfil", desc: "Atualize seus dados" },
];

export default function DashboardPage() {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(" ")[0] ?? "Usuário";

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#fff", marginBottom: 6 }}>
          Olá, {firstName}
        </h1>
        <p style={{ color: "#666", fontSize: 15 }}>
          Bem-vindo ao seu painel.
        </p>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {statCards.map((s) => (
          <div
            key={s.label}
            style={{
              background: "#111",
              border: "1px solid #1e1e1e",
              borderRadius: 12,
              padding: "20px",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: "rgba(204,0,0,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#cc0000",
                flexShrink: 0,
              }}
            >
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 16 }}>Ações rápidas</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {quickActions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              style={{
                display: "block",
                background: "#111",
                border: "1px solid #1e1e1e",
                borderRadius: 10,
                padding: "16px 18px",
                textDecoration: "none",
                transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#cc000050")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#1e1e1e")}
            >
              <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 4 }}>{a.label}</div>
              <div style={{ fontSize: 13, color: "#666" }}>{a.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent bookings placeholder */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Reservas recentes</h2>
          <Link href="/dashboard/reservas" style={{ fontSize: 13, color: "#cc0000", textDecoration: "none" }}>Ver todas</Link>
        </div>
        <div
          style={{
            background: "#111",
            border: "1px solid #1e1e1e",
            borderRadius: 12,
            padding: "40px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 12 }}>🏠</div>
          <p style={{ color: "#666", fontSize: 14, marginBottom: 16 }}>
            Você ainda não tem reservas. Que tal buscar um imóvel?
          </p>
          <Link
            href="/imoveis"
            style={{
              display: "inline-block",
              padding: "10px 24px",
              background: "#cc0000",
              color: "#fff",
              borderRadius: 8,
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Buscar imóveis
          </Link>
        </div>
      </div>
    </div>
  );
}

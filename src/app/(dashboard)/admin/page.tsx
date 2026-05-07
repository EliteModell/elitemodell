"use client";
import Link from "next/link";

const stats = [
  { label: "Usuários totais", value: "1.284", change: "+12%", icon: "👥" },
  { label: "Imóveis ativos", value: "347", change: "+5%", icon: "🏠" },
  { label: "Reservas este mês", value: "892", change: "+23%", icon: "📅" },
  { label: "Receita total", value: "R$ 142K", change: "+18%", icon: "💰" },
];

const recentUsers = [
  { name: "Ana Lima", email: "ana@email.com", role: "GUEST", createdAt: "2024-12-10", verified: true },
  { name: "Carlos Host", email: "carlos@email.com", role: "HOST", createdAt: "2024-12-09", verified: false },
  { name: "Maria Silva", email: "maria@email.com", role: "GUEST", createdAt: "2024-12-08", verified: true },
  { name: "João Santos", email: "joao@email.com", role: "HOST", createdAt: "2024-12-07", verified: true },
];

const pendingProperties = [
  { title: "Casa de Praia Búzios", host: "João Host", city: "Búzios", price: 650, submittedAt: "2024-12-10" },
  { title: "Flat Centro SP", host: "Maria Anfitriã", city: "São Paulo", price: 180, submittedAt: "2024-12-09" },
];

const roleLabel: Record<string, { label: string; color: string }> = {
  GUEST: { label: "Hóspede", color: "#4488cc" },
  HOST: { label: "Anfitrião", color: "#cc8800" },
  ADMIN: { label: "Admin", color: "#cc0000" },
};

export default function AdminPage() {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Painel Administrativo</h1>
        <p style={{ color: "#666", fontSize: 14 }}>Visão geral da plataforma Elite Modell.</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 32 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <span style={{ fontSize: 26 }}>{s.icon}</span>
              <span style={{ fontSize: 12, color: "#00cc66", fontWeight: 600, background: "rgba(0,200,100,0.1)", padding: "2px 8px", borderRadius: 20 }}>{s.change}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#666" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }} className="admin-grid">
        {/* Recent Users */}
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #1a1a1a" }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Usuários recentes</h2>
            <Link href="/admin/usuarios" style={{ fontSize: 13, color: "#cc0000", textDecoration: "none" }}>Ver todos</Link>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {recentUsers.map((u) => {
                const r = roleLabel[u.role];
                return (
                  <tr key={u.email} style={{ borderBottom: "1px solid #141414" }}>
                    <td style={{ padding: "12px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#cc0000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                          {u.name[0]}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{u.name}</div>
                          <div style={{ fontSize: 12, color: "#555" }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 11, padding: "3px 8px", background: `${r.color}22`, color: r.color, borderRadius: 20, fontWeight: 600 }}>{r.label}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 11, color: u.verified ? "#00cc66" : "#cc8800" }}>{u.verified ? "✓ Verificado" : "⏳ Pendente"}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pending Properties */}
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #1a1a1a" }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Imóveis pendentes</h2>
            <Link href="/admin/imoveis" style={{ fontSize: 13, color: "#cc0000", textDecoration: "none" }}>Ver todos</Link>
          </div>
          {pendingProperties.map((p) => (
            <div key={p.title} style={{ padding: "16px 20px", borderBottom: "1px solid #141414" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 3 }}>{p.title}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>{p.host} · {p.city} · R$ {p.price}/noite</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ padding: "5px 12px", background: "rgba(0,200,100,0.1)", border: "1px solid #00cc66", borderRadius: 6, color: "#00cc66", fontSize: 12, cursor: "pointer" }}>✓ Aprovar</button>
                  <button style={{ padding: "5px 12px", background: "rgba(204,0,0,0.1)", border: "1px solid #cc0000", borderRadius: 6, color: "#cc0000", fontSize: 12, cursor: "pointer" }}>✗ Rejeitar</button>
                </div>
              </div>
            </div>
          ))}
          {pendingProperties.length === 0 && (
            <div style={{ padding: "32px", textAlign: "center", color: "#555", fontSize: 14 }}>Nenhum imóvel pendente.</div>
          )}
        </div>
      </div>

      {/* Quick admin actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {[
          { href: "/admin/usuarios", label: "Gerenciar usuários", icon: "👥", desc: "Criar, editar e banir" },
          { href: "/admin/imoveis", label: "Aprovar anúncios", icon: "🏠", desc: "2 pendentes" },
          { href: "/admin/reservas", label: "Reservas", icon: "📅", desc: "Monitorar pagamentos" },
          { href: "/admin/cupons", label: "Cupons", icon: "🎟️", desc: "Criar promoções" },
        ].map((l) => (
          <Link key={l.href} href={l.href} style={{ display: "block", background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "16px", textDecoration: "none", transition: "border-color 0.2s" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#cc000050")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#1e1e1e")}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>{l.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 3 }}>{l.label}</div>
            <div style={{ fontSize: 12, color: "#666" }}>{l.desc}</div>
          </Link>
        ))}
      </div>

      <style>{`
        @media (max-width: 767px) {
          .admin-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

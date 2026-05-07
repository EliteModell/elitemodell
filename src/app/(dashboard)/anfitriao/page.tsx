"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";

const mockStats = [
  { label: "Imóveis ativos", value: "3", icon: "🏠" },
  { label: "Reservas este mês", value: "8", icon: "📅" },
  { label: "Ganhos este mês", value: "R$ 6.840", icon: "💰" },
  { label: "Avaliação média", value: "4.9 ★", icon: "⭐" },
];

const mockBookings = [
  { id: "b1", guest: "Ana Lima", property: "Cobertura Jardins", checkIn: "2024-12-15", checkOut: "2024-12-18", total: 2700, status: "CONFIRMED" },
  { id: "b2", guest: "Pedro Souza", property: "Casa Campos do Jordão", checkIn: "2024-12-20", checkOut: "2024-12-27", total: 3780, status: "PENDING" },
  { id: "b3", guest: "Maria Silva", property: "Studio Ipanema", checkIn: "2024-11-30", checkOut: "2024-12-02", total: 620, status: "COMPLETED" },
];

const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
  CONFIRMED: { bg: "rgba(0,200,100,0.1)", color: "#00cc66", label: "Confirmada" },
  PENDING: { bg: "rgba(204,170,0,0.1)", color: "#ccaa00", label: "Pendente" },
  COMPLETED: { bg: "rgba(100,100,100,0.1)", color: "#888", label: "Concluída" },
  CANCELLED: { bg: "rgba(204,0,0,0.1)", color: "#cc0000", label: "Cancelada" },
};

export default function AnfitriaoPage() {
  const { data: session } = useSession();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Painel do Anfitrião</h1>
          <p style={{ color: "#666", fontSize: 14 }}>Gerencie seus imóveis, reservas e ganhos.</p>
        </div>
        <Link
          href="/anfitriao/imoveis/novo"
          style={{
            padding: "10px 20px",
            background: "#cc0000",
            color: "#fff",
            borderRadius: 8,
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Novo imóvel
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 32 }}>
        {mockStats.map((s) => (
          <div key={s.label} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "20px" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#666" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent bookings */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Reservas recentes</h2>
          <Link href="/anfitriao/reservas" style={{ fontSize: 13, color: "#cc0000", textDecoration: "none" }}>Ver todas</Link>
        </div>

        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                {["Hóspede", "Imóvel", "Check-in", "Check-out", "Total", "Status"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, color: "#666", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockBookings.map((b) => {
                const s = statusStyle[b.status] ?? statusStyle.PENDING;
                return (
                  <tr key={b.id} style={{ borderBottom: "1px solid #141414" }}>
                    <td style={{ padding: "14px 16px", fontSize: 14, color: "#ccc", fontWeight: 500 }}>{b.guest}</td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#888" }}>{b.property}</td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#888" }}>{new Date(b.checkIn + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#888" }}>{new Date(b.checkOut + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                    <td style={{ padding: "14px 16px", fontSize: 14, color: "#cc0000", fontWeight: 700 }}>R$ {b.total.toLocaleString("pt-BR")}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ padding: "4px 10px", background: s.bg, color: s.color, borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{s.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick links */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        {[
          { href: "/anfitriao/imoveis", label: "Gerenciar imóveis", icon: "🏠", desc: "3 imóveis cadastrados" },
          { href: "/anfitriao/reservas", label: "Todas as reservas", icon: "📅", desc: "Calendário completo" },
          { href: "/anfitriao/ganhos", label: "Relatório de ganhos", icon: "💰", desc: "Histórico financeiro" },
        ].map((l) => (
          <Link key={l.href} href={l.href} style={{ display: "block", background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "16px", textDecoration: "none", transition: "border-color 0.2s" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#cc000050")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#1e1e1e")}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>{l.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 4 }}>{l.label}</div>
            <div style={{ fontSize: 12, color: "#666" }}>{l.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";

const stats = [
  { label: "Visualizações do perfil", value: "1.284", icon: "👁️", change: "+18%" },
  { label: "Agendamentos este mês", value: "12", icon: "📅", change: "+3" },
  { label: "Avaliação média", value: "4.9 ★", icon: "⭐", change: "" },
  { label: "Conversões (contato)", value: "34%", icon: "📈", change: "+5%" },
];

const pendingAppointments = [
  { id: "a1", client: "Carlos F.", date: "2024-12-18", time: "14:00", duration: "2 horas", status: "PENDING", notes: "Ensaio fashion editorial para revista." },
  { id: "a2", client: "Studio Arte", date: "2024-12-20", time: "09:00", duration: "Dia inteiro", status: "PENDING", notes: "Campanha comercial verão." },
];

const statusMap: Record<string, { color: string; label: string; bg: string }> = {
  PENDING: { color: "#ccaa00", label: "Aguardando", bg: "rgba(204,170,0,0.1)" },
  CONFIRMED: { color: "#00cc66", label: "Confirmado", bg: "rgba(0,204,102,0.1)" },
  COMPLETED: { color: "#888", label: "Concluído", bg: "rgba(136,136,136,0.1)" },
  CANCELLED: { color: "#cc4444", label: "Cancelado", bg: "rgba(204,68,68,0.1)" },
};

export default function ProfissionalDashPage() {
  const { data: session } = useSession();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Painel da Profissional</h1>
          <p style={{ color: "#666", fontSize: 14 }}>Gerencie seu perfil, agenda e agendamentos.</p>
        </div>
        <Link
          href="/profissionais/juliana-oliveira"
          style={{ padding: "10px 20px", background: "#111", border: "1px solid #333", borderRadius: 8, color: "#ccc", textDecoration: "none", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" /><circle cx="12" cy="12" r="3" />
          </svg>
          Ver meu perfil público
        </Link>
      </div>

      {/* Profile completeness */}
      <div style={{ background: "rgba(204,0,0,0.05)", border: "1px solid rgba(204,0,0,0.15)", borderRadius: 12, padding: "16px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: "#ccc", fontWeight: 600 }}>Completude do perfil</span>
            <span style={{ fontSize: 13, color: "#cc0000", fontWeight: 700 }}>75%</span>
          </div>
          <div style={{ height: 6, background: "#222", borderRadius: 3 }}>
            <div style={{ width: "75%", height: "100%", background: "#cc0000", borderRadius: 3 }} />
          </div>
        </div>
        <p style={{ fontSize: 13, color: "#888" }}>
          Adicione mais fotos ao portfólio para aumentar suas chances de contratação.
        </p>
        <Link href="/profissional/perfil" style={{ padding: "8px 16px", background: "#cc0000", color: "#fff", borderRadius: 6, textDecoration: "none", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
          Completar perfil
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 28 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <span style={{ fontSize: 24 }}>{s.icon}</span>
              {s.change && <span style={{ fontSize: 11, color: "#00cc66", background: "rgba(0,200,100,0.1)", padding: "2px 7px", borderRadius: 20, fontWeight: 600 }}>{s.change}</span>}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 3 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#666" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pending appointments */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Agendamentos pendentes</h2>
          <Link href="/profissional/agendamentos" style={{ fontSize: 13, color: "#cc0000", textDecoration: "none" }}>Ver todos</Link>
        </div>

        {pendingAppointments.length === 0 ? (
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: 32, textAlign: "center" }}>
            <p style={{ color: "#555", fontSize: 14 }}>Nenhum agendamento pendente.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {pendingAppointments.map((a) => {
              const s = statusMap[a.status];
              return (
                <div key={a.id} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "18px 20px", display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#cc0000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff" }}>{a.client[0]}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{a.client}</div>
                        <div style={{ fontSize: 12, color: "#666" }}>{new Date(a.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })} · {a.time} · {a.duration}</div>
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: "#777", marginLeft: 44 }}>{a.notes}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ padding: "4px 10px", background: s.bg, color: s.color, borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{s.label}</span>
                    <button style={{ padding: "7px 14px", background: "rgba(0,200,100,0.1)", border: "1px solid #00cc66", borderRadius: 7, color: "#00cc66", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>✓ Aceitar</button>
                    <button style={{ padding: "7px 14px", background: "rgba(204,0,0,0.1)", border: "1px solid #cc0000", borderRadius: 7, color: "#cc4444", fontSize: 12, cursor: "pointer" }}>✗ Recusar</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {[
          { href: "/profissional/perfil", label: "Editar perfil", icon: "✏️", desc: "Atualizar bio, fotos, especialidades" },
          { href: "/profissional/fotos", label: "Gerenciar fotos", icon: "📸", desc: "Portfólio e fotos de capa" },
          { href: "/profissional/agenda", label: "Minha agenda", icon: "📅", desc: "Disponibilidade semanal" },
          { href: "/profissional/agendamentos", label: "Agendamentos", icon: "🤝", desc: "Histórico e confirmações" },
        ].map((l) => (
          <Link key={l.href} href={l.href} style={{ display: "block", background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "16px", textDecoration: "none", transition: "border-color 0.2s" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#cc000050")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#1e1e1e")}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>{l.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 3 }}>{l.label}</div>
            <div style={{ fontSize: 12, color: "#666" }}>{l.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

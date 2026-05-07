"use client";
import { useState } from "react";
import toast from "react-hot-toast";

const mockAppointments = [
  { id: "a1", client: "Carlos F.", avatar: "C", date: "2024-12-18", time: "14:00", duration: "2h", status: "PENDING", notes: "Ensaio fashion editorial para revista.", contact: "WhatsApp" },
  { id: "a2", client: "Studio Arte", avatar: "S", date: "2024-12-20", time: "09:00", duration: "8h", status: "PENDING", notes: "Campanha comercial verão.", contact: "WhatsApp" },
  { id: "a3", client: "Marca XYZ", avatar: "M", date: "2024-11-30", time: "10:00", duration: "4h", status: "COMPLETED", notes: "Campanha de verão lançada.", contact: "Chat" },
  { id: "a4", client: "João F.", avatar: "J", date: "2024-11-25", time: "13:00", duration: "2h", status: "CONFIRMED", notes: "Ensaio artístico pessoal.", contact: "WhatsApp" },
  { id: "a5", client: "Agência Beta", avatar: "A", date: "2024-11-20", time: "09:00", duration: "6h", status: "CANCELLED", notes: "Cancelado pelo cliente.", contact: "Chat" },
];

const statusMap: Record<string, { color: string; label: string; bg: string }> = {
  PENDING:   { color: "#ccaa00", label: "Pendente",   bg: "rgba(204,170,0,0.1)" },
  CONFIRMED: { color: "#00cc66", label: "Confirmado", bg: "rgba(0,204,102,0.1)" },
  COMPLETED: { color: "#888",    label: "Concluído",  bg: "rgba(136,136,136,0.1)" },
  CANCELLED: { color: "#cc4444", label: "Cancelado",  bg: "rgba(204,68,68,0.1)" },
  NO_SHOW:   { color: "#cc4444", label: "Não compareceu", bg: "rgba(204,68,68,0.1)" },
};

export default function AgendamentosPage() {
  const [filter, setFilter] = useState("ALL");
  const [appointments, setAppointments] = useState(mockAppointments);

  const filtered = filter === "ALL" ? appointments : appointments.filter((a) => a.status === filter);

  function handleAction(id: string, action: "CONFIRMED" | "CANCELLED") {
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: action } : a));
    toast.success(action === "CONFIRMED" ? "Agendamento confirmado!" : "Agendamento recusado.");
  }

  const tabs = [
    { key: "ALL", label: "Todos" },
    { key: "PENDING", label: "Pendentes" },
    { key: "CONFIRMED", label: "Confirmados" },
    { key: "COMPLETED", label: "Concluídos" },
    { key: "CANCELLED", label: "Cancelados" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Agendamentos</h1>
        <p style={{ color: "#666", fontSize: 14 }}>Gerencie todos os pedidos de agendamento.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {tabs.map((t) => {
          const count = t.key === "ALL" ? appointments.length : appointments.filter((a) => a.status === t.key).length;
          return (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              style={{
                padding: "8px 16px",
                background: filter === t.key ? "rgba(204,0,0,0.12)" : "#111",
                border: `1.5px solid ${filter === t.key ? "#cc0000" : "#1e1e1e"}`,
                borderRadius: 8,
                color: filter === t.key ? "#fff" : "#777",
                fontSize: 13,
                fontWeight: filter === t.key ? 700 : 400,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {t.label}
              {count > 0 && (
                <span style={{ background: filter === t.key ? "#cc0000" : "#222", color: "#fff", fontSize: 11, fontWeight: 700, width: 18, height: 18, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.length === 0 && (
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: 40, textAlign: "center" }}>
            <p style={{ color: "#555", fontSize: 14 }}>Nenhum agendamento neste status.</p>
          </div>
        )}

        {filtered.map((a) => {
          const s = statusMap[a.status];
          return (
            <div key={a.id} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#cc0000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                    {a.avatar}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 3 }}>{a.client}</div>
                    <div style={{ display: "flex", gap: 12, fontSize: 13, color: "#777", flexWrap: "wrap" }}>
                      <span>📅 {new Date(a.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}</span>
                      <span>🕐 {a.time}</span>
                      <span>⏱ {a.duration}</span>
                      <span>📲 {a.contact}</span>
                    </div>
                    {a.notes && (
                      <p style={{ fontSize: 13, color: "#666", marginTop: 6, maxWidth: 400 }}>{a.notes}</p>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <span style={{ padding: "4px 12px", background: s.bg, color: s.color, borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                    {s.label}
                  </span>
                  {a.status === "PENDING" && (
                    <>
                      <button
                        onClick={() => handleAction(a.id, "CONFIRMED")}
                        style={{ padding: "7px 14px", background: "rgba(0,200,100,0.1)", border: "1px solid #00cc66", borderRadius: 7, color: "#00cc66", fontSize: 12, cursor: "pointer", fontWeight: 600 }}
                      >
                        ✓ Aceitar
                      </button>
                      <button
                        onClick={() => handleAction(a.id, "CANCELLED")}
                        style={{ padding: "7px 14px", background: "rgba(204,0,0,0.08)", border: "1px solid #cc0000", borderRadius: 7, color: "#cc4444", fontSize: 12, cursor: "pointer" }}
                      >
                        ✗ Recusar
                      </button>
                    </>
                  )}
                  {a.status === "CONFIRMED" && (
                    <button
                      onClick={() => { setAppointments((p) => p.map((x) => x.id === a.id ? { ...x, status: "COMPLETED" } : x)); toast.success("Marcado como concluído."); }}
                      style={{ padding: "7px 14px", background: "rgba(136,136,136,0.1)", border: "1px solid #555", borderRadius: 7, color: "#888", fontSize: 12, cursor: "pointer" }}
                    >
                      Marcar concluído
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

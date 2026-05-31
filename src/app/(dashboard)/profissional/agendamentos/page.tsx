"use client";
/* eslint-disable @next/next/no-img-element -- Avatares remotos de clientes são opcionais e pequenos nesta lista operacional. */
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type AppointmentStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";

type Appointment = {
  id: string;
  date: string;
  duration: number;
  status: AppointmentStatus;
  notes?: string | null;
  contactMethod: string;
  price?: number | null;
  originalPrice?: number | null;
  voucherDiscount?: number | null;
  finalPrice?: number | null;
  voucher?: { id: string; code: string; value: number; status: string } | null;
  client: { name: string | null; email: string | null; image: string | null };
  professional: { displayName: string; slug: string };
};

const statusMap: Record<AppointmentStatus, { color: string; label: string; bg: string }> = {
  PENDING:   { color: "#ccaa00", label: "Pendente",   bg: "rgba(204,170,0,0.1)" },
  CONFIRMED: { color: "#00cc66", label: "Confirmado", bg: "rgba(0,204,102,0.1)" },
  COMPLETED: { color: "#888",    label: "Concluído",  bg: "rgba(136,136,136,0.1)" },
  CANCELLED: { color: "#cc4444", label: "Cancelado",  bg: "rgba(204,68,68,0.1)" },
  NO_SHOW:   { color: "#cc4444", label: "Não compareceu", bg: "rgba(204,68,68,0.1)" },
};

function clientName(appointment: Appointment) {
  return appointment.client.name ?? appointment.client.email ?? "Cliente";
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}min` : `${hours}h`;
}

function money(value?: number | null) {
  return (value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AgendamentosPage() {
  const [filter, setFilter] = useState<AppointmentStatus | "ALL">("ALL");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadAppointments() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/appointments", { signal: controller.signal });
        if (!res.ok) throw new Error("Failed to load appointments");
        const data: Appointment[] = await res.json();
        setAppointments(data);
      } catch {
        if (!controller.signal.aborted) {
          setAppointments([]);
          setError("Não foi possível carregar seus agendamentos agora.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadAppointments();
    return () => controller.abort();
  }, []);

  const filtered = filter === "ALL" ? appointments : appointments.filter((a) => a.status === filter);

  async function handleAction(id: string, status: AppointmentStatus) {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("Failed to update appointment");
      const updated: Appointment = await res.json();
      setAppointments((prev) => prev.map((a) => a.id === id ? updated : a));
      toast.success(status === "CONFIRMED" ? "Agendamento confirmado!" : status === "COMPLETED" ? "Marcado como concluído." : "Agendamento cancelado.");
    } catch {
      toast.error("Não foi possível atualizar o agendamento.");
    } finally {
      setUpdatingId(null);
    }
  }

  const tabs: { key: AppointmentStatus | "ALL"; label: string }[] = [
    { key: "ALL", label: "Todos" },
    { key: "PENDING", label: "Pendentes" },
    { key: "CONFIRMED", label: "Confirmados" },
    { key: "COMPLETED", label: "Concluídos" },
    { key: "CANCELLED", label: "Cancelados" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", marginBottom: 4 }}>Agendamentos</h1>
        <p style={{ color: "#666", fontSize: 14 }}>Gerencie todos os pedidos de agendamento reais do seu perfil.</p>
      </div>

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
                borderRadius: 12,
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

      {loading && (
        <div className="premium-card premium-enter" style={{ borderRadius: 8, padding: 22 }}>
          <div className="premium-skeleton" style={{ height: 18, width: 180, borderRadius: 999 }} />
          <div className="premium-skeleton" style={{ height: 12, width: "70%", borderRadius: 999, marginTop: 14 }} />
        </div>
      )}

      {!loading && error && (
        <div className="premium-empty-state premium-enter" style={{ borderRadius: 8, padding: 32, textAlign: "center", color: "#aaa" }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.length === 0 && (
            <div style={{ background: "#111", border: "1px solid rgba(212,168,67,.16)", borderRadius: 18, padding: 40, textAlign: "center" }}>
              <p style={{ color: "#555", fontSize: 14 }}>Nenhum agendamento neste status.</p>
            </div>
          )}

          {filtered.map((a) => {
            const s = statusMap[a.status];
            const date = new Date(a.date);
            const label = clientName(a);
            return (
              <div key={a.id} style={{ background: "#111", border: "1px solid rgba(212,168,67,.16)", borderRadius: 18, padding: "20px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#cc0000", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                      {a.client.image ? <img src={a.client.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : label[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 3 }}>{label}</div>
                      <div style={{ display: "flex", gap: 12, fontSize: 13, color: "#777", flexWrap: "wrap" }}>
                        <span>{date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}</span>
                        <span>{date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                        <span>{formatDuration(a.duration)}</span>
                        <span>{a.contactMethod}</span>
                      </div>
                      {a.notes && (
                        <p style={{ fontSize: 13, color: "#666", marginTop: 6, maxWidth: 400 }}>{a.notes}</p>
                      )}
                      {a.voucher && (
                        <div style={{ marginTop: 10, border: "1px solid rgba(212,168,67,.24)", borderRadius: 10, padding: 10, color: "#d8d1c7", fontSize: 12, lineHeight: 1.6 }}>
                          <strong style={{ color: "#f5d78c" }}>Voucher promocional aplicado pela plataforma</strong><br />
                          Valor original: {money(a.originalPrice ?? a.price)} · Voucher aplicado: {money(a.voucherDiscount ?? a.voucher.value)} · Cliente pagará: {money(a.finalPrice ?? a.price)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
                    <span style={{ padding: "4px 12px", background: s.bg, color: s.color, borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                      {s.label}
                    </span>
                    {a.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => handleAction(a.id, "CONFIRMED")}
                          disabled={updatingId === a.id}
                          style={{ padding: "7px 14px", background: "rgba(0,200,100,0.1)", border: "1px solid #00cc66", borderRadius: 7, color: "#00cc66", fontSize: 12, cursor: updatingId === a.id ? "wait" : "pointer", fontWeight: 600 }}
                        >
                          Aceitar
                        </button>
                        <button
                          onClick={() => handleAction(a.id, "CANCELLED")}
                          disabled={updatingId === a.id}
                          style={{ padding: "7px 14px", background: "rgba(204,0,0,0.08)", border: "1px solid #cc0000", borderRadius: 7, color: "#cc4444", fontSize: 12, cursor: updatingId === a.id ? "wait" : "pointer" }}
                        >
                          Recusar
                        </button>
                      </>
                    )}
                    {a.status === "CONFIRMED" && (
                      <button
                        onClick={() => handleAction(a.id, "COMPLETED")}
                        disabled={updatingId === a.id}
                        style={{ padding: "7px 14px", background: "rgba(136,136,136,0.1)", border: "1px solid #555", borderRadius: 7, color: "#888", fontSize: 12, cursor: updatingId === a.id ? "wait" : "pointer" }}
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
      )}
    </div>
  );
}

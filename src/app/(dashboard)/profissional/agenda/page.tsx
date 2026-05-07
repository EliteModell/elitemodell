"use client";
import { useState } from "react";
import toast from "react-hot-toast";

const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const timeSlots = ["06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00"];

type DaySchedule = { available: boolean; startTime: string; endTime: string };

export default function AgendaPage() {
  const [schedule, setSchedule] = useState<DaySchedule[]>([
    { available: false, startTime: "09:00", endTime: "18:00" }, // Dom
    { available: true,  startTime: "09:00", endTime: "18:00" }, // Seg
    { available: true,  startTime: "09:00", endTime: "18:00" }, // Ter
    { available: true,  startTime: "09:00", endTime: "18:00" }, // Qua
    { available: true,  startTime: "09:00", endTime: "18:00" }, // Qui
    { available: true,  startTime: "09:00", endTime: "17:00" }, // Sex
    { available: true,  startTime: "10:00", endTime: "14:00" }, // Sáb
  ]);
  const [loading, setLoading] = useState(false);

  const update = (i: number, field: keyof DaySchedule, value: any) => {
    setSchedule((s) => s.map((d, idx) => idx === i ? { ...d, [field]: value } : d));
  };

  async function handleSave() {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    toast.success("Agenda atualizada!");
    setLoading(false);
  }

  const selectStyle = {
    padding: "8px 10px",
    background: "#0d0d0d",
    border: "1px solid #2a2a2a",
    borderRadius: 7,
    color: "#ccc",
    fontSize: 13,
    outline: "none",
    cursor: "pointer",
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Minha agenda</h1>
        <p style={{ color: "#666", fontSize: 14 }}>Configure seus dias e horários disponíveis para agendamentos.</p>
      </div>

      <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
        {schedule.map((day, i) => (
          <div
            key={days[i]}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "16px 20px",
              borderBottom: i < 6 ? "1px solid #141414" : "none",
              background: day.available ? "#111" : "#0d0d0d",
              transition: "background 0.2s",
              flexWrap: "wrap",
            }}
          >
            {/* Toggle */}
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none", minWidth: 110 }}>
              <div
                onClick={() => update(i, "available", !day.available)}
                style={{
                  width: 40,
                  height: 22,
                  borderRadius: 11,
                  background: day.available ? "#cc0000" : "#2a2a2a",
                  position: "relative",
                  cursor: "pointer",
                  transition: "background 0.2s",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 3,
                    left: day.available ? 21 : 3,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#fff",
                    transition: "left 0.2s",
                  }}
                />
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: day.available ? "#fff" : "#555", width: 65 }}>
                {days[i]}
              </span>
            </label>

            {day.available ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <select value={day.startTime} onChange={(e) => update(i, "startTime", e.target.value)} style={selectStyle}>
                  {timeSlots.map((t) => <option key={t} value={t} style={{ background: "#111" }}>{t}</option>)}
                </select>
                <span style={{ color: "#555", fontSize: 13 }}>até</span>
                <select value={day.endTime} onChange={(e) => update(i, "endTime", e.target.value)} style={selectStyle}>
                  {timeSlots.map((t) => <option key={t} value={t} style={{ background: "#111" }}>{t}</option>)}
                </select>
              </div>
            ) : (
              <span style={{ fontSize: 13, color: "#444", fontStyle: "italic" }}>Não disponível</span>
            )}

            {/* Availability dot */}
            <div style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: "50%", background: day.available ? "#00cc66" : "#2a2a2a" }} />
          </div>
        ))}
      </div>

      {/* Visual summary */}
      <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "18px 20px", marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 14 }}>Resumo da semana</h3>
        <div style={{ display: "flex", gap: 6 }}>
          {schedule.map((d, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                borderRadius: 6,
                background: d.available ? "#cc0000" : "#1a1a1a",
                padding: "8px 4px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: d.available ? "#fff" : "#444", marginBottom: 4 }}>
                {days[i].slice(0, 3)}
              </div>
              {d.available && (
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.7)" }}>
                  {d.startTime}–{d.endTime}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        style={{
          padding: "13px 28px",
          background: loading ? "#8a0000" : "#cc0000",
          color: "#fff",
          border: "none",
          borderRadius: 9,
          fontSize: 15,
          fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
        }}
        onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#e00000"; }}
        onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#cc0000"; }}
      >
        {loading ? "Salvando..." : "Salvar agenda"}
      </button>
    </div>
  );
}

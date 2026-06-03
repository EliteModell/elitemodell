"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { CalendarDays, Check, Clock } from "lucide-react";
import { PremiumHeroCard, PremiumSection } from "@/components/professional-dashboard/ProfessionalPremium";

const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const timeSlots = ["06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00"];

type DaySchedule = { available: boolean; startTime: string; endTime: string };

export default function AgendaPage() {
  const [schedule, setSchedule] = useState<DaySchedule[]>([
    { available: false, startTime: "09:00", endTime: "18:00" },
    { available: true,  startTime: "09:00", endTime: "18:00" },
    { available: true,  startTime: "09:00", endTime: "18:00" },
    { available: true,  startTime: "09:00", endTime: "18:00" },
    { available: true,  startTime: "09:00", endTime: "18:00" },
    { available: true,  startTime: "09:00", endTime: "17:00" },
    { available: true,  startTime: "10:00", endTime: "14:00" },
  ]);
  const [loading, setLoading] = useState(false);

  const update = <K extends keyof DaySchedule>(i: number, field: K, value: DaySchedule[K]) => {
    setSchedule((s) => s.map((d, idx) => idx === i ? { ...d, [field]: value } : d));
  };

  async function handleSave() {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    toast.success("Agenda atualizada!");
    setLoading(false);
  }

  return (
    <div className="professional-premium-page">
      <PremiumHeroCard
        eyebrow="Disponibilidade"
        title={<>Atualizar <span className="gold">agenda</span></>}
        subtitle="Mantenha seus horários, disponibilidade e presença sempre atualizados."
        illustration="calendar"
      />

      <PremiumSection eyebrow="Semana" title="Horários de atendimento" description="Organize os dias disponíveis com horários claros para reduzir atrito no contato.">
        <div className="premium-grid">
          {schedule.map((day, i) => (
            <article key={days[i]} className="premium-card" style={{ padding: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 14, alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => update(i, "available", !day.available)}
                  className={day.available ? "premium-button" : "premium-button-secondary"}
                  style={{ justifyContent: "flex-start", width: "100%" }}
                >
                  {day.available ? <Check size={18} /> : <Clock size={18} />}
                  {days[i]}
                </button>
                <span className="premium-badge" style={{ color: day.available ? "var(--elite-success)" : "var(--elite-text-muted)" }}>
                  {day.available ? "Disponível" : "Indisponível"}
                </span>
              </div>

              {day.available ? (
                <div className="premium-form" style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "center", marginTop: 16 }}>
                  <select value={day.startTime} onChange={(e) => update(i, "startTime", e.target.value)}>
                    {timeSlots.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <span style={{ color: "var(--elite-text-muted)", fontWeight: 800 }}>até</span>
                  <select value={day.endTime} onChange={(e) => update(i, "endTime", e.target.value)}>
                    {timeSlots.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </PremiumSection>

      <section className="premium-section-card">
        <p className="premium-eyebrow">Resumo</p>
        <h2 className="premium-section-title">Resumo da semana</h2>
        <div className="premium-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(72px, 1fr))", marginTop: 18 }}>
          {schedule.map((d, i) => (
            <div key={days[i]} style={{ minHeight: 74, border: "1px solid var(--elite-border-soft)", borderRadius: 16, background: d.available ? "rgba(117,217,154,0.10)" : "rgba(255,255,255,0.035)", display: "grid", placeItems: "center", padding: 8, textAlign: "center" }}>
              <strong style={{ color: d.available ? "var(--elite-success)" : "var(--elite-text-muted)", fontSize: 12 }}>{days[i].slice(0, 3)}</strong>
              {d.available ? <small style={{ color: "#fff", fontSize: 10 }}>{d.startTime}-{d.endTime}</small> : null}
            </div>
          ))}
        </div>
      </section>

      <button onClick={handleSave} disabled={loading} className="premium-button" style={{ width: "100%" }}>
        <CalendarDays size={18} />
        {loading ? "Salvando..." : "Salvar agenda"}
      </button>
    </div>
  );
}

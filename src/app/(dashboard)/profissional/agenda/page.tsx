"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CalendarDays, Check, Clock } from "lucide-react";
import { PremiumHeroCard, PremiumSection } from "@/components/professional-dashboard/ProfessionalPremium";

const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const timeSlots = ["06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"];

type DaySchedule = { dayOfWeek: number; available: boolean; startTime: string; endTime: string };
type ScheduleResponse = { schedule?: Array<{ dayOfWeek: number; available: boolean; startTime: string; endTime: string }> };

function defaultSchedule(): DaySchedule[] {
  return days.map((_, dayOfWeek) => ({
    dayOfWeek,
    available: dayOfWeek > 0 && dayOfWeek < 6,
    startTime: "09:00",
    endTime: dayOfWeek === 5 ? "17:00" : "18:00",
  }));
}

function mergeSchedule(saved: ScheduleResponse["schedule"]): DaySchedule[] {
  const base = defaultSchedule();
  if (!saved?.length) return base;
  return base.map((day) => {
    const current = saved.find((item) => item.dayOfWeek === day.dayOfWeek);
    return current
      ? { dayOfWeek: day.dayOfWeek, available: current.available, startTime: current.startTime, endTime: current.endTime }
      : { ...day, available: false };
  });
}

export default function AgendaPage() {
  const [schedule, setSchedule] = useState<DaySchedule[]>(defaultSchedule);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function loadSchedule() {
      setLoading(true);
      try {
        const res = await fetch("/api/professional/schedule", { signal: controller.signal, cache: "no-store" });
        if (!res.ok) throw new Error("load");
        const data: ScheduleResponse = await res.json();
        setSchedule(mergeSchedule(data.schedule));
      } catch {
        if (!controller.signal.aborted) toast.error("Não foi possível carregar sua agenda agora.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadSchedule();
    return () => controller.abort();
  }, []);

  const update = <K extends keyof DaySchedule>(i: number, field: K, value: DaySchedule[K]) => {
    setSchedule((current) => current.map((day, idx) => (idx === i ? { ...day, [field]: value } : day)));
  };

  async function handleSave() {
    const invalid = schedule.find((day) => day.available && day.endTime <= day.startTime);
    if (invalid) {
      toast.error("O horário final precisa ser depois do horário inicial.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/professional/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "save");
      setSchedule(mergeSchedule(data.schedule));
      toast.success("Sua agenda foi atualizada.");
    } catch (err) {
      toast.error(err instanceof Error && err.message !== "save" ? err.message : "Não foi possível atualizar sua agenda agora.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="professional-premium-page">
      <PremiumHeroCard
        eyebrow="Disponibilidade"
        title={<>Atualizar <span className="gold">agenda</span></>}
        subtitle="Informe seus horários e disponibilidade para melhorar a experiência dos clientes."
        illustration="calendar"
      />

      <PremiumSection eyebrow="Semana" title="Horários de atendimento" description="Organize os dias disponíveis com horários claros para reduzir atrito no contato.">
        {loading ? (
          <div className="premium-section-card">
            <div className="premium-skeleton" style={{ height: 24, width: 220, borderRadius: 999 }} />
            <div className="premium-skeleton" style={{ height: 120, width: "100%", borderRadius: 18, marginTop: 18 }} />
          </div>
        ) : (
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
        )}
      </PremiumSection>

      <section className="premium-section-card">
        <p className="premium-eyebrow">Resumo</p>
        <h2 className="premium-section-title">Resumo da semana</h2>
        <div className="premium-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(72px, 1fr))", marginTop: 18 }}>
          {schedule.map((day, i) => (
            <div key={days[i]} style={{ minHeight: 74, border: "1px solid var(--elite-border-soft)", borderRadius: 16, background: day.available ? "rgba(117,217,154,0.10)" : "rgba(255,255,255,0.035)", display: "grid", placeItems: "center", padding: 8, textAlign: "center" }}>
              <strong style={{ color: day.available ? "var(--elite-success)" : "var(--elite-text-muted)", fontSize: 12 }}>{days[i].slice(0, 3)}</strong>
              {day.available ? <small style={{ color: "#fff", fontSize: 10 }}>{day.startTime}-{day.endTime}</small> : null}
            </div>
          ))}
        </div>
      </section>

      <button onClick={handleSave} disabled={saving || loading} className="premium-button" style={{ width: "100%" }}>
        <CalendarDays size={18} />
        {saving ? "Salvando..." : "Salvar agenda"}
      </button>
    </div>
  );
}

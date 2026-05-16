"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, CalendarCheck, Clock3, Compass, MapPin, Sparkles } from "lucide-react";

type Appointment = {
  id: string;
  date: string;
  duration: number;
  status: string;
  contactMethod: string;
  professional?: {
    displayName: string;
    slug: string;
  };
};

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "Aguardando confirmação",
    CONFIRMED: "Confirmado",
    CANCELLED: "Cancelado",
    COMPLETED: "Concluído",
    NO_SHOW: "Não compareceu",
  };
  return labels[status] ?? status;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ReservasPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/appointments")
      .then((res) => res.json())
      .then((data) => setAppointments(Array.isArray(data) ? data : []))
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <section className="rounded-[8px] border border-white/10 bg-[linear-gradient(135deg,rgba(20,20,22,0.97),rgba(58,9,14,0.65),rgba(7,7,8,0.98))] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.35)] sm:p-6">
        <p className="mb-2 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-[#f5d78c]">
          <CalendarCheck className="h-4 w-4" />
          Agenda cliente
        </p>
        <h1 className="text-3xl font-black text-white">Meus agendamentos</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/52">
          Acompanhe contatos e experiências iniciadas com profissionais verificadas.
        </p>
      </section>

      {loading ? (
        <div className="rounded-[8px] border border-white/10 bg-white/[0.04] p-5">
          <div className="premium-shimmer h-24 rounded-[8px] bg-white/5" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="rounded-[8px] border border-dashed border-white/12 bg-white/[0.04] p-6 text-center">
          <Sparkles className="mx-auto mb-3 h-6 w-6 text-[#d4a843]" />
          <p className="text-lg font-black text-white">Nenhum agendamento ainda</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/45">
            Explore perfis verificados e inicie contato quando encontrar uma profissional alinhada ao seu momento.
          </p>
          <Link
            href="/profissionais"
            className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-[#d4a843] px-5 text-sm font-black text-[#100d09] transition hover:bg-[#f5d78c]"
          >
            <Compass className="h-4 w-4" />
            Explorar profissionais
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {appointments.map((appointment) => (
            <Link
              key={appointment.id}
              href={appointment.professional?.slug ? `/profissionais/${appointment.professional.slug}` : "/dashboard/reservas"}
              className="rounded-[8px] border border-white/10 bg-white/[0.04] p-4 text-white no-underline transition hover:border-[#d4a843]/35 hover:bg-white/[0.06]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate font-black text-white">
                    {appointment.professional?.displayName ?? "Profissional"}
                    <BadgeCheck className="h-4 w-4 shrink-0 text-[#d4a843]" />
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-sm text-white/45">
                    <Clock3 className="h-4 w-4 text-[#d4a843]" />
                    {dateLabel(appointment.date)} · {appointment.duration} min
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-white/45">
                    <MapPin className="h-4 w-4 text-[#d4a843]" />
                    Contato via {appointment.contactMethod}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-[#d4a843]/20 bg-[#d4a843]/10 px-3 py-1 text-xs font-black text-[#f5d78c]">
                  {statusLabel(appointment.status)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

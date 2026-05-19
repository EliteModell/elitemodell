"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarCheck, Clock3, Compass, MessageCircle, Star } from "lucide-react";

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
    PENDING: "Aguardando",
    CONFIRMED: "Confirmado",
    CANCELLED: "Cancelado",
    COMPLETED: "Concluído",
    NO_SHOW: "Ausente",
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
    <div className="client-page">
      <p className="client-kicker">Histórico privado</p>
      <h1 className="client-title mt-1">Atividade</h1>
      <p className="client-subtitle mt-3">
        Histórico, agendamentos e avaliações ficam organizados em um só lugar.
      </p>

      <section className="client-card mt-6 p-5">
        <h2 className="flex items-center gap-3 text-[22px] font-black text-[#f5f0e4]">
          <CalendarCheck className="h-7 w-7 text-[#f5d78c]" />
          Agendamentos
        </h2>

        {loading ? (
          <div className="premium-skeleton mt-6 h-24 rounded-[8px]" />
        ) : appointments.length === 0 ? (
          <div className="py-12 text-center">
            <Compass className="mx-auto h-14 w-14 text-[#f5d78c]" />
            <p className="mt-6 text-[21px] font-black text-[#f5f0e4]">Nenhum agendamento ainda</p>
            <p className="mt-3 text-[15px] leading-6 text-[#f5f0e4]/58">Explore perfis e inicie contato quando encontrar alguém alinhado ao seu momento.</p>
            <Link href="/dashboard/acompanhantes" className="client-primary-button mt-7 flex items-center justify-center text-[16px] no-underline">
              Explorar acompanhantes
            </Link>
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            {appointments.map((appointment) => (
              <Link
                key={appointment.id}
                href={appointment.professional?.slug ? `/profissionais/${appointment.professional.slug}` : "/dashboard/reservas"}
                className="client-panel-soft p-4 text-[#f5f0e4] no-underline"
              >
                <p className="text-[18px] font-black">{appointment.professional?.displayName ?? "Profissional"}</p>
                <p className="mt-2 flex items-center gap-2 text-[14px] text-[#f5f0e4]/58">
                  <Clock3 className="h-4 w-4" />
                  {dateLabel(appointment.date)} · {appointment.duration} min
                </p>
                <p className="mt-2 text-sm font-black text-[#f5d78c]">{statusLabel(appointment.status)}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="client-panel mt-5 p-5">
        <h2 className="flex items-center gap-3 text-[22px] font-black text-[#f5f0e4]">
          <Star className="h-7 w-7 text-[#f5d78c]" />
          Avaliações
        </h2>
        <p className="mt-4 text-[15px] leading-6 text-[#f5f0e4]/58">Você ainda não fez nenhuma avaliação.</p>
        <p className="mt-2 text-[15px] leading-6 text-[#f5f0e4]">Quando contratar um atendimento, compartilhe sua experiência pelo perfil da acompanhante.</p>
        <Link href="/dashboard/acompanhantes" className="client-secondary-button mt-6 flex items-center justify-center gap-2 text-[16px] no-underline">
          <MessageCircle className="h-5 w-5" />
          Avaliar agora
        </Link>
      </section>
    </div>
  );
}

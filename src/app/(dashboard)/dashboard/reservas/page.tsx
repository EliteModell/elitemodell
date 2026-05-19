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
    <div className="bg-white px-5 py-8">
      <h1 className="text-[34px] font-black text-[#202a30]">Atividade</h1>
      <p className="mt-4 text-[19px] leading-7 text-[#59666d]">
        Histórico, agendamentos e avaliações ficam organizados em um só lugar.
      </p>

      <section className="mt-8 rounded-[10px] border border-[#e0e5e7] bg-white p-5">
        <h2 className="flex items-center gap-3 text-[24px] font-black text-[#202a30]">
          <CalendarCheck className="h-7 w-7 text-[#a9822d]" />
          Agendamentos
        </h2>

        {loading ? (
          <div className="mt-6 h-24 animate-pulse rounded-[8px] bg-[#edf2f4]" />
        ) : appointments.length === 0 ? (
          <div className="py-12 text-center">
            <Compass className="mx-auto h-16 w-16 text-[#617781]" />
            <p className="mt-6 text-[22px] font-black text-[#202a30]">Nenhum agendamento ainda</p>
            <p className="mt-3 text-[17px] leading-6 text-[#64727a]">Explore perfis e inicie contato quando encontrar alguém alinhado ao seu momento.</p>
            <Link href="/profissionais" className="mt-7 flex h-[56px] items-center justify-center rounded-[8px] bg-[#c9a84c] text-[17px] font-black text-[#11191d] no-underline">
              Explorar acompanhantes
            </Link>
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            {appointments.map((appointment) => (
              <Link
                key={appointment.id}
                href={appointment.professional?.slug ? `/profissionais/${appointment.professional.slug}` : "/dashboard/reservas"}
                className="rounded-[8px] border border-[#e0e5e7] bg-[#f8faf9] p-4 text-[#202a30] no-underline"
              >
                <p className="text-[18px] font-black">{appointment.professional?.displayName ?? "Profissional"}</p>
                <p className="mt-2 flex items-center gap-2 text-[15px] text-[#64727a]">
                  <Clock3 className="h-4 w-4" />
                  {dateLabel(appointment.date)} · {appointment.duration} min
                </p>
                <p className="mt-2 text-sm font-black text-[#a9822d]">{statusLabel(appointment.status)}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-7 rounded-[10px] bg-[#edf2f4] p-5">
        <h2 className="flex items-center gap-3 text-[24px] font-black text-[#202a30]">
          <Star className="h-7 w-7 text-[#a9822d]" />
          Avaliações
        </h2>
        <p className="mt-4 text-[18px] leading-7 text-[#59666d]">Você ainda não fez nenhuma avaliação.</p>
        <p className="mt-2 text-[18px] leading-7 text-[#202a30]">Quando contratar um atendimento, compartilhe sua experiência pelo perfil da acompanhante.</p>
        <Link href="/profissionais" className="mt-6 flex h-[56px] items-center justify-center gap-2 rounded-[8px] border border-[#c9a84c] bg-white text-[17px] font-black text-[#a9822d] no-underline">
          <MessageCircle className="h-5 w-5" />
          Avaliar agora
        </Link>
      </section>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Booking = {
  id: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  status: string;
  paymentStatus: string;
  property?: { id: string; title: string; city: string };
};

export default function ReservasPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bookings")
      .then((res) => res.json())
      .then((data) => setBookings(Array.isArray(data) ? data : []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Minhas reservas</h1>
      <p style={{ color: "#777", marginBottom: 24 }}>Acompanhe reservas e pagamentos criados na plataforma.</p>

      {loading ? (
        <p style={{ color: "#777" }}>Carregando reservas...</p>
      ) : bookings.length === 0 ? (
        <div style={{ background: "#111", border: "1px solid #222", borderRadius: 10, padding: 24 }}>
          <p style={{ color: "#aaa", marginBottom: 14 }}>Voce ainda nao tem reservas.</p>
          <Link href="/imoveis" style={{ color: "#d4a843", textDecoration: "none", fontWeight: 700 }}>
            Buscar imoveis
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {bookings.map((booking) => (
            <Link
              key={booking.id}
              href={booking.property?.id ? `/imoveis/${booking.property.id}` : "/dashboard/reservas"}
              style={{ background: "#111", border: "1px solid #222", borderRadius: 10, padding: 16, textDecoration: "none" }}
            >
              <strong style={{ color: "#fff" }}>{booking.property?.title ?? "Reserva"}</strong>
              <p style={{ color: "#777", margin: "6px 0" }}>{booking.property?.city ?? ""}</p>
              <p style={{ color: "#aaa", margin: 0 }}>
                {new Date(booking.checkIn).toLocaleDateString("pt-BR")} - {new Date(booking.checkOut).toLocaleDateString("pt-BR")} | R$ {booking.totalPrice.toLocaleString("pt-BR")}
              </p>
              <p style={{ color: "#d4a843", margin: "8px 0 0", fontSize: 13 }}>
                {booking.status} / {booking.paymentStatus}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

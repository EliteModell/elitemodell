"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import toast from "react-hot-toast";

const mockProperty = {
  id: "1",
  title: "Cobertura de Luxo com Vista Panorâmica",
  city: "São Paulo",
  state: "SP",
  pricePerNight: 850,
  cleaningFee: 150,
  serviceFee: 80,
  rating: 4.9,
  totalReviews: 42,
};

type PayMethod = "pix" | "card" | "boleto";

function ReservarContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const checkIn = searchParams.get("checkIn") ?? "";
  const checkOut = searchParams.get("checkOut") ?? "";
  const guests = Number(searchParams.get("guests") ?? 1);
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [payMethod, setPayMethod] = useState<PayMethod>("pix");
  const [loading, setLoading] = useState(false);

  const nights = checkIn && checkOut
    ? Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
    : 0;

  const subtotal = nights * mockProperty.pricePerNight;
  const discount = couponApplied ? subtotal * 0.1 : 0;
  const total = subtotal + mockProperty.cleaningFee + mockProperty.serviceFee - discount;

  function applyCoupon() {
    if (coupon.toUpperCase() === "ELITE10") {
      setCouponApplied(true);
      toast.success("Cupom aplicado! 10% de desconto.");
    } else {
      toast.error("Cupom inválido ou expirado.");
    }
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 1500));
      toast.success("Reserva confirmada!");
      router.push("/dashboard/reservas");
    } finally {
      setLoading(false);
    }
  }

  const fmtDate = (d: string) => d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "";

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "96px 24px 60px" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <Link href={`/imoveis/${mockProperty.id}`} style={{ color: "#cc0000", textDecoration: "none", fontSize: 14, display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Voltar ao imóvel
        </Link>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Confirmar reserva</h1>
        <p style={{ color: "#666", fontSize: 15 }}>Revise os detalhes antes de confirmar</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 40 }} className="reservar-grid">
        {/* Left */}
        <div>
          {/* Trip details */}
          <section style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "24px", marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 16 }}>Sua viagem</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { label: "Check-in", value: fmtDate(checkIn) },
                { label: "Check-out", value: fmtDate(checkOut) },
                { label: "Duração", value: `${nights} noite${nights > 1 ? "s" : ""}` },
                { label: "Hóspedes", value: `${guests} hóspede${guests > 1 ? "s" : ""}` },
              ].map((d) => (
                <div key={d.label}>
                  <div style={{ fontSize: 12, color: "#666", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.8 }}>{d.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{d.value}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Guest info */}
          <section style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "24px", marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 16 }}>Dados do hóspede</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                { label: "Nome completo", value: session?.user?.name ?? "" },
                { label: "Email", value: session?.user?.email ?? "" },
                { label: "Telefone", placeholder: "(11) 99999-9999" },
                { label: "CPF", placeholder: "000.000.000-00" },
              ].map((f) => (
                <div key={f.label}>
                  <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6, fontWeight: 500 }}>{f.label}</label>
                  <input
                    defaultValue={f.value}
                    placeholder={f.placeholder}
                    style={{ width: "100%", padding: "10px 12px", background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 8, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                    onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "#cc0000")}
                    onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "#2a2a2a")}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Coupon */}
          <section style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "24px", marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 16 }}>Cupom de desconto</h2>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                value={coupon}
                onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                placeholder="Digite seu cupom"
                disabled={couponApplied}
                style={{ flex: 1, padding: "10px 12px", background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 8, color: "#fff", fontSize: 14, outline: "none" }}
                onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "#cc0000")}
                onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "#2a2a2a")}
              />
              <button
                onClick={applyCoupon}
                disabled={couponApplied || !coupon}
                style={{ padding: "10px 20px", background: couponApplied ? "#1a3a1a" : "#222", border: `1px solid ${couponApplied ? "#2a5a2a" : "#333"}`, borderRadius: 8, color: couponApplied ? "#66cc66" : "#ccc", fontSize: 14, cursor: "pointer" }}
              >
                {couponApplied ? "✓ Aplicado" : "Aplicar"}
              </button>
            </div>
            <p style={{ fontSize: 12, color: "#555", marginTop: 8 }}>Tente: ELITE10 (10% de desconto)</p>
          </section>

          {/* Payment method */}
          <section style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "24px" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 16 }}>Forma de pagamento</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {([
                { key: "pix", label: "PIX", desc: "Confirmação imediata · Desconto de 5%", icon: "⚡" },
                { key: "card", label: "Cartão de crédito", desc: "Parcele em até 12x", icon: "💳" },
                { key: "boleto", label: "Boleto bancário", desc: "Prazo de 3 dias úteis", icon: "📄" },
              ] as { key: PayMethod; label: string; desc: string; icon: string }[]).map((m) => (
                <label
                  key={m.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 16px",
                    background: payMethod === m.key ? "rgba(204,0,0,0.08)" : "#0d0d0d",
                    border: `1.5px solid ${payMethod === m.key ? "#cc0000" : "#1e1e1e"}`,
                    borderRadius: 10,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <input type="radio" name="payment" value={m.key} checked={payMethod === m.key} onChange={() => setPayMethod(m.key)} style={{ accentColor: "#cc0000" }} />
                  <span style={{ fontSize: 22 }}>{m.icon}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{m.label}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>{m.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            {payMethod === "card" && (
              <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Número do cartão", placeholder: "0000 0000 0000 0000", full: true },
                  { label: "Nome no cartão", placeholder: "NOME SOBRENOME", full: true },
                  { label: "Validade", placeholder: "MM/AA" },
                  { label: "CVV", placeholder: "000" },
                ].map((f) => (
                  <div key={f.label} style={{ gridColumn: f.full ? "1 / 3" : undefined }}>
                    <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>{f.label}</label>
                    <input
                      placeholder={f.placeholder}
                      style={{ width: "100%", padding: "10px 12px", background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 8, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                      onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "#cc0000")}
                      onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "#2a2a2a")}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right - Summary */}
        <div>
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "24px", position: "sticky", top: 90 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 16 }}>Resumo</h2>

            <div style={{ paddingBottom: 16, borderBottom: "1px solid #1a1a1a", marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 4 }}>{mockProperty.title}</div>
              <div style={{ fontSize: 13, color: "#666" }}>{mockProperty.city}, {mockProperty.state}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
                <span style={{ color: "#cc0000", fontSize: 13 }}>★</span>
                <span style={{ color: "#ccc", fontSize: 13 }}>{mockProperty.rating} · {mockProperty.totalReviews} avaliações</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #1a1a1a" }}>
              {[
                { label: `R$ ${mockProperty.pricePerNight.toLocaleString("pt-BR")} × ${nights} noite${nights > 1 ? "s" : ""}`, value: subtotal },
                { label: "Taxa de limpeza", value: mockProperty.cleaningFee },
                { label: "Taxa de serviço", value: mockProperty.serviceFee },
                ...(couponApplied ? [{ label: "Desconto (ELITE10)", value: -discount }] : []),
              ].map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#888" }}>{r.label}</span>
                  <span style={{ color: r.value < 0 ? "#66cc66" : "#ccc" }}>
                    {r.value < 0 ? "-" : ""}R$ {Math.abs(r.value).toLocaleString("pt-BR")}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 800, marginBottom: 20 }}>
              <span style={{ color: "#fff" }}>Total</span>
              <span style={{ color: "#cc0000" }}>R$ {total.toLocaleString("pt-BR")}</span>
            </div>

            <button
              onClick={handleConfirm}
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                background: loading ? "#8a0000" : "#cc0000",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#e00000"; }}
              onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#cc0000"; }}
            >
              {loading ? "Confirmando..." : "Confirmar e pagar"}
            </button>

            <p style={{ fontSize: 12, color: "#555", textAlign: "center", marginTop: 12, lineHeight: 1.5 }}>
              Ao confirmar, você concorda com os{" "}
              <Link href="/termos" style={{ color: "#cc0000", textDecoration: "none" }}>Termos de Uso</Link>{" "}
              e a{" "}
              <Link href="/privacidade" style={{ color: "#cc0000", textDecoration: "none" }}>Política de Reembolso</Link>.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .reservar-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

export default function ReservarPage() {
  return (
    <div style={{ background: "#0d0d0d", minHeight: "100vh" }}>
      <Suspense fallback={<div style={{ color: "#fff", padding: "100px 24px", textAlign: "center" }}>Carregando...</div>}>
        <ReservarContent />
      </Suspense>
    </div>
  );
}

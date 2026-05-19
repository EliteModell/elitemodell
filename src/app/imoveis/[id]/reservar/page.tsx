"use client";
/* eslint-disable @next/next/no-img-element -- QR Code PIX arrives as a data URL and should render immediately without image optimization. */
import { useState, useEffect, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import toast from "react-hot-toast";

const GOLD = "#d4a843";
const GOLD_DIM = "rgba(212,168,67,0.10)";
const GOLD_MID = "rgba(212,168,67,0.28)";

type PayMethod = "pix" | "card" | "boleto";

interface Property {
  id: string;
  title: string;
  city: string;
  state: string;
  pricePerNight: number;
  cleaningFee: number;
  rating: number;
  totalReviews: number;
  minNights: number;
  photos?: { url: string }[];
}

function ReservarContent() {
  const { data: session } = useSession();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const propertyId = String(params?.id ?? "");

  const [property, setProperty] = useState<Property | null>(null);
  const [loadingProp, setLoadingProp] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const canRequestLocation =
    session?.user?.role === "ADMIN" ||
    session?.user?.accountType === "model" ||
    session?.user?.accountType === "professional" ||
    session?.user?.isProfessional === true;
  const blockedByRole = !canRequestLocation;

  const checkIn = searchParams.get("checkIn") ?? "";
  const checkOut = searchParams.get("checkOut") ?? "";
  const guests = Number(searchParams.get("guests") ?? 1);

  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [payMethod, setPayMethod] = useState<PayMethod>("pix");
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");

  // Modal PIX
  const [pixData, setPixData] = useState<{ qrCodeBase64: string; copyPaste: string; bookingId: string; amount: number } | null>(null);
  const [, setPollingPayment] = useState(false);

  useEffect(() => {
    if (!canRequestLocation) return;
    fetch(`/api/properties/${propertyId}`)
      .then(r => {
        if (!r.ok) setBlocked(true);
        return r.ok ? r.json() : null;
      })
      .then(d => setProperty(d))
      .catch(() => toast.error("Erro ao carregar local."))
      .finally(() => setLoadingProp(false));
  }, [propertyId, canRequestLocation]);

  const nights = checkIn && checkOut
    ? Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
    : 0;

  const subtotal = property ? nights * property.pricePerNight : 0;
  const cleaningFee = property?.cleaningFee ?? 0;
  const serviceFee = subtotal * 0.1;
  const pixDiscount = payMethod === "pix" ? subtotal * 0.05 : 0;
  const total = Math.max(0, subtotal + cleaningFee + serviceFee - discount - pixDiscount);

  function applyCoupon() {
    if (coupon.toUpperCase() === "ELITE10") {
      setCouponApplied(true);
      setDiscount(subtotal * 0.1);
      toast.success("Cupom aplicado! 10% de desconto.");
    } else {
      toast.error("Cupom inválido ou expirado.");
    }
  }

  async function handleConfirm() {
    if (!property) return;
    if (!phone || !cpf) {
      toast.error("Preencha telefone e CPF.");
      return;
    }
    setLoading(true);
    try {
      // 1. Cria booking
      const bRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId, checkIn, checkOut, guests,
          paymentMethod: payMethod,
          couponCode: couponApplied ? coupon : undefined,
        }),
      });
      const booking = await bRes.json();
      if (!bRes.ok) throw new Error(booking.error ?? "Erro ao criar reserva.");

      if (payMethod === "pix") {
        // 2. Cria pagamento PIX
        const pRes = await fetch("/api/payments/pix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId: booking.id,
            description: `Reserva ${property.title}`,
            payerName:  session?.user?.name ?? "",
            payerCpf:   cpf,
          }),
        });
        const pix = await pRes.json();
        if (!pRes.ok) throw new Error(pix.error ?? "Erro ao gerar PIX.");

        setPixData({
          qrCodeBase64: pix.qrCodeBase64,
          copyPaste: pix.copyPaste,
          bookingId: booking.id,
          amount: pix.amount ?? booking.totalPrice,
        });
        startPaymentPolling(booking.id);
      } else {
        toast.success("Reserva criada! Aguarde a confirmação.");
        router.push("/dashboard/reservas");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao confirmar reserva.");
    } finally {
      setLoading(false);
    }
  }

  function startPaymentPolling(bookingId: string) {
    setPollingPayment(true);
    const interval = setInterval(async () => {
      try {
        const r = await fetch(`/api/bookings/${bookingId}`);
        const b = await r.json();
        if (b.paymentStatus === "PAID") {
          clearInterval(interval);
          toast.success("Pagamento confirmado!");
          router.push("/dashboard/reservas");
        }
      } catch {}
    }, 4000);
    // Para de polar após 10 minutos
    setTimeout(() => clearInterval(interval), 600_000);
  }

  function copyPix() {
    if (!pixData?.copyPaste) return;
    navigator.clipboard.writeText(pixData.copyPaste);
    toast.success("Código PIX copiado!");
  }

  const fmtDate = (d: string) => d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "";
  const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (blockedByRole || blocked) {
    return <div style={{ color: "#94a3b8", padding: "100px 24px", textAlign: "center" }}>Locais disponíveis apenas para profissionais aprovadas.</div>;
  }

  if (loadingProp) {
    return <div style={{ color: "#94a3b8", padding: "100px 24px", textAlign: "center" }}>Carregando local...</div>;
  }
  if (!property) {
    return <div style={{ color: "#94a3b8", padding: "100px 24px", textAlign: "center" }}>Locais disponíveis apenas para profissionais aprovadas.</div>;
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "96px 24px 60px" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <Link href={`/imoveis/${propertyId}`} style={{ color: GOLD, textDecoration: "none", fontSize: 14, display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Voltar ao local
        </Link>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#f1f5f9", marginBottom: 4 }}>Confirmar reserva</h1>
        <p style={{ color: "#475569", fontSize: 15 }}>Revise os detalhes antes de confirmar</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 40 }} className="reservar-grid">
        {/* Left */}
        <div>
          <section style={{ background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 16 }}>Seu período</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { label: "Check-in", value: fmtDate(checkIn) },
                { label: "Check-out", value: fmtDate(checkOut) },
                { label: "Duração", value: `${nights} período${nights > 1 ? "s" : ""}` },
                { label: "Pessoas", value: `${guests} pessoa${guests > 1 ? "s" : ""}` },
              ].map((d) => (
                <div key={d.label}>
                  <div style={{ fontSize: 11, color: "#475569", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>{d.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9" }}>{d.value}</div>
                </div>
              ))}
            </div>
          </section>

          <section style={{ background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 16 }}>Dados para confirmação</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 6 }}>Nome</label>
                <input defaultValue={session?.user?.name ?? ""} disabled
                  style={{ width: "100%", padding: "10px 12px", background: "#060e1b", border: `1px solid ${GOLD_DIM}`, borderRadius: 8, color: "#94a3b8", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 6 }}>Email</label>
                <input defaultValue={session?.user?.email ?? ""} disabled
                  style={{ width: "100%", padding: "10px 12px", background: "#060e1b", border: `1px solid ${GOLD_DIM}`, borderRadius: 8, color: "#94a3b8", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 6 }}>Telefone *</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999"
                  style={{ width: "100%", padding: "10px 12px", background: "#060e1b", border: `1px solid #1e293b`, borderRadius: 8, color: "#f1f5f9", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  onFocus={e => (e.target.style.borderColor = GOLD)} onBlur={e => (e.target.style.borderColor = "#1e293b")} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 6 }}>CPF *</label>
                <input value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00"
                  style={{ width: "100%", padding: "10px 12px", background: "#060e1b", border: `1px solid #1e293b`, borderRadius: 8, color: "#f1f5f9", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  onFocus={e => (e.target.style.borderColor = GOLD)} onBlur={e => (e.target.style.borderColor = "#1e293b")} />
              </div>
            </div>
          </section>

          <section style={{ background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 16 }}>Cupom de desconto</h2>
            <div style={{ display: "flex", gap: 10 }}>
              <input value={coupon} onChange={e => setCoupon(e.target.value.toUpperCase())} placeholder="Digite seu cupom" disabled={couponApplied}
                style={{ flex: 1, padding: "10px 12px", background: "#060e1b", border: `1px solid #1e293b`, borderRadius: 8, color: "#f1f5f9", fontSize: 14, outline: "none" }}
                onFocus={e => (e.target.style.borderColor = GOLD)} onBlur={e => (e.target.style.borderColor = "#1e293b")} />
              <button onClick={applyCoupon} disabled={couponApplied || !coupon}
                style={{ padding: "10px 20px", background: couponApplied ? "rgba(34,197,94,0.1)" : GOLD_DIM, border: `1px solid ${couponApplied ? "#22c55e" : GOLD_MID}`, borderRadius: 8, color: couponApplied ? "#22c55e" : GOLD, fontSize: 14, cursor: "pointer", fontWeight: 700 }}>
                {couponApplied ? "✓ Aplicado" : "Aplicar"}
              </button>
            </div>
            <p style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>Tente: ELITE10 (10% off)</p>
          </section>

          <section style={{ background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 16 }}>Forma de pagamento</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {([
                { key: "pix", label: "PIX", desc: "Confirmação imediata · 5% de desconto", icon: "⚡" },
                { key: "card", label: "Cartão de crédito", desc: "Em breve", icon: "💳", disabled: true },
                { key: "boleto", label: "Boleto bancário", desc: "Em breve", icon: "📄", disabled: true },
              ] as { key: PayMethod; label: string; desc: string; icon: string; disabled?: boolean }[]).map((m) => (
                <label key={m.key}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "14px 16px",
                    background: payMethod === m.key ? GOLD_DIM : "#060e1b",
                    border: `1.5px solid ${payMethod === m.key ? GOLD : "#1e293b"}`,
                    borderRadius: 10,
                    cursor: m.disabled ? "not-allowed" : "pointer",
                    opacity: m.disabled ? 0.5 : 1,
                  }}>
                  <input type="radio" name="payment" value={m.key} checked={payMethod === m.key}
                    disabled={m.disabled}
                    onChange={() => !m.disabled && setPayMethod(m.key)}
                    style={{ accentColor: GOLD }} />
                  <span style={{ fontSize: 22 }}>{m.icon}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9" }}>{m.label}</div>
                    <div style={{ fontSize: 12, color: "#475569" }}>{m.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* Right - Summary */}
        <div>
          <div style={{ background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 12, padding: 24, position: "sticky", top: 90 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 16 }}>Resumo</h2>
            <div style={{ paddingBottom: 16, borderBottom: `1px solid ${GOLD_DIM}`, marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", marginBottom: 4 }}>{property.title}</div>
              <div style={{ fontSize: 13, color: "#475569" }}>{property.city}, {property.state}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
                <span style={{ color: GOLD, fontSize: 13 }}>★</span>
                <span style={{ color: "#94a3b8", fontSize: 13 }}>{property.rating} · {property.totalReviews} avaliações</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${GOLD_DIM}` }}>
              {[
                { label: `R$ ${fmt(property.pricePerNight)} × ${nights} período${nights > 1 ? "s" : ""}`, value: subtotal },
                { label: "Taxa de limpeza", value: cleaningFee },
                { label: "Taxa de serviço (10%)", value: serviceFee },
                ...(couponApplied ? [{ label: "Cupom ELITE10", value: -discount }] : []),
                ...(payMethod === "pix" ? [{ label: "Desconto PIX (5%)", value: -pixDiscount }] : []),
              ].map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: r.value < 0 ? "#22c55e" : "#94a3b8" }}>{r.label}</span>
                  <span style={{ color: r.value < 0 ? "#22c55e" : "#f1f5f9" }}>{r.value < 0 ? "−" : ""}R$ {fmt(Math.abs(r.value))}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 800, marginBottom: 20 }}>
              <span style={{ color: "#f1f5f9" }}>Total</span>
              <span style={{ color: GOLD }}>R$ {fmt(total)}</span>
            </div>

            <button onClick={handleConfirm} disabled={loading || !nights || !phone || !cpf}
              style={{
                width: "100%", padding: 14,
                background: loading || !phone || !cpf ? "rgba(212,168,67,0.3)" : GOLD,
                color: "#060e1b", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 800,
                cursor: loading || !phone || !cpf ? "not-allowed" : "pointer",
              }}>
              {loading ? "Processando..." : `Pagar R$ ${fmt(total)} via ${payMethod.toUpperCase()}`}
            </button>

            <p style={{ fontSize: 11, color: "#475569", textAlign: "center", marginTop: 12, lineHeight: 1.5 }}>
              Ao confirmar, você concorda com os{" "}
              <Link href="/termos" style={{ color: GOLD, textDecoration: "none" }}>Termos</Link> e{" "}
              <Link href="/privacidade" style={{ color: GOLD, textDecoration: "none" }}>Política de Reembolso</Link>.
            </p>
          </div>
        </div>
      </div>

      {/* Modal PIX */}
      {pixData && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(4,10,20,0.92)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#0b1420", border: `1px solid ${GOLD_MID}`, borderRadius: 16, padding: 28, maxWidth: 420, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: GOLD, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>Pague com PIX</div>
            <h3 style={{ color: "#f1f5f9", fontSize: 20, fontWeight: 800, margin: "0 0 6px" }}>R$ {fmt(pixData.amount)}</h3>
            <p style={{ color: "#475569", fontSize: 13, margin: "0 0 20px" }}>Escaneie o QR Code ou copie o código abaixo. Confirmação automática em segundos.</p>

            {pixData.qrCodeBase64 && (
              <div style={{ background: "#fff", padding: 16, borderRadius: 12, marginBottom: 16, display: "inline-block" }}>
                <img src={`data:image/png;base64,${pixData.qrCodeBase64}`} alt="QR Code PIX" style={{ width: 200, height: 200 }} />
              </div>
            )}

            <button onClick={copyPix} style={{ width: "100%", padding: 12, background: GOLD, color: "#060e1b", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: "pointer", marginBottom: 8 }}>
              📋 Copiar código PIX
            </button>

            <div style={{ background: "#060e1b", border: `1px solid ${GOLD_DIM}`, borderRadius: 8, padding: 10, fontSize: 10, color: "#475569", wordBreak: "break-all", textAlign: "left", maxHeight: 80, overflowY: "auto" }}>
              {pixData.copyPaste}
            </div>

            <div style={{ marginTop: 18, padding: "10px 14px", background: GOLD_DIM, borderRadius: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <div style={{ width: 14, height: 14, border: `2px solid ${GOLD}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <span style={{ fontSize: 12, color: GOLD, fontWeight: 700 }}>Aguardando pagamento...</span>
              </div>
            </div>

            <button onClick={() => router.push("/dashboard/reservas")} style={{ marginTop: 12, background: "none", border: "none", color: "#475569", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>
              Vou pagar depois — ir para Minhas Reservas
            </button>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

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
    <div style={{ background: "#060e1b", minHeight: "100vh" }}>
      <Suspense fallback={<div style={{ color: "#94a3b8", padding: "100px 24px", textAlign: "center" }}>Carregando...</div>}>
        <ReservarContent />
      </Suspense>
    </div>
  );
}

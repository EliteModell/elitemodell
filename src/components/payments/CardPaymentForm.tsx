"use client";
import { useRef, useState } from "react";
import { CheckCircle, CreditCard, Loader, XCircle } from "lucide-react";
import { createPortal } from "react-dom";

type Props = {
  planId?: "elite-premium-monthly";
  creditAmount?: number;
  bookingId?: string;
  amount: number;
  onClose: () => void;
  onSuccess: () => void;
};

type Stage = "form" | "loading" | "paid" | "failed";

function formatCardNumber(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

function formatCpf(v: string) {
  return v.replace(/\D/g, "").slice(0, 14);
}

function formatCep(v: string) {
  return v.replace(/\D/g, "").slice(0, 8);
}

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: 10,
  color: "#f1f5f9",
  fontSize: 14,
  outline: "none",
} as const;

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  color: "rgba(245,240,228,0.5)",
  marginBottom: 6,
  textTransform: "uppercase" as const,
  letterSpacing: 1,
};

export default function CardPaymentForm({ planId, creditAmount, bookingId, amount, onClose, onSuccess }: Props) {
  const checkoutTokenRef = useRef(crypto.randomUUID());
  const [stage, setStage] = useState<Stage>("form");
  const [error, setError] = useState<string | null>(null);
  const [brand, setBrand] = useState<string | null>(null);

  const [holderName, setHolderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [ccv, setCcv] = useState("");
  const [cpf, setCpf] = useState("");
  const [cep, setCep] = useState("");
  const [addressNumber, setAddressNumber] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStage("loading");

    const [expiryMonth, expiryYear] = expiry.split("/");

    const body: Record<string, unknown> = {
      card: {
        holderName,
        number: cardNumber.replace(/\s/g, ""),
        expiryMonth: expiryMonth ?? "",
        expiryYear: expiryYear ?? "",
        ccv,
      },
      holderInfo: {
        cpfCnpj: cpf,
        postalCode: cep,
        addressNumber,
      },
      checkoutToken: checkoutTokenRef.current,
    };
    if (planId) body.planId = planId;
    if (creditAmount) body.creditAmount = creditAmount;
    if (bookingId) body.bookingId = bookingId;

    try {
      const res = await fetch("/api/payments/card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Erro ao processar cartão.");
        setStage("failed");
        return;
      }

      if (data.status === "PAID" && data.benefitStatus === "APPLIED") {
        setBrand(data.brand ?? null);
        setStage("paid");
      } else {
        setError("Pagamento enviado ao Asaas e ainda nao confirmado. Consulte o historico antes de tentar novamente.");
        setStage("failed");
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setStage("failed");
    }
  }

  const modal = (
    <div
      className="fixed inset-0 z-[1300] grid place-items-center bg-black/80 px-4 py-6 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-[420px] overflow-hidden rounded-[24px] border border-[#d4a843]/25 bg-[#0d0d0d] shadow-[0_28px_90px_rgba(0,0,0,0.7)]">
        <div className="h-[2px] bg-[linear-gradient(90deg,transparent,#f5b83b,#d4a843,transparent)]" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-[#d4a843]" />
            <p className="text-[13px] font-bold uppercase tracking-widest text-[#d4a843]">Cartão de Crédito</p>
          </div>
          {stage !== "paid" && (
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-full border border-white/10 text-white/40 hover:text-white"
            >
              ×
            </button>
          )}
        </div>

        {/* Formulário */}
        {stage === "form" && (
          <form onSubmit={submit} className="px-6 pb-7 pt-2 space-y-4">
            <p className="text-[26px] font-black text-white">
              R$ {amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>

            <div>
              <label style={labelStyle}>Número do cartão</label>
              <input
                style={inputStyle}
                placeholder="0000 0000 0000 0000"
                inputMode="numeric"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>Nome no cartão</label>
              <input
                style={inputStyle}
                placeholder="Como impresso no cartão"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value.toUpperCase())}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>Validade</label>
                <input
                  style={inputStyle}
                  placeholder="MM/AA"
                  inputMode="numeric"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>CVV</label>
                <input
                  style={inputStyle}
                  placeholder="123"
                  inputMode="numeric"
                  maxLength={4}
                  value={ccv}
                  onChange={(e) => setCcv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  required
                />
              </div>
            </div>

            <div className="border-t border-white/10 pt-4">
              <p style={{ ...labelStyle, marginBottom: 12 }}>Dados do titular</p>
              <div className="space-y-3">
                <div>
                  <label style={labelStyle}>CPF / CNPJ</label>
                  <input
                    style={inputStyle}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    value={cpf}
                    onChange={(e) => setCpf(formatCpf(e.target.value))}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={labelStyle}>CEP</label>
                    <input
                      style={inputStyle}
                      placeholder="00000-000"
                      inputMode="numeric"
                      value={cep}
                      onChange={(e) => setCep(formatCep(e.target.value))}
                      required
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Número</label>
                    <input
                      style={inputStyle}
                      placeholder="Ex: 100"
                      value={addressNumber}
                      onChange={(e) => setAddressNumber(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] leading-5 text-white/30">
              Seus dados de cartão são enviados com criptografia e não são armazenados em nossos servidores.
            </p>

            <button
              type="submit"
              className="client-primary-button w-full py-4 text-[15px] font-black"
            >
              Pagar R$ {amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </button>
          </form>
        )}

        {/* Processando */}
        {stage === "loading" && (
          <div className="flex flex-col items-center gap-4 px-6 pb-10 pt-6">
            <Loader className="h-12 w-12 animate-spin text-[#d4a843]" />
            <p className="text-[15px] text-white/60">Processando pagamento...</p>
          </div>
        )}

        {/* Aprovado */}
        {stage === "paid" && (
          <div className="flex flex-col items-center gap-4 px-6 pb-8 pt-4 text-center">
            <CheckCircle className="h-16 w-16 text-[#4d9b56]" />
            <h2 className="text-[24px] font-black text-white">Pagamento aprovado!</h2>
            <p className="text-[14px] leading-6 text-white/60">
              {brand ? `${brand} • ` : ""}
              {planId
                ? "Seu plano Elite Premium foi ativado."
                : creditAmount
                  ? `R$ ${creditAmount.toFixed(2)} adicionados à sua carteira.`
                  : "Reserva confirmada."}
            </p>
            <button
              type="button"
              onClick={() => { onSuccess(); onClose(); }}
              className="client-primary-button mt-2 w-full py-4 text-[15px] font-black"
            >
              Continuar
            </button>
          </div>
        )}

        {/* Falhou */}
        {stage === "failed" && (
          <div className="flex flex-col items-center gap-4 px-6 pb-8 pt-4 text-center">
            <XCircle className="h-16 w-16 text-red-500" />
            <h2 className="text-[22px] font-black text-white">Pagamento recusado</h2>
            <p className="text-[14px] leading-6 text-white/60">{error ?? "Tente outro cartão."}</p>
            <div className="mt-2 flex w-full flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  checkoutTokenRef.current = crypto.randomUUID();
                  setStage("form");
                  setError(null);
                }}
                className="client-primary-button py-4 text-[15px] font-black"
              >
                Tentar novamente
              </button>
              <button
                type="button"
                onClick={onClose}
                className="client-secondary-button py-3 text-[14px] font-black"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}

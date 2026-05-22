"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle, Copy, Loader, XCircle } from "lucide-react";
import toast from "react-hot-toast";

type Props = {
  planId?: "elite-premium-monthly";
  creditAmount?: number;
  bookingId?: string;
  amount: number;
  onClose: () => void;
  onSuccess: () => void;
};

type PixData = {
  localPaymentId: string;
  qrCode: string | null;
  qrCodeBase64: string | null;
  expiresAt: string | null;
};

type Stage = "loading" | "waiting" | "paid" | "failed";

const POLL_INTERVAL = 6000;

export default function PixPaymentModal({ planId, creditAmount, bookingId, amount, onClose, onSuccess }: Props) {
  const [stage, setStage] = useState<Stage>("loading");
  const [pix, setPix] = useState<PixData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    async function createPayment() {
      try {
        const body: Record<string, unknown> = {};
        if (planId) body.planId = planId;
        if (creditAmount) body.creditAmount = creditAmount;
        if (bookingId) body.bookingId = bookingId;

        const res = await fetch("/api/payments/pix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();

        if (!res.ok) {
          if (!mountedRef.current) return;
          setError(data.error ?? "Erro ao gerar PIX.");
          setStage("failed");
          return;
        }

        if (!mountedRef.current) return;
        setPix({
          localPaymentId: data.localPaymentId,
          qrCode: data.qrCode ?? data.copyPaste ?? null,
          qrCodeBase64: data.qrCodeBase64 ?? null,
          expiresAt: data.expiresAt ?? null,
        });
        setStage("waiting");
      } catch {
        if (!mountedRef.current) return;
        setError("Erro de conexao. Tente novamente.");
        setStage("failed");
      }
    }

    void createPayment();

    return () => {
      mountedRef.current = false;
    };
  }, [planId, creditAmount, bookingId]);

  // Inicia polling quando temos o localPaymentId
  useEffect(() => {
    if (!pix?.localPaymentId || stage !== "waiting") return;

    async function checkStatus() {
      if (!pix?.localPaymentId || !mountedRef.current) return;
      try {
        const res = await fetch(`/api/payments/status/${pix.localPaymentId}`);
        if (!res.ok || !mountedRef.current) return;
        const data = await res.json();

        if (data.status === "PAID") {
          if (pollRef.current) clearInterval(pollRef.current);
          setStage("paid");
        } else if (data.status === "FAILED" || data.status === "REFUNDED") {
          if (pollRef.current) clearInterval(pollRef.current);
          setStage("failed");
          setError("Pagamento nao confirmado. Tente novamente.");
        }
      } catch {}
    }

    pollRef.current = setInterval(() => {
      if (!document.hidden) void checkStatus();
    }, POLL_INTERVAL);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [pix?.localPaymentId, stage]);

  function copyCode() {
    if (!pix?.qrCode) return;
    navigator.clipboard.writeText(pix.qrCode).then(() => {
      toast.success("Código PIX copiado!");
    });
  }

  function handleSuccess() {
    onSuccess();
    onClose();
  }

  const modal = (
    <div
      className="fixed inset-0 z-[1300] grid place-items-center bg-black/80 px-4 py-6 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-[400px] overflow-hidden rounded-[24px] border border-[#d4a843]/25 bg-[#0d0d0d] shadow-[0_28px_90px_rgba(0,0,0,0.7)]">
        <div className="h-[2px] bg-[linear-gradient(90deg,transparent,#f5b83b,#d4a843,transparent)]" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <p className="text-[13px] font-bold uppercase tracking-widest text-[#d4a843]">Pagar com PIX</p>
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

        {/* Loading */}
        {stage === "loading" && (
          <div className="flex flex-col items-center gap-4 px-6 pb-8 pt-4">
            <Loader className="h-10 w-10 animate-spin text-[#d4a843]" />
            <p className="text-[15px] text-white/60">Gerando cobrança PIX...</p>
          </div>
        )}

        {/* Waiting — mostra QR Code */}
        {stage === "waiting" && pix && (
          <div className="flex flex-col items-center gap-4 px-6 pb-7">
            <p className="text-[28px] font-black text-white">
              R$ {amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>

            {pix.qrCodeBase64 ? (
              <div className="rounded-[12px] border border-[#d4a843]/20 bg-white p-3">
                <img
                  src={`data:image/png;base64,${pix.qrCodeBase64}`}
                  alt="QR Code PIX"
                  width={200}
                  height={200}
                  className="block"
                />
              </div>
            ) : null}

            {pix.qrCode && (
              <div className="w-full rounded-[10px] border border-white/10 bg-white/5 p-3">
                <p className="break-all font-mono text-[11px] leading-5 text-white/50 select-all">
                  {pix.qrCode.length > 80 ? `${pix.qrCode.slice(0, 80)}…` : pix.qrCode}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={copyCode}
              className="client-primary-button flex w-full items-center justify-center gap-2 py-4 text-[15px] font-black"
            >
              <Copy className="h-4 w-4" />
              Copiar código PIX
            </button>

            <div className="flex items-center gap-2 text-[13px] text-white/40">
              <Loader className="h-3.5 w-3.5 animate-spin" />
              Aguardando pagamento...
            </div>

            {pix.expiresAt && (
              <p className="text-[12px] text-white/30">
                Expira em: {new Date(pix.expiresAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>
        )}

        {/* Pago */}
        {stage === "paid" && (
          <div className="flex flex-col items-center gap-4 px-6 pb-8 pt-2 text-center">
            <CheckCircle className="h-16 w-16 text-[#4d9b56]" />
            <h2 className="text-[24px] font-black text-white">Pagamento confirmado!</h2>
            <p className="text-[14px] leading-6 text-white/60">
              {planId
                ? "Seu plano Elite Premium foi ativado com sucesso."
                : creditAmount
                  ? `R$ ${creditAmount.toFixed(2)} adicionados à sua carteira.`
                  : "Sua reserva foi confirmada."}
            </p>
            <button
              type="button"
              onClick={handleSuccess}
              className="client-primary-button mt-2 w-full py-4 text-[15px] font-black"
            >
              Continuar
            </button>
          </div>
        )}

        {/* Falhou */}
        {stage === "failed" && (
          <div className="flex flex-col items-center gap-4 px-6 pb-8 pt-2 text-center">
            <XCircle className="h-16 w-16 text-red-500" />
            <h2 className="text-[22px] font-black text-white">Pagamento não confirmado</h2>
            <p className="text-[14px] leading-6 text-white/60">
              {error ?? "Ocorreu um erro ao processar o pagamento."}
            </p>
            <div className="mt-2 flex w-full flex-col gap-3">
              <button
                type="button"
                onClick={onClose}
                className="client-secondary-button py-4 text-[15px] font-black"
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

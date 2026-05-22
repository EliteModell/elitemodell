"use client";
import { useState } from "react";
import { Check, CreditCard, QrCode, Star } from "lucide-react";
import { createPortal } from "react-dom";
import { ClientSensitiveAction } from "@/components/client-area/ClientSensitiveGate";
import dynamic from "next/dynamic";

const PixPaymentModal = dynamic(() => import("@/components/payments/PixPaymentModal"), { ssr: false });
const CardPaymentForm = dynamic(() => import("@/components/payments/CardPaymentForm"), { ssr: false });

const PLAN_AMOUNT = 49.9;

const plans = [
  {
    name: "Free",
    price: "R$ 0",
    period: "/mês",
    description: "Acesso básico à plataforma",
    features: ["Busca de acompanhantes", "Verificação básica de conta", "Suporte por e-mail"],
    current: true,
    gold: false,
  },
  {
    name: "Elite Premium",
    price: "R$ 49,90",
    period: "/mês",
    description: "Experiência completa e exclusiva",
    features: [
      "Histórico de perfis visitados",
      "Listas ilimitadas",
      "Prioridade no atendimento",
      "Acesso antecipado a novidades",
      "Perfil verificado em destaque",
    ],
    current: false,
    gold: true,
  },
];

type PaymentMethod = "pix" | "card";

function MethodSelectorModal({
  onSelect,
  onClose,
}: {
  onSelect: (m: PaymentMethod) => void;
  onClose: () => void;
}) {
  const modal = (
    <div
      className="fixed inset-0 z-[1300] grid place-items-center bg-black/80 px-4 py-6 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-[380px] overflow-hidden rounded-[24px] border border-[#d4a843]/25 bg-[#0d0d0d] shadow-[0_28px_90px_rgba(0,0,0,0.7)]">
        <div className="h-[2px] bg-[linear-gradient(90deg,transparent,#f5b83b,#d4a843,transparent)]" />
        <div className="px-6 pt-5 pb-2">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-bold uppercase tracking-widest text-[#d4a843]">Elite Premium</p>
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-full border border-white/10 text-white/40 hover:text-white"
            >
              ×
            </button>
          </div>
          <p className="mt-2 text-[24px] font-black text-white">
            R$ {PLAN_AMOUNT.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            <span className="ml-1 text-[14px] font-normal text-white/40">/mês</span>
          </p>
          <p className="mt-1 text-[13px] text-white/50">Escolha como pagar:</p>
        </div>
        <div className="grid gap-3 px-6 pb-6 pt-4">
          <button
            type="button"
            onClick={() => onSelect("pix")}
            className="flex items-center gap-4 rounded-[14px] border border-[#d4a843]/20 bg-[#d4a843]/8 px-5 py-4 text-left transition hover:border-[#d4a843]/40"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] bg-[#d4a843]/15 text-[#f5d78c]">
              <QrCode className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[15px] font-black text-white">PIX</p>
              <p className="text-[12px] text-white/50">Instantâneo · sem taxas · QR Code</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelect("card")}
            className="flex items-center gap-4 rounded-[14px] border border-white/10 bg-white/[0.04] px-5 py-4 text-left transition hover:border-white/20"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] bg-white/[0.06] text-white/60">
              <CreditCard className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[15px] font-black text-white">Cartão de crédito</p>
              <p className="text-[12px] text-white/50">Visa, Mastercard, Elo, Amex</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}

export default function PlanosPage() {
  const [showMethodSelector, setShowMethodSelector] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  function handleMethodSelect(m: PaymentMethod) {
    setShowMethodSelector(false);
    setPaymentMethod(m);
  }

  function handlePaymentSuccess() {
    setPaymentMethod(null);
    setShowSuccess(true);
  }

  return (
    <div className="client-page space-y-6">
      <div className="mb-1">
        <p className="client-kicker">Elite Premium</p>
        <h1 className="client-title mt-1">Planos</h1>
        <p className="client-subtitle mt-2">Escolha o plano ideal para sua experiência.</p>
      </div>

      {showSuccess && (
        <div className="client-panel flex items-center gap-3 p-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#4d9b56]/15 text-[#4d9b56]">
            <Check className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[15px] font-black text-white">Elite Premium ativado!</p>
            <p className="text-[13px] text-white/50">Seu acesso foi liberado com sucesso.</p>
          </div>
        </div>
      )}

      {plans.map((plan) => (
        <div
          key={plan.name}
          className={`p-6 ${
            plan.gold ? "client-panel relative overflow-hidden text-white" : "client-card text-[#f5f0e4]"
          }`}
        >
          {plan.gold ? (
            <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-[#d4a843]/16 blur-3xl" />
          ) : null}
          {plan.gold && (
            <div className="relative mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#d4a843]/24 bg-[#d4a843]/14 px-3 py-1.5 text-[12px] font-bold text-[#f5d78c]">
              <Star className="h-3.5 w-3.5 fill-current" />
              Recomendado
            </div>
          )}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className={`text-[22px] font-black ${plan.gold ? "text-white" : "text-[#f5f0e4]"}`}>
                {plan.name}
              </h2>
              <p className={`mt-1 text-[14px] leading-5 ${plan.gold ? "text-white/60" : "text-[#f5f0e4]/58"}`}>
                {plan.description}
              </p>
            </div>
            <div className="text-right">
              <p className={`text-[25px] font-black ${plan.gold ? "text-[#f5d78c]" : "text-[#f5f0e4]"}`}>
                {plan.price}
              </p>
              <p className={`text-[12px] ${plan.gold ? "text-white/50" : "text-[#f5f0e4]/46"}`}>{plan.period}</p>
            </div>
          </div>

          <ul className="mt-6 space-y-3.5">
            {plan.features.map((f) => (
              <li key={f} className="flex items-center gap-2.5">
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                    plan.gold ? "bg-[#c9a84c]/20 text-[#f5d78c]" : "bg-[#4d9b56]/14 text-[#7ed58a]"
                  }`}
                >
                  <Check className="h-3 w-3" />
                </span>
                <span className={`text-[14px] leading-5 ${plan.gold ? "text-white/75" : "text-[#f5f0e4]/60"}`}>
                  {f}
                </span>
              </li>
            ))}
          </ul>

          {plan.current || showSuccess ? (
            <button
              type="button"
              disabled
              className="mt-7 h-[56px] w-full cursor-default rounded-[8px] border border-white/10 bg-white/[0.045] text-[16px] font-black text-[#f5f0e4]/46"
            >
              {showSuccess && plan.gold ? "Ativo" : "Plano atual"}
            </button>
          ) : (
            <ClientSensitiveAction
              className={`mt-7 h-[56px] w-full rounded-[8px] text-[16px] font-black transition-opacity active:opacity-80 ${
                plan.gold ? "client-primary-button" : "client-secondary-button"
              }`}
              onAllowed={() => setShowMethodSelector(true)}
            >
              Assinar agora
            </ClientSensitiveAction>
          )}
        </div>
      ))}

      {showMethodSelector && (
        <MethodSelectorModal
          onSelect={handleMethodSelect}
          onClose={() => setShowMethodSelector(false)}
        />
      )}

      {paymentMethod === "pix" && (
        <PixPaymentModal
          planId="elite-premium-monthly"
          amount={PLAN_AMOUNT}
          onClose={() => setPaymentMethod(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {paymentMethod === "card" && (
        <CardPaymentForm
          planId="elite-premium-monthly"
          amount={PLAN_AMOUNT}
          onClose={() => setPaymentMethod(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}

"use client";
import { Check, Star } from "lucide-react";

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

export default function PlanosPage() {
  return (
    <div className="px-4 py-6 space-y-4">
      <div className="mb-2">
        <h1 className="text-[20px] font-bold text-[#1f2a30]">Planos</h1>
        <p className="mt-1 text-[13px] text-[#566570]">Escolha o plano ideal para sua experiência.</p>
      </div>

      {plans.map((plan) => (
        <div
          key={plan.name}
          className={`rounded-[14px] p-5 shadow-[0_2px_12px_rgba(20,31,36,0.08)] ${
            plan.gold ? "bg-[#0d1318] text-white" : "border border-[#e4eaec] bg-white text-[#1f2a30]"
          }`}
        >
          {plan.gold && (
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[#c9a84c]/20 px-3 py-1 text-[12px] font-semibold text-[#c9a84c]">
              <Star className="h-3.5 w-3.5 fill-current" />
              Recomendado
            </div>
          )}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className={`text-[18px] font-bold ${plan.gold ? "text-white" : "text-[#1f2a30]"}`}>
                {plan.name}
              </h2>
              <p className={`mt-0.5 text-[13px] ${plan.gold ? "text-white/60" : "text-[#566570]"}`}>
                {plan.description}
              </p>
            </div>
            <div className="text-right">
              <p className={`text-[22px] font-bold ${plan.gold ? "text-[#c9a84c]" : "text-[#1f2a30]"}`}>
                {plan.price}
              </p>
              <p className={`text-[12px] ${plan.gold ? "text-white/50" : "text-[#6a7a81]"}`}>{plan.period}</p>
            </div>
          </div>

          <ul className="mt-5 space-y-2.5">
            {plan.features.map((f) => (
              <li key={f} className="flex items-center gap-2.5">
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                    plan.gold ? "bg-[#c9a84c]/20 text-[#c9a84c]" : "bg-[#f0f3f5] text-[#4d9b56]"
                  }`}
                >
                  <Check className="h-3 w-3" />
                </span>
                <span className={`text-[13px] ${plan.gold ? "text-white/75" : "text-[#566570]"}`}>{f}</span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className={`mt-6 h-[48px] w-full rounded-[10px] text-[15px] font-semibold transition-opacity active:opacity-80 ${
              plan.current
                ? "border border-[#d0d7da] bg-white text-[#6a7a81] cursor-default"
                : plan.gold
                ? "bg-[#c9a84c] text-[#0d1318]"
                : "bg-[#1f2a30] text-white"
            }`}
          >
            {plan.current ? "Plano atual" : "Assinar agora"}
          </button>
        </div>
      ))}
    </div>
  );
}

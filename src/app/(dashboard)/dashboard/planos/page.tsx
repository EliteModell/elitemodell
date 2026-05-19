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
    <div className="client-page space-y-4">
      <div className="mb-2">
        <p className="client-kicker">Elite Premium</p>
        <h1 className="client-title mt-1">Planos</h1>
        <p className="client-subtitle mt-2">Escolha o plano ideal para sua experiência.</p>
      </div>

      {plans.map((plan) => (
        <div
          key={plan.name}
          className={`p-5 ${
            plan.gold ? "client-panel relative overflow-hidden text-white" : "client-card text-[#f5f0e4]"
          }`}
        >
          {plan.gold ? <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-[#d4a843]/16 blur-3xl" /> : null}
          {plan.gold && (
            <div className="relative mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#d4a843]/24 bg-[#d4a843]/14 px-3 py-1 text-[12px] font-semibold text-[#f5d78c]">
              <Star className="h-3.5 w-3.5 fill-current" />
              Recomendado
            </div>
          )}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className={`text-[19px] font-bold ${plan.gold ? "text-white" : "text-[#f5f0e4]"}`}>
                {plan.name}
              </h2>
              <p className={`mt-0.5 text-[13px] ${plan.gold ? "text-white/60" : "text-[#f5f0e4]/58"}`}>
                {plan.description}
              </p>
            </div>
            <div className="text-right">
              <p className={`text-[22px] font-bold ${plan.gold ? "text-[#f5d78c]" : "text-[#f5f0e4]"}`}>
                {plan.price}
              </p>
              <p className={`text-[12px] ${plan.gold ? "text-white/50" : "text-[#f5f0e4]/46"}`}>{plan.period}</p>
            </div>
          </div>

          <ul className="mt-5 space-y-2.5">
            {plan.features.map((f) => (
              <li key={f} className="flex items-center gap-2.5">
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                    plan.gold ? "bg-[#c9a84c]/20 text-[#f5d78c]" : "bg-[#4d9b56]/14 text-[#7ed58a]"
                  }`}
                >
                  <Check className="h-3 w-3" />
                </span>
                <span className={`text-[13px] ${plan.gold ? "text-white/75" : "text-[#f5f0e4]/60"}`}>{f}</span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className={`mt-6 h-[48px] w-full rounded-[8px] text-[15px] font-semibold transition-opacity active:opacity-80 ${
              plan.current
                ? "border border-white/10 bg-white/[0.045] text-[#f5f0e4]/46 cursor-default"
                : plan.gold
                ? "client-primary-button"
                : "client-secondary-button"
            }`}
          >
            {plan.current ? "Plano atual" : "Assinar agora"}
          </button>
        </div>
      ))}
    </div>
  );
}

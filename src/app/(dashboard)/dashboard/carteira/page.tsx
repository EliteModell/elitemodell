"use client";
import { ArrowDownLeft, ArrowUpRight, CreditCard, Plus } from "lucide-react";

export default function CarteiraPage() {
  return (
    <div className="client-page space-y-4">
      <div>
        <p className="client-kicker">Carteira</p>
        <h1 className="client-title mt-1">Saldo e pagamentos</h1>
        <p className="client-subtitle mt-2">Controle créditos, PIX e movimentações de forma discreta.</p>
      </div>

      {/* Balance card */}
      <div className="client-panel relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-[#d4a843]/16 blur-3xl" />
        <p className="text-[12px] font-bold uppercase text-white/50">Saldo disponível</p>
        <p className="relative mt-2 text-[34px] font-bold text-white">R$ 0,00</p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            className="client-primary-button flex flex-1 items-center justify-center gap-2 py-3 text-[14px]"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </button>
          <button
            type="button"
            className="client-secondary-button flex flex-1 items-center justify-center gap-2 py-3 text-[14px]"
          >
            <ArrowUpRight className="h-4 w-4" />
            Transferir
          </button>
        </div>
      </div>

      {/* Transactions */}
      <div className="client-card p-5">
        <h2 className="text-[16px] font-bold text-[#f5f0e4]">Extrato</h2>
        <div className="client-empty mt-4 flex flex-col items-center gap-3 py-8 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-[8px] border border-white/10 bg-white/[0.045]">
            <CreditCard className="h-7 w-7 text-[#f5d78c]" />
          </div>
          <p className="text-[14px] text-[#f5f0e4]/58">Nenhuma transação ainda.</p>
        </div>
      </div>

      {/* Payment methods */}
      <div className="client-card p-5">
        <h2 className="mb-4 text-[16px] font-bold text-[#f5f0e4]">Métodos de pagamento</h2>
        <div className="client-panel-soft flex items-center gap-3 p-4">
          <ArrowDownLeft className="h-5 w-5 text-[#4d9b56]" />
          <div>
            <p className="text-[14px] font-semibold text-[#f5f0e4]">PIX</p>
            <p className="text-[12px] text-[#f5f0e4]/50">Instantâneo e sem taxas</p>
          </div>
        </div>
      </div>
    </div>
  );
}

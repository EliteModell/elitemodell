"use client";
import { ArrowDownLeft, ArrowUpRight, CreditCard, Plus } from "lucide-react";

export default function CarteiraPage() {
  return (
    <div className="client-page space-y-7">
      <div className="pb-1">
        <p className="client-kicker">Carteira</p>
        <h1 className="client-title mt-1">Saldo e pagamentos</h1>
        <p className="client-subtitle mt-2">Controle créditos, PIX e movimentações de forma discreta.</p>
      </div>

      {/* Balance card */}
      <div className="client-panel relative min-h-[230px] overflow-hidden p-7">
        <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-[#d4a843]/16 blur-3xl" />
        <p className="text-[12px] font-bold uppercase text-white/50">Saldo disponível</p>
        <p className="relative mt-3 text-[42px] font-black leading-none text-white">R$ 0,00</p>
        <div className="mt-8 flex gap-3">
          <button
            type="button"
            className="client-primary-button flex min-h-[54px] flex-1 items-center justify-center gap-2 py-3 text-[15px]"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </button>
          <button
            type="button"
            className="client-secondary-button flex min-h-[54px] flex-1 items-center justify-center gap-2 py-3 text-[15px]"
          >
            <ArrowUpRight className="h-4 w-4" />
            Transferir
          </button>
        </div>
      </div>

      {/* Transactions */}
      <div className="client-card p-6">
        <h2 className="text-[20px] font-black text-[#f5f0e4]">Extrato</h2>
        <div className="mt-5 flex min-h-[180px] flex-col items-center justify-center gap-4 border-y border-[#d4a843]/12 bg-white/[0.025] py-10 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-[8px] border border-white/10 bg-white/[0.045]">
            <CreditCard className="h-8 w-8 text-[#f5d78c]" />
          </div>
          <p className="text-[15px] font-semibold text-[#f5f0e4]/64">Nenhuma transação ainda.</p>
        </div>
      </div>

      {/* Payment methods */}
      <div className="client-card p-6">
        <h2 className="mb-5 text-[20px] font-black text-[#f5f0e4]">Métodos de pagamento</h2>
        <div className="flex min-h-[76px] items-center gap-4 border-y border-[#d4a843]/12 bg-white/[0.025] p-5">
          <ArrowDownLeft className="h-5 w-5 text-[#4d9b56]" />
          <div>
            <p className="text-[15px] font-bold text-[#f5f0e4]">PIX</p>
            <p className="mt-1 text-[13px] text-[#f5f0e4]/54">Instantâneo e sem taxas</p>
          </div>
        </div>
      </div>
    </div>
  );
}

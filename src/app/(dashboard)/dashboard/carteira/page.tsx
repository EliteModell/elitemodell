import ClientAreaShell from "@/components/client-area/ClientAreaShell";
import { CreditCard, Plus, ArrowDownLeft, ArrowUpRight } from "lucide-react";

export default function CarteiraPage() {
  return (
    <ClientAreaShell backHref="/dashboard">
      <div className="px-4 py-6 space-y-5">
        {/* Balance card */}
        <div className="rounded-[14px] bg-[#0d1318] p-6 shadow-[0_4px_24px_rgba(5,10,15,0.25)]">
          <p className="text-[13px] text-white/55 uppercase tracking-[0.12em]">Saldo disponível</p>
          <p className="mt-2 text-[32px] font-bold text-white">R$ 0,00</p>
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-2 rounded-[10px] bg-[#c9a84c] py-3 text-[14px] font-semibold text-[#0d1318]"
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </button>
            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-2 rounded-[10px] border border-white/15 bg-white/[0.07] py-3 text-[14px] font-semibold text-white"
            >
              <ArrowUpRight className="h-4 w-4" />
              Transferir
            </button>
          </div>
        </div>

        {/* Transactions */}
        <div className="rounded-[14px] bg-white p-5 shadow-[0_2px_12px_rgba(20,31,36,0.06)]">
          <h2 className="text-[16px] font-bold text-[#1f2a30]">Extrato</h2>
          <div className="mt-6 flex flex-col items-center gap-3 py-8 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-[#f0f3f5]">
              <CreditCard className="h-7 w-7 text-[#8fa0a8]" />
            </div>
            <p className="text-[14px] text-[#566570]">Nenhuma transação ainda.</p>
          </div>
        </div>

        {/* PIX / info */}
        <div className="rounded-[14px] bg-white p-5 shadow-[0_2px_12px_rgba(20,31,36,0.06)]">
          <h2 className="mb-4 text-[16px] font-bold text-[#1f2a30]">Métodos de pagamento</h2>
          <div className="flex items-center gap-3 rounded-[10px] border border-[#e4eaec] p-4">
            <ArrowDownLeft className="h-5 w-5 text-[#4d9b56]" />
            <div>
              <p className="text-[14px] font-semibold text-[#1f2a30]">PIX</p>
              <p className="text-[12px] text-[#6a7a81]">Instantâneo e sem taxas</p>
            </div>
          </div>
        </div>
      </div>
    </ClientAreaShell>
  );
}

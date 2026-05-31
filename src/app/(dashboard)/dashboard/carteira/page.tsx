"use client";
import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CreditCard, Loader, Plus, Star } from "lucide-react";
import dynamic from "next/dynamic";
import { ClientSensitiveAction, ClientSensitiveGate } from "@/components/client-area/ClientSensitiveGate";

const PixPaymentModal = dynamic(() => import("@/components/payments/PixPaymentModal"), { ssr: false });
const CardPaymentForm = dynamic(() => import("@/components/payments/CardPaymentForm"), { ssr: false });

type Transaction = {
  id: string;
  amount: number;
  method: string;
  status: string;
  creditAmount: number | null;
  premiumUntil: string | null;
  paidAt: string | null;
  createdAt: string;
  bookingId: string | null;
};

type WalletData = {
  credits: number;
  premiumUntil: string | null;
  isPremium: boolean;
  transactions: Transaction[];
};

type AddMethod = "pix" | "card" | null;

type Voucher = {
  id: string;
  code: string;
  value: number;
  status: string;
  statusLabel: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string | null;
  requiresPayment: boolean;
  paymentStatus: string;
  participantOnly: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  PAID: "Confirmado",
  PENDING: "Pendente",
  FAILED: "Falhou",
  REFUNDED: "Estornado",
};

const METHOD_LABEL: Record<string, string> = {
  pix: "PIX",
  credit_card: "Cartão",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CarteiraPage() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMethod, setAddMethod] = useState<AddMethod>(null);
  const [addAmount, setAddAmount] = useState(50);

  async function loadWallet() {
    try {
      const res = await fetch("/api/wallet");
      if (!res.ok) return;
      const data: WalletData = await res.json();
      setWallet(data);
      const voucherRes = await fetch("/api/vouchers/client", { cache: "no-store" });
      if (voucherRes.ok) {
        const voucherData: { vouchers: Voucher[] } = await voucherRes.json();
        setVouchers(voucherData.vouchers ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadWallet(); }, []);

  function handleSuccess() {
    setAddMethod(null);
    setLoading(true);
    void loadWallet();
  }

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

        {loading ? (
          <div className="flex h-full min-h-[120px] items-center justify-center">
            <Loader className="h-8 w-8 animate-spin text-[#d4a843]" />
          </div>
        ) : (
          <>
            <p className="text-[12px] font-bold uppercase text-white/50">Saldo disponível</p>
            <p className="relative mt-3 text-[42px] font-black leading-none text-white">
              R$ {(wallet?.credits ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>

            {wallet?.isPremium && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#d4a843]/24 bg-[#d4a843]/14 px-3 py-1 text-[12px] font-bold text-[#f5d78c]">
                <Star className="h-3 w-3 fill-current" />
                Elite Premium ativo
                {wallet.premiumUntil && (
                  <span className="font-normal text-white/40">
                    {" "}· até {fmt(wallet.premiumUntil)}
                  </span>
                )}
              </div>
            )}

            <div className="mt-8 flex gap-3">
              <ClientSensitiveAction
                className="client-primary-button flex min-h-[54px] flex-1 items-center justify-center gap-2 py-3 text-[15px]"
                onAllowed={() => setAddMethod("pix")}
              >
                <Plus className="h-4 w-4" />
                Adicionar
              </ClientSensitiveAction>
              <button
                type="button"
                disabled
                className="client-secondary-button flex min-h-[54px] flex-1 cursor-not-allowed items-center justify-center gap-2 py-3 text-[15px] opacity-40"
              >
                <ArrowUpRight className="h-4 w-4" />
                Transferir
              </button>
            </div>
          </>
        )}
      </div>

      <ClientSensitiveGate fallbackTitle="Carteira privada">
        <div className="client-card p-5">
          <p className="text-[15px] leading-7 text-[#b8b8b8]">
            Compra de creditos e movimentacoes privadas liberadas para clientes 18+ verificados.
          </p>
        </div>
      </ClientSensitiveGate>

      <div className="client-card p-6">
        <h2 className="text-[20px] font-black text-[#f5f0e4]">Meus Vouchers</h2>
        <p className="mt-2 text-[13px] text-white/45">Vouchers promocionais para usar com profissionais participantes.</p>
        {loading ? (
          <div className="mt-5 flex min-h-[100px] items-center justify-center">
            <Loader className="h-7 w-7 animate-spin text-[#d4a843]" />
          </div>
        ) : vouchers.length === 0 ? (
          <div className="mt-5 border-y border-[#d4a843]/12 bg-white/[0.025] p-6 text-center text-[14px] text-white/45">
            Nenhum voucher disponível ainda.
          </div>
        ) : (
          <ul className="mt-5 grid gap-3">
            {vouchers.map((voucher) => (
              <li key={voucher.id} className="rounded-[8px] border border-[#d4a843]/16 bg-white/[0.025] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[18px] font-black text-[#f5d78c]">R$ {voucher.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    <p className="mt-1 font-mono text-[13px] font-bold text-white">{voucher.code}</p>
                    <p className="mt-2 text-[12px] text-white/42">Ganho em {fmt(voucher.createdAt)} · válido até {fmt(voucher.expiresAt)}</p>
                    {voucher.participantOnly && <p className="mt-1 text-[12px] text-white/42">Válido somente para profissionais participantes.</p>}
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase ${
                    voucher.status === "AVAILABLE" ? "border-emerald-400/30 text-emerald-200" :
                    voucher.status === "AWAITING_REGISTRATION" ? "border-[#d4a843]/30 text-[#f5d78c]" :
                    "border-white/12 text-white/40"
                  }`}>
                    {voucher.statusLabel}
                  </span>
                </div>
                {voucher.status === "AVAILABLE" && (
                  <a href="/dashboard/acompanhantes" className="mt-4 inline-flex min-h-10 items-center justify-center rounded-[8px] bg-[#d4a843] px-4 text-[13px] font-black text-[#080704] no-underline">
                    Usar no agendamento
                  </a>
                )}
                {voucher.status === "AWAITING_REGISTRATION" && <p className="mt-4 text-[13px] text-[#f5d78c]">Conclua o cadastro para liberar este voucher.</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Transações */}
      <div className="client-card p-6">
        <h2 className="text-[20px] font-black text-[#f5f0e4]">Extrato</h2>

        {loading ? (
          <div className="mt-5 flex min-h-[120px] items-center justify-center">
            <Loader className="h-7 w-7 animate-spin text-[#d4a843]" />
          </div>
        ) : !wallet?.transactions.length ? (
          <div className="mt-5 flex min-h-[180px] flex-col items-center justify-center gap-4 border-y border-[#d4a843]/12 bg-white/[0.025] py-10 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-[8px] border border-white/10 bg-white/[0.045]">
              <CreditCard className="h-8 w-8 text-[#f5d78c]" />
            </div>
            <p className="text-[15px] font-semibold text-[#f5f0e4]/64">Nenhuma transação ainda.</p>
          </div>
        ) : (
          <ul className="mt-5 divide-y divide-white/[0.06]">
            {wallet.transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-4 py-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                      t.status === "PAID" ? "bg-[#4d9b56]/12 text-[#4d9b56]" : "bg-white/[0.06] text-white/30"
                    }`}
                  >
                    <ArrowDownLeft className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[14px] font-bold text-[#f5f0e4]">
                      {t.creditAmount
                        ? `Créditos`
                        : t.premiumUntil
                          ? "Elite Premium"
                          : t.bookingId
                            ? "Reserva"
                            : "Pagamento"}
                    </p>
                    <p className="text-[12px] text-white/40">
                      {METHOD_LABEL[t.method] ?? t.method} ·{" "}
                      {STATUS_LABEL[t.status] ?? t.status} ·{" "}
                      {fmt(t.paidAt ?? t.createdAt)}
                    </p>
                  </div>
                </div>
                <p
                  className={`text-[15px] font-black ${
                    t.status === "PAID" ? "text-[#f5d78c]" : "text-white/30"
                  }`}
                >
                  R$ {t.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Métodos */}
      <div className="client-card p-6">
        <h2 className="mb-5 text-[20px] font-black text-[#f5f0e4]">Métodos de pagamento</h2>
        <div className="flex min-h-[76px] items-center gap-4 border-y border-[#d4a843]/12 bg-white/[0.025] p-5">
          <ArrowDownLeft className="h-5 w-5 text-[#4d9b56]" />
          <div>
            <p className="text-[15px] font-bold text-[#f5f0e4]">PIX</p>
            <p className="mt-1 text-[13px] text-[#f5f0e4]/54">Instantâneo e sem taxas</p>
          </div>
        </div>
        <div className="flex min-h-[76px] items-center gap-4 border-b border-[#d4a843]/12 bg-white/[0.025] p-5">
          <CreditCard className="h-5 w-5 text-white/40" />
          <div>
            <p className="text-[15px] font-bold text-[#f5f0e4]">Cartão de crédito</p>
            <p className="mt-1 text-[13px] text-[#f5f0e4]/54">Visa, Mastercard, Elo, Amex</p>
          </div>
        </div>
      </div>

      {/* Modais de pagamento */}
      {addMethod === "pix" && (
        <PixPaymentModal
          creditAmount={addAmount}
          amount={addAmount}
          onClose={() => setAddMethod(null)}
          onSuccess={handleSuccess}
        />
      )}
      {addMethod === "card" && (
        <CardPaymentForm
          creditAmount={addAmount}
          amount={addAmount}
          onClose={() => setAddMethod(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, ChevronRight, CreditCard, Loader, Plus, Shield, Star, Ticket } from "lucide-react";
import dynamic from "next/dynamic";
import { ClientSensitiveAction } from "@/components/client-area/ClientSensitiveGate";

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

function WalletIllustration() {
  return (
    <svg width="88" height="72" viewBox="0 0 88 72" fill="none" aria-hidden="true">
      <rect x="4" y="14" width="76" height="50" rx="10" fill="rgba(212,168,67,0.10)" stroke="rgba(212,168,67,0.28)" strokeWidth="1.5" />
      <rect x="4" y="22" width="76" height="14" fill="rgba(212,168,67,0.08)" />
      <rect x="52" y="28" width="20" height="14" rx="7" fill="rgba(212,168,67,0.18)" stroke="rgba(212,168,67,0.35)" strokeWidth="1.2" />
      <circle cx="62" cy="35" r="4" fill="rgba(212,168,67,0.5)" />
      <rect x="12" y="44" width="28" height="4" rx="2" fill="rgba(212,168,67,0.18)" />
      <rect x="12" y="52" width="18" height="4" rx="2" fill="rgba(212,168,67,0.10)" />
      {/* sparkle */}
      <path d="M76 8 L78 4 L80 8 L84 10 L80 12 L78 16 L76 12 L72 10 Z" fill="#f5d78c" opacity="0.7" />
      <path d="M14 6 L15 4 L16 6 L18 7 L16 8 L15 10 L14 8 L12 7 Z" fill="#d4a843" opacity="0.5" />
    </svg>
  );
}

function PixIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M11 2L6.5 6.5M11 2L15.5 6.5M11 2V10M6.5 6.5L2 11M6.5 6.5L11 10M15.5 6.5L20 11M15.5 6.5L11 10M2 11L6.5 15.5M2 11H10M20 11L15.5 15.5M20 11H12M6.5 15.5L11 20M6.5 15.5L11 12M15.5 15.5L11 20M15.5 15.5L11 12M11 20V12M11 10V12" stroke="#00bfa5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const GOLD = "#d4a843";
const GOLD_DIM = "rgba(212,168,67,0.10)";
const GOLD_BORDER = "rgba(212,168,67,0.20)";

export default function CarteiraPage() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMethod, setAddMethod] = useState<AddMethod>(null);
  const [addAmount] = useState(50);

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

  const credits = wallet?.credits ?? 0;
  const balance = credits.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

  return (
    <>
      <style>{`
        .cw-page {
          padding: 0 0 120px;
          max-width: 480px;
          margin: 0 auto;
        }

        /* ── Hero ── */
        .cw-hero {
          padding: 28px 20px 24px;
          position: relative;
          overflow: hidden;
        }
        .cw-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at 80% 0%, rgba(212,168,67,0.18) 0%, transparent 55%),
            radial-gradient(ellipse at 20% 100%, rgba(212,168,67,0.08) 0%, transparent 50%);
          pointer-events: none;
        }
        .cw-kicker {
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: ${GOLD};
          margin: 0 0 8px;
          position: relative;
        }
        .cw-title {
          font-size: 30px;
          font-weight: 900;
          color: #f5f0e4;
          margin: 0 0 8px;
          line-height: 1.08;
          position: relative;
        }
        .cw-subtitle {
          font-size: 14px;
          color: rgba(245,240,228,0.52);
          margin: 0;
          line-height: 1.55;
          position: relative;
        }

        /* ── Balance card ── */
        .cw-balance-card {
          margin: 0 16px;
          border-radius: 20px;
          background: linear-gradient(145deg, #1a1208, #0e0c07);
          border: 1.5px solid rgba(212,168,67,0.32);
          box-shadow: 0 24px 64px rgba(0,0,0,0.5), 0 0 40px rgba(212,168,67,0.06);
          padding: 24px 24px 20px;
          position: relative;
          overflow: hidden;
        }
        .cw-balance-card::before {
          content: "";
          position: absolute;
          top: 0; right: 0;
          width: 180px; height: 130px;
          background: radial-gradient(ellipse at 100% 0%, rgba(212,168,67,0.20), transparent 65%);
          pointer-events: none;
        }
        .cw-balance-label {
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: ${GOLD};
          margin: 0 0 10px;
        }
        .cw-balance-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .cw-balance-value {
          font-size: 40px;
          font-weight: 900;
          color: #f5f0e4;
          line-height: 1;
          letter-spacing: -0.5px;
        }
        .cw-balance-value span {
          font-size: 22px;
          font-weight: 700;
          opacity: 0.7;
          margin-right: 4px;
        }
        .cw-premium-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          border-radius: 999px;
          border: 1px solid rgba(212,168,67,0.28);
          background: rgba(212,168,67,0.12);
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 800;
          color: #f5d78c;
          margin-top: 12px;
        }
        .cw-card-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 22px;
        }
        .cw-btn-add {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 50px;
          border-radius: 12px;
          background: linear-gradient(135deg, #f0c355, ${GOLD});
          border: none;
          color: #080704;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.15s;
          box-shadow: 0 8px 24px rgba(212,168,67,0.22);
        }
        .cw-btn-add:active { transform: scale(0.97); opacity: 0.88; }
        .cw-btn-transfer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 50px;
          border-radius: 12px;
          background: rgba(212,168,67,0.07);
          border: 1.5px solid rgba(212,168,67,0.28);
          color: #f5d78c;
          font-size: 14px;
          font-weight: 800;
          cursor: not-allowed;
          opacity: 0.5;
        }

        /* ── Info strip ── */
        .cw-info-strip {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin: 14px 16px 0;
          padding: 12px 14px;
          border-radius: 12px;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.06);
        }
        .cw-info-strip p {
          margin: 0;
          font-size: 12px;
          color: rgba(245,240,228,0.45);
          line-height: 1.55;
        }

        /* ── Section ── */
        .cw-section {
          margin: 22px 16px 0;
        }
        .cw-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .cw-section-head h2 {
          font-size: 18px;
          font-weight: 900;
          color: #f5f0e4;
          margin: 0;
        }
        .cw-see-all {
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 13px;
          font-weight: 700;
          color: ${GOLD};
          text-decoration: none;
        }

        /* ── Card box ── */
        .cw-card {
          border-radius: 16px;
          background: rgba(255,255,255,0.035);
          border: 1px solid ${GOLD_BORDER};
          overflow: hidden;
        }

        /* ── Voucher card ── */
        .cw-voucher-head {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px 18px 0;
        }
        .cw-voucher-icon {
          display: grid;
          place-items: center;
          width: 48px; height: 48px;
          border-radius: 12px;
          background: ${GOLD_DIM};
          border: 1px solid rgba(212,168,67,0.24);
          color: ${GOLD};
          flex-shrink: 0;
        }
        .cw-voucher-title {
          font-size: 16px;
          font-weight: 900;
          color: #f5f0e4;
          margin: 0 0 3px;
        }
        .cw-voucher-desc {
          font-size: 12px;
          color: rgba(245,240,228,0.46);
          margin: 0;
          line-height: 1.45;
        }
        .cw-voucher-empty {
          margin: 14px 18px 18px;
          padding: 14px 16px;
          border-radius: 10px;
          background: rgba(255,255,255,0.02);
          border: 1px dashed rgba(212,168,67,0.15);
          font-size: 13px;
          color: rgba(245,240,228,0.36);
          text-align: center;
        }
        .cw-voucher-item {
          margin: 10px 14px;
          padding: 14px;
          border-radius: 10px;
          background: rgba(212,168,67,0.06);
          border: 1px solid rgba(212,168,67,0.18);
        }

        /* ── Transaction list ── */
        .cw-tx-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .cw-tx-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 18px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .cw-tx-item:last-child { border-bottom: none; }
        .cw-tx-left { display: flex; align-items: center; gap: 13px; }
        .cw-tx-icon {
          display: grid;
          place-items: center;
          width: 40px; height: 40px;
          border-radius: 12px;
          flex-shrink: 0;
        }
        .cw-tx-name {
          font-size: 14px;
          font-weight: 700;
          color: #f5f0e4;
          margin: 0 0 3px;
        }
        .cw-tx-meta {
          font-size: 12px;
          color: rgba(245,240,228,0.42);
          margin: 0;
        }
        .cw-tx-meta .status-failed { color: #f87171; }
        .cw-tx-amount {
          font-size: 15px;
          font-weight: 900;
          white-space: nowrap;
        }
        .cw-tx-chevron {
          color: rgba(245,240,228,0.22);
          flex-shrink: 0;
        }

        /* ── Payment methods ── */
        .cw-method-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 18px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .cw-method-item:last-child { border-bottom: none; }
        .cw-method-icon {
          display: grid;
          place-items: center;
          width: 44px; height: 44px;
          border-radius: 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          flex-shrink: 0;
        }
        .cw-method-name {
          font-size: 15px;
          font-weight: 700;
          color: #f5f0e4;
          margin: 0 0 2px;
        }
        .cw-method-desc {
          font-size: 12px;
          color: rgba(245,240,228,0.44);
          margin: 0;
        }
        .cw-method-arrow {
          margin-left: auto;
          color: rgba(245,240,228,0.22);
          flex-shrink: 0;
        }

        /* ── Loading placeholder ── */
        .cw-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 80px;
        }

        /* ── Empty statement ── */
        .cw-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 32px 20px;
          text-align: center;
        }
        .cw-empty-icon {
          display: grid;
          place-items: center;
          width: 56px; height: 56px;
          border-radius: 14px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .cw-empty-text {
          font-size: 14px;
          font-weight: 600;
          color: rgba(245,240,228,0.45);
          margin: 0;
        }
      `}</style>

      <div className="cw-page">

        {/* ── Hero ── */}
        <div className="cw-hero">
          <p className="cw-kicker">Carteira</p>
          <h1 className="cw-title">Saldo e pagamentos</h1>
          <p className="cw-subtitle">Controle créditos, PIX e movimentações de forma discreta.</p>
        </div>

        {/* ── Balance card ── */}
        <div className="cw-balance-card">
          <p className="cw-balance-label">Saldo disponível</p>

          {loading ? (
            <div className="cw-loading">
              <Loader className="animate-spin" style={{ width: 28, height: 28, color: GOLD }} />
            </div>
          ) : (
            <>
              <div className="cw-balance-row">
                <div>
                  <p className="cw-balance-value">
                    <span>R$</span>{balance}
                  </p>
                  {wallet?.isPremium && (
                    <div className="cw-premium-badge">
                      <Star style={{ width: 11, height: 11, fill: "currentColor" }} />
                      Elite Premium ativo
                      {wallet.premiumUntil && (
                        <span style={{ fontWeight: 500, opacity: 0.6 }}>
                          &nbsp;· até {fmt(wallet.premiumUntil)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ flexShrink: 0, opacity: 0.85, marginTop: -6 }}>
                  <WalletIllustration />
                </div>
              </div>

              <div className="cw-card-actions">
                <ClientSensitiveAction
                  className="cw-btn-add"
                  onAllowed={() => setAddMethod("pix")}
                >
                  <Plus style={{ width: 16, height: 16 }} />
                  Adicionar
                </ClientSensitiveAction>
                <button type="button" disabled className="cw-btn-transfer">
                  <ArrowUpRight style={{ width: 16, height: 16 }} />
                  Transferir
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── Info strip ── */}
        <div className="cw-info-strip">
          <Shield style={{ width: 15, height: 15, color: GOLD, flexShrink: 0, marginTop: 1 }} />
          <p>Compra de créditos e movimentações privadas liberadas para clientes 18+ verificados.</p>
        </div>

        {/* ── Vouchers ── */}
        <div className="cw-section">
          <div className="cw-card">
            <div className="cw-voucher-head">
              <div className="cw-voucher-icon">
                <Ticket style={{ width: 22, height: 22 }} />
              </div>
              <div>
                <p className="cw-voucher-title">Meus Vouchers</p>
                <p className="cw-voucher-desc">Vouchers promocionais para usar com profissionais participantes.</p>
              </div>
            </div>

            {loading ? (
              <div className="cw-loading" style={{ minHeight: 64 }}>
                <Loader className="animate-spin" style={{ width: 22, height: 22, color: GOLD }} />
              </div>
            ) : vouchers.length === 0 ? (
              <p className="cw-voucher-empty">Nenhum voucher disponível ainda.</p>
            ) : (
              <div style={{ paddingBottom: 10 }}>
                {vouchers.map((voucher) => (
                  <div key={voucher.id} className="cw-voucher-item">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <div>
                        <p style={{ margin: "0 0 2px", fontSize: 18, fontWeight: 900, color: "#f5d78c" }}>
                          R$ {voucher.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                        <p style={{ margin: 0, fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#f5f0e4" }}>{voucher.code}</p>
                        <p style={{ margin: "6px 0 0", fontSize: 11, color: "rgba(245,240,228,0.4)" }}>
                          Válido até {fmt(voucher.expiresAt)}
                        </p>
                      </div>
                      <span style={{
                        borderRadius: 999, padding: "3px 9px", fontSize: 10, fontWeight: 900, textTransform: "uppercase",
                        border: `1px solid ${voucher.status === "AVAILABLE" ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.12)"}`,
                        color: voucher.status === "AVAILABLE" ? "#86efac" : "rgba(245,240,228,0.4)",
                      }}>
                        {voucher.statusLabel}
                      </span>
                    </div>
                    {voucher.status === "AVAILABLE" && (
                      <a href="/dashboard/acompanhantes" style={{ display: "inline-flex", alignItems: "center", marginTop: 12, minHeight: 38, padding: "0 14px", borderRadius: 8, background: GOLD, color: "#080704", fontSize: 12, fontWeight: 800, textDecoration: "none", gap: 6 }}>
                        Usar no agendamento <ArrowRight style={{ width: 13, height: 13 }} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Extrato ── */}
        <div className="cw-section">
          <div className="cw-section-head">
            <h2>Extrato</h2>
            <a href="#" className="cw-see-all">
              Ver tudo <ChevronRight style={{ width: 15, height: 15 }} />
            </a>
          </div>

          <div className="cw-card">
            {loading ? (
              <div className="cw-loading">
                <Loader className="animate-spin" style={{ width: 22, height: 22, color: GOLD }} />
              </div>
            ) : !wallet?.transactions.length ? (
              <div className="cw-empty-state">
                <div className="cw-empty-icon">
                  <CreditCard style={{ width: 26, height: 26, color: "#f5d78c" }} />
                </div>
                <p className="cw-empty-text">Nenhuma transação ainda.</p>
              </div>
            ) : (
              <ul className="cw-tx-list">
                {wallet.transactions.map((t) => {
                  const failed = t.status === "FAILED";
                  const paid = t.status === "PAID";
                  const name = t.creditAmount ? "Créditos" : t.premiumUntil ? "Elite Premium" : t.bookingId ? "Reserva" : "Pagamento";
                  const statusLabel = STATUS_LABEL[t.status] ?? t.status;
                  const method = METHOD_LABEL[t.method] ?? t.method;
                  return (
                    <li key={t.id} className="cw-tx-item">
                      <div className="cw-tx-left">
                        <div className="cw-tx-icon" style={{ background: paid ? "rgba(77,155,86,0.12)" : "rgba(255,255,255,0.05)" }}>
                          <ArrowDownLeft style={{ width: 18, height: 18, color: paid ? "#4d9b56" : "rgba(245,240,228,0.3)" }} />
                        </div>
                        <div>
                          <p className="cw-tx-name">{name}</p>
                          <p className="cw-tx-meta">
                            {method} · <span className={failed ? "status-failed" : ""}>{statusLabel}</span> · {fmt(t.paidAt ?? t.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <p className="cw-tx-amount" style={{ color: paid ? "#f5d78c" : "rgba(245,240,228,0.3)" }}>
                          R$ {t.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                        <ChevronRight className="cw-tx-chevron" style={{ width: 16, height: 16 }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* ── Métodos de pagamento ── */}
        <div className="cw-section">
          <div className="cw-section-head">
            <h2>Métodos de pagamento</h2>
          </div>

          <div className="cw-card">
            <div className="cw-method-item">
              <div className="cw-method-icon">
                <PixIcon />
              </div>
              <div>
                <p className="cw-method-name">PIX</p>
                <p className="cw-method-desc">Instantâneo e sem taxas</p>
              </div>
              <ChevronRight className="cw-method-arrow" style={{ width: 18, height: 18 }} />
            </div>

            <div className="cw-method-item">
              <div className="cw-method-icon">
                <CreditCard style={{ width: 20, height: 20, color: "rgba(245,240,228,0.5)" }} />
              </div>
              <div>
                <p className="cw-method-name">Cartão de crédito</p>
                <p className="cw-method-desc">Visa, Mastercard, Elo, Amex</p>
              </div>
              <ChevronRight className="cw-method-arrow" style={{ width: 18, height: 18 }} />
            </div>
          </div>
        </div>

      </div>

      {/* ── Modais ── */}
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
    </>
  );
}

"use client";

import Link from "next/link";
import { CalendarClock, Gift, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Prize = {
  id: string;
  index: number;
  name: string;
  type: string;
  value: number | null;
  requiresPayment: boolean;
  paymentAmount: number | null;
};

type RouletteConfig = {
  active: boolean;
  canSpin: boolean;
  blockedUntil: string | null;
  prizes: Prize[];
};

type SpinResult = {
  spinId: string;
  prize: Prize;
  result: string;
  message: string;
  needsIdentification: boolean;
  needsRegistration?: boolean;
  pendingToken?: string | null;
  voucher?: { id: string; code: string; value: number; status: string; requiresPayment: boolean } | null;
};

const CLOSED_KEY = "elite_voucher_modal_closed";
const GOLD = "#d4a843";
const WHEEL_IMAGE_SRC = "/images/roleta/roleta-roda.png";
const SEGMENT_ANGLE = 36;
const SPIN_DURATION_MS = 4200;

function randomKey() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((item) => item.toString(16).padStart(2, "0")).join("");
}

function hashText(value: string) {
  return Array.from(value).reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function getPrizeValue(result: SpinResult) {
  return Math.round(result.prize?.value ?? result.voucher?.value ?? 0);
}

function isVoucherWin(result: SpinResult) {
  return getPrizeValue(result) > 0 || result.result === "VOUCHER" || result.result === "PAID_VOUCHER";
}

function duplicateIndex(options: number[], result: SpinResult) {
  return options[Math.abs(hashText(result.spinId || result.prize?.id || result.prize?.name || "")) % options.length];
}

function resolveVisualIndex(result: SpinResult) {
  const value = getPrizeValue(result);
  if (value === 5) return 0;
  if (value === 10) return 2;
  if (value === 20) return 4;
  if (value === 50) return 6;
  if (value === 100) return 8;

  const prizeName = result.prize?.name?.toLowerCase() ?? "";
  if (result.prize?.type === "TRY_TOMORROW" || result.result === "TRY_TOMORROW") return duplicateIndex([3, 9], result);
  if (prizeName.includes("quase")) return duplicateIndex([1, 7], result);
  return 5;
}

function getResultView(result: SpinResult) {
  if (isVoucherWin(result)) {
    const value = getPrizeValue(result);
    return {
      Icon: Gift,
      tone: "voucher",
      title: `Parabéns! Você ganhou R$ ${value} OFF.`,
      subtitle: "Use seu desconto após criar sua conta na plataforma.",
    };
  }

  if (result.prize?.type === "TRY_TOMORROW" || result.result === "TRY_TOMORROW") {
    return {
      Icon: CalendarClock,
      tone: "tomorrow",
      title: "Tente amanhã!",
      subtitle: "Você pode tentar novamente amanhã.",
    };
  }

  const isNearMiss = result.prize?.name?.toLowerCase().includes("quase");
  return {
    Icon: Sparkles,
    tone: "again",
    title: isNearMiss ? "Quase lá!" : "Mais sorte na próxima!",
    subtitle: isNearMiss ? "Você pode tentar novamente amanhã." : "Continue navegando na plataforma.",
  };
}

export default function VoucherRouletteModal() {
  const [config, setConfig] = useState<RouletteConfig | null>(null);
  const [open, setOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [claiming, setClaiming] = useState(false);
  const idempotencyRef = useRef(randomKey());

  useEffect(() => {
    if (sessionStorage.getItem(CLOSED_KEY)) return;

    let active = true;
    fetch("/api/vouchers/roulette", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: RouletteConfig | null) => {
        if (!active || !data?.active || !data.canSpin || data.prizes.length < 2) return;
        setConfig(data);
        window.setTimeout(() => setOpen(true), 700);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  function close() {
    sessionStorage.setItem(CLOSED_KEY, "1");
    setOpen(false);
  }

  function rotateToSegment(index: number) {
    setRotation((current) => {
      const normalized = ((current % 360) + 360) % 360;
      const target = (360 - index * SEGMENT_ANGLE) % 360;
      let delta = 360 * 6 + target - normalized;
      if (delta < 360 * 5) delta += 360;
      return current + delta;
    });
  }

  async function spin() {
    if (!config || spinning || result) return;

    setSpinning(true);
    setShowResult(false);

    try {
      const res = await fetch("/api/vouchers/roulette/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey: idempotencyRef.current }),
      });
      const data: SpinResult & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível girar agora.");

      rotateToSegment(resolveVisualIndex(data));
      window.setTimeout(() => {
        setResult(data);
        setShowResult(true);
        setSpinning(false);
      }, SPIN_DURATION_MS);
    } catch (err) {
      setResult({
        spinId: "",
        prize: { id: "error", index: 5, name: "Mais sorte na próxima", type: "TRY_AGAIN", value: null, requiresPayment: false, paymentAmount: null },
        result: "ERROR",
        message: err instanceof Error ? err.message : "Não foi possível girar agora.",
        needsIdentification: false,
      });
      setShowResult(true);
      setSpinning(false);
    }
  }

  async function claimVoucher() {
    if (!result?.pendingToken) return;

    setClaiming(true);
    try {
      const res = await fetch("/api/vouchers/roulette/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spinId: result.spinId, pendingToken: result.pendingToken, name, whatsapp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível salvar o voucher.");
      setResult((current) => current ? { ...current, needsIdentification: false, voucher: data.voucher } : current);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Não foi possível salvar o voucher.");
    } finally {
      setClaiming(false);
    }
  }

  if (!open || !config) return null;

  const resultView = result ? getResultView(result) : null;
  const ResultIcon = resultView?.Icon;

  return (
    <div className="voucher-modal-backdrop" role="dialog" aria-modal="true" aria-label="Roleta Premiada">
      <div className="voucher-modal">
        <button type="button" className="voucher-close" onClick={close} aria-label="Fechar">x</button>

        <header className="voucher-header">
          <div className="voucher-brand"><span>elite</span>modell</div>
          <h2>ROLETA PREMIADA</h2>
          <p>Gire a roleta e descubra seu desconto especial para usar na plataforma.</p>
        </header>

        <div className="voucher-wheel-wrap">
          <div className="voucher-pointer" aria-hidden="true" />
          <div className="voucher-wheel-shell">
            <img
              src={WHEEL_IMAGE_SRC}
              alt="Roda da Roleta Premiada"
              className="voucher-wheel-image"
              draggable={false}
              style={{ transform: `rotate(${rotation}deg)` }}
            />
          </div>

          <button type="button" className="voucher-spin-button" onClick={spin} disabled={spinning || Boolean(result)}>
            {spinning ? "Girando..." : "GIRAR AGORA"}
          </button>
        </div>

        <p className="voucher-footer">Descontos promocionais para uso interno na plataforma.</p>
      </div>

      {showResult && result && resultView && ResultIcon && (
        <div className="voucher-result">
          <div className="voucher-result-card">
            <button type="button" className="voucher-close small" onClick={close} aria-label="Fechar">x</button>
            <p className="voucher-kicker">Resultado</p>

            <div className={`voucher-result-prize ${resultView.tone}`}>
              <div className="voucher-result-icon" aria-hidden="true">
                <ResultIcon size={30} strokeWidth={2.2} />
              </div>
              <div>
                <h3>{resultView.title}</h3>
                <p>{resultView.subtitle}</p>
              </div>
            </div>

            {result.needsRegistration && (
              <div className="voucher-identify">
                <p>Esse prêmio está reservado por tempo limitado. Entre ou crie sua conta para liberar o desconto na carteira.</p>
                <Link href="/login?returnUrl=/dashboard/carteira">Entrar para liberar</Link>
                <Link href="/cadastro">Criar cadastro</Link>
              </div>
            )}

            {result.needsIdentification && (
              <div className="voucher-identify">
                <p>Informe seus dados para salvar o benefício por alguns minutos.</p>
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome" />
                <input value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} placeholder="WhatsApp com DDD" inputMode="tel" />
                <button type="button" onClick={claimVoucher} disabled={claiming}>{claiming ? "Salvando..." : "Salvar desconto"}</button>
                <Link href="/login?returnUrl=/dashboard/carteira">Entrar ou cadastrar para guardar na carteira</Link>
              </div>
            )}

            {!result.needsIdentification && result.voucher && (
              <div className="voucher-saved">
                <strong>{result.voucher.code}</strong>
                <span>{result.voucher.status === "AWAITING_REGISTRATION" ? "Aguardando cadastro" : "Desconto disponível"}</span>
                {result.voucher.status === "AWAITING_REGISTRATION" ? (
                  <Link href="/cadastro">Concluir cadastro</Link>
                ) : (
                  <Link href="/dashboard/carteira">Ver em Meus Vouchers</Link>
                )}
              </div>
            )}

            {!result.needsIdentification && !result.needsRegistration && !result.voucher && (
              <button type="button" className="voucher-secondary" onClick={close}>Continuar navegando</button>
            )}
          </div>
        </div>
      )}

      <style>{`
        .voucher-modal-backdrop { position: fixed; inset: 0; z-index: 9998; display: grid; place-items: center; padding: 14px; background: rgba(0,0,0,.74); backdrop-filter: blur(8px); }
        .voucher-modal { width: min(100%, 700px); max-height: min(94vh, 900px); overflow: auto; position: relative; display: grid; justify-items: center; gap: 14px; border-radius: 18px; border: 1px solid rgba(212,168,67,.34); background:
          radial-gradient(circle at 18% 18%, rgba(116,34,128,.5), transparent 34%),
          radial-gradient(circle at 78% 18%, rgba(212,168,67,.16), transparent 26%),
          linear-gradient(145deg, #050306 0%, #130617 50%, #030303 100%); box-shadow: 0 36px 110px rgba(0,0,0,.74), inset 0 0 0 1px rgba(255,255,255,.04); padding: clamp(18px, 4vw, 30px); color: #f6efe0; }
        .voucher-close { position: absolute; right: 12px; top: 10px; z-index: 5; width: 34px; height: 34px; border-radius: 999px; border: 1px solid rgba(212,168,67,.3); background: rgba(0,0,0,.46); color: #f5d78c; cursor: pointer; font-weight: 900; }
        .voucher-close.small { right: 12px; top: 12px; }
        .voucher-header { display: grid; justify-items: center; text-align: center; gap: 8px; max-width: 580px; }
        .voucher-brand { font-size: 24px; font-weight: 950; letter-spacing: -.02em; }
        .voucher-brand span { color: ${GOLD}; }
        .voucher-header h2 { margin: 2px 0 0; font-family: var(--font-playfair), serif; font-size: clamp(40px, 8vw, 72px); line-height: .9; color: #ffe7a5; text-shadow: 0 0 28px rgba(212,168,67,.34); }
        .voucher-header p { margin: 0; max-width: 560px; color: rgba(255,255,255,.78); font-size: clamp(14px, 2.8vw, 18px); line-height: 1.45; }
        .voucher-wheel-wrap { display: grid; justify-items: center; position: relative; width: min(100%, 560px); padding-top: 22px; }
        .voucher-pointer { position: absolute; top: 0; z-index: 4; width: 66px; height: 82px; background: linear-gradient(180deg, #fff0b8, #d4a843 58%, #6d3c0c); clip-path: polygon(50% 100%, 0 0, 100% 0); filter: drop-shadow(0 9px 14px rgba(0,0,0,.6)); pointer-events: none; }
        .voucher-pointer::after { content: ""; position: absolute; left: 50%; top: 17px; width: 16px; height: 16px; border-radius: 999px; transform: translateX(-50%); background: #7f1f95; box-shadow: 0 0 14px rgba(181,76,212,.74); }
        .voucher-wheel-shell { width: min(88vw, 520px); aspect-ratio: 1; border-radius: 50%; display: grid; place-items: center; padding: clamp(6px, 1.4vw, 10px); background: radial-gradient(circle, rgba(255,240,184,.26), rgba(0,0,0,.2) 56%, rgba(0,0,0,.66)); box-shadow: 0 24px 80px rgba(0,0,0,.68), 0 0 48px rgba(126,32,143,.24); overflow: visible; }
        .voucher-wheel-image { display: block; width: 100%; height: 100%; object-fit: contain; transform-origin: 50% 50%; transition: transform ${SPIN_DURATION_MS}ms cubic-bezier(.15,.85,.25,1); filter: drop-shadow(0 18px 42px rgba(0,0,0,.64)); user-select: none; will-change: transform; }
        .voucher-spin-button { margin-top: 16px; min-height: clamp(54px, 9vw, 72px); width: min(100%, 430px); border: 1px solid #ffe7a5; border-radius: 16px; background: linear-gradient(180deg, #ffe7a5, #d4a843 48%, #9a6719); color: #14080a; font-size: clamp(22px, 5vw, 42px); font-weight: 950; letter-spacing: .04em; text-transform: uppercase; cursor: pointer; box-shadow: 0 14px 36px rgba(212,168,67,.3); }
        .voucher-spin-button:disabled { opacity: .72; cursor: wait; }
        .voucher-footer { margin: 0; text-align: center; color: rgba(255,255,255,.52); font-size: 13px; }
        .voucher-result { position: fixed; inset: 0; z-index: 9999; display: grid; place-items: center; padding: 18px; background: rgba(0,0,0,.74); }
        .voucher-result-card { position: relative; width: min(100%, 480px); border-radius: 16px; border: 1px solid rgba(212,168,67,.32); background:
          radial-gradient(circle at 18% 0%, rgba(126,32,143,.3), transparent 32%),
          linear-gradient(145deg, #0b070d, #040304 72%); color: #f6efe0; padding: 26px; box-shadow: 0 28px 90px rgba(0,0,0,.72); }
        .voucher-kicker { margin: 0 0 10px; color: #d4a843; font-size: 11px; font-weight: 950; letter-spacing: .18em; text-transform: uppercase; }
        .voucher-result-prize { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 16px; align-items: center; padding: 18px; border-radius: 14px; border: 1px solid rgba(212,168,67,.34); background: linear-gradient(145deg, rgba(255,231,165,.1), rgba(126,32,143,.1) 58%, rgba(0,0,0,.24)); box-shadow: inset 0 0 0 1px rgba(255,255,255,.04), 0 16px 42px rgba(0,0,0,.36); }
        .voucher-result-prize.voucher { border-color: rgba(255,231,165,.48); box-shadow: inset 0 0 0 1px rgba(255,255,255,.05), 0 0 34px rgba(212,168,67,.18), 0 18px 48px rgba(0,0,0,.42); }
        .voucher-result-icon { width: 56px; height: 56px; border-radius: 999px; display: grid; place-items: center; color: #16090a; background: linear-gradient(180deg, #fff0b8, #d4a843 54%, #9f6b1e); box-shadow: 0 0 24px rgba(212,168,67,.4); }
        .voucher-result-card h3 { margin: 0; font-size: clamp(25px, 6vw, 34px); line-height: 1.05; color: #ffe7a5; font-family: var(--font-playfair), serif; }
        .voucher-result-card p { color: rgba(255,255,255,.74); line-height: 1.55; }
        .voucher-result-prize p { margin: 8px 0 0; color: rgba(255,255,255,.78); }
        .voucher-identify, .voucher-saved { display: grid; gap: 10px; margin-top: 14px; }
        .voucher-identify input { min-height: 44px; border-radius: 8px; border: 1px solid rgba(212,168,67,.22); background: #050506; color: #fff; padding: 0 12px; }
        .voucher-identify button, .voucher-saved a, .voucher-secondary { min-height: 44px; border-radius: 8px; border: 0; background: #d4a843; color: #080704; font-weight: 950; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; cursor: pointer; }
        .voucher-identify a { color: #f5d78c; text-align: center; font-size: 13px; }
        .voucher-saved strong { font-family: monospace; color: #f5d78c; font-size: 18px; }
        .voucher-saved span { color: rgba(255,255,255,.68); }
        @media (max-width: 560px) {
          .voucher-modal { width: min(100%, 390px); max-height: 92vh; padding: 18px 14px; border-radius: 16px; }
          .voucher-brand { font-size: 21px; }
          .voucher-wheel-wrap { padding-top: 18px; }
          .voucher-wheel-shell { width: min(84vw, 350px); }
          .voucher-pointer { width: 50px; height: 64px; }
          .voucher-result-prize { grid-template-columns: 1fr; justify-items: center; text-align: center; }
        }
      `}</style>
    </div>
  );
}

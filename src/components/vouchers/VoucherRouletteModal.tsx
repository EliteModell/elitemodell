"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarClock, Gift, RotateCcw } from "lucide-react";
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
const ROULETTE_IMAGE_SRC = "/images/roleta/roleta-premiada.png";

function randomKey() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((item) => item.toString(16).padStart(2, "0")).join("");
}

function getPrizeValue(result: SpinResult) {
  return Math.round(result.prize?.value ?? result.voucher?.value ?? 0);
}

function isVoucherWin(result: SpinResult) {
  return getPrizeValue(result) > 0 || result.result === "VOUCHER" || result.result === "PAID_VOUCHER";
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
      title: "Tente amanhã.",
      subtitle: result.message || "Volte amanhã para tentar novamente.",
    };
  }

  return {
    Icon: RotateCcw,
    tone: "again",
    title: result.result === "ERROR" ? "Não foi possível girar agora." : "Tente outra vez.",
    subtitle: result.message || "Não foi dessa vez. Você pode tentar novamente.",
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

  const segments = config?.prizes ?? [];
  const segmentAngle = segments.length ? 360 / segments.length : 0;

  function close() {
    sessionStorage.setItem(CLOSED_KEY, "1");
    setOpen(false);
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível girar agora.");

      const prizeIndex = Math.max(0, data.prize?.index ?? 0);
      const target = 360 * 6 + (360 - (prizeIndex * segmentAngle + segmentAngle / 2));
      setRotation((current) => current + target);

      window.setTimeout(() => {
        setResult(data);
        setShowResult(true);
        setSpinning(false);
      }, 3900);
    } catch (err) {
      setResult({
        spinId: "",
        prize: segments[0],
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
    <div className="voucher-modal-backdrop" role="dialog" aria-modal="true" aria-label="Roleta de Vouchers">
      <div className="voucher-modal">
        <button type="button" className="voucher-close" onClick={close} aria-label="Fechar">x</button>

        <div className="voucher-copy">
          <div className="voucher-brand"><span>elite</span>modell</div>
          <p className="voucher-kicker">Buscar Prazer</p>
          <h2>Roleta de Vouchers</h2>
          <p>Gire e receba créditos promocionais para usar com profissionais participantes.</p>
          <div className="voucher-muse" aria-hidden="true" />
        </div>

        <div className="voucher-wheel-wrap">
          <div className={`voucher-art-stage${spinning ? " is-spinning" : ""}`}>
            <Image
              src={ROULETTE_IMAGE_SRC}
              alt="Roleta de Vouchers Elite Modell"
              fill
              priority
              sizes="(max-width: 820px) 92vw, 520px"
              className="voucher-roulette-image"
            />
            <span className="voucher-spin-ring" style={{ transform: `rotate(${rotation}deg)` }} aria-hidden="true" />
            <span className="voucher-spin-sweep" aria-hidden="true" />
            <button type="button" className="voucher-image-spin-button" onClick={spin} disabled={spinning || Boolean(result)}>
              <span>{spinning ? "Girando..." : "Girar agora"}</span>
            </button>
          </div>
        </div>

        <p className="voucher-footer">Vouchers promocionais para uso interno na plataforma.</p>
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
                <p>Esse prêmio está reservado por tempo limitado. Entre ou crie sua conta para liberar o voucher na carteira.</p>
                <Link href="/login?returnUrl=/dashboard/carteira">Entrar para liberar</Link>
                <Link href="/cadastro">Criar cadastro</Link>
              </div>
            )}

            {result.needsIdentification && (
              <div className="voucher-identify">
                <p>Informe seus dados para salvar o benefício por alguns minutos.</p>
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome" />
                <input value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} placeholder="WhatsApp com DDD" inputMode="tel" />
                <button type="button" onClick={claimVoucher} disabled={claiming}>{claiming ? "Salvando..." : "Salvar voucher"}</button>
                <Link href="/login?returnUrl=/dashboard/carteira">Entrar ou cadastrar para guardar na carteira</Link>
              </div>
            )}

            {!result.needsIdentification && result.voucher && (
              <div className="voucher-saved">
                <strong>{result.voucher.code}</strong>
                <span>{result.voucher.status === "AWAITING_REGISTRATION" ? "Aguardando cadastro" : "Voucher disponível"}</span>
                {result.voucher.status === "AWAITING_REGISTRATION" ? (
                  <Link href="/cadastro">Concluir cadastro</Link>
                ) : (
                  <Link href="/dashboard/carteira">Ver em Meus Vouchers</Link>
                )}
              </div>
            )}

            {!result.needsIdentification && !result.needsRegistration && !result.voucher && (
              <button type="button" className="voucher-secondary" onClick={close}>Continuar buscando</button>
            )}
          </div>
        </div>
      )}

      <style>{`
        .voucher-modal-backdrop { position: fixed; inset: 0; z-index: 9998; display: grid; place-items: center; padding: 16px; background: rgba(0,0,0,.72); backdrop-filter: blur(8px); }
        .voucher-modal { width: min(100%, 1040px); max-height: min(92vh, 820px); overflow: auto; position: relative; display: grid; grid-template-columns: minmax(0, .85fr) minmax(340px, 1.15fr); gap: 18px; border-radius: 18px; border: 1px solid rgba(212,168,67,.32); background:
          radial-gradient(circle at 18% 20%, rgba(116,34,128,.46), transparent 32%),
          radial-gradient(circle at 72% 15%, rgba(212,168,67,.18), transparent 26%),
          linear-gradient(135deg, #050306 0%, #100514 48%, #030303 100%); box-shadow: 0 36px 110px rgba(0,0,0,.72), inset 0 0 0 1px rgba(255,255,255,.04); padding: 28px; color: #f6efe0; }
        .voucher-close { position: absolute; right: 14px; top: 12px; z-index: 2; width: 34px; height: 34px; border-radius: 999px; border: 1px solid rgba(212,168,67,.28); background: rgba(0,0,0,.42); color: #f5d78c; cursor: pointer; font-weight: 900; }
        .voucher-close.small { right: 12px; top: 12px; }
        .voucher-brand { font-size: 28px; font-weight: 950; letter-spacing: -.02em; }
        .voucher-brand span { color: ${GOLD}; }
        .voucher-kicker { margin: 18px 0 8px; color: #d4a843; font-size: 11px; font-weight: 950; letter-spacing: .18em; text-transform: uppercase; }
        .voucher-copy h2 { margin: 0; font-family: var(--font-playfair), serif; font-size: clamp(42px, 7vw, 82px); line-height: .9; color: #ffe7a5; text-shadow: 0 0 24px rgba(212,168,67,.3); }
        .voucher-copy p:not(.voucher-kicker) { max-width: 430px; color: rgba(255,255,255,.76); font-size: 17px; line-height: 1.55; }
        .voucher-muse { margin-top: 22px; width: min(240px, 58vw); aspect-ratio: .68; border-radius: 44% 44% 10px 10px; background:
          radial-gradient(circle at 52% 18%, #f7c79f 0 12%, transparent 13%),
          radial-gradient(ellipse at 52% 14%, #201014 0 22%, transparent 24%),
          linear-gradient(135deg, #6b1c78, #210728 55%, #09030a); border: 1px solid rgba(212,168,67,.24); box-shadow: inset 0 0 45px rgba(212,168,67,.1), 0 24px 70px rgba(0,0,0,.5); opacity: .9; }
        .voucher-wheel-wrap { display: grid; justify-items: center; align-content: center; position: relative; min-height: 560px; }
        .voucher-art-stage { position: relative; width: min(100%, 520px); max-width: 100%; aspect-ratio: 2 / 3; overflow: hidden; border-radius: 18px; border: 1px solid rgba(212,168,67,.28); background: #050205; box-shadow: 0 28px 90px rgba(0,0,0,.7), 0 0 46px rgba(126,32,143,.22); }
        .voucher-roulette-image { object-fit: contain; filter: drop-shadow(0 14px 30px rgba(0,0,0,.5)); }
        .voucher-spin-ring { position: absolute; left: 12%; right: 12%; top: 36%; aspect-ratio: 1; border-radius: 999px; border: 2px solid rgba(255,231,165,.2); box-shadow: 0 0 30px rgba(212,168,67,.3), inset 0 0 26px rgba(212,168,67,.16); opacity: 0; transition: transform 3.8s cubic-bezier(.12,.78,.08,1), opacity .2s ease; pointer-events: none; }
        .voucher-spin-ring::after { content: ""; position: absolute; left: 50%; top: -8px; width: 18px; height: 18px; border-radius: 999px; background: #ffe7a5; box-shadow: 0 0 18px #ffe7a5, 0 0 34px rgba(212,168,67,.72); transform: translateX(-50%); }
        .voucher-spin-sweep { position: absolute; inset: 0; opacity: 0; pointer-events: none; background: linear-gradient(110deg, transparent 0 42%, rgba(255,231,165,.22) 48%, transparent 56% 100%); mix-blend-mode: screen; }
        .voucher-art-stage.is-spinning .voucher-spin-ring { opacity: 1; }
        .voucher-art-stage.is-spinning .voucher-spin-sweep { opacity: 1; animation: voucherSweep 1s linear infinite; }
        .voucher-image-spin-button { position: absolute; left: 15%; right: 15%; bottom: 6.2%; min-height: clamp(48px, 7.2vw, 78px); border-radius: 18px; border: 1px solid rgba(255,231,165,.76); background: rgba(12,6,8,.08); color: transparent; font-size: 0; cursor: pointer; transition: box-shadow .2s ease, background .2s ease, opacity .2s ease; }
        .voucher-image-spin-button:hover, .voucher-image-spin-button:focus-visible { background: rgba(255,231,165,.08); box-shadow: 0 0 28px rgba(212,168,67,.45); outline: none; }
        .voucher-image-spin-button:disabled { cursor: wait; opacity: .78; }
        .voucher-image-spin-button:disabled span { position: absolute; inset: 0; display: grid; place-items: center; border-radius: inherit; background: rgba(0,0,0,.52); color: #ffe7a5; font-size: clamp(16px, 3vw, 24px); font-weight: 950; text-transform: uppercase; letter-spacing: .04em; }
        .voucher-footer { grid-column: 1 / -1; margin: 0; text-align: center; color: rgba(255,255,255,.54); font-size: 13px; }
        .voucher-result { position: fixed; inset: 0; z-index: 9999; display: grid; place-items: center; padding: 18px; background: rgba(0,0,0,.74); }
        .voucher-result-card { position: relative; width: min(100%, 480px); border-radius: 16px; border: 1px solid rgba(212,168,67,.32); background:
          radial-gradient(circle at 18% 0%, rgba(126,32,143,.3), transparent 32%),
          linear-gradient(145deg, #0b070d, #040304 72%); color: #f6efe0; padding: 26px; box-shadow: 0 28px 90px rgba(0,0,0,.72); }
        .voucher-result-prize { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 16px; align-items: center; padding: 18px; border-radius: 14px; border: 1px solid rgba(212,168,67,.34); background: linear-gradient(145deg, rgba(255,231,165,.1), rgba(126,32,143,.1) 58%, rgba(0,0,0,.24)); box-shadow: inset 0 0 0 1px rgba(255,255,255,.04), 0 16px 42px rgba(0,0,0,.36); }
        .voucher-result-prize.voucher { border-color: rgba(255,231,165,.48); box-shadow: inset 0 0 0 1px rgba(255,255,255,.05), 0 0 34px rgba(212,168,67,.18), 0 18px 48px rgba(0,0,0,.42); }
        .voucher-result-icon { width: 56px; height: 56px; border-radius: 999px; display: grid; place-items: center; color: #16090a; background: linear-gradient(180deg, #fff0b8, #d4a843 54%, #9f6b1e); box-shadow: 0 0 24px rgba(212,168,67,.4); }
        .voucher-result-card h3 { margin: 0; font-size: clamp(25px, 6vw, 34px); line-height: 1.05; color: #ffe7a5; font-family: var(--font-playfair), serif; }
        .voucher-result-card p { color: rgba(255,255,255,.74); line-height: 1.55; }
        .voucher-result-prize p { margin: 8px 0 0; color: rgba(255,255,255,.78); }
        .voucher-identify, .voucher-saved, .voucher-pix { display: grid; gap: 10px; margin-top: 14px; }
        .voucher-identify input, .voucher-pix textarea { min-height: 44px; border-radius: 8px; border: 1px solid rgba(212,168,67,.22); background: #050506; color: #fff; padding: 0 12px; }
        .voucher-identify button, .voucher-saved button, .voucher-saved a, .voucher-secondary { min-height: 44px; border-radius: 8px; border: 0; background: #d4a843; color: #080704; font-weight: 950; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; cursor: pointer; }
        .voucher-identify a { color: #f5d78c; text-align: center; font-size: 13px; }
        .voucher-saved strong { font-family: monospace; color: #f5d78c; font-size: 18px; }
        .voucher-saved span { color: rgba(255,255,255,.68); }
        .voucher-pix img { width: 180px; height: 180px; background: #fff; padding: 8px; border-radius: 8px; }
        @keyframes voucherSweep { from { transform: translateX(-48%); } to { transform: translateX(48%); } }
        @media (max-width: 820px) {
          .voucher-modal { grid-template-columns: 1fr; padding: 22px; }
          .voucher-copy { text-align: center; }
          .voucher-copy p:not(.voucher-kicker) { margin-left: auto; margin-right: auto; }
          .voucher-muse { display: none; }
          .voucher-wheel-wrap { min-height: auto; }
          .voucher-art-stage { width: min(100%, 430px); }
          .voucher-result-prize { grid-template-columns: 1fr; justify-items: center; text-align: center; }
        }
      `}</style>
    </div>
  );
}

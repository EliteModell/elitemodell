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
const SEGMENT_ANGLE = 36; // 360 / 10 segments
const SPIN_DURATION_MS = 4500;

function randomKey() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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
  return options[
    Math.abs(hashText(result.spinId || result.prize?.id || result.prize?.name || "")) % options.length
  ];
}

function resolveVisualIndex(result: SpinResult) {
  const value = getPrizeValue(result);
  if (value === 5) return 0;
  if (value === 10) return 2;
  if (value === 20) return 4;
  if (value === 50) return 6;
  if (value === 100) return 8;
  const prizeName = result.prize?.name?.toLowerCase() ?? "";
  if (result.prize?.type === "TRY_TOMORROW" || result.result === "TRY_TOMORROW")
    return duplicateIndex([3, 9], result);
  if (prizeName.includes("quase")) return duplicateIndex([1, 7], result);
  return 5;
}

function getResultView(result: SpinResult) {
  if (isVoucherWin(result)) {
    const value = getPrizeValue(result);
    return {
      Icon: Gift,
      tone: "voucher" as const,
      title: `Parabéns! Você ganhou R$ ${value} OFF`,
      subtitle: "Use seu desconto na plataforma.",
    };
  }
  if (result.prize?.type === "TRY_TOMORROW" || result.result === "TRY_TOMORROW") {
    return {
      Icon: CalendarClock,
      tone: "tomorrow" as const,
      title: "Tente amanhã!",
      subtitle: "Você pode tentar novamente amanhã.",
    };
  }
  const isNearMiss = result.prize?.name?.toLowerCase().includes("quase");
  return {
    Icon: Sparkles,
    tone: "again" as const,
    title: isNearMiss ? "Quase lá!" : "Mais sorte na próxima!",
    subtitle: isNearMiss ? "Você pode tentar novamente amanhã." : "Continue navegando na plataforma.",
  };
}

export default function VoucherRouletteModal() {
  const [config, setConfig] = useState<RouletteConfig | null>(null);
  const [open, setOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [claiming, setClaiming] = useState(false);

  const wheelRef = useRef<HTMLImageElement>(null);
  const rotationRef = useRef(0);
  const idempotencyRef = useRef(randomKey());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const tickTimersRef = useRef<number[]>([]);

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
    stopSpinSound();
    setOpen(false);
  }

  function startSpinSound() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioCtx = window.AudioContext ?? (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx() as AudioContext;
      audioCtxRef.current = ctx;

      const timers: number[] = [];
      let elapsed = 0;
      let interval = 55; // start fast

      while (elapsed < SPIN_DURATION_MS - 300) {
        const t = elapsed;
        timers.push(
          window.setTimeout(() => {
            if (!audioCtxRef.current || audioCtxRef.current.state === "closed") return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "triangle";
            osc.frequency.value = 680 + Math.random() * 120;
            const now = ctx.currentTime;
            gain.gain.setValueAtTime(0.07, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
            osc.start(now);
            osc.stop(now + 0.045);
          }, t),
        );

        // Quadratic ease-out: interval grows from 55ms → 380ms
        const progress = elapsed / SPIN_DURATION_MS;
        interval = 55 + progress * progress * 325;
        elapsed += interval;
      }

      tickTimersRef.current = timers;
    } catch {
      // AudioContext unavailable
    }
  }

  function stopSpinSound() {
    tickTimersRef.current.forEach((id) => window.clearTimeout(id));
    tickTimersRef.current = [];
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }

  function rotateToSegment(index: number) {
    const wheel = wheelRef.current;
    if (!wheel) return;

    const current = rotationRef.current;
    const normalized = ((current % 360) + 360) % 360;
    const target = (360 - index * SEGMENT_ANGLE) % 360;
    let delta = 360 * 6 + target - normalized;
    if (delta < 360 * 5) delta += 360;
    const next = current + delta;
    rotationRef.current = next;

    // Reset any existing transition, flush layout, then animate
    wheel.style.transition = "none";
    void wheel.offsetWidth;
    wheel.style.transition = `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.15, 0.85, 0.25, 1)`;
    wheel.style.transform = `rotate(${next}deg)`;
  }

  async function spin() {
    if (!config || spinning || result) return;

    setSpinning(true);
    startSpinSound();

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
        stopSpinSound();
        setResult(data);
        setShowResult(true);
        setSpinning(false);
      }, SPIN_DURATION_MS);
    } catch (err) {
      stopSpinSound();
      setResult({
        spinId: "",
        prize: {
          id: "error",
          index: 5,
          name: "Mais sorte na próxima",
          type: "TRY_AGAIN",
          value: null,
          requiresPayment: false,
          paymentAmount: null,
        },
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
      setResult((cur) => (cur ? { ...cur, needsIdentification: false, voucher: data.voucher } : cur));
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
    <div className="vm-backdrop" role="dialog" aria-modal="true" aria-label="Roleta Premiada">
      {/* ── Main modal ── */}
      <div className="vm-card">
        <button type="button" className="vm-x" onClick={close} aria-label="Fechar">
          ✕
        </button>

        <p className="vm-brand">
          <span>elite</span>modell
        </p>
        <h2 className="vm-title">ROLETA PREMIADA</h2>
        <p className="vm-sub">Gire a roleta e descubra seu desconto especial para usar na plataforma.</p>

        {/* Wheel section — pointer + ring are siblings; pointer overlaps ring top via negative margin */}
        <div className="vm-wheel-section">
          <div className="vm-pointer" aria-hidden="true">
            <div className="vm-pointer-gem" />
          </div>

          <div className="vm-wheel-ring">
            <img
              ref={wheelRef}
              src={WHEEL_IMAGE_SRC}
              alt="Roda da Roleta Premiada"
              className="vm-wheel-img"
              draggable={false}
            />
          </div>
        </div>

        <button
          type="button"
          className="vm-spin-btn"
          onClick={spin}
          disabled={spinning || Boolean(result)}
        >
          {spinning ? "Girando..." : "GIRAR AGORA"}
        </button>

        <p className="vm-footnote">Descontos promocionais para uso interno na plataforma.</p>
      </div>

      {/* ── Result overlay ── */}
      {showResult && result && resultView && ResultIcon && (
        <div className="vm-result-layer">
          <div className="vm-result-card">
            <button type="button" className="vm-x" onClick={close} aria-label="Fechar">
              ✕
            </button>

            <p className="vm-kicker">RESULTADO</p>

            <div className={`vm-prize-box vm-prize-box--${resultView.tone}`}>
              <div className="vm-prize-icon">
                <ResultIcon size={28} strokeWidth={2.4} />
              </div>
              <h3 className="vm-prize-title">{resultView.title}</h3>
              <p className="vm-prize-sub">{resultView.subtitle}</p>
            </div>

            {result.needsRegistration && (
              <div className="vm-actions">
                <p className="vm-info">
                  Esse prêmio está reservado por tempo limitado. Entre ou crie sua conta para liberar o
                  desconto.
                </p>
                <Link href="/login?returnUrl=/dashboard/carteira" className="vm-btn-gold">
                  Entrar para liberar
                </Link>
                <Link href="/cadastro" className="vm-btn-outline">
                  Criar cadastro
                </Link>
              </div>
            )}

            {result.needsIdentification && (
              <div className="vm-actions">
                <p className="vm-info">Informe seus dados para salvar o benefício.</p>
                <input
                  className="vm-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome"
                />
                <input
                  className="vm-input"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="WhatsApp com DDD"
                  inputMode="tel"
                />
                <button
                  type="button"
                  className="vm-btn-gold"
                  onClick={claimVoucher}
                  disabled={claiming}
                >
                  {claiming ? "Salvando..." : "Salvar desconto"}
                </button>
                <Link href="/login?returnUrl=/dashboard/carteira" className="vm-link">
                  Entrar ou cadastrar para guardar na carteira
                </Link>
              </div>
            )}

            {!result.needsIdentification && result.voucher && (
              <div className="vm-actions">
                <strong className="vm-code">{result.voucher.code}</strong>
                <span className="vm-code-status">
                  {result.voucher.status === "AWAITING_REGISTRATION"
                    ? "Aguardando cadastro"
                    : "Desconto disponível"}
                </span>
                {result.voucher.status === "AWAITING_REGISTRATION" ? (
                  <Link href="/cadastro" className="vm-btn-gold">
                    Concluir cadastro
                  </Link>
                ) : (
                  <Link href="/dashboard/carteira" className="vm-btn-gold">
                    Ver em Meus Vouchers
                  </Link>
                )}
              </div>
            )}

            {!result.needsIdentification && !result.needsRegistration && !result.voucher && (
              <button type="button" className="vm-btn-gold" onClick={close}>
                Continuar navegando
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`
        /* ── Backdrop ── */
        .vm-backdrop {
          position: fixed; inset: 0; z-index: 9998;
          display: flex; align-items: center; justify-content: center;
          padding: 12px;
          background: rgba(0,0,0,.82);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        /* ── Main card ── */
        .vm-card {
          position: relative;
          width: min(100%, 400px);
          max-height: calc(100dvh - 24px);
          overflow-y: auto;
          overflow-x: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          border-radius: 22px;
          border: 1px solid rgba(212,168,67,.38);
          background:
            radial-gradient(ellipse at 22% 0%, rgba(116,34,128,.55) 0%, transparent 48%),
            radial-gradient(ellipse at 80% 8%, rgba(212,168,67,.14) 0%, transparent 40%),
            linear-gradient(170deg, #090212 0%, #110520 55%, #060208 100%);
          box-shadow:
            0 40px 120px rgba(0,0,0,.84),
            inset 0 0 0 1px rgba(255,255,255,.03);
          padding: 20px 18px 16px;
          color: #f6efe0;
          text-align: center;
          gap: 0;
        }

        /* ── Close ── */
        .vm-x {
          position: absolute; top: 12px; right: 12px; z-index: 10;
          width: 32px; height: 32px;
          border-radius: 50%;
          border: 1px solid rgba(212,168,67,.38);
          background: rgba(0,0,0,.55);
          color: #f5d78c;
          font-size: 13px; font-weight: 800;
          cursor: pointer;
          display: grid; place-items: center;
          line-height: 1;
          transition: background .15s;
        }
        .vm-x:hover { background: rgba(0,0,0,.8); }

        /* ── Header ── */
        .vm-brand {
          margin: 0 0 4px;
          font-size: 18px; font-weight: 900; letter-spacing: -.02em;
        }
        .vm-brand span { color: ${GOLD}; }

        .vm-title {
          margin: 0 0 8px;
          font-family: var(--font-playfair, Georgia, serif);
          font-size: clamp(30px, 9vw, 52px);
          line-height: .92;
          color: #ffe7a5;
          text-shadow: 0 0 32px rgba(212,168,67,.38);
          letter-spacing: .01em;
        }

        .vm-sub {
          margin: 0 0 16px;
          max-width: 320px;
          color: rgba(255,255,255,.74);
          font-size: clamp(13px, 3.4vw, 15px);
          line-height: 1.48;
        }

        /* ── Wheel section ── */
        .vm-wheel-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          flex-shrink: 0;
        }

        /* Pointer — downward triangle sitting above the wheel */
        .vm-pointer {
          position: relative;
          z-index: 5;
          margin-bottom: -18px; /* overlaps the top edge of the ring */
          width: 52px; height: 64px;
          background: linear-gradient(180deg, #fff4cc 0%, ${GOLD} 52%, #6d3c0c 100%);
          clip-path: polygon(50% 100%, 0% 0%, 100% 0%);
          filter: drop-shadow(0 6px 14px rgba(0,0,0,.7));
          flex-shrink: 0;
        }
        .vm-pointer-gem {
          position: absolute;
          top: 13px; left: 50%;
          transform: translateX(-50%);
          width: 13px; height: 13px;
          border-radius: 50%;
          background: #8c1fa8;
          box-shadow: 0 0 14px rgba(181,76,212,.85);
        }

        /* Wheel ring — circular, clips the image, no bleed-through */
        .vm-wheel-ring {
          width: min(68vw, 268px);
          height: min(68vw, 268px);
          border-radius: 50%;
          overflow: hidden;
          background: #08020e; /* solid base, no transparency */
          box-shadow:
            0 0 0 4px rgba(212,168,67,.65),
            0 0 0 9px rgba(212,168,67,.12),
            0 16px 50px rgba(0,0,0,.75),
            0 0 40px rgba(126,32,143,.28);
          flex-shrink: 0;
          position: relative;
          z-index: 2;
        }

        /* Wheel image — only THIS element rotates */
        .vm-wheel-img {
          display: block;
          width: 100%; height: 100%;
          object-fit: cover;
          transform-origin: 50% 50%;
          user-select: none;
          pointer-events: none;
          will-change: transform;
        }

        /* ── Spin button ── */
        .vm-spin-btn {
          margin-top: 20px;
          width: min(100%, 320px);
          min-height: 56px;
          border-radius: 14px;
          border: 1px solid #ffe7a5;
          background: linear-gradient(180deg, #ffe7a5 0%, ${GOLD} 50%, #9a6719 100%);
          color: #120608;
          font-size: clamp(17px, 4.5vw, 24px);
          font-weight: 900;
          letter-spacing: .07em;
          text-transform: uppercase;
          cursor: pointer;
          box-shadow: 0 12px 32px rgba(212,168,67,.32), inset 0 1px 0 rgba(255,255,255,.28);
          transition: opacity .15s, transform .1s;
          flex-shrink: 0;
        }
        .vm-spin-btn:not(:disabled):hover { opacity: .9; }
        .vm-spin-btn:not(:disabled):active { transform: scale(.97); }
        .vm-spin-btn:disabled { opacity: .6; cursor: not-allowed; }

        /* ── Footnote ── */
        .vm-footnote {
          margin: 10px 0 0;
          font-size: 12px;
          color: rgba(255,255,255,.42);
        }

        /* ── Result layer — separate fixed overlay ── */
        .vm-result-layer {
          position: fixed; inset: 0; z-index: 9999;
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          background: rgba(0,0,0,.76);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
        }

        /* ── Result card ── */
        .vm-result-card {
          position: relative;
          width: min(100%, 390px);
          border-radius: 20px;
          border: 1px solid rgba(212,168,67,.36);
          background:
            radial-gradient(ellipse at 20% 0%, rgba(126,32,143,.38) 0%, transparent 50%),
            linear-gradient(145deg, #0d0912 0%, #050206 100%);
          color: #f6efe0;
          padding: 30px 24px 24px;
          box-shadow: 0 32px 100px rgba(0,0,0,.82), inset 0 0 0 1px rgba(255,255,255,.03);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          text-align: center;
        }

        .vm-kicker {
          margin: 0;
          font-size: 10px; font-weight: 900; letter-spacing: .22em;
          color: ${GOLD};
        }

        /* Prize box */
        .vm-prize-box {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 22px 16px;
          border-radius: 14px;
          border: 1px solid rgba(212,168,67,.28);
          background: linear-gradient(145deg, rgba(255,231,165,.07), rgba(0,0,0,.18));
        }
        .vm-prize-box--voucher {
          border-color: rgba(255,231,165,.55);
          box-shadow: 0 0 32px rgba(212,168,67,.16), inset 0 0 0 1px rgba(255,255,255,.04);
        }

        .vm-prize-icon {
          width: 58px; height: 58px;
          border-radius: 50%;
          background: linear-gradient(180deg, #fff0b8 0%, ${GOLD} 52%, #9f6b1e 100%);
          display: grid; place-items: center;
          color: #120608;
          box-shadow: 0 0 26px rgba(212,168,67,.45);
          flex-shrink: 0;
        }

        .vm-prize-title {
          margin: 0;
          font-family: var(--font-playfair, Georgia, serif);
          font-size: clamp(20px, 5.5vw, 28px);
          line-height: 1.1;
          color: #ffe7a5;
        }
        .vm-prize-sub {
          margin: 0;
          font-size: 14px;
          color: rgba(255,255,255,.72);
          line-height: 1.5;
        }

        /* Actions */
        .vm-actions {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 10px;
        }
        .vm-info {
          margin: 0;
          font-size: 13px; line-height: 1.55;
          color: rgba(255,255,255,.66);
        }
        .vm-input {
          width: 100%; box-sizing: border-box;
          min-height: 46px;
          border-radius: 10px;
          border: 1px solid rgba(212,168,67,.25);
          background: rgba(255,255,255,.05);
          color: #fff;
          padding: 0 14px;
          font-size: 15px;
          outline: none;
        }
        .vm-input:focus { border-color: rgba(212,168,67,.5); }
        .vm-input::placeholder { color: rgba(255,255,255,.35); }

        .vm-btn-gold {
          min-height: 50px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(180deg, #ffe7a5 0%, ${GOLD} 50%, #9a6719 100%);
          color: #120608;
          font-size: 15px; font-weight: 900;
          letter-spacing: .03em;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          text-decoration: none;
          box-shadow: 0 8px 22px rgba(212,168,67,.28);
          transition: opacity .15s;
        }
        .vm-btn-gold:disabled { opacity: .55; cursor: not-allowed; }
        .vm-btn-gold:not(:disabled):hover { opacity: .88; }

        .vm-btn-outline {
          min-height: 46px;
          border-radius: 12px;
          border: 1px solid rgba(212,168,67,.38);
          background: transparent;
          color: #f5d78c;
          font-size: 14px; font-weight: 700;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          text-decoration: none;
          transition: opacity .15s;
        }
        .vm-btn-outline:hover { opacity: .8; }

        .vm-link {
          color: #f5d78c;
          font-size: 13px;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .vm-code {
          font-family: monospace;
          font-size: 22px; letter-spacing: .12em;
          color: #f5d78c;
        }
        .vm-code-status {
          font-size: 13px;
          color: rgba(255,255,255,.6);
        }

        /* ── Small screen ── */
        @media (max-height: 700px) {
          .vm-title { font-size: 24px; margin-bottom: 4px; }
          .vm-sub   { font-size: 12px; margin-bottom: 8px; }
          .vm-wheel-ring { width: min(58vw, 220px); height: min(58vw, 220px); }
          .vm-pointer { width: 36px; height: 46px; margin-bottom: -12px; }
          .vm-pointer-gem { top: 9px; width: 10px; height: 10px; }
          .vm-spin-btn { min-height: 46px; margin-top: 12px; font-size: 15px; }
        }
        @media (max-width: 380px) {
          .vm-card { padding: 16px 14px 14px; border-radius: 18px; }
          .vm-wheel-ring { width: min(66vw, 240px); height: min(66vw, 240px); }
        }
      `}</style>
    </div>
  );
}

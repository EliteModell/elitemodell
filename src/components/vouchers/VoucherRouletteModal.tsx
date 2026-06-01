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
const SEGMENT_ANGLE = 36; // 10 fatias, 36° cada
const SPIN_DURATION_MS = 4200;
const PAUSE_AFTER_STOP_MS = 1100; // pausa para o usuário ver onde parou

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

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
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
  const [landed, setLanded] = useState(false);   // true enquanto mostra o glow antes do resultado
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [claiming, setClaiming] = useState(false);

  const wheelRef = useRef<HTMLImageElement>(null);
  const rotationRef = useRef(0);
  const idempotencyRef = useRef(randomKey());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const spinOscRef = useRef<OscillatorNode | null>(null);
  const spinGainRef = useRef<GainNode | null>(null);
  const tickTimerRef = useRef<number | null>(null);
  const soundActiveRef = useRef(false);
  const soundT0Ref = useRef(0);

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
    return () => { active = false; };
  }, []);

  function close() {
    sessionStorage.setItem(CLOSED_KEY, "1");
    stopSound();
    setOpen(false);
  }

  // ── Som: drone contínuo + tiques desacelerando ─────────────────────────────

  function startSound() {
    try {
      stopSound();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioCtx = window.AudioContext ?? (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx() as AudioContext;
      audioCtxRef.current = ctx;
      if (ctx.state === "suspended") void ctx.resume();

      const t0 = ctx.currentTime;
      const dur = SPIN_DURATION_MS / 1000;

      // Drone grave que desacelera
      const drone = ctx.createOscillator();
      const droneGain = ctx.createGain();
      drone.type = "sawtooth";
      drone.frequency.setValueAtTime(130, t0);
      drone.frequency.exponentialRampToValueAtTime(68, t0 + dur);
      droneGain.gain.setValueAtTime(0.001, t0);
      droneGain.gain.linearRampToValueAtTime(0.032, t0 + 0.12);
      droneGain.gain.linearRampToValueAtTime(0.028, t0 + dur);
      drone.connect(droneGain);
      droneGain.connect(ctx.destination);
      drone.start(t0);
      spinOscRef.current = drone;
      spinGainRef.current = droneGain;

      soundActiveRef.current = true;
      soundT0Ref.current = performance.now();
      scheduleTick(ctx);
    } catch {
      // AudioContext indisponível
    }
  }

  function scheduleTick(ctx: AudioContext) {
    if (!soundActiveRef.current) return;
    const elapsed = performance.now() - soundT0Ref.current;
    const progress = Math.min(elapsed / SPIN_DURATION_MS, 0.98);

    // Tique curto, tom agudo
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g);
      g.connect(ctx.destination);
      osc.type = "triangle";
      osc.frequency.value = 700 + Math.random() * 140;
      const now = ctx.currentTime;
      const vol = 0.12 - progress * 0.04;
      g.gain.setValueAtTime(vol, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
    }

    // Intervalo cresce quadraticamente: 55ms → 380ms
    const interval = 55 + progress * progress * 325;
    tickTimerRef.current = window.setTimeout(() => scheduleTick(ctx), interval);
  }

  function stopSound() {
    soundActiveRef.current = false;
    if (tickTimerRef.current !== null) {
      window.clearTimeout(tickTimerRef.current);
      tickTimerRef.current = null;
    }
    if (spinGainRef.current && audioCtxRef.current) {
      const now = audioCtxRef.current.currentTime;
      spinGainRef.current.gain.cancelScheduledValues(now);
      spinGainRef.current.gain.setValueAtTime(spinGainRef.current.gain.value, now);
      spinGainRef.current.gain.linearRampToValueAtTime(0.001, now + 0.1);
      spinOscRef.current?.stop(now + 0.12);
    }
    spinOscRef.current = null;
    spinGainRef.current = null;
    if (audioCtxRef.current) {
      const ctx = audioCtxRef.current;
      audioCtxRef.current = null;
      window.setTimeout(() => ctx.close().catch(() => {}), 150);
    }
  }

  // ── Animação da roda via CSS transition ────────────────────────────────────

  function rotateToSegment(index: number) {
    const wheel = wheelRef.current;
    if (!wheel) return;

    const current = rotationRef.current;
    const normalized = ((current % 360) + 360) % 360;
    // Posição alvo: fatia 'index' sob o ponteiro (12h)
    const target = (360 - index * SEGMENT_ANGLE) % 360;
    // Mínimo 7 voltas completas antes de pousar
    let delta = 360 * 7 + target - normalized;
    if (delta < 360 * 6) delta += 360;
    const next = current + delta;
    rotationRef.current = next;

    // Reseta qualquer transition anterior, força reflow, aplica nova animação
    wheel.style.transition = "none";
    void wheel.offsetWidth; // flush para o browser comprometer o transform atual
    wheel.style.transition = `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.10, 0.80, 0.20, 1)`;
    wheel.style.transform = `translateZ(0) rotate(${next}deg)`;
  }

  // ── Fluxo principal de giro ────────────────────────────────────────────────

  async function spin() {
    if (!config || spinning || result) return;

    setSpinning(true);
    setLanded(false);
    setShowResult(false);

    try {
      const res = await fetch("/api/vouchers/roulette/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey: idempotencyRef.current }),
      });
      const data: SpinResult & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível girar agora.");

      const visualIndex = resolveVisualIndex(data);

      // Som e roda começam juntos — sincronizados
      startSound();
      rotateToSegment(visualIndex);

      // Aguarda a animação CSS terminar
      await wait(SPIN_DURATION_MS);

      // --- Roda parou ---
      stopSound();                    // fade-out suave do áudio
      setLanded(true);                // ativa glow + bounce do ponteiro
      await wait(PAUSE_AFTER_STOP_MS); // usuário vê onde a seta parou

      // --- Mostra resultado ---
      setResult(data);
      setShowResult(true);
      setLanded(false);
      setSpinning(false);
    } catch (err) {
      stopSound();
      setLanded(false);
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

      {/* ── Modal principal ── */}
      <div className="vm-card">
        <button type="button" className="vm-x" onClick={close} aria-label="Fechar">✕</button>

        <p className="vm-brand"><span>elite</span>modell</p>
        <h2 className="vm-title">ROLETA PREMIADA</h2>
        <p className="vm-sub">Gire a roleta e descubra seu desconto especial para usar na plataforma.</p>

        {/* Seção da roda — ponteiro fica acima, irmão da ring */}
        <div className="vm-wheel-section">
          <div className={`vm-pointer${landed ? " vm-pointer--landed" : ""}`} aria-hidden="true">
            <div className="vm-pointer-gem" />
          </div>

          <div className="vm-wheel-ring">
            {/* ÚNICA coisa que gira */}
            <img
              ref={wheelRef}
              src={WHEEL_IMAGE_SRC}
              alt="Roda da Roleta Premiada"
              className="vm-wheel-img"
              draggable={false}
            />
            {/* Glow da fatia vencedora, aparece 1s antes do resultado */}
            {landed && <div className="vm-glow" aria-hidden="true" />}
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

      {/* ── Overlay de resultado ── */}
      {showResult && result && resultView && ResultIcon && (
        <div className="vm-result-layer">
          <div className="vm-result-card">
            <button type="button" className="vm-x" onClick={close} aria-label="Fechar">✕</button>

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
                  Esse prêmio está reservado por tempo limitado. Entre ou crie sua conta para liberar o desconto.
                </p>
                <Link href="/login?returnUrl=/dashboard/carteira" className="vm-btn-gold">Entrar para liberar</Link>
                <Link href="/cadastro" className="vm-btn-outline">Criar cadastro</Link>
              </div>
            )}

            {result.needsIdentification && (
              <div className="vm-actions">
                <p className="vm-info">Informe seus dados para salvar o benefício.</p>
                <input className="vm-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" />
                <input className="vm-input" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="WhatsApp com DDD" inputMode="tel" />
                <button type="button" className="vm-btn-gold" onClick={claimVoucher} disabled={claiming}>
                  {claiming ? "Salvando..." : "Salvar desconto"}
                </button>
                <Link href="/login?returnUrl=/dashboard/carteira" className="vm-link">Entrar ou cadastrar para guardar na carteira</Link>
              </div>
            )}

            {!result.needsIdentification && result.voucher && (
              <div className="vm-actions">
                <strong className="vm-code">{result.voucher.code}</strong>
                <span className="vm-code-status">
                  {result.voucher.status === "AWAITING_REGISTRATION" ? "Aguardando cadastro" : "Desconto disponível"}
                </span>
                {result.voucher.status === "AWAITING_REGISTRATION" ? (
                  <Link href="/cadastro" className="vm-btn-gold">Concluir cadastro</Link>
                ) : (
                  <Link href="/dashboard/carteira" className="vm-btn-gold">Ver em Meus Vouchers</Link>
                )}
              </div>
            )}

            {!result.needsIdentification && !result.needsRegistration && !result.voucher && (
              <button type="button" className="vm-btn-gold" onClick={close}>Continuar navegando</button>
            )}
          </div>
        </div>
      )}

      <style>{`
        /* Backdrop */
        .vm-backdrop {
          position: fixed; inset: 0; z-index: 9998;
          display: flex; align-items: center; justify-content: center;
          padding: 12px;
          background: rgba(0,0,0,.80);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }

        /* Card principal */
        .vm-card {
          position: relative;
          width: min(100%, 400px);
          max-height: calc(100dvh - 24px);
          overflow-y: auto; overflow-x: hidden;
          display: flex; flex-direction: column; align-items: center;
          border-radius: 22px;
          border: 1px solid rgba(212,168,67,.38);
          background:
            radial-gradient(ellipse at 22% 0%, rgba(116,34,128,.55) 0%, transparent 48%),
            radial-gradient(ellipse at 80% 8%,  rgba(212,168,67,.14) 0%, transparent 40%),
            linear-gradient(170deg, #090212 0%, #110520 55%, #060208 100%);
          box-shadow: 0 32px 90px rgba(0,0,0,.8), inset 0 0 0 1px rgba(255,255,255,.03);
          padding: 20px 18px 16px;
          color: #f6efe0; text-align: center;
        }

        /* Botão fechar */
        .vm-x {
          position: absolute; top: 12px; right: 12px; z-index: 10;
          width: 32px; height: 32px; border-radius: 50%;
          border: 1px solid rgba(212,168,67,.38); background: rgba(0,0,0,.55);
          color: #f5d78c; font-size: 13px; font-weight: 800;
          cursor: pointer; display: grid; place-items: center;
          transition: background .15s;
        }
        .vm-x:hover { background: rgba(0,0,0,.8); }

        /* Header */
        .vm-brand { margin: 0 0 4px; font-size: 18px; font-weight: 900; letter-spacing: -.02em; }
        .vm-brand span { color: ${GOLD}; }
        .vm-title {
          margin: 0 0 8px;
          font-family: var(--font-playfair, Georgia, serif);
          font-size: clamp(28px, 8vw, 50px); line-height: .93;
          color: #ffe7a5;
          text-shadow: 0 0 30px rgba(212,168,67,.36);
        }
        .vm-sub {
          margin: 0 0 14px; max-width: 310px;
          color: rgba(255,255,255,.74);
          font-size: clamp(12px, 3.2vw, 14px); line-height: 1.48;
        }

        /* Seção da roda */
        .vm-wheel-section {
          display: flex; flex-direction: column; align-items: center;
          width: 100%; flex-shrink: 0;
        }

        /* Ponteiro — triângulo dourado apontando para baixo */
        .vm-pointer {
          position: relative; z-index: 5;
          margin-bottom: -14px;
          width: 44px; height: 54px;
          background: linear-gradient(180deg, #fff4cc 0%, ${GOLD} 52%, #6d3c0c 100%);
          clip-path: polygon(50% 100%, 0% 0%, 100% 0%);
          filter: drop-shadow(0 4px 10px rgba(0,0,0,.55));
          flex-shrink: 0;
          transform-origin: 50% 0%;
        }
        .vm-pointer-gem {
          position: absolute; top: 11px; left: 50%;
          transform: translateX(-50%);
          width: 11px; height: 11px; border-radius: 50%;
          background: #8c1fa8;
          box-shadow: 0 0 14px rgba(181,76,212,.9);
        }

        /* Bounce do ponteiro quando a roda para */
        .vm-pointer--landed {
          animation: vm-ptr-bounce 0.52s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes vm-ptr-bounce {
          0%   { transform: translateY(0)   scale(1);    filter: drop-shadow(0 4px 10px rgba(0,0,0,.55)); }
          18%  { transform: translateY(5px)  scale(1,1.1); filter: drop-shadow(0 0 22px rgba(255,215,80,.95)); }
          36%  { transform: translateY(-2px) scale(1);  }
          54%  { transform: translateY(3px)  scale(1,.98); filter: drop-shadow(0 0 16px rgba(255,215,80,.65)); }
          72%  { transform: translateY(-1px) scale(1);  }
          88%  { transform: translateY(1px)  scale(1);  }
          100% { transform: translateY(0)   scale(1);    filter: drop-shadow(0 4px 10px rgba(0,0,0,.55)); }
        }

        /* Ring circular — container com overflow:hidden */
        .vm-wheel-ring {
          width: min(70vw, 278px);
          height: min(70vw, 278px);
          border-radius: 50%;
          overflow: hidden;
          background: #0b0311;
          box-shadow:
            0 0 0 3px rgba(238,190,78,.8),
            0 0 0 8px rgba(212,168,67,.1),
            0 12px 36px rgba(0,0,0,.5),
            0 0 40px rgba(171,63,188,.22);
          flex-shrink: 0;
          position: relative; z-index: 2;
        }

        /* A única coisa que gira */
        .vm-wheel-img {
          display: block; width: 100%; height: 100%;
          object-fit: cover;
          transform: translateZ(0) rotate(0deg);
          transform-origin: 50% 50%;
          backface-visibility: hidden;
          will-change: transform;
          user-select: none; pointer-events: none;
        }

        /* Glow dourado na fatia vencedora (aparece após parar) */
        .vm-glow {
          position: absolute; inset: 0;
          pointer-events: none; z-index: 3;
          border-radius: 50%;
          background:
            radial-gradient(circle at 50% 24%, rgba(255,238,160,.6) 0%, transparent 22%),
            conic-gradient(
              from -18deg,
              rgba(255,228,120,.68) 0deg,
              rgba(255,228,120,.35) 24deg,
              transparent 38deg 360deg
            );
          mix-blend-mode: screen;
          animation: vm-glow-pulse ${PAUSE_AFTER_STOP_MS}ms ease-in-out both;
        }
        @keyframes vm-glow-pulse {
          0%   { opacity: 0;   transform: scale(.95); }
          22%  { opacity: 1;   transform: scale(1.01); }
          50%  { opacity: .65; transform: scale(1); }
          76%  { opacity: 1;   transform: scale(1.02); }
          100% { opacity: .8;  transform: scale(1); }
        }

        /* Botão girar */
        .vm-spin-btn {
          margin-top: 18px;
          width: min(100%, 310px); min-height: 54px;
          border-radius: 14px; border: 1px solid #ffe7a5;
          background: linear-gradient(180deg, #ffe7a5 0%, ${GOLD} 50%, #9a6719 100%);
          color: #120608; font-size: clamp(16px, 4.2vw, 22px);
          font-weight: 900; letter-spacing: .07em; text-transform: uppercase;
          cursor: pointer;
          box-shadow: 0 10px 28px rgba(212,168,67,.3), inset 0 1px 0 rgba(255,255,255,.26);
          transition: opacity .15s, transform .1s; flex-shrink: 0;
        }
        .vm-spin-btn:not(:disabled):hover  { opacity: .9; }
        .vm-spin-btn:not(:disabled):active { transform: scale(.97); }
        .vm-spin-btn:disabled { opacity: .6; cursor: not-allowed; }

        .vm-footnote { margin: 10px 0 0; font-size: 11px; color: rgba(255,255,255,.38); }

        /* Overlay do resultado */
        .vm-result-layer {
          position: fixed; inset: 0; z-index: 9999;
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          background: rgba(0,0,0,.78);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
        }

        /* Card do resultado */
        .vm-result-card {
          position: relative;
          width: min(100%, 390px);
          border-radius: 20px;
          border: 1px solid rgba(212,168,67,.36);
          background:
            radial-gradient(ellipse at 20% 0%, rgba(126,32,143,.38) 0%, transparent 50%),
            linear-gradient(145deg, #0d0912 0%, #050206 100%);
          color: #f6efe0;
          padding: 30px 22px 22px;
          box-shadow: 0 32px 100px rgba(0,0,0,.82), inset 0 0 0 1px rgba(255,255,255,.03);
          display: flex; flex-direction: column; align-items: center; gap: 14px;
          text-align: center;
          animation: vm-result-in .35s cubic-bezier(.22,.68,0,1.2) both;
        }
        @keyframes vm-result-in {
          from { opacity: 0; transform: scale(.92) translateY(12px); }
          to   { opacity: 1; transform: scale(1)   translateY(0); }
        }

        .vm-kicker {
          margin: 0; font-size: 10px; font-weight: 900; letter-spacing: .22em; color: ${GOLD};
        }

        .vm-prize-box {
          width: 100%;
          display: flex; flex-direction: column; align-items: center; gap: 10px;
          padding: 20px 14px; border-radius: 14px;
          border: 1px solid rgba(212,168,67,.28);
          background: linear-gradient(145deg, rgba(255,231,165,.07), rgba(0,0,0,.18));
        }
        .vm-prize-box--voucher {
          border-color: rgba(255,231,165,.55);
          box-shadow: 0 0 30px rgba(212,168,67,.16), inset 0 0 0 1px rgba(255,255,255,.04);
        }
        .vm-prize-icon {
          width: 58px; height: 58px; border-radius: 50%;
          background: linear-gradient(180deg, #fff0b8 0%, ${GOLD} 52%, #9f6b1e 100%);
          display: grid; place-items: center; color: #120608;
          box-shadow: 0 0 26px rgba(212,168,67,.45); flex-shrink: 0;
        }
        .vm-prize-title {
          margin: 0;
          font-family: var(--font-playfair, Georgia, serif);
          font-size: clamp(19px, 5vw, 27px); line-height: 1.12; color: #ffe7a5;
        }
        .vm-prize-sub { margin: 0; font-size: 14px; color: rgba(255,255,255,.72); line-height: 1.5; }

        .vm-actions { width: 100%; display: flex; flex-direction: column; align-items: stretch; gap: 10px; }
        .vm-info { margin: 0; font-size: 13px; line-height: 1.55; color: rgba(255,255,255,.66); }

        .vm-input {
          width: 100%; box-sizing: border-box; min-height: 46px;
          border-radius: 10px; border: 1px solid rgba(212,168,67,.25);
          background: rgba(255,255,255,.05); color: #fff;
          padding: 0 14px; font-size: 15px; outline: none;
        }
        .vm-input:focus { border-color: rgba(212,168,67,.5); }
        .vm-input::placeholder { color: rgba(255,255,255,.35); }

        .vm-btn-gold {
          min-height: 50px; border-radius: 12px; border: none;
          background: linear-gradient(180deg, #ffe7a5 0%, ${GOLD} 50%, #9a6719 100%);
          color: #120608; font-size: 15px; font-weight: 900; letter-spacing: .03em;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          text-decoration: none;
          box-shadow: 0 8px 22px rgba(212,168,67,.28); transition: opacity .15s;
        }
        .vm-btn-gold:disabled { opacity: .55; cursor: not-allowed; }
        .vm-btn-gold:not(:disabled):hover { opacity: .88; }

        .vm-btn-outline {
          min-height: 46px; border-radius: 12px;
          border: 1px solid rgba(212,168,67,.38); background: transparent;
          color: #f5d78c; font-size: 14px; font-weight: 700;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          text-decoration: none; transition: opacity .15s;
        }
        .vm-btn-outline:hover { opacity: .8; }

        .vm-link {
          color: #f5d78c; font-size: 13px;
          text-decoration: underline; text-underline-offset: 3px;
        }

        .vm-code { font-family: monospace; font-size: 22px; letter-spacing: .12em; color: #f5d78c; }
        .vm-code-status { font-size: 13px; color: rgba(255,255,255,.6); }

        /* Telas pequenas */
        @media (max-height: 680px) {
          .vm-title { font-size: 24px; margin-bottom: 4px; }
          .vm-sub   { font-size: 12px; margin-bottom: 8px; }
          .vm-wheel-ring { width: min(58vw, 218px); height: min(58vw, 218px); }
          .vm-pointer { width: 36px; height: 44px; margin-bottom: -11px; }
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

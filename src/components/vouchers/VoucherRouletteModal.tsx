"use client";

import Link from "next/link";
import { CalendarClock, Gift, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

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
  policy: {
    key: string;
    title: string;
    href: string;
    version: string;
    hash: string;
    authorizationReference: string | null;
  };
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

type Props = {
  demoMode?: boolean;
};

const CLOSED_KEY = "elite_voucher_modal_closed";
const GOLD = "#d4a843";
const WHEEL_IMAGE_SRC = "/images/roleta/roleta-roda.webp?v=20260601-spin-audio";
const SEGMENT_ANGLE = 36; // 360 / 10 segments
const SPIN_DURATION_MS = 4000;   // duração fixa do giro visual (ms)
const RESULT_REVEAL_DELAY_MS = 1000; // pausa após parar para mostrar onde caiu
const SLOW_PREPARE_MS = 180;
const SPIN_API_TIMEOUT_MS = 8000;
const DEMO_PRIZES: Prize[] = Array.from({ length: 10 }, (_, index) => ({
  id: `demo-${index}`,
  index,
  name: index % 2 === 0 ? `R$ ${[5, 10, 20, 50, 100][index / 2]} OFF` : "Tente novamente",
  type: index % 2 === 0 ? "VOUCHER" : "TRY_AGAIN",
  value: index % 2 === 0 ? [5, 10, 20, 50, 100][index / 2] : null,
  requiresPayment: false,
  paymentAmount: null,
}));

const DEMO_CONFIG: RouletteConfig = {
  active: true,
  canSpin: true,
  blockedUntil: null,
  prizes: DEMO_PRIZES,
  policy: {
    key: "roulette-promotion-policy",
    title: "Política da Roleta Promocional",
    href: "/documentos/roulette-promotion-policy",
    version: "DEMONSTRACAO",
    hash: "demonstracao-sem-premiacao",
    authorizationReference: "DEMONSTRACAO_SEM_PREMIACAO",
  },
};

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

function delay(ms: number) {
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
  if (result.result === "DEMO") {
    return {
      Icon: Sparkles,
      tone: "again" as const,
      title: "Demonstração concluída",
      subtitle: "Nenhum prêmio, voucher ou participação real foi gerado.",
    };
  }
  if (result.result === "ERROR") {
    return {
      Icon: Sparkles,
      tone: "again" as const,
      title: "Não foi possível girar agora.",
      subtitle: result.message || "Tente novamente em instantes.",
    };
  }
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
      subtitle: result.message || "Você pode tentar novamente amanhã.",
    };
  }
  const isNearMiss = result.prize?.name?.toLowerCase().includes("quase");
  return {
    Icon: Sparkles,
    tone: "again" as const,
    title: isNearMiss ? "Quase lá!" : "Mais sorte na próxima!",
    subtitle: result.message || (isNearMiss ? "Você pode tentar novamente amanhã." : "Continue navegando na plataforma."),
  };
}

export default function VoucherRouletteModal({ demoMode = false }: Props) {
  const [config, setConfig] = useState<RouletteConfig | null>(
    demoMode ? DEMO_CONFIG : null,
  );
  const [open, setOpen] = useState(demoMode);
  const [spinning, setSpinning] = useState(false);
  const [fetching, setFetching] = useState(false); // aguardando resposta da API
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [winningIndex, setWinningIndex] = useState<number | null>(null);
  const [slowPreparing, setSlowPreparing] = useState(false);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);

  const wheelRef = useRef<HTMLImageElement>(null);
  const rotationRef = useRef(0);
  const idempotencyRef = useRef(randomKey());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundNodesRef = useRef<{ osc: OscillatorNode; gain: GainNode } | null>(null);
  const tickTimersRef = useRef<number[]>([]);
  const soundActiveRef = useRef(false);
  const soundStartedAtRef = useRef(0);
  const spinFrameRef = useRef<number | null>(null);
  const preSpinActiveRef = useRef(false);
  const slowPrepareTimerRef = useRef<number | null>(null);
  const preloadedWheelRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (demoMode) return;
    if (sessionStorage.getItem(CLOSED_KEY)) return;
    let active = true;
    let openTimer: number | null = null;

    function loadRoulette() {
      fetch("/api/vouchers/roulette", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: RouletteConfig | null) => {
          if (!active || !data?.active || !data.canSpin || data.prizes.length < 2) return;
          setConfig(data);
          if (openTimer !== null) window.clearTimeout(openTimer);
          openTimer = window.setTimeout(() => setOpen(true), 700);
        })
        .catch(() => undefined);
    }

    loadRoulette();
    window.addEventListener("elite-cookie-consent", loadRoulette);

    return () => {
      active = false;
      if (openTimer !== null) window.clearTimeout(openTimer);
      window.removeEventListener("elite-cookie-consent", loadRoulette);
    };
  }, [demoMode]);

  useEffect(() => {
    if (!open) return;
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    img.src = WHEEL_IMAGE_SRC;
    preloadedWheelRef.current = img;
    void img.decode?.().catch(() => undefined);

    try {
      void getAudioContext();
    } catch {
      // Audio still gets unlocked on the user's tap.
    }

    const warmTimer = window.setTimeout(() => {
      fetch("/api/vouchers/roulette", { cache: "no-store" }).catch(() => undefined);
    }, 250);

    return () => window.clearTimeout(warmTimer);
  }, [open]);

  function close() {
    if (!demoMode) sessionStorage.setItem(CLOSED_KEY, "1");
    clearSlowPrepareTimer();
    stopWheelMotion();
    stopSpinSound();
    setOpen(false);
  }

  function clearSlowPrepareTimer() {
    if (slowPrepareTimerRef.current !== null) {
      window.clearTimeout(slowPrepareTimerRef.current);
      slowPrepareTimerRef.current = null;
    }
    setSlowPreparing(false);
  }

  function getAudioContext() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioCtx = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioCtx() as AudioContext;
    }
    return audioCtxRef.current;
  }

  async function primeSpinAudio() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === "suspended") await ctx.resume().catch(() => undefined);

      // Unlock mobile audio during the user's click so the spin sound can start with the wheel.
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.01);
    } catch {
      // Audio is optional; the wheel animation must still run.
    }
  }

  function startSpinSound() {
    try {
      stopSpinSound(false);
      const ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === "suspended") void ctx.resume();

      const startAt = ctx.currentTime;
      const spinOsc = ctx.createOscillator();
      const spinGain = ctx.createGain();
      spinOsc.type = "sawtooth";
      spinOsc.frequency.setValueAtTime(120, startAt);
      spinOsc.frequency.exponentialRampToValueAtTime(72, startAt + SPIN_DURATION_MS / 1000);
      spinGain.gain.setValueAtTime(0.001, startAt);
      spinGain.gain.linearRampToValueAtTime(0.036, startAt + 0.08);
      spinGain.gain.linearRampToValueAtTime(0.032, startAt + SPIN_DURATION_MS / 1000);
      spinOsc.connect(spinGain);
      spinGain.connect(ctx.destination);
      spinOsc.start(startAt);
      soundNodesRef.current = { osc: spinOsc, gain: spinGain };
      soundActiveRef.current = true;
      soundStartedAtRef.current = performance.now();
      scheduleSpinTick(ctx);
    } catch {
      // AudioContext unavailable
    }
  }

  function scheduleSpinTick(ctx: AudioContext) {
    if (!soundActiveRef.current) return;

    const elapsed = performance.now() - soundStartedAtRef.current;
    const progress = Math.min(elapsed / SPIN_DURATION_MS, 0.95);

    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "triangle";
      osc.frequency.value = 680 + Math.random() * 120;
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.13 - progress * 0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      osc.start(now);
      osc.stop(now + 0.045);
    }

    const interval = 55 + progress * progress * 325;
    tickTimersRef.current = [window.setTimeout(() => scheduleSpinTick(ctx), interval)];
  }

  function stopSpinSound(closeContext = true) {
    soundActiveRef.current = false;
    tickTimersRef.current.forEach((id) => window.clearTimeout(id));
    tickTimersRef.current = [];
    if (soundNodesRef.current && audioCtxRef.current) {
      const now = audioCtxRef.current.currentTime;
      soundNodesRef.current.gain.gain.cancelScheduledValues(now);
      soundNodesRef.current.gain.gain.setValueAtTime(soundNodesRef.current.gain.gain.value, now);
      soundNodesRef.current.gain.gain.linearRampToValueAtTime(0.001, now + 0.08);
      soundNodesRef.current.osc.stop(now + 0.1);
      soundNodesRef.current = null;
    }
    if (audioCtxRef.current && closeContext) {
      const ctx = audioCtxRef.current;
      window.setTimeout(() => ctx.close().catch(() => {}), 130);
      audioCtxRef.current = null;
    }
  }

  function setWheelRotation(angle: number) {
    rotationRef.current = angle;
    if (wheelRef.current) {
      wheelRef.current.style.transform = `translateZ(0) rotate(${angle}deg)`;
    }
  }

  function stopWheelMotion() {
    preSpinActiveRef.current = false;
    if (spinFrameRef.current !== null) {
      window.cancelAnimationFrame(spinFrameRef.current);
      spinFrameRef.current = null;
    }
  }

  function startWheelMotion() {
    stopWheelMotion();
    preSpinActiveRef.current = true;

    let lastFrame = performance.now();
    const step = (now: number) => {
      const elapsed = Math.min(now - lastFrame, 40);
      lastFrame = now;
      setWheelRotation(rotationRef.current + elapsed * 0.82);

      if (preSpinActiveRef.current) {
        spinFrameRef.current = window.requestAnimationFrame(step);
      }
    };

    spinFrameRef.current = window.requestAnimationFrame(step);
  }

  function animateWheelToSegment(index: number, durationMs: number) {
    if (!wheelRef.current) return Promise.resolve();
    stopWheelMotion();
    const current = rotationRef.current;
    const normalized = ((current % 360) + 360) % 360;
    const target = (360 - index * SEGMENT_ANGLE) % 360;
    const extraSpins = durationMs <= 1200 ? 3 : 4;
    let delta = 360 * extraSpins + target - normalized;
    if (delta < 360 * (extraSpins - 1)) delta += 360;
    const next = current + delta;

    return new Promise<void>((resolve) => {
      const start = performance.now();
      const easeOut = (progress: number) => 1 - Math.pow(1 - progress, 3);

      const step = (now: number) => {
        const progress = Math.min((now - start) / durationMs, 1);
        const eased = easeOut(progress);
        setWheelRotation(current + delta * eased);

        if (progress < 1) {
          spinFrameRef.current = window.requestAnimationFrame(step);
          return;
        }

        setWheelRotation(next);
        spinFrameRef.current = null;
        resolve();
      };

      spinFrameRef.current = window.requestAnimationFrame(step);
    });
  }

  async function spin() {
    if (!config || spinning || result) return;

    // 1. Bloqueia novo clique imediatamente e prepara o giro sem animar a roda indefinidamente.
    await primeSpinAudio();
    clearSlowPrepareTimer();
    flushSync(() => {
      setSpinning(true);
      setFetching(true);
      setShowResult(false);
      setWinningIndex(null);
    });
    startSpinSound();
    startWheelMotion();
    slowPrepareTimerRef.current = window.setTimeout(() => {
      setSlowPreparing(true);
      slowPrepareTimerRef.current = null;
    }, SLOW_PREPARE_MS);

    if (demoMode) {
      await delay(450);
      clearSlowPrepareTimer();
      setFetching(false);
      const visualIndex = Math.floor(Math.random() * 10);
      await animateWheelToSegment(visualIndex, SPIN_DURATION_MS);
      stopSpinSound();
      setWinningIndex(visualIndex);
      await delay(RESULT_REVEAL_DELAY_MS);
      setResult({
        spinId: "demo",
        prize: DEMO_PRIZES[visualIndex],
        result: "DEMO",
        message: "Demonstração visual sem premiação.",
        needsIdentification: false,
      });
      setShowResult(true);
      setSpinning(false);
      return;
    }

    let timeoutId: number | null = null;

    try {
      const controller = new AbortController();
      timeoutId = window.setTimeout(() => controller.abort(), SPIN_API_TIMEOUT_MS);

      // 2. Busca resultado primeiro; se passar do limite, cancela e mostra erro claro.
      const res = await fetch("/api/vouchers/roulette/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: idempotencyRef.current,
          acceptedPolicy,
        }),
        signal: controller.signal,
      });
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      timeoutId = null;
      const data: SpinResult & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível girar agora.");

      clearSlowPrepareTimer();
      setFetching(false);
      const visualIndex = resolveVisualIndex(data);

      // 3. A API respondeu: agora sim desacelera por 4s até o prêmio sorteado.
      await animateWheelToSegment(visualIndex, SPIN_DURATION_MS);

      // 4. Parou: encerra o som e mostra onde caiu por 1 segundo
      stopSpinSound();
      setWinningIndex(visualIndex);
      await delay(RESULT_REVEAL_DELAY_MS);

      // 5. Só então exibe o resultado
      setResult(data);
      setShowResult(true);
      setSpinning(false);
    } catch (err) {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      console.error("[voucher-roulette-modal] spin_failed", {
        name: err instanceof Error ? err.name : "UnknownError",
        message: err instanceof Error ? err.message : String(err),
        timeoutMs: SPIN_API_TIMEOUT_MS,
      });
      clearSlowPrepareTimer();
      stopWheelMotion();
      stopSpinSound();
      setFetching(false);
      setWinningIndex(null);
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
        message: err instanceof Error && err.name === "AbortError"
          ? "Não foi possível preparar seu giro agora. Tente novamente."
          : err instanceof Error
            ? err.message
            : "Não foi possível girar agora. Tente novamente.",
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
        {demoMode && <p className="vm-demo-badge">MODO DEMONSTRAÇÃO · SEM PRÊMIO REAL</p>}
        <p className="vm-sub">Gire a roleta e descubra seu desconto especial para usar na plataforma.</p>

        {/* Wheel section — pointer + ring are siblings; pointer overlaps ring top via negative margin */}
        <div className="vm-wheel-section">
          <div className={`vm-pointer${winningIndex !== null ? " is-landed" : ""}`} aria-hidden="true">
            <div className="vm-pointer-gem" />
          </div>

          <div className="vm-wheel-ring">
            <img
              ref={wheelRef}
              src={WHEEL_IMAGE_SRC}
              alt="Roda da Roleta Premiada"
              className={`vm-wheel-img${spinning ? " vm-wheel-img--spinning" : ""}`}
              width={836}
              height={836}
              decoding="async"
              loading="eager"
              draggable={false}
            />
            {winningIndex !== null && <div className="vm-winning-glow" aria-hidden="true" />}
          </div>
        </div>

        <button
          type="button"
          className="vm-spin-btn"
          onClick={spin}
          disabled={spinning || Boolean(result) || (!demoMode && !acceptedPolicy)}
        >
          {fetching ? "Preparando..." : spinning ? "Girando..." : "GIRAR AGORA"}
        </button>
        {demoMode ? (
          <p className="vm-demo-note">
            Esta visualização não registra giro, não consome estoque e não emite voucher.
          </p>
        ) : (
          <label className="vm-policy-acceptance">
            <input
              type="checkbox"
              checked={acceptedPolicy}
              onChange={(event) => setAcceptedPolicy(event.target.checked)}
              disabled={spinning || Boolean(result)}
            />
            <span>
              Li e aceito a{" "}
              <Link href={config.policy.href} target="_blank">
                {config.policy.title}
              </Link>
              .
            </span>
          </label>
        )}
        {fetching && slowPreparing && (
          <p className="vm-prepare-note" role="status">
            Preparando seu giro com segurança...
          </p>
        )}

        <p className="vm-footnote">
          Versão {config.policy.version}
          {config.policy.authorizationReference
            ? ` · Referência ${config.policy.authorizationReference}`
            : ""}
        </p>
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
          background: rgba(0,0,0,.76);
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
            0 22px 54px rgba(0,0,0,.62),
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
          margin-bottom: -14px; /* overlaps the top edge of the ring */
          width: 44px; height: 54px;
          background: linear-gradient(180deg, #fff4cc 0%, ${GOLD} 52%, #6d3c0c 100%);
          clip-path: polygon(50% 100%, 0% 0%, 100% 0%);
          filter: drop-shadow(0 4px 9px rgba(0,0,0,.5));
          flex-shrink: 0;
        }
        .vm-pointer-gem {
          position: absolute;
          top: 11px; left: 50%;
          transform: translateX(-50%);
          width: 11px; height: 11px;
          border-radius: 50%;
          background: #8c1fa8;
          box-shadow: 0 0 14px rgba(181,76,212,.85);
        }
        .vm-pointer.is-landed {
          animation: vm-pointer-landed 1.05s ease-out both;
        }

        /* Wheel ring — circular, clips the image, no bleed-through */
        .vm-wheel-ring {
          width: min(70vw, 280px);
          height: min(70vw, 280px);
          border-radius: 50%;
          overflow: hidden;
          background: #0b0311; /* solid base, no transparency */
          box-shadow:
            0 0 0 3px rgba(238,190,78,.78),
            0 0 0 8px rgba(212,168,67,.08),
            0 10px 24px rgba(0,0,0,.34),
            0 0 24px rgba(171,63,188,.18);
          flex-shrink: 0;
          position: relative;
          z-index: 2;
        }

        /* Wheel image — only THIS element rotates */
        .vm-wheel-img {
          display: block;
          width: 100%; height: 100%;
          object-fit: cover;
          transform: translateZ(0) rotate(0deg);
          transform-origin: 50% 50%;
          backface-visibility: hidden;
          filter: brightness(1.1) saturate(1.12) contrast(1.03);
          user-select: none;
          pointer-events: none;
          will-change: auto;
        }
        .vm-wheel-img--spinning { will-change: transform; }

        .vm-winning-glow {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 3;
          background:
            radial-gradient(circle at 50% 26%, rgba(255,238,169,.56), transparent 18%),
            conic-gradient(from -18deg, rgba(255,229,130,.66) 0deg, rgba(255,229,130,.34) 22deg, transparent 37deg 360deg);
          mix-blend-mode: screen;
          -webkit-mask: radial-gradient(circle, transparent 0 22%, #000 25% 91%, transparent 96%);
          mask: radial-gradient(circle, transparent 0 22%, #000 25% 91%, transparent 96%);
          animation: vm-winning-glow 1.05s ease-out both;
        }

        @keyframes vm-winning-glow {
          0% { opacity: 0; transform: scale(.96); filter: blur(1px); }
          24% { opacity: 1; transform: scale(1.02); filter: blur(0); }
          70% { opacity: .78; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.03); }
        }

        @keyframes vm-pointer-landed {
          0% { filter: drop-shadow(0 4px 9px rgba(0,0,0,.5)); transform: translateY(0); }
          20% { filter: drop-shadow(0 0 22px rgba(255,222,128,.92)); transform: translateY(3px); }
          52% { filter: drop-shadow(0 0 18px rgba(255,222,128,.72)); transform: translateY(0); }
          100% { filter: drop-shadow(0 4px 9px rgba(0,0,0,.5)); transform: translateY(0); }
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
        .vm-demo-badge {
          width: fit-content;
          margin: 8px auto 4px;
          padding: 6px 10px;
          border: 1px solid rgba(245,215,140,.4);
          border-radius: 999px;
          background: rgba(212,168,67,.12);
          color: #f5d78c;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .1em;
        }
        .vm-demo-note {
          margin: 12px auto 0;
          max-width: 420px;
          color: rgba(255,255,255,.58);
          font-size: 12px;
          line-height: 1.55;
          text-align: center;
        }

        .vm-policy-acceptance {
          width: min(100%, 320px);
          margin-top: 12px;
          display: flex;
          align-items: flex-start;
          gap: 9px;
          color: rgba(255,255,255,.76);
          font-size: 12px;
          line-height: 1.45;
          text-align: left;
        }
        .vm-policy-acceptance input {
          width: 16px;
          height: 16px;
          margin: 1px 0 0;
          accent-color: ${GOLD};
          flex: 0 0 auto;
        }
        .vm-policy-acceptance a {
          color: #f5d78c;
          font-weight: 800;
          text-underline-offset: 2px;
        }

        .vm-prepare-note {
          margin: 8px 0 0;
          min-height: 18px;
          color: rgba(255,231,165,.82);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: .02em;
          animation: vm-prepare-pulse .9s ease-in-out infinite alternate;
        }

        @keyframes vm-prepare-pulse {
          from { opacity: .62; }
          to { opacity: 1; }
        }

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
          box-shadow: 0 22px 58px rgba(0,0,0,.66), inset 0 0 0 1px rgba(255,255,255,.03);
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

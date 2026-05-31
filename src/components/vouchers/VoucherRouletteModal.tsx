"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

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

function randomKey() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((item) => item.toString(16).padStart(2, "0")).join("");
}

function prizeShortLabel(prize: Prize) {
  if (prize.type === "TRY_AGAIN") return "Tente outra vez";
  if (prize.type === "TRY_TOMORROW") return "Tente amanhã";
  return `Voucher R$ ${Math.round(prize.value ?? 0)}`;
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
  const wheelBackground = useMemo(() => {
    if (!segments.length) return "#120612";
    return `conic-gradient(${segments.map((segment, index) => {
      const color = segment.value === 100
        ? "#d4a843"
        : index % 2 === 0
          ? "#160916"
          : "#4c0f54";
      return `${color} ${index * segmentAngle}deg ${(index + 1) * segmentAngle}deg`;
    }).join(",")})`;
  }, [segmentAngle, segments]);

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
          <div className="voucher-pointer" />
          <div className="voucher-wheel" style={{ transform: `rotate(${rotation}deg)`, background: wheelBackground }}>
            {segments.map((segment, index) => {
              const angle = index * segmentAngle + segmentAngle / 2;
              return (
                <div key={segment.id} className="voucher-segment-label" style={{ transform: `rotate(${angle}deg) translateY(-38%) rotate(${-angle}deg)` }}>
                  <span>{segment.type === "TRY_AGAIN" ? "↻" : segment.type === "TRY_TOMORROW" ? "▣" : "🎟"}</span>
                  <strong>{prizeShortLabel(segment)}</strong>
                </div>
              );
            })}
            <div className="voucher-wheel-center">E</div>
          </div>
          <button type="button" className="voucher-spin-button" onClick={spin} disabled={spinning || Boolean(result)}>
            {spinning ? "Girando..." : "Girar agora"}
          </button>
        </div>

        <p className="voucher-footer">Vouchers promocionais para uso interno na plataforma.</p>
      </div>

      {showResult && result && (
        <div className="voucher-result">
          <div className="voucher-result-card">
            <button type="button" className="voucher-close small" onClick={close} aria-label="Fechar">x</button>
            <p className="voucher-kicker">Resultado</p>
            <h3>{result.result === "VOUCHER" || result.result === "PAID_VOUCHER" ? "Parabéns!" : "Roleta de Vouchers"}</h3>
            <p>{result.message}</p>

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
        .voucher-pointer { position: absolute; top: 16px; z-index: 3; width: 76px; height: 92px; background: linear-gradient(180deg, #ffe9a8, #d4a843 58%, #5f3509); clip-path: polygon(50% 100%, 0 0, 100% 0); filter: drop-shadow(0 8px 14px rgba(0,0,0,.55)); }
        .voucher-wheel { position: relative; width: min(72vw, 520px); aspect-ratio: 1; border-radius: 50%; border: 16px solid #b77b22; box-shadow: inset 0 0 0 3px rgba(255,239,170,.72), inset 0 0 60px rgba(0,0,0,.68), 0 28px 90px rgba(0,0,0,.7); transition: transform 3.8s cubic-bezier(.12,.78,.08,1); }
        .voucher-wheel::after { content: ""; position: absolute; inset: 0; border-radius: 50%; background: repeating-conic-gradient(from 0deg, rgba(255,230,160,.72) 0deg 1deg, transparent 1deg 51.42deg); pointer-events: none; }
        .voucher-segment-label { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding-top: 58px; text-align: center; color: #ffe7a5; pointer-events: none; }
        .voucher-segment-label span { font-size: 24px; }
        .voucher-segment-label strong { max-width: 108px; font-size: clamp(11px, 2vw, 17px); line-height: 1.05; text-shadow: 0 2px 8px rgba(0,0,0,.7); }
        .voucher-segment-label small { font-size: 11px; color: #1a0900; font-weight: 900; }
        .voucher-wheel-center { position: absolute; inset: 50%; transform: translate(-50%,-50%); width: 110px; height: 110px; border-radius: 50%; display: grid; place-items: center; z-index: 2; color: #ffe7a5; font-family: var(--font-playfair), serif; font-size: 58px; font-weight: 950; border: 5px solid #f5d78c; background: radial-gradient(circle, #875515, #1b0c07 72%); box-shadow: 0 0 28px rgba(212,168,67,.45); }
        .voucher-spin-button { margin-top: 18px; min-height: 66px; width: min(100%, 460px); border: 1px solid #ffe7a5; border-radius: 18px; background: linear-gradient(180deg, #ffe7a5, #d4a843 48%, #9a6719); color: #14080a; font-size: clamp(24px, 4vw, 44px); font-weight: 950; letter-spacing: .04em; text-transform: uppercase; cursor: pointer; box-shadow: 0 12px 34px rgba(212,168,67,.28); }
        .voucher-spin-button:disabled { opacity: .68; cursor: wait; }
        .voucher-footer { grid-column: 1 / -1; margin: 0; text-align: center; color: rgba(255,255,255,.54); font-size: 13px; }
        .voucher-result { position: fixed; inset: 0; z-index: 9999; display: grid; place-items: center; padding: 18px; background: rgba(0,0,0,.74); }
        .voucher-result-card { position: relative; width: min(100%, 460px); border-radius: 16px; border: 1px solid rgba(212,168,67,.32); background: #0b070d; color: #f6efe0; padding: 26px; box-shadow: 0 28px 90px rgba(0,0,0,.72); }
        .voucher-result-card h3 { margin: 0; font-size: 32px; color: #ffe7a5; }
        .voucher-result-card p { color: rgba(255,255,255,.72); line-height: 1.55; }
        .voucher-identify, .voucher-saved, .voucher-pix { display: grid; gap: 10px; margin-top: 14px; }
        .voucher-identify input, .voucher-pix textarea { min-height: 44px; border-radius: 8px; border: 1px solid rgba(212,168,67,.22); background: #050506; color: #fff; padding: 0 12px; }
        .voucher-identify button, .voucher-saved button, .voucher-saved a, .voucher-secondary { min-height: 44px; border-radius: 8px; border: 0; background: #d4a843; color: #080704; font-weight: 950; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; cursor: pointer; }
        .voucher-identify a { color: #f5d78c; text-align: center; font-size: 13px; }
        .voucher-saved strong { font-family: monospace; color: #f5d78c; font-size: 18px; }
        .voucher-saved span { color: rgba(255,255,255,.68); }
        .voucher-pix img { width: 180px; height: 180px; background: #fff; padding: 8px; border-radius: 8px; }
        @media (max-width: 820px) {
          .voucher-modal { grid-template-columns: 1fr; padding: 22px; }
          .voucher-copy { text-align: center; }
          .voucher-copy p:not(.voucher-kicker) { margin-left: auto; margin-right: auto; }
          .voucher-muse { display: none; }
          .voucher-wheel-wrap { min-height: auto; padding-top: 52px; }
          .voucher-wheel { width: min(86vw, 430px); border-width: 12px; }
          .voucher-segment-label { padding-top: 44px; }
          .voucher-wheel-center { width: 82px; height: 82px; font-size: 44px; }
        }
      `}</style>
    </div>
  );
}

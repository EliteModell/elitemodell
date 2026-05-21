"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  BadgeCheck,
  Clock,
  FileText,
  Lock,
  ShieldCheck,
  XCircle,
} from "lucide-react";

const GOLD = "#d4a843";
const GOLD_GRADIENT = "linear-gradient(135deg, #ffe5a0 0%, #d4a843 22%, #f5d78c 50%, #9e7b2a 100%)";

type Status = "UNVERIFIED" | "PENDING_REVIEW" | "VERIFIED" | "REJECTED";

interface Props {
  status: Status;
  name: string | null;
  submittedAt: string | null;
  rejectionReason: string | null;
}

function firstName(name?: string | null) {
  return name?.split(" ").filter(Boolean)[0] ?? "você";
}

export default function VerificacaoClient({ status, name, submittedAt, rejectionReason }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [step, setStep] = useState<"info" | "consent" | "submitted">(
    status === "PENDING_REVIEW" ? "submitted" : "info"
  );

  async function handleStartVerification() {
    if (!agreed) {
      toast.error("Você precisa aceitar os termos para continuar.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/kyc/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consentGiven: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? "Erro ao iniciar verificação.");
      }
      const data = await res.json() as { url?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setStep("submitted");
      toast.success("Solicitação enviada! Aguarde a análise.");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar solicitação.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      {/* Gold line header card */}
      <div style={{
        background: "#0d0d0f",
        border: "1px solid rgba(212,168,67,0.28)",
        borderRadius: 16,
        padding: "40px 32px",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent 0%, #d4a843 30%, #f5d78c 50%, #d4a843 70%, transparent 100%)" }} />

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span style={{ fontWeight: 900, fontSize: 24, letterSpacing: "-0.5px" }}>
            <span style={{ background: GOLD_GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>elite</span>
            <span style={{ color: "#f1f5f9" }}>modell</span>
          </span>
        </div>

        {/* Status: PENDING */}
        {(step === "submitted" || status === "PENDING_REVIEW") && (
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "inline-grid", placeItems: "center", width: 64, height: 64, borderRadius: "50%", border: `1.5px solid ${GOLD}`, background: "rgba(212,168,67,0.08)", marginBottom: 20 }}>
              <Clock style={{ width: 28, height: 28, color: GOLD }} />
            </div>
            <h1 style={{ color: "#f1f5f9", fontSize: 22, fontWeight: 900, margin: "0 0 12px" }}>Verificação em análise</h1>
            <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.7, margin: "0 0 24px" }}>
              Olá, {firstName(name)}. Sua solicitação foi recebida e está sendo analisada pela nossa equipe.
              Você será notificado assim que a verificação for concluída.
            </p>
            {submittedAt && (
              <p style={{ color: "#475569", fontSize: 12 }}>
                Enviado em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short" }).format(new Date(submittedAt))}
              </p>
            )}
            <div style={{ marginTop: 28, padding: "14px 18px", background: "rgba(212,168,67,0.06)", border: "1px solid rgba(212,168,67,0.18)", borderRadius: 10, textAlign: "left" }}>
              <p style={{ color: "#d4a843", fontSize: 12, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10 }}>O que acontece agora?</p>
              {["Nossa equipe analisa os dados em até 48h.", "Você recebe um email com o resultado.", "Aprovado: acesso completo liberado."].map((txt) => (
                <p key={txt} style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.6, margin: "4px 0", display: "flex", gap: 8 }}>
                  <ShieldCheck style={{ width: 14, height: 14, color: GOLD, flexShrink: 0, marginTop: 2 }} />
                  {txt}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Status: REJECTED */}
        {status === "REJECTED" && step !== "submitted" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "inline-grid", placeItems: "center", width: 64, height: 64, borderRadius: "50%", border: "1.5px solid #cc1f2f", background: "rgba(204,31,47,0.08)", marginBottom: 20 }}>
              <XCircle style={{ width: 28, height: 28, color: "#cc1f2f" }} />
            </div>
            <h1 style={{ color: "#f1f5f9", fontSize: 22, fontWeight: 900, margin: "0 0 12px" }}>Verificação recusada</h1>
            <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.7, margin: "0 0 24px" }}>
              Sua verificação não foi aprovada.
              {rejectionReason ? ` Motivo: ${rejectionReason}` : " Entre em contato com o suporte para mais informações."}
            </p>
            <button
              onClick={() => setStep("info")}
              style={{ width: "100%", padding: "13px", background: GOLD, color: "#060e1b", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 800, cursor: "pointer" }}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Step: INFO */}
        {step === "info" && status !== "PENDING_REVIEW" && status !== "REJECTED" && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ display: "inline-grid", placeItems: "center", width: 64, height: 64, borderRadius: "50%", border: `1.5px solid ${GOLD}`, background: "rgba(212,168,67,0.08)", marginBottom: 20 }}>
                <BadgeCheck style={{ width: 28, height: 28, color: GOLD }} />
              </div>
              <h1 style={{ color: "#f1f5f9", fontSize: 22, fontWeight: 900, margin: "0 0 10px" }}>Confirme sua idade</h1>
              <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                Para manter a Elite Modell segura e em conformidade com a lei, precisamos confirmar que você é maior de 18 anos antes de liberar o acesso completo à plataforma.
              </p>
            </div>

            <div style={{ display: "grid", gap: 10, marginBottom: 28 }}>
              {[
                { icon: <Lock style={{ width: 16, height: 16, color: GOLD }} />, text: "Seus dados são protegidos por criptografia" },
                { icon: <FileText style={{ width: 16, height: 16, color: GOLD }} />, text: "Usados apenas para confirmar maioridade e identidade" },
                { icon: <ShieldCheck style={{ width: 16, height: 16, color: GOLD }} />, text: "Em conformidade com a LGPD" },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "rgba(212,168,67,0.05)", border: "1px solid rgba(212,168,67,0.12)", borderRadius: 8 }}>
                  {icon}
                  <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>{text}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep("consent")}
              style={{ width: "100%", padding: "13px", background: GOLD, color: "#060e1b", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 800, cursor: "pointer", marginBottom: 12 }}
            >
              Iniciar verificação
            </button>
            <Link href="/privacy" style={{ display: "block", textAlign: "center", color: "#475569", fontSize: 13, textDecoration: "none" }}>
              Ver política de privacidade →
            </Link>
          </div>
        )}

        {/* Step: CONSENT */}
        {step === "consent" && (
          <div>
            <h2 style={{ color: "#f1f5f9", fontSize: 20, fontWeight: 900, margin: "0 0 16px" }}>Consentimento de verificação</h2>
            <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
              Para verificar sua identidade e maioridade, a Elite Modell solicitará seus dados conforme descrito abaixo. Leia com atenção antes de continuar.
            </p>

            <div style={{ padding: "16px 18px", background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, marginBottom: 24, fontSize: 13, color: "#64748b", lineHeight: 1.7 }}>
              <p style={{ color: "#94a3b8", fontWeight: 700, marginBottom: 8 }}>Dados coletados para verificação:</p>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>Confirmação de maioridade (+18 anos)</li>
                <li>Aceitação dos Termos de Uso e Política de Privacidade</li>
                <li>Registro de data, hora e versão dos termos aceitos</li>
              </ul>
              <p style={{ marginTop: 12, color: "#475569" }}>
                Finalidade: confirmação de identidade, maioridade, segurança da plataforma e prevenção de fraudes.
                Estes dados são tratados conforme a <Link href="/privacy" style={{ color: GOLD }}>Política de Privacidade</Link> da Elite Modell.
              </p>
            </div>

            <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer", marginBottom: 28 }}>
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                style={{ marginTop: 3, accentColor: GOLD, width: 16, height: 16 }}
              />
              <span style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.6 }}>
                Li e compreendi as informações acima. Consinto com a coleta e uso dos meus dados para verificação de maioridade e identidade, conforme a Política de Privacidade e os <Link href="/terms" style={{ color: GOLD }}>Termos de Uso</Link> da Elite Modell.
              </span>
            </label>

            <button
              onClick={handleStartVerification}
              disabled={submitting || !agreed}
              style={{
                width: "100%", padding: "13px",
                background: agreed ? GOLD : "rgba(212,168,67,0.25)",
                color: "#060e1b", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 800,
                cursor: agreed ? "pointer" : "not-allowed", marginBottom: 12,
              }}
            >
              {submitting ? "Enviando..." : "Confirmar e solicitar verificação"}
            </button>
            <button
              onClick={() => setStep("info")}
              style={{ width: "100%", padding: "10px", background: "transparent", color: "#475569", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 14, cursor: "pointer" }}
            >
              Voltar
            </button>
          </div>
        )}
      </div>

      {/* Support link */}
      <p style={{ textAlign: "center", marginTop: 20, color: "#334155", fontSize: 13 }}>
        Dúvidas?{" "}
        <a href="mailto:suporte@elitemodell.com.br" style={{ color: GOLD, textDecoration: "none" }}>
          Falar com suporte
        </a>
      </p>
    </div>
  );
}

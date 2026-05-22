"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CircleHelp, FileCheck2, Loader, LockKeyhole, ShieldCheck } from "lucide-react";
import {
  clientAgeVerificationLabel,
  type ClientAgeVerificationStatus,
} from "@/lib/client-age-verification";

export default function VerificacaoIdadeClient({
  status: initialStatus,
  rejectionReason,
}: {
  status: ClientAgeVerificationStatus;
  rejectionReason?: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canStart = status === "not_started" || status === "rejected";

  async function handleStart() {
    if (!canStart || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/kyc/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consentGiven: true }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Não foi possível iniciar a verificação. Tente novamente ou contate o suporte.");
        return;
      }

      // Persona (ou outro provedor externo) retornou URL → redireciona
      if (data.url) {
        window.location.href = data.url;
        return;
      }

      // Sem provedor externo (fallback manual): atualiza localmente e recarrega
      setStatus("pending");
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function buttonLabel() {
    if (loading) return "Aguarde...";
    if (status === "pending") return "Verificação em análise";
    if (status === "verified") return "Verificação concluída";
    if (status === "rejected") return "Enviar novamente";
    return "Iniciar verificação";
  }

  return (
    <main className="client-page space-y-6">
      <div>
        <p className="client-kicker">18+ cliente</p>
        <h1 className="client-title mt-1">Verifique sua idade</h1>
        <p className="client-subtitle mt-3">
          Essa etapa protege sua conta e mantem a plataforma segura.
        </p>
      </div>

      <section className="client-panel overflow-hidden p-6">
        <div className="flex items-start gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-[8px] border border-[#d6a83a]/25 bg-[#d6a83a]/12 text-[#f5b83b]">
            <ShieldCheck className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <span className="inline-flex rounded-full border border-[#d6a83a]/25 bg-[#d6a83a]/10 px-3 py-1 text-[12px] font-black uppercase text-[#f5b83b]">
              {clientAgeVerificationLabel(status)}
            </span>
            <h2 className="mt-4 text-[25px] font-black leading-8 text-white">
              Confirmacao real de maioridade
            </h2>
            <p className="mt-3 text-[15px] leading-7 text-[#b8b8b8]">
              O aviso inicial 18+ apenas registra seu consentimento para navegar. Esta verificacao e separada e libera contatos, conteudos restritos e recursos privados do cliente.
            </p>
          </div>
        </div>

        {status === "rejected" && rejectionReason ? (
          <div className="mt-5 rounded-[18px] border border-[#ef4444]/25 bg-[#ef4444]/10 p-4 text-[14px] leading-6 text-[#fca5a5]">
            {rejectionReason}
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-[18px] border border-[#ef4444]/25 bg-[#ef4444]/10 p-4 text-[14px] leading-6 text-[#fca5a5]">
            {error}
          </div>
        ) : null}

        {status === "pending" ? (
          <div className="mt-6 rounded-[18px] border border-[#d6a83a]/20 bg-[#d6a83a]/8 p-5 text-center">
            <p className="text-[15px] font-black text-[#f5b83b]">Verificação em análise</p>
            <p className="mt-2 text-[13px] leading-6 text-[#b8b8b8]">
              Sua solicitação foi recebida. A equipe revisará e você será notificado quando o status for atualizado.
            </p>
          </div>
        ) : status === "verified" ? (
          <div className="mt-6 rounded-[18px] border border-[#22c55e]/20 bg-[#22c55e]/8 p-5 text-center">
            <p className="text-[15px] font-black text-[#4ade80]">Verificação concluída</p>
            <p className="mt-2 text-[13px] leading-6 text-[#b8b8b8]">
              Sua conta está verificada. Todos os recursos estão disponíveis.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleStart}
            disabled={loading}
            className="client-primary-button mt-6 flex min-h-[56px] w-full items-center justify-center gap-2 text-[15px] font-black disabled:opacity-60"
          >
            {loading ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <FileCheck2 className="h-4 w-4" />
            )}
            {buttonLabel()}
          </button>
        )}

        <p className="mt-3 text-center text-[12px] leading-5 text-[#b8b8b8]/72">
          Seus dados são protegidos e usados apenas para confirmar maioridade.
        </p>
      </section>

      <section className="client-card p-5">
        <div className="flex items-start gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[8px] border border-[#d6a83a]/20 bg-[#d6a83a]/10 text-[#f5b83b]">
            <LockKeyhole className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[21px] font-black text-white">Como funciona</h2>
            <p className="mt-3 text-[15px] leading-7 text-[#b8b8b8]">
              A analise confirma que sua conta pertence a uma pessoa maior de 18 anos. Enquanto estiver pendente, a navegacao publica continua disponivel e os recursos sensiveis permanecem bloqueados.
            </p>
          </div>
        </div>
      </section>

      <section className="client-card p-5">
        <div className="flex items-start gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[8px] border border-[#d6a83a]/20 bg-[#d6a83a]/10 text-[#f5b83b]">
            <CircleHelp className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[21px] font-black text-white">Precisa de ajuda?</h2>
            <p className="mt-3 text-[15px] leading-7 text-[#b8b8b8]">
              Fale com o suporte se tiver dificuldade no processo ou precisar revisar seu status.
            </p>
            <Link href="/dashboard/atendimento" className="client-secondary-button mt-5 flex min-h-[48px] items-center justify-center text-[14px] font-black no-underline">
              Abrir suporte
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

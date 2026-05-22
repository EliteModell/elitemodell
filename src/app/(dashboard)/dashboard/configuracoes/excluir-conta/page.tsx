"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { AlertTriangle, ChevronLeft } from "lucide-react";

export default function ExcluirContaPage() {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = confirmation === "EXCLUIR MINHA CONTA" && !loading;

  async function handleDelete() {
    if (!canSubmit) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/users/me/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Erro ao excluir conta.");
        return;
      }

      await signOut({ redirect: false });
      router.replace("/saida?reason=deleted");
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="client-page max-w-lg">
      <Link
        href="/dashboard/configuracoes"
        className="mb-6 inline-flex items-center gap-2 text-[13px] font-semibold text-[#f5f0e4]/54 no-underline transition-colors hover:text-[#f5f0e4]"
      >
        <ChevronLeft className="h-4 w-4" /> Voltar para configurações
      </Link>

      <div className="mb-7">
        <p className="client-kicker">LGPD</p>
        <h1 className="client-title mt-1">Excluir minha conta</h1>
        <p className="client-subtitle mt-2">
          Esta ação é permanente e não pode ser desfeita.
        </p>
      </div>

      {/* Aviso */}
      <div className="mb-6 flex gap-4 rounded-[12px] border border-red-500/20 bg-red-500/6 p-5">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
        <div>
          <p className="text-[15px] font-bold text-red-400">O que será removido</p>
          <ul className="mt-3 space-y-1.5 text-[13px] leading-relaxed text-[#f5f0e4]/70">
            <li>• Seus dados pessoais (nome, e-mail, telefone, documentos)</li>
            <li>• Foto de perfil e informações da conta</li>
            <li>• Sessões ativas em todos os dispositivos</li>
            <li>• Favoritos e notificações</li>
          </ul>
          <p className="mt-3 text-[12px] text-[#f5f0e4]/40">
            Registros financeiros e histórico de reservas são mantidos por 5 anos conforme exigência legal (LGPD Art. 16).
          </p>
        </div>
      </div>

      <div className="client-card p-6">
        <label className="block">
          <p className="mb-3 text-[14px] font-bold text-[#f5f0e4]">
            Para confirmar, digite:{" "}
            <span className="font-mono text-red-400">EXCLUIR MINHA CONTA</span>
          </p>
          <input
            type="text"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value.toUpperCase())}
            placeholder="EXCLUIR MINHA CONTA"
            className="w-full rounded-[10px] border border-white/10 bg-white/[0.04] px-4 py-3 font-mono text-[15px] text-[#f5f0e4] placeholder:text-white/20 focus:border-red-500/50 focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        {error && (
          <p className="mt-4 rounded-[8px] border border-red-500/20 bg-red-500/8 px-4 py-3 text-[13px] text-red-400">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={!canSubmit}
          className="mt-5 w-full rounded-[10px] border border-red-500/30 bg-red-500/12 py-3.5 text-[15px] font-bold text-red-400 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {loading ? "Excluindo conta..." : "Excluir minha conta permanentemente"}
        </button>

        <p className="mt-4 text-center text-[12px] text-[#f5f0e4]/28">
          Ao confirmar, seus dados serão anonimizados conforme a{" "}
          <Link href="/privacy" className="text-[#d4a843] no-underline">
            Política de Privacidade
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

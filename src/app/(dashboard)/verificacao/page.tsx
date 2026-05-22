import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Rota legada — redireciona para a tela canônica de verificação
export default function VerificacaoPage() {
  redirect("/dashboard/verificacao-idade");
}

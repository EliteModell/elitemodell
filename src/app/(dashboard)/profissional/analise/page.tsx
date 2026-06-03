import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuthenticatedAccount } from "@/lib/account-access";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

export const dynamic = "force-dynamic";

function statusCopy(status: string | null | undefined) {
  if (status === "REJECTED") {
    return {
      title: "Cadastro precisa de ajustes",
      body: "Nossa equipe revisou seu cadastro e encontrou uma pendencia. Veja o motivo abaixo e fale com o suporte para reenviar as informacoes.",
      tone: "danger" as const,
    };
  }

  return {
    title: "Cadastro enviado para analise",
    body: "Seu perfil sera revisado pela equipe em ate 3 dias uteis. Voce sera avisada quando for aprovado.",
    tone: "pending" as const,
  };
}

export default async function ProfessionalAnalysisPage() {
  const access = await requireAuthenticatedAccount();
  const professional = access.user.professional;

  if (!professional) redirect(ACCOUNT_ROUTES.onboardingAcompanhante);
  if (professional.status === "DRAFT") redirect(ACCOUNT_ROUTES.onboardingAcompanhante);
  if (professional.status === "ACTIVE" || professional.status === "PAUSED") redirect(ACCOUNT_ROUTES.dashboardAcompanhante);

  const copy = statusCopy(professional.status);

  return (
    <div className="mx-auto grid min-h-[calc(100dvh-80px)] w-full max-w-[560px] place-items-center px-4 py-10">
      <section className="w-full rounded-[8px] border border-[#d4a843]/25 bg-[#101010] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.34)] sm:p-8">
        <div className={`mx-auto grid h-16 w-16 place-items-center rounded-[8px] border text-2xl font-black ${copy.tone === "danger" ? "border-[#ef4444]/35 bg-[#ef4444]/10 text-[#ff9aa4]" : "border-[#d4a843]/35 bg-[#d4a843]/12 text-[#f5d78c]"}`}>
          {copy.tone === "danger" ? "!" : "..."}
        </div>

        <p className="mt-6 text-[11px] font-black uppercase tracking-[0.22em] text-[#d4a843]">Status profissional</p>
        <h1 className="mt-2 text-3xl font-black leading-tight text-white">{copy.title}</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-white/58">{copy.body}</p>

        {professional.rejectReason ? (
          <div className="mt-5 rounded-[8px] border border-[#ef4444]/25 bg-[#ef4444]/10 p-4 text-left text-sm leading-6 text-[#ffb4b4]">
            {professional.rejectReason}
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 rounded-[8px] border border-white/10 bg-white/[0.035] p-4 text-left">
          {[
            "KYC e biometria ajudam a validar identidade, mas nao publicam o perfil automaticamente.",
            "A aprovacao final e manual pela equipe Elite Modell.",
            "Enquanto estiver em analise, seu perfil nao aparece na busca publica.",
          ].map((item) => (
            <p key={item} className="flex gap-3 text-sm leading-6 text-white/60">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#d4a843]" />
              <span>{item}</span>
            </p>
          ))}
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-[8px] border border-white/10 px-4 text-sm font-black text-white/72 no-underline">
            Voltar ao inicio
          </Link>
          <Link href="mailto:suporte@elitemodell.com.br" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-[8px] bg-[#d4a843] px-4 text-sm font-black text-[#080704] no-underline">
            Falar com suporte
          </Link>
        </div>
      </section>
    </div>
  );
}

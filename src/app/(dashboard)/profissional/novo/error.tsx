"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

export default function ProfessionalOnboardingError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { flow: "professional-onboarding" } });
  }, [error]);

  return (
    <main className="onboarding-error">
      <div className="onboarding-error-card">
        <p className="eyebrow">Elite Modell</p>
        <h1>Não foi possível mostrar esta etapa</h1>
        <p>Seu rascunho salvo neste aparelho foi preservado. Tente carregar novamente; se o envio já tiver sido concluído, o sistema recuperará o status sem duplicar o cadastro.</p>
        <button type="button" onClick={unstable_retry}>Tentar novamente</button>
        <Link href="/conta">Voltar para minha conta</Link>
      </div>
      <style>{`
        .onboarding-error { min-height:100dvh; display:grid; place-items:center; padding:24px; background:radial-gradient(circle at 50% 20%,rgba(183,44,255,.14),transparent 38%),#faf8fc; color:#171219; }
        .onboarding-error-card { width:min(100%,430px); padding:28px; border:1px solid #d8c9df; border-radius:24px; background:#fff; text-align:center; box-shadow:0 24px 60px rgba(59,31,83,.12); }
        .onboarding-error .eyebrow { margin:0 0 10px; color:#7d179f; font-size:12px; font-weight:900; letter-spacing:2px; text-transform:uppercase; }
        .onboarding-error h1 { margin:0 0 12px; font-size:28px; line-height:1.12; }
        .onboarding-error p:not(.eyebrow) { margin:0 0 22px; color:#625c68; line-height:1.6; }
        .onboarding-error button, .onboarding-error a { display:block; width:100%; padding:15px 18px; border-radius:14px; font-weight:900; text-decoration:none; }
        .onboarding-error button { border:0; background:#7d179f; color:#fff; cursor:pointer; }
        .onboarding-error a { margin-top:10px; border:1px solid #d8c9df; color:#7d179f; background:#fff; }
      `}</style>
    </main>
  );
}

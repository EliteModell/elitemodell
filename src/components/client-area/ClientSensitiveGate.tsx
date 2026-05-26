"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useState } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { useSession } from "next-auth/react";
import { isClientAgeVerified } from "@/lib/client-age-verification";

const VERIFY_HREF = "/dashboard/verificacao-idade";

function VerificationRequiredModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[1200] grid place-items-center bg-black/78 px-4 py-6 backdrop-blur-xl" role="dialog" aria-modal="true" aria-labelledby="client-age-lock-title">
      <div className="w-full max-w-[420px] overflow-hidden rounded-[24px] border border-[#d6a83a]/25 bg-[#101014] shadow-[0_28px_90px_rgba(0,0,0,0.62)]">
        <div className="h-[2px] bg-[linear-gradient(90deg,transparent,#f5b83b,#d6a83a,transparent)]" />
        <div className="p-6 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-[18px] border border-[#d6a83a]/28 bg-[#d6a83a]/12 text-[#f5b83b]">
            <LockKeyhole className="h-7 w-7" />
          </div>
          <h2 id="client-age-lock-title" className="mt-5 text-[26px] font-black leading-tight text-white">
            Verificação necessária
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-[#b8b8b8]">
            Para continuar, você precisa confirmar sua idade. Essa etapa ajuda a manter a plataforma segura e adequada para maiores de 18 anos.
          </p>
          <div className="mt-6 grid gap-3">
            <Link href={VERIFY_HREF} className="client-primary-button flex min-h-[56px] items-center justify-center gap-2 text-[15px] font-black no-underline">
              <ShieldCheck className="h-4 w-4" />
              Verificar agora
            </Link>
            <button type="button" onClick={onClose} className="client-secondary-button min-h-[52px] text-[15px] font-black">
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ClientSensitiveAction({
  children,
  className,
  onAllowed,
  type = "button",
}: {
  children: React.ReactNode;
  className?: string;
  onAllowed?: () => void;
  type?: "button" | "submit";
}) {
  const { data: session } = useSession();
  const [blocked, setBlocked] = useState(false);
  const verified = isClientAgeVerified(session?.user?.clientStatus);

  return (
    <>
      <button
        type={type}
        className={className}
        onClick={(event) => {
          if (!verified) {
            event.preventDefault();
            setBlocked(true);
            return;
          }
          onAllowed?.();
        }}
      >
        {children}
      </button>
      {blocked && typeof document !== "undefined" ? createPortal(<VerificationRequiredModal onClose={() => setBlocked(false)} />, document.body) : null}
    </>
  );
}

export function ClientSensitiveGate({
  children,
  fallbackTitle = "Recurso privado",
}: {
  children: React.ReactNode;
  fallbackTitle?: string;
}) {
  const { data: session } = useSession();
  const verified = isClientAgeVerified(session?.user?.clientStatus);
  const [blocked, setBlocked] = useState(false);

  if (verified) return <>{children}</>;

  return (
    <>
      <div className="client-panel p-5">
        <div className="flex items-start gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[8px] border border-[#d6a83a]/25 bg-[#d6a83a]/12 text-[#f5b83b]">
            <LockKeyhole className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[22px] font-black leading-7 text-white">{fallbackTitle}</h2>
            <p className="mt-2 text-[15px] leading-7 text-[#b8b8b8]">
              Para acessar recursos privados, contatos e conteúdos restritos, confirme que você é maior de 18 anos.
            </p>
          </div>
        </div>
        <button type="button" onClick={() => setBlocked(true)} className="client-primary-button mt-6 w-full text-[15px] font-black">
          Verificar agora
        </button>
      </div>
      {blocked ? createPortal(<VerificationRequiredModal onClose={() => setBlocked(false)} />, document.body) : null}
    </>
  );
}

export { VERIFY_HREF as CLIENT_AGE_VERIFY_HREF };

"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

type Props = {
  open: boolean;
  actionLabel: string;
  returnTo: string;
  onClose: () => void;
};

export default function ActionAuthModal({ open, actionLabel, returnTo, onClose }: Props) {
  if (!open) return null;

  const loginHref = `${ACCOUNT_ROUTES.login}?returnUrl=${encodeURIComponent(returnTo)}`;
  const cadastroHref = `${ACCOUNT_ROUTES.cadastro}?tipo=cliente&returnUrl=${encodeURIComponent(returnTo)}`;

  return (
    <div className="fixed inset-0 z-[950] grid place-items-center bg-black/80 p-4 backdrop-blur-xl" role="dialog" aria-modal="true" aria-labelledby="action-auth-title">
      <section className="w-full max-w-md rounded-2xl border border-[#d4a843]/30 bg-[linear-gradient(180deg,#15120d,#070707)] p-6 text-[#f4f1ea] shadow-[0_32px_100px_rgba(0,0,0,.7)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="m-0 text-[11px] font-black uppercase tracking-[.18em] text-[#d4a843]">Continue de onde parou</p>
            <h2 id="action-auth-title" className="mt-3 text-2xl font-black">Crie sua conta gratuitamente para continuar.</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[.04] text-white">
            <X size={18} />
          </button>
        </div>
        <p className="mt-4 text-sm leading-6 text-white/60">
          Entre ou faça um cadastro rápido para {actionLabel}. Depois você volta automaticamente para esta mesma ação.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link href={loginHref} className="grid min-h-12 place-items-center rounded-xl bg-[#d4a843] px-4 text-sm font-black text-black no-underline">
            Entrar
          </Link>
          <Link href={cadastroHref} className="grid min-h-12 place-items-center rounded-xl border border-[#d4a843]/35 bg-[#d4a843]/[.07] px-4 text-sm font-black text-[#f5d78c] no-underline">
            Criar conta
          </Link>
        </div>
      </section>
    </div>
  );
}

"use client";
import Link from "next/link";
import { CheckCircle2, ChevronRight, Circle, ShieldCheck } from "lucide-react";

export type VerificationStep = {
  label: string;
  done: boolean;
  href?: string;
};

export default function VerificationSection({ steps }: { steps: VerificationStep[] }) {
  const doneCount = steps.filter((step) => step.done).length;
  const progress = Math.max(6, Math.round((doneCount / steps.length) * 100));

  return (
    <section className="client-page-tight">
      <Link href="/dashboard/perfil" className="client-card block p-4 no-underline">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] border border-[#d4a843]/18 bg-[#d4a843]/10 text-[#f5d78c]">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="min-w-0 flex-1 text-[16px] font-bold text-[#f5f0e4]">Verificacao</h2>
              <span className="rounded-full border border-[#d4a843]/18 bg-[#d4a843]/10 px-2 py-0.5 text-[11px] font-bold text-[#f5d78c]">
                {doneCount}/{steps.length}
              </span>
            </div>
            <p className="mt-1 text-[13px] leading-5 text-[#f5f0e4]/54">
              Complete dados essenciais para manter acesso e suporte mais seguros.
            </p>
          </div>
          <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-[#f5d78c]" />
        </div>

        <div className="mt-4 h-[4px] overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[#d4a843] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-4 space-y-2">
          {steps.map((step) => (
            <div key={step.label} className="flex items-center gap-2.5 text-[12px]">
              {step.done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#4d9b56]" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-[#f5f0e4]/28" />
              )}
              <span className={step.done ? "text-[#f5f0e4]/72" : "text-[#f5f0e4]/46"}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </Link>
    </section>
  );
}

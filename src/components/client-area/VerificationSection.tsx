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
    <section className="client-page-tight client-dashboard-section">
      <Link href="/dashboard/perfil" className="client-card block p-5 no-underline">
        <div className="flex items-start gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-[8px] border border-[#d4a843]/18 bg-[#d4a843]/10 text-[#f5d78c]">
            <ShieldCheck className="h-7 w-7" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="min-w-0 flex-1 text-[28px] font-black leading-8 text-[#f5f0e4]">Verificação</h2>
              <span className="rounded-full border border-[#d4a843]/18 bg-[#d4a843]/10 px-2.5 py-1 text-[14px] font-black text-[#f5d78c]">
                {doneCount}/{steps.length}
              </span>
            </div>
            <p className="mt-3 text-[17px] leading-8 text-[#f5f0e4]/58">
              Complete dados essenciais para manter acesso e suporte mais seguros.
            </p>
          </div>
          <ChevronRight className="mt-2 h-5 w-5 shrink-0 text-[#f5d78c]" />
        </div>

        <div className="mt-5 h-[6px] overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[#d4a843] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-5 space-y-3.5">
          {steps.map((step) => (
            <div key={step.label} className="flex items-center gap-3.5 text-[18px]">
              {step.done ? (
                <CheckCircle2 className="h-6 w-6 shrink-0 text-[#4d9b56]" />
              ) : (
                <Circle className="h-6 w-6 shrink-0 text-[#f5f0e4]/28" />
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

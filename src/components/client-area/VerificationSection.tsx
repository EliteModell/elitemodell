"use client";
import Link from "next/link";
import { CheckCircle2, ChevronRight, IdCard, Mail, Phone, ShieldCheck } from "lucide-react";

export type VerificationStep = {
  label: string;
  done: boolean;
  href?: string;
};

const icons = [Mail, Phone, IdCard];

export default function VerificationSection({ steps }: { steps: VerificationStep[] }) {
  const doneCount = steps.filter((step) => step.done).length;
  const progress = Math.max(6, Math.round((doneCount / steps.length) * 100));

  return (
    <section className="client-page-tight">
      <Link href="/dashboard/perfil" className="client-card block p-5 no-underline">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] border border-[#d4a843]/18 bg-[#d4a843]/10 text-[#f5d78c]">
            <ShieldCheck className="h-[22px] w-[22px]" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[18px] font-bold text-[#f5f0e4]">Verifique sua conta</h2>
            <p className="mt-1.5 text-[13px] leading-5 text-[#f5f0e4]/58">
              Aumente a confiança do seu perfil e proteja sua conta em minutos! Sua privacidade é muito importante para nós.{" "}
              <strong className="text-[#f5d78c]">Não compartilhamos seus dados.</strong>
            </p>
          </div>
          <ChevronRight className="mt-2 h-5 w-5 shrink-0 text-[#f5d78c]" />
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="relative h-[5px] overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#4d9b56,#d4a843,#f5d78c)] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
            <span className="absolute right-[8%] top-0 h-full border-r-2 border-dotted border-[#f5f0e4]/26" />
          </div>
        </div>

        {/* Steps */}
        <div className="mt-7 grid grid-cols-3 gap-3 text-center">
          {steps.map((step, index) => {
            const Icon = icons[index] ?? ShieldCheck;
            return (
              <div key={step.label} className="flex flex-col items-center gap-2">
                <span
                  className={`relative grid h-[48px] w-[48px] place-items-center rounded-[8px] border ${
                    step.done ? "border-[#d4a843]/34 bg-[#d4a843]/14" : "border-white/10 bg-white/[0.045]"
                  }`}
                >
                  <Icon
                    className={`h-[22px] w-[22px] ${step.done ? "text-[#f5d78c]" : "text-[#f5f0e4]/36"}`}
                  />
                  {step.done ? (
                    <CheckCircle2 className="absolute -bottom-1 -right-1 h-[18px] w-[18px] rounded-full bg-[#101214] text-[#4d9b56]" />
                  ) : null}
                </span>
                <p
                  className={`text-[11px] font-semibold leading-4 ${
                    step.done ? "text-[#f5f0e4]" : "text-[#f5f0e4]/48"
                  }`}
                >
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>
      </Link>
    </section>
  );
}

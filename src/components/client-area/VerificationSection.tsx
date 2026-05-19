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
    <section className="bg-white px-4 py-8">
      <Link href="/dashboard/perfil" className="block no-underline">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-[22px] w-[22px] shrink-0 text-[#5a6a71]" />
          <div className="min-w-0 flex-1">
            <h2 className="text-[18px] font-bold text-[#1f2a30]">Verifique sua conta</h2>
            <p className="mt-1.5 text-[13px] leading-5 text-[#566570]">
              Aumente a confiança do seu perfil e proteja sua conta em minutos! Sua privacidade é muito importante para nós.{" "}
              <strong className="text-[#1f2a30]">Não compartilhamos seus dados.</strong>
            </p>
          </div>
          <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-[#9aabaf]" />
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="relative h-[5px] overflow-hidden rounded-full bg-[#e4eaec]">
            <div
              className="h-full rounded-full bg-[#4d9b56] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
            <span className="absolute right-[8%] top-0 h-full border-r-2 border-dotted border-[#9aabaf]" />
          </div>
        </div>

        {/* Steps */}
        <div className="mt-7 grid grid-cols-3 gap-3 text-center">
          {steps.map((step, index) => {
            const Icon = icons[index] ?? ShieldCheck;
            return (
              <div key={step.label} className="flex flex-col items-center gap-2">
                <span
                  className={`relative grid h-[48px] w-[48px] place-items-center rounded-full ${
                    step.done ? "bg-[#edf7ef]" : "bg-[#f0f3f5]"
                  }`}
                >
                  <Icon
                    className={`h-[22px] w-[22px] ${step.done ? "text-[#4d9b56]" : "text-[#8fa0a8]"}`}
                  />
                  {step.done ? (
                    <CheckCircle2 className="absolute -bottom-1 -right-1 h-[18px] w-[18px] rounded-full bg-white text-[#4d9b56]" />
                  ) : null}
                </span>
                <p
                  className={`text-[11px] font-semibold leading-4 ${
                    step.done ? "text-[#1f2a30]" : "text-[#6a7a81]"
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

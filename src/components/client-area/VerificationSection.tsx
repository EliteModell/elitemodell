"use client";
import Link from "next/link";
import { CheckCircle2, IdCard, Mail, Phone, ShieldCheck } from "lucide-react";

export type VerificationStep = {
  label: string;
  done: boolean;
  href?: string;
};

const icons = [Mail, Phone, IdCard];

export default function VerificationSection({ steps }: { steps: VerificationStep[] }) {
  const doneCount = steps.filter((step) => step.done).length;
  const progress = Math.max(8, Math.round((doneCount / steps.length) * 100));

  return (
    <section className="bg-white px-5 py-10">
      <Link href="/dashboard/perfil" className="block text-[#1f2a30] no-underline">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 h-8 w-8 shrink-0 text-[#61737b]" />
          <div className="min-w-0 flex-1">
            <h2 className="text-[30px] font-black leading-tight text-[#1f2a30]">Verifique sua conta</h2>
            <p className="mt-4 max-w-[540px] text-[20px] leading-7 text-[#4c5960]">
              Aumente a confiança do seu perfil e proteja sua conta em poucos minutos.
              <strong className="block text-[#1f2a30]">Não compartilhamos seus dados.</strong>
            </p>
          </div>
        </div>

        <div className="mt-9">
          <div className="relative h-4 overflow-hidden rounded-full bg-[#e8eef0]">
            <div className="h-full rounded-full bg-[#4d9b56]" style={{ width: `${progress}%` }} />
            <span className="absolute left-[68%] top-0 h-full border-l-2 border-dotted border-[#1f2a30]" />
          </div>

          <div className="mt-9 grid grid-cols-3 gap-4 text-center">
            {steps.map((step, index) => {
              const Icon = icons[index] ?? ShieldCheck;
              return (
                <div key={step.label} className="flex flex-col items-center">
                  <span className={`relative grid h-14 w-14 place-items-center rounded-full ${step.done ? "bg-white" : "bg-[#edf2f4]"}`}>
                    <Icon className="h-8 w-8 text-[#11191d]" />
                    {step.done ? (
                      <CheckCircle2 className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-white text-[#4d9b56]" />
                    ) : null}
                  </span>
                  <p className="mt-4 text-[18px] font-black leading-5 tracking-[0.04em] text-[#1f2a30]">{step.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </Link>
    </section>
  );
}

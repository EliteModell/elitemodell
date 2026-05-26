"use client";

import Link from "next/link";
import { BadgeCheck, Clock3, ShieldAlert, ShieldCheck, XCircle } from "lucide-react";
import {
  clientAgeVerificationLabel,
  type ClientAgeVerificationStatus,
} from "@/lib/client-age-verification";
import { CLIENT_AGE_VERIFY_HREF } from "@/components/client-area/ClientSensitiveGate";

const statusStyles: Record<ClientAgeVerificationStatus, string> = {
  not_started: "border-[#d6a83a]/25 bg-[#d6a83a]/10 text-[#f5b83b]",
  pending: "border-[#f5b83b]/28 bg-[#f5b83b]/12 text-[#f5b83b]",
  verified: "border-[#4d9b56]/28 bg-[#4d9b56]/14 text-[#7ed58a]",
  rejected: "border-[#ef4444]/28 bg-[#ef4444]/12 text-[#fca5a5]",
};

function StatusIcon({ status }: { status: ClientAgeVerificationStatus }) {
  if (status === "verified") return <BadgeCheck className="h-4 w-4" />;
  if (status === "pending") return <Clock3 className="h-4 w-4" />;
  if (status === "rejected") return <XCircle className="h-4 w-4" />;
  return <ShieldAlert className="h-4 w-4" />;
}

export function AgeVerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#4d9b56]/28 bg-[#4d9b56]/14 px-3 py-1.5 text-[12px] font-black uppercase text-[#7ed58a]">
      <BadgeCheck className="h-4 w-4" />
      18+ verificado
    </span>
  );
}

export default function AgeVerificationCard({
  status,
  compact = false,
}: {
  status: ClientAgeVerificationStatus;
  compact?: boolean;
}) {
  if (status === "verified") {
    return (
      <section className="client-page-tight client-dashboard-section">
        <div className="client-card flex items-center justify-between gap-3 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] border border-[#4d9b56]/25 bg-[#4d9b56]/12 text-[#7ed58a]">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-black text-white">Idade verificada</p>
              <p className="text-[13px] text-[#b8b8b8]">Recursos privados liberados.</p>
            </div>
          </div>
          <AgeVerifiedBadge />
        </div>
      </section>
    );
  }

  return (
    <section className="client-page-tight client-dashboard-section">
      <div className="client-panel overflow-hidden p-5">
        <div className="flex items-start gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-[8px] border border-[#d6a83a]/25 bg-[#d6a83a]/12 text-[#f5b83b]">
            <ShieldCheck className="h-7 w-7" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[24px] font-black leading-7 text-white">Verifique sua idade</h2>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black uppercase ${statusStyles[status]}`}>
                <StatusIcon status={status} />
                {clientAgeVerificationLabel(status)}
              </span>
            </div>
            <p className="mt-3 text-[15px] leading-7 text-[#b8b8b8]">
              Para acessar recursos privados, contatos e conteúdos restritos, confirme que você é maior de 18 anos.
            </p>
          </div>
        </div>
        <Link href={CLIENT_AGE_VERIFY_HREF} className="client-primary-button mt-6 flex min-h-[54px] items-center justify-center text-[15px] font-black no-underline">
          Verificar agora
        </Link>
        {!compact ? (
          <p className="mt-3 text-center text-[12px] leading-5 text-[#b8b8b8]/70">
            O aceite do aviso inicial 18+ não substitui esta verificação.
          </p>
        ) : null}
      </div>
    </section>
  );
}

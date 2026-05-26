"use client";

import { CheckCircle2, Clock, EyeOff, PauseCircle, ShieldAlert } from "lucide-react";
import type React from "react";

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  ACTIVE: {
    label: "Ativo",
    className: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  PAUSED: {
    label: "Pausado",
    className: "border-amber-300/30 bg-amber-300/10 text-amber-100",
    icon: <PauseCircle className="h-3.5 w-3.5" />,
  },
  PENDING_REVIEW: {
    label: "Em análise",
    className: "border-[#d4a843]/30 bg-[#d4a843]/10 text-[#f5d78c]",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  DRAFT: {
    label: "Oculto",
    className: "border-white/15 bg-white/[0.06] text-white/65",
    icon: <EyeOff className="h-3.5 w-3.5" />,
  },
  SUSPENDED: {
    label: "Suspenso",
    className: "border-red-400/30 bg-red-400/10 text-red-200",
    icon: <ShieldAlert className="h-3.5 w-3.5" />,
  },
  REJECTED: {
    label: "Reprovado",
    className: "border-red-400/30 bg-red-400/10 text-red-200",
    icon: <ShieldAlert className="h-3.5 w-3.5" />,
  },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? statusConfig.PENDING_REVIEW;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${config.className}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

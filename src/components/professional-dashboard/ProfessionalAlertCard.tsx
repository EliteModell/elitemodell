"use client";

import { useState } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, Clock, FileCheck, ImageOff, MapPin, PhoneOff, ShieldAlert, Sparkles, UserRound, X } from "lucide-react";
import Link from "next/link";

export type ProfessionalAlertIcon = "alert" | "calendar" | "check" | "clock" | "file" | "image" | "map" | "phone" | "shield" | "sparkles" | "user";

export type ProfessionalAlert = {
  id: string;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  tone: "gold" | "danger" | "success" | "neutral";
  dismissible?: boolean;
  icon: ProfessionalAlertIcon;
};

const toneClass = {
  gold: "border-[#d4a843]/35 bg-[#d4a843]/10 text-[#f5d78c]",
  danger: "border-red-400/30 bg-red-400/10 text-red-100",
  success: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
  neutral: "border-white/12 bg-white/[0.045] text-white/72",
};

const iconMap = {
  alert: AlertTriangle,
  calendar: CalendarDays,
  check: CheckCircle2,
  clock: Clock,
  file: FileCheck,
  image: ImageOff,
  map: MapPin,
  phone: PhoneOff,
  shield: ShieldAlert,
  sparkles: Sparkles,
  user: UserRound,
};

export function ProfessionalAlertStack({ alerts }: { alerts: ProfessionalAlert[] }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const visible = alerts.filter((alert) => !hidden.has(alert.id));

  if (visible.length === 0) return null;

  return (
    <section className="grid gap-3">
      {visible.map((alert) => {
        const Icon = iconMap[alert.icon];
        return (
          <div key={alert.id} className={`relative overflow-hidden rounded-[8px] border p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)] ${toneClass[alert.tone]}`}>
            <div className="flex gap-3 pr-8">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] border border-current/20 bg-black/22">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-black text-white">{alert.title}</h2>
                <p className="mt-1 text-sm leading-6 text-white/62">{alert.description}</p>
                <Link
                  href={alert.href}
                  className="mt-3 inline-flex min-h-10 items-center justify-center rounded-[8px] bg-[#d4a843] px-4 text-sm font-black text-[#080704] no-underline transition hover:bg-[#f5d78c]"
                >
                  {alert.actionLabel}
                </Link>
              </div>
            </div>
            {alert.dismissible ? (
              <button
                type="button"
                onClick={() => setHidden((current) => new Set(current).add(alert.id))}
                className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-[8px] border border-white/10 bg-black/20 text-white/55 transition hover:text-white"
                aria-label="Fechar alerta"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}

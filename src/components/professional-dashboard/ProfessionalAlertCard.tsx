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
  gold: "border-[#d4a843]/30 bg-[linear-gradient(135deg,rgba(212,168,67,0.13),rgba(255,255,255,0.035))] text-[#f5d78c]",
  danger: "border-red-400/28 bg-[linear-gradient(135deg,rgba(248,113,113,0.13),rgba(255,255,255,0.03))] text-red-100",
  success: "border-emerald-400/25 bg-[linear-gradient(135deg,rgba(16,185,129,0.13),rgba(255,255,255,0.03))] text-emerald-100",
  neutral: "border-white/12 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] text-white/72",
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
    <section className="grid gap-4">
      {visible.map((alert) => {
        const Icon = iconMap[alert.icon];
        return (
          <div key={alert.id} className={`relative overflow-hidden rounded-[18px] border p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)] sm:p-5 ${toneClass[alert.tone]}`}>
            <div className="flex gap-3 pr-8 sm:gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border border-current/20 bg-black/24">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-black leading-5 text-white">{alert.title}</h2>
                <p className="mt-1.5 text-sm leading-6 text-white/64">{alert.description}</p>
                <Link
                  href={alert.href}
                  className="professional-primary-action mt-4 inline-flex min-h-11 w-full max-w-[260px] items-center justify-center rounded-[12px] bg-[#d4a843] px-5 py-2.5 text-center text-sm font-black leading-5 text-[#080704] no-underline shadow-[0_14px_34px_rgba(212,168,67,0.20)] transition hover:bg-[#f5d78c] sm:w-auto"
                >
                  {alert.actionLabel}
                </Link>
              </div>
            </div>
            {alert.dismissible ? (
              <button
                type="button"
                onClick={() => setHidden((current) => new Set(current).add(alert.id))}
                className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-[12px] border border-white/10 bg-black/20 text-white/55 transition hover:text-white"
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

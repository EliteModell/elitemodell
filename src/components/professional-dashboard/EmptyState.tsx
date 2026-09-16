"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-[8px] border border-dashed border-[#ca4651]/25 bg-black/20 p-6 text-center">
      <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-[8px] border border-[#ca4651]/22 bg-[#ca4651]/10 text-[#f2c8cc]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-black text-white">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-white/52">{description}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="professional-primary-action mt-4 inline-flex min-h-10 items-center justify-center rounded-[8px] bg-[#ca4651] px-4 text-sm font-black text-[#080704] no-underline transition hover:bg-[#f2c8cc]"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

export function VerificationRefresh({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => {
      if (document.visibilityState === "visible" && !pending) startTransition(() => router.refresh());
    };
    const timer = window.setInterval(refresh, 15_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [enabled, pending, router]);
  return null;
}

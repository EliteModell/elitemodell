"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Analytics = dynamic(() => import("@vercel/analytics/next").then((module) => module.Analytics), {
  ssr: false,
});
const SpeedInsights = dynamic(
  () => import("@vercel/speed-insights/next").then((module) => module.SpeedInsights),
  { ssr: false },
);

function hasAnalyticsConsent() {
  try {
    const stored = JSON.parse(localStorage.getItem("elite_cookie_preferences") ?? "null") as {
      analytics?: boolean;
    } | null;
    return stored?.analytics === true;
  } catch {
    return false;
  }
}

export default function ConsentAnalytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const hydrateTimer = window.setTimeout(() => setEnabled(hasAnalyticsConsent()), 0);

    const updateConsent = (event: Event) => {
      const detail = (event as CustomEvent<{ choices?: { analytics?: boolean } }>).detail;
      setEnabled(detail?.choices?.analytics === true);
    };
    window.addEventListener("elite-cookie-consent", updateConsent);
    return () => {
      window.clearTimeout(hydrateTimer);
      window.removeEventListener("elite-cookie-consent", updateConsent);
    };
  }, []);

  if (!enabled) return null;
  return <><Analytics /><SpeedInsights /></>;
}

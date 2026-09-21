type SentryClient = typeof import("@sentry/nextjs");
type NavigationType = "push" | "replace" | "traverse";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
let sentryClientPromise: Promise<SentryClient> | null = null;

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

function loadSentryClient() {
  if (!SENTRY_DSN || !hasAnalyticsConsent()) return Promise.resolve(null);

  sentryClientPromise ??= import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn: SENTRY_DSN,
      enabled: true,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
      ignoreErrors: [
        "AbortError",
        "NetworkError",
        "Failed to fetch",
        "Load failed",
        "ResizeObserver loop limit exceeded",
        "ChunkLoadError",
      ],
    });
    return Sentry;
  });

  return sentryClientPromise;
}

if (hasAnalyticsConsent()) void loadSentryClient();

window.addEventListener("elite-cookie-consent", (event) => {
  const detail = (event as CustomEvent<{ choices?: { analytics?: boolean } }>).detail;
  if (detail?.choices?.analytics) void loadSentryClient();
});

export function onRouterTransitionStart(url: string, navigationType: NavigationType) {
  void loadSentryClient().then((Sentry) => {
    Sentry?.captureRouterTransitionStart(url, navigationType);
  });
}

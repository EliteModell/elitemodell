import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
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

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Captura apenas 10% das transações em produção para não estourar a cota
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Não envia nada em dev local se DSN não estiver configurado
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),

  // Ignora erros de rede/cancelamentos do usuário — não são bugs
  ignoreErrors: [
    "AbortError",
    "NetworkError",
    "Failed to fetch",
    "Load failed",
    "ResizeObserver loop limit exceeded",
    "ChunkLoadError",
  ],
});

import * as Sentry from "@sentry/nextjs";

function scrubSensitiveRequestData(event: Sentry.ErrorEvent) {
  if (event.request?.cookies) {
    event.request.cookies = {};
  }
  if (event.request?.headers) {
    delete event.request.headers.authorization;
    delete event.request.headers.cookie;
  }
  return event;
}

export async function register() {
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

  Sentry.init({
    dsn,
    enabled: Boolean(dsn),
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
    beforeSend: scrubSensitiveRequestData,
  });
}

export const onRequestError = Sentry.captureRequestError;

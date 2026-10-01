import * as Sentry from "@sentry/nextjs";

function scrubSensitiveRequestData(event: Sentry.ErrorEvent) {
  event.user = undefined;
  if (event.request?.cookies) {
    event.request.cookies = {};
  }
  if (event.request?.headers) {
    delete event.request.headers.authorization;
    delete event.request.headers.cookie;
  }
  if (event.request) {
    event.request.data = undefined;
    event.request.query_string = undefined;
    if (event.request.url) {
      try {
        const url = new URL(event.request.url);
        url.search = "";
        event.request.url = url.toString();
      } catch {
        event.request.url = event.request.url.split("?")[0];
      }
    }
  }
  event.extra = undefined;
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
    beforeBreadcrumb(breadcrumb) {
      // Objetos de console podem conter e-mail, telefone, caminhos privados ou
      // metadados de mídia adulta. Métricas devem usar campos explicitamente seguros.
      return breadcrumb.category === "console" ? null : breadcrumb;
    },
  });
}

export const onRequestError = Sentry.captureRequestError;

import * as Sentry from "@sentry/nextjs";

// Server-side (SSR/route handlers) error tracking — same rationale and
// redaction as sentry.client.config.ts. See that file's comments.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
      }
      delete event.extra;
      return event;
    },
  });
}

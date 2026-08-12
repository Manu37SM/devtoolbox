import * as Sentry from "@sentry/nextjs";

// Edge runtime (middleware, if any edge routes are added later) — same
// rationale and redaction as sentry.client.config.ts.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0,
    sendDefaultPii: false,
  });
}

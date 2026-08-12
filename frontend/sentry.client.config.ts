import * as Sentry from "@sentry/nextjs";

// Client-side error tracking (AUDIT_REPORT.md §24). Deliberately minimal:
//
// - No Session Replay integration. Replay records a video-like reconstruction
//   of the DOM, and this app's entire product surface is "paste your data
//   into a tool" — a replay would routinely capture exactly the tool
//   input/output content CLAUDE.md rule 8 says must never reach an error
//   report. Not worth the tradeoff for a dev-tools product.
// - `sendDefaultPii: false` — don't attach IP/cookies automatically.
// - `beforeSend` strips `request.data`/`extra` as defense-in-depth on top
//   of not instrumenting anything that would populate them in the first
//   place.
// - No-op if NEXT_PUBLIC_SENTRY_DSN isn't set (same optional-integration
//   treatment as every other key in .env.example).
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request) {
        delete event.request.data;
      }
      delete event.extra;
      return event;
    },
  });
}

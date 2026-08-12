// Next.js App Router convention file — `register()` runs once per runtime
// on server start, and is how @sentry/nextjs' server/edge init actually
// gets loaded (the sentry.server.config.ts/sentry.edge.config.ts files
// alongside next.config.mjs hold the actual `Sentry.init` calls; this file
// just routes to the right one per runtime). Client-side init
// (sentry.client.config.ts) is picked up automatically by `withSentryConfig`
// in next.config.mjs and doesn't need to be imported here. See
// AUDIT_REPORT.md §24.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import * as Sentry from "@sentry/node";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";

// Checklist item #31 — explicit request body size limit, rather than
// relying on body-parser's undocumented-here default. No route in this API
// legitimately needs a large body (the largest, plugin WASM upload, is
// base64 and already capped at ~2MB decoded in PluginsService — see
// prisma/schema.prisma's PluginVersion doc comment); 5mb leaves headroom
// for that base64 inflation (~2.7MB) plus JSON overhead without leaving the
// limit effectively unbounded.
const MAX_REQUEST_BODY_SIZE = "5mb";

/**
 * Backend entry point. See ARCHITECTURE.md §8.3 for module boundaries and
 * DEVELOPMENT_GUIDE.md §3 for the full folder structure.
 */

// Initialized before the Nest app so early boot failures are still
// captured. No `Sentry.expressIntegration()`/request auto-instrumentation
// enabled — those automatically attach request bodies/cookies to events,
// which for this codebase's tool endpoints could mean arbitrary user tool
// content ending up in Sentry (CLAUDE.md rule 8). GlobalExceptionFilter
// below reports exceptions manually instead, with an explicit, minimal set
// of fields. No-op (never calls `Sentry.init`) if SENTRY_DSN isn't set —
// same "degrade, don't fail boot" treatment as every other optional
// integration in this codebase.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: 0,
    // Defense-in-depth on top of GlobalExceptionFilter's manual, minimal
    // capture: strip anything that could carry request/response bodies
    // even if a future change accidentally starts passing more context.
    beforeSend(event) {
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
      }
      return event;
    },
  });
}

async function bootstrap() {
  // `rawBody: true` preserves the exact request bytes on `req.rawBody`
  // alongside Nest's normal JSON body parsing (every other route is
  // unaffected) — POST /billing/webhook needs those exact bytes to verify
  // Razorpay's signature (API.md §9); parsed-then-reserialized JSON wouldn't
  // byte-match what Razorpay signed. See BillingController.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  app.useBodyParser("json", { limit: MAX_REQUEST_BODY_SIZE });
  app.useBodyParser("urlencoded", { limit: MAX_REQUEST_BODY_SIZE, extended: true });

  app.use(helmet());
  app.use(cookieParser());
  // Explicit single-origin allowlist, not `origin: true` — reflecting the
  // request origin with credentials:true would let any site read
  // cookie-authenticated responses (see ARCHITECTURE.md §9 CSRF note; the
  // refresh-token cookie is sameSite=strict as defense-in-depth on top of
  // this, not instead of it).
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    credentials: true,
  });
  app.setGlobalPrefix("v1");
  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`DevToolbox API listening on :${port}`);
}

bootstrap();

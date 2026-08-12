import { Module } from "@nestjs/common";
import { ConfigModule as NestConfigModule } from "@nestjs/config";
import { z } from "zod";

// Fail-fast env validation per DEVELOPMENT_GUIDE.md §9 — the process
// refuses to boot with a missing/malformed required variable instead of
// failing later at first use.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  // AES-256-GCM key (32 raw bytes, base64-encoded) for encrypting
  // HistoryEntry previews at rest per DATABASE.md §4. Required once Sync
  // (Phase 3) is live, not just Auth — validated here so it fails fast
  // rather than at first history write.
  HISTORY_ENCRYPTION_KEY: z.string().min(32),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  // Org SSO (AUDIT_REPORT.md §23): this backend's own externally-reachable
  // origin, needed for the SAML ACS (assertion consumer service) callback
  // URL — SAML's IdP-initiated POST target must be an absolute URL the IdP
  // dashboard is configured with ahead of time, unlike OIDC/OAuth's
  // redirect_uri which the frontend already supplies per-request.
  BACKEND_URL: z.string().url().default("http://localhost:4000"),
  // AI Gateway: optional in dev — AiGatewayService returns a clear 503
  // ("AI features aren't configured") from any endpoint that actually needs
  // to call the model, rather than failing boot; the deterministic-first
  // half of /ai/json-repair still works with no key at all. Model names are
  // env-configurable rather than hardcoded so a future Anthropic model
  // rename/deprecation is a config change, not a code change.
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_MODEL_HAIKU: z.string().default("claude-haiku-4-5"),
  AI_MODEL_SONNET: z.string().default("claude-sonnet-4-5"),
  // OAuth: optional in dev — Auth module checks these at call time and
  // returns a clear error if a provider is used without its creds set,
  // rather than failing boot (email/password auth must keep working
  // without any OAuth app registered).
  GITHUB_OAUTH_CLIENT_ID: z.string().optional(),
  GITHUB_OAUTH_CLIENT_SECRET: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  // Email: optional in dev — EmailService falls back to logging the
  // link to the console when unset, same "degrade, don't fail boot"
  // treatment as the OAuth pairs above.
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  // Billing: optional in dev — BillingService returns a clear 503 from any
  // route that actually needs Razorpay, same "degrade, don't fail boot"
  // treatment as the other optional-integration keys above. Plan IDs (not
  // rupee amounts) so pricing changes are a Razorpay-dashboard + env change,
  // never a code change. Migrated off Stripe — see AUDIT_REPORT.md §20
  // (Stripe doesn't support billing for this business from India).
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_PLAN_ID_PRO: z.string().optional(),
  RAZORPAY_PLAN_ID_TEAM: z.string().optional(),
  // Org SSO (AUDIT_REPORT.md §23): AES-256-GCM master key for encrypting
  // SsoConnection.oidcClientSecretEnc at rest, same shape as
  // HISTORY_ENCRYPTION_KEY but a distinct key so the two blast radii don't
  // overlap. Optional in dev like the other integration keys above — SsoService
  // returns a clear 503 from any route that needs it rather than failing boot,
  // so an org with no SSO connection configured is entirely unaffected.
  SSO_SECRET_ENCRYPTION_KEY: z.string().min(32).optional(),
  // Error tracking (AUDIT_REPORT.md §24) — optional in dev, same
  // degrade-don't-fail-boot treatment as every other integration key above.
  // GlobalExceptionFilter only ever sends the exception + route/status
  // metadata to Sentry, never the request body — CLAUDE.md rule 8 ("no
  // tool input/output content in ... error reports").
  SENTRY_DSN: z.string().optional(),
});

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => envSchema.parse(config),
      // @nestjs/config's default `.env` lookup is relative to
      // `process.cwd()` — for a monorepo, that's `backend/` when this app
      // is started via `npm run dev`/`turbo run dev` (each workspace's dev
      // script runs with its own directory as cwd), NOT the repo root. This
      // project ships a single root `.env.example`/`.env` (DEVELOPMENT_GUIDE.md
      // §2's `cp .env.example .env`), so without this, the backend silently
      // sees none of those variables when run the documented way — it
      // either fails Zod validation on required vars (DATABASE_URL, JWT
      // secrets, etc.) or, if those happen to be set some other way,
      // FRONTEND_URL/BACKEND_URL/etc. quietly fall back to their
      // `localhost` defaults instead of the real configured values. Listing
      // both paths covers every way this app is actually started: `../.env`
      // for the documented root-cwd workflow above, `.env` as a fallback
      // for anyone running `nest start` directly from inside `backend/`
      // with their own `backend/.env`. Neither file exists in a real
      // deploy (Render/Vercel inject env vars directly into the process,
      // no `.env` file on disk) — @nestjs/config silently ignores missing
      // paths, so this is a no-op there, not a hard dependency on the file
      // existing.
      envFilePath: ["../.env", ".env"],
    }),
  ],
})
export class ConfigModule {}

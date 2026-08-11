# DATABASE.md

Database design for DevToolbox's backend services (auth, sync, sharing, analytics). The vast majority of tool usage never touches this database — it exists only to support optional accounts, cross-device sync, sharing, and aggregate analytics.

- **Engine:** PostgreSQL 16+
- **ORM:** Prisma (schema-first, typed client shared into the NestJS backend)
- **Migrations:** Prisma Migrate, one migration per PR that changes schema, reviewed like code

## 1. Design Principles

1. Store the minimum necessary. Tool input/output content is only ever persisted when the user explicitly shares or saves it (a snippet, a pipeline, a share link) — never as a side effect of simply using a tool.
2. Every user-owned table carries `userId` and is queried through service-layer ownership checks, never trusted from client-supplied IDs alone.
3. Soft-delete for user-facing content the user might want to recover (`deletedAt` nullable), hard-delete for expired/ephemeral content (share links past expiry) via scheduled job.
4. All timestamps UTC, `createdAt`/`updatedAt` on every table.
5. UUIDv7 (time-ordered) primary keys for all tables — good index locality plus no sequential-ID enumeration risk.

## 2. Entity-Relationship Overview

```text
User ──1:N── Session (refresh tokens)
User ──1:N── Snippet
User ──1:N── Pipeline ──1:N── PipelineStep
User ──1:N── ShareLink
User ──1:N── Favorite
User ──1:N── HistoryEntry (only if sync enabled; otherwise local IndexedDB only)
User ──N:1── Organization (nullable; Phase 4 team workspaces — ✅ shipped, API.md §17)
Organization ──1:N── OrganizationMember (join: User × Organization, role)
Organization ──1:N── Snippet, Pipeline (nullable organizationId; org-shared, additive to userId ownership)
User ──1:N── AiUsageEvent (aggregate counters, not payload content)
User ──1:N── ApiKey (Phase 4 public API/CLI access)
User ──1:1── Subscription (Phase 4 billing; nullable — free users have none)
User ──1:N── Plugin (as author) ──1:N── PluginVersion (Phase 4 plugin marketplace — ✅ shipped v1, API.md §18)
ShareLink ──N:1── Tool (by slug, not FK — tool registry lives in code, not DB)
```

## 3. Schema (Prisma-style definitions)

```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String?   // null if OAuth-only account
  displayName   String?
  avatarUrl     String?
  plan          Plan      @default(FREE)
  emailVerified Boolean   @default(false)
  // Phase 4 plugin marketplace (API.md §18) — first real implementation of
  // the "admin" concept API.md §14's Admin routes already assumed existed.
  isAdmin       Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?

  sessions      Session[]
  snippets      Snippet[]
  pipelines     Pipeline[]
  shareLinks    ShareLink[]
  favorites     Favorite[]
  historyEntries HistoryEntry[]
  aiUsageEvents AiUsageEvent[]
  oauthAccounts OAuthAccount[]
  memberships   OrganizationMember[]
  plugins       Plugin[]

  @@index([email])
}

enum Plan {
  FREE
  PRO
  TEAM
}

model OAuthAccount {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  provider        String   // "github" | "google"
  providerUserId  String
  createdAt       DateTime @default(now())

  @@unique([provider, providerUserId])
  @@index([userId])
}

model Session {
  id               String   @id @default(uuid())
  userId           String
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  refreshTokenHash String   @unique   // hashed, never store raw token
  userAgent        String?
  ipHash           String?            // hashed for abuse detection, not raw IP
  revokedAt        DateTime?
  expiresAt        DateTime
  createdAt        DateTime @default(now())

  @@index([userId])
}

model Favorite {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  toolSlug  String
  createdAt DateTime @default(now())

  @@unique([userId, toolSlug])
  @@index([userId])
}

model HistoryEntry {
  id         String   @id @default(uuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  toolSlug   String
  // Encrypted at rest (app-layer AES-GCM, key derived per-user) since this
  // is the one table that *can* contain arbitrary user tool input if sync
  // is enabled. Size-capped (see NFR) and user-purgeable at any time.
  inputPreview  String?  @db.Text
  outputPreview String?  @db.Text
  createdAt  DateTime @default(now())

  @@index([userId, toolSlug, createdAt])
}

model Snippet {
  id             String   @id @default(uuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  // Phase 4 team workspaces (API.md §17): when set, any member of this org
  // can view/duplicate the snippet; only the creator or an org OWNER/ADMIN
  // can edit/delete it. Ownership check in the service layer, same pattern
  // as every other userId-scoped table (Design Principle 2) — this is an
  // additive visibility grant, not a replacement for it.
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: SetNull)
  toolSlug    String
  title       String
  content     String   @db.Text
  isPublic    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  @@index([userId])
  @@index([organizationId])
}

model Pipeline {
  id             String         @id @default(uuid())
  userId         String
  user           User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  organizationId String?        // same org-shared-visibility model as Snippet.organizationId above
  organization   Organization?  @relation(fields: [organizationId], references: [id], onDelete: SetNull)
  name        String
  description String?
  isPublic    Boolean        @default(false)
  steps       PipelineStep[]
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  deletedAt   DateTime?

  @@index([userId])
  @@index([organizationId])
}

model PipelineStep {
  id          String   @id @default(uuid())
  pipelineId  String
  pipeline    Pipeline @relation(fields: [pipelineId], references: [id], onDelete: Cascade)
  order       Int
  toolSlug    String
  optionsJson Json     // tool-specific options for this step

  @@index([pipelineId, order])
}

model ShareLink {
  id           String    @id @default(uuid())
  slug         String    @unique  // short, unguessable (nanoid, 12+ chars)
  userId       String?             // nullable: anonymous shares allowed
  user         User?     @relation(fields: [userId], references: [id], onDelete: SetNull)
  toolSlug     String
  payload      Json                // input/options/output snapshot, size-capped
  objectStorageKey String?         // for large binary payloads (images), stored in S3-compatible storage instead
  viewCount    Int       @default(0)
  expiresAt    DateTime?           // null = default 30-day expiry enforced at creation
  createdAt    DateTime  @default(now())

  @@index([slug])
  @@index([expiresAt])
}

model AiUsageEvent {
  id         String   @id @default(uuid())
  userId     String?
  user       User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  toolSlug   String
  model      String   // e.g. "claude-haiku-4-5", "claude-sonnet-5"
  inputTokens  Int
  outputTokens Int
  latencyMs    Int
  createdAt  DateTime @default(now())

  @@index([userId, createdAt])
}

// Activated Phase 4 (API.md §17) — these two tables existed as unused
// planning-phase scaffolding before this pass. `Organization.plan` is
// **not** authoritative and not read by any plan check; kept only as a
// display label. The actual gate is `resolveEffectivePlan()`
// (backend/src/common/plan/effective-plan.ts): a member's effective plan is
// TEAM whenever they belong to an org whose OWNER has `User.plan === TEAM`.
// There is no separate org-level Stripe subscription in this pass — an org
// "goes TEAM" purely because its owner personally subscribed via the
// existing billing flow (§9/AUDIT_REPORT.md §15). This keeps billing a
// single well-tested code path instead of adding a second one for orgs.
model Organization {
  id        String   @id @default(uuid())
  name      String
  plan      Plan     @default(TEAM)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  members   OrganizationMember[]
  snippets  Snippet[]
  pipelines Pipeline[]
}

model OrganizationMember {
  id             String       @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  role           OrgRole      @default(MEMBER)
  joinedAt       DateTime     @default(now())

  @@unique([organizationId, userId])
}

enum OrgRole {
  OWNER
  ADMIN
  MEMBER
}

// Plugin marketplace v1 (Phase 4 — API.md §18, ARCHITECTURE.md §16). WASM
// stored as base64 text directly on PluginVersion, not S3-compatible
// object storage — that infrastructure is referenced elsewhere in this doc
// (ShareLink.objectStorageKey) but was never actually built, and adding an
// S3 SDK dependency for a feature already capped at 2MB felt like the
// wrong tradeoff. See AUDIT_REPORT.md §18.2.
enum PluginStatus {
  DRAFT
  IN_REVIEW
  PUBLISHED
  REJECTED
  SUSPENDED
}

model Plugin {
  id           String       @id @default(uuid())
  slug         String       @unique
  name         String
  description  String
  authorUserId String
  author       User         @relation(fields: [authorUserId], references: [id], onDelete: Cascade)
  status       PluginStatus @default(DRAFT)
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  versions PluginVersion[]

  @@index([authorUserId])
  @@index([status])
}

model PluginVersion {
  id             String    @id @default(uuid())
  pluginId       String
  plugin         Plugin    @relation(fields: [pluginId], references: [id], onDelete: Cascade)
  version        String
  manifestJson   Json
  wasmBase64     String    @db.Text
  checksumSha256 String
  reviewedById   String?
  reviewedBy     User?     @relation(fields: [reviewedById], references: [id], onDelete: SetNull)
  reviewedAt     DateTime?
  createdAt      DateTime  @default(now())

  @@unique([pluginId, version])
  @@index([pluginId])
}

// Added during Phase 3 implementation — not in the original ERD above.
// Backs the email-verify / password-reset flows API.md §2 documents;
// discriminated by `type` rather than two near-identical tables. See
// AUDIT_REPORT.md Phase 3 section for the full rationale.
enum VerificationTokenType {
  EMAIL_VERIFY
  PASSWORD_RESET
}

model VerificationToken {
  id        String                @id @default(uuid())
  userId    String
  user      User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String                @unique // hashed, never store the raw token
  type      VerificationTokenType
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime              @default(now())

  @@index([userId, type])
}

// Added during Phase 4 implementation — not in the original ERD above.
// Backs Public API/CLI access (ARCHITECTURE.md §14.3, §15). Same
// hashed-secret pattern as Session.refreshTokenHash/VerificationToken.tokenHash
// — `keyHash` is a SHA-256 hash, the raw key is shown to the user exactly
// once (at creation) and never stored or recoverable. `keyPrefix` is the raw
// key's first 8 characters kept in plaintext solely so the key-management UI
// can show "dtb_live_ab12…" to distinguish keys without exposing the rest.
model ApiKey {
  id         String    @id @default(uuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  name       String
  keyPrefix  String
  keyHash    String    @unique
  lastUsedAt DateTime?
  revokedAt  DateTime?
  createdAt  DateTime  @default(now())

  @@index([userId])
}

// Added during Phase 4 implementation — not in the original ERD above.
// Backs billing (ARCHITECTURE.md §14.2). NOT what plan checks read —
// User.plan (existing field, now also gets a `stripeCustomerId` sibling)
// stays the single denormalized value every other module already checks
// (PlanThrottleGuard, ApiKeysService, AI Gateway quotas); this table exists
// so support/debugging can see the underlying Stripe state and so a
// webhook-delivery failure (User.plan out of sync with Stripe) is
// detectable instead of silent. Status values mirror Stripe's own
// subscription.status strings 1:1 — no lossy translation to invent/maintain.
enum SubscriptionStatus {
  ACTIVE
  PAST_DUE
  CANCELED
  INCOMPLETE
  INCOMPLETE_EXPIRED
  TRIALING
  UNPAID
}

model Subscription {
  id                   String             @id @default(uuid())
  userId               String             @unique
  user                 User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  stripeSubscriptionId String             @unique
  stripePriceId        String
  plan                 Plan
  status               SubscriptionStatus
  currentPeriodEnd     DateTime
  cancelAtPeriodEnd    Boolean            @default(false)
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt

  @@index([userId])
}
```

**Implementation notes (Phase 3):**

- Primary keys use Prisma's `@default(uuid())` (UUIDv4), not true UUIDv7 as
  originally specified above — Prisma/Postgres don't generate UUIDv7
  natively yet. Tracked as a follow-up; the index-locality benefit UUIDv7
  would give is a performance optimization, not a correctness requirement,
  so this shipped as documented technical debt rather than blocking Phase 3.
- `HistoryEntry` encryption: **resolved**. Each record's AES-256-GCM key is
  now derived per-user via HKDF-SHA256 from the single master secret
  (`HISTORY_ENCRYPTION_KEY`), using the owning user's id as the derivation
  context (`backend/src/common/crypto/history-encryption.ts`), plus a
  random IV per record. This is not full KMS-backed per-user key-wrapping
  (one user's key still can't be rotated/revoked independently of the
  master secret) — that remains a larger follow-up if ever needed — but it
  does mean a leaked derived key only ever exposes one user's history, not
  everyone's.

**Implementation notes (Phase 4):**

- `ApiKey` added to back Public API/CLI access. Keys are gated to `PRO`/`TEAM`
  plans at the service layer (not a DB constraint) — matches ARCHITECTURE.md
  §14.3's "API/CLI access tier." A revoked key's row is kept (`revokedAt` set,
  not deleted) so past usage can still be audited; `ApiKeyAuthGuard` rejects
  any key with `revokedAt` set regardless of `keyHash` validity.
- `Subscription` + `User.stripeCustomerId` added to back billing
  (ARCHITECTURE.md §14.2). `User.plan` is updated by the Stripe webhook
  handler on every `customer.subscription.*` event — it's a cache of
  Stripe's state, not the other way around; if the two ever disagree,
  Stripe is authoritative and `Subscription` (kept in sync from the same
  webhook) is what a support/debug flow would compare against.

## 4. Data Retention & Privacy Notes

| Table | Contains user content? | Retention |
| --- | --- | --- |
| `HistoryEntry` | Yes (opt-in sync only) | User-purgeable anytime; previews truncated (e.g., 4KB) and encrypted at rest |
| `Snippet` / `Pipeline` | Yes (explicit save) | Until user deletes; soft-deleted 30 days before hard purge |
| `ShareLink` | Yes (explicit share) | Default 30-day expiry, hard-deleted by scheduled job after expiry |
| `AiUsageEvent` | No — token counts only, never prompt/response content | Retained for billing/analytics, aggregated after 90 days |
| `Session` | No | Refresh token stored as hash only; purged on logout/expiry |
| `ApiKey` | No | Raw key shown once at creation, never stored; `keyHash` retained (and revoked rows kept, not deleted) for audit until the user deletes their account |
| `Subscription` | No — Stripe IDs and status only, no payment/card data (that lives entirely in Stripe, never touches this DB) | Kept in sync with Stripe via webhook. Account deletion does not yet cancel the underlying Stripe subscription automatically — tracked as a follow-up, see AUDIT_REPORT.md §15 |

## 5. Indexing Strategy

- All foreign keys indexed (Prisma default via relation).
- `ShareLink.slug` unique index — primary lookup path, must be O(1).
- `ShareLink.expiresAt` indexed — supports the cleanup job's range scan.
- `HistoryEntry` composite index on `(userId, toolSlug, createdAt)` — supports the "recent history for this tool" query pattern, the most frequent read.
- No full-text search needed at MVP; `Snippet.content` search (Phase 3+) would add a `tsvector` generated column + GIN index if/when implemented.

## 6. Migrations Strategy

- Prisma Migrate, additive-first (avoid destructive migrations in the same release as the code that depends on the new shape — expand/contract pattern for zero-downtime deploys).
- Every migration reviewed in PR alongside the schema change; migration files committed to `backend/src/database/migrations`.
- Seed data (`backend/src/database/seeds`) provides local dev fixtures only — never runs against production.

## 7. Local Client Storage (not in Postgres)

For completeness — most "data" in this product lives on-device, not in this schema:

- **IndexedDB (via Dexie.js):** `history` (per-tool, capped at N entries, purgeable), `favorites`, `draftPipelines`, `preferences`.
- **localStorage:** theme, layout density, onboarding-seen flags — small, non-sensitive UI state only.

This local-first data becomes the source of truth for anonymous users and is merged into the server tables on first sign-in with sync enabled. The merge strategy differs per entity because the conflict shape differs per entity, not out of inconsistency:

- **Favorites** — a plain set union (local ∪ server). A `toolSlug` is either favorited or not; there's no field to overwrite, so nothing can conflict. See `frontend/src/lib/sync.ts`.
- **History** — append-only, never backfilled on sign-in (only new entries created after sign-in sync). Each record is a distinct, immutable entry, never updated in place, so there's no overwrite hazard and no conflict case to prompt for.
- **Pipelines** — the one entity that's actually mutable and re-savable, so it's the one that needs last-write-wins with a **user-visible conflict prompt**: before overwriting an already-synced pipeline, the client re-fetches the server copy's `updatedAt` and compares it against what was recorded at the last successful sync; a mismatch surfaces a confirm dialog before retrying with `force: true`. See `frontend/src/lib/pipeline-sync.ts`.

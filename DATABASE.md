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

```
User ──1:N── Session (refresh tokens)
User ──1:N── Snippet
User ──1:N── Pipeline ──1:N── PipelineStep
User ──1:N── ShareLink
User ──1:N── Favorite
User ──1:N── HistoryEntry (only if sync enabled; otherwise local IndexedDB only)
User ──N:1── Organization (nullable; Phase 4 team workspaces)
Organization ──1:N── OrganizationMember (join: User × Organization, role)
User ──1:N── AiUsageEvent (aggregate counters, not payload content)
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
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  toolSlug    String
  title       String
  content     String   @db.Text
  isPublic    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  @@index([userId])
}

model Pipeline {
  id          String         @id @default(uuid())
  userId      String
  user        User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  name        String
  description String?
  isPublic    Boolean        @default(false)
  steps       PipelineStep[]
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  deletedAt   DateTime?

  @@index([userId])
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

model Organization {
  id        String   @id @default(uuid())
  name      String
  plan      Plan     @default(TEAM)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  members   OrganizationMember[]
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
```

## 4. Data Retention & Privacy Notes

| Table | Contains user content? | Retention |
|---|---|---|
| `HistoryEntry` | Yes (opt-in sync only) | User-purgeable anytime; previews truncated (e.g., 4KB) and encrypted at rest |
| `Snippet` / `Pipeline` | Yes (explicit save) | Until user deletes; soft-deleted 30 days before hard purge |
| `ShareLink` | Yes (explicit share) | Default 30-day expiry, hard-deleted by scheduled job after expiry |
| `AiUsageEvent` | No — token counts only, never prompt/response content | Retained for billing/analytics, aggregated after 90 days |
| `Session` | No | Refresh token stored as hash only; purged on logout/expiry |

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

This local-first data becomes the source of truth for anonymous users and is merged (last-write-wins, user-visible conflict prompt for pipelines) into the server tables on first sign-in with sync enabled.

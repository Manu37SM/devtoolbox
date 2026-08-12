# API.md

REST API reference for the DevToolbox backend. Style: **REST**, chosen over GraphQL because the resource shapes here are simple, mostly-CRUD, and don't have the deep/variable nested-query patterns that justify GraphQL's complexity cost. The one non-CRUD surface (AI Gateway) is modeled as a small set of task-specific POST endpoints rather than a generic passthrough, so request/response shapes stay typed and reviewable.

Base URL: `https://api.devtoolbox.dev/v1`

## 1. Conventions

- All request/response bodies are JSON, `Content-Type: application/json`.
- All timestamps ISO 8601 UTC.
- All list endpoints are cursor-paginated: `?cursor=<opaque>&limit=<n, default 20, max 100>`, response includes `nextCursor: string | null`.
- Resource IDs are UUIDs.
- Auth via `Authorization: Bearer <accessToken>` header; refresh token is an httpOnly cookie, never exposed to JS.
- Idempotent writes (e.g., creating a share link) accept an optional `Idempotency-Key` header.

### Standard error format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable summary",
    "details": [{ "field": "email", "issue": "must be a valid email" }],
    "requestId": "req_01HXYZ..."
  }
}
```

Common `code` values: `VALIDATION_ERROR` (400), `UNAUTHENTICATED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500).

## 2. Auth

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/auth/register` | Create account (email + password) | none |
| POST | `/auth/login` | Login, returns access token + sets refresh cookie | none |
| POST | `/auth/oauth/:provider/callback` | OAuth callback (github, google) | none |
| POST | `/auth/refresh` | Exchange refresh cookie for new access token (rotates refresh token) | refresh cookie |
| POST | `/auth/logout` | Revoke current session | access token |
| POST | `/auth/verify-email` | Confirm email via token | none |
| POST | `/auth/password-reset/request` | Send reset email | none |
| POST | `/auth/password-reset/confirm` | Set new password via token | none |
| GET | `/auth/me` | Current user profile | access token |

**Example — `POST /auth/login`**
```json
// Request
{ "email": "dev@example.com", "password": "••••••••" }

// Response 200
{
  "accessToken": "eyJhbGciOi...",
  "expiresIn": 900,
  "user": { "id": "...", "email": "dev@example.com", "displayName": "Dev", "plan": "FREE" }
}
```

## 3. Users

| Method | Path | Description |
|---|---|---|
| GET | `/users/me` | Get profile |
| PATCH | `/users/me` | Update displayName/avatar |
| DELETE | `/users/me` | Delete account (soft-delete, 30-day grace period) |
| GET | `/users/me/export` | Export all owned data (GDPR-style data portability) as a JSON archive |

## 4. Sync — Favorites

| Method | Path | Description |
|---|---|---|
| GET | `/favorites` | List current user's favorites |
| POST | `/favorites` | Add favorite `{ toolSlug }` |
| DELETE | `/favorites/:toolSlug` | Remove favorite |

## 5. Sync — History

| Method | Path | Description |
|---|---|---|
| GET | `/history?toolSlug=&cursor=&limit=` | List history entries (optionally filtered by tool) |
| POST | `/history` | Create entry `{ toolSlug, inputPreview?, outputPreview? }` (only called if user has sync enabled) |
| DELETE | `/history/:id` | Delete a single entry |
| DELETE | `/history` | Clear all history for current user |

## 6. Snippets

| Method | Path | Description |
|---|---|---|
| GET | `/snippets?toolSlug=&cursor=&limit=` | List own snippets |
| POST | `/snippets` | Create `{ toolSlug, title, content, isPublic? }` |
| GET | `/snippets/:id` | Get one (owner, an org member if org-shared, or if `isPublic` anyone) — 404 for both "doesn't exist" and "exists but you can't see it," never 403, so resource existence isn't disclosed to a caller who shouldn't know (AUDIT_REPORT.md §19) |
| PATCH | `/snippets/:id` | Update |
| DELETE | `/snippets/:id` | Soft-delete |

## 7. Pipelines

| Method | Path | Description |
|---|---|---|
| GET | `/pipelines` | List own pipelines |
| POST | `/pipelines` | Create `{ name, description?, steps: [{ toolSlug, optionsJson }] }` |
| GET | `/pipelines/:id` | Get one (owner, an org member if org-shared, or if `isPublic` anyone) — 404, not 403, for the not-visible case (same reasoning as §6's snippet GET) |
| PATCH | `/pipelines/:id` | Update (name/description/steps, full replace of steps array) |
| DELETE | `/pipelines/:id` | Soft-delete |
| POST | `/pipelines/:id/duplicate` | Clone a pipeline (own or a public one) into the current user's account |

## 8. Share Links

First given a frontend (a `Share` button on Pipelines and Snippets, plus a public `/s/:slug` viewer page) and org-attributed branding in the same pass (AUDIT_REPORT.md §22) — the backend routes below predate that pass and are otherwise unchanged.

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/shares` | Create a share link `{ toolSlug, payload, organizationId? }` (size-capped, default 30-day expiry). `organizationId` requires being signed in and a member of that org — 403 otherwise. | optional (anonymous allowed, rate-limited harder; `organizationId` requires an access token) |
| GET | `/shares/:slug` | Resolve a share link — `{ toolSlug, payload, createdAt, branding }` (increments `viewCount`). `branding` is `{ name, logoUrl }` if the link is org-attributed and that org has set a `brandName`, else `null` | none |
| DELETE | `/shares/:slug` | Delete own share link early | access token, must own |

**Example — `POST /shares`**
```json
// Request
{ "toolSlug": "json-formatter", "payload": { "input": "{...}", "options": { "indent": 2 } }, "organizationId": "9f2a..." }

// Response 201
{ "slug": "k3f9zQ2pLm7a", "url": "https://devtoolbox.dev/s/k3f9zQ2pLm7a", "expiresAt": "2026-08-29T00:00:00Z" }
```

### 8.1 Org branding (API.md §17)

`PATCH /organizations/:id/branding` — `{ brandName?, brandLogoUrl? }`, either nullable to explicitly clear it, omit to leave unchanged — sets the name/logo shown on that org's attributed share links. `OWNER` only, same gate as rename. `brandLogoUrl` is validated as a well-formed URL but not fetched/verified server-side; it's rendered as a plain `<img src>` on the public share page, same trust tier as `User.avatarUrl` elsewhere in this API.

## 9. Billing (Phase 4 — Razorpay)

Migrated off Stripe (AUDIT_REPORT.md §20 — Stripe doesn't support billing for this business from India). No card/UPI data ever reaches this backend; the frontend opens Razorpay's Checkout.js modal client-side with a subscription id this API creates. `POST /billing/webhook` is the one route in this entire API that is neither session- nor API-key-authed; it's authenticated instead by verifying Razorpay's request signature (`X-Razorpay-Signature` header, HMAC-SHA256 of the raw body keyed by the webhook secret) against the raw request body, and must never be placed behind the global JSON body-parsing middleware that touches every other route (the signature is computed over the exact raw bytes Razorpay sent).

Razorpay has no hosted equivalents of Stripe's Checkout page or Customer Portal (AUDIT_REPORT.md §20 deviation notes) — `POST /billing/subscription` returns IDs for a client-side modal instead of a redirect URL, `POST /billing/verify-payment` replaces the old post-redirect success flow, and `POST /billing/cancel-subscription` replaces the portal redirect for self-serve cancellation.

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/billing/subscription` | `{ plan: "PRO"\|"TEAM" }` → `{ razorpaySubscriptionId, razorpayKeyId, plan }` for the frontend to open Razorpay Checkout.js with. Creates a Razorpay customer for the user on first use (stored as `User.razorpayCustomerId`) | access token |
| POST | `/billing/verify-payment` | `{ razorpay_payment_id, razorpay_subscription_id, razorpay_signature }` (as returned by Checkout.js's success handler) → current `SubscriptionSummary`. Verifies the HMAC signature server-side before syncing `User.plan` | access token |
| POST | `/billing/cancel-subscription` | `{}` → `{ cancelled: true }`. Cancels at the end of the current billing cycle (`cancel_at_cycle_end`), same "keep access through what's already paid for" behavior as the old Stripe portal flow | access token, must have an active subscription |
| GET | `/billing/subscription` | Current subscription summary (plan, status, `currentPeriodEnd`, `cancelAtPeriodEnd`) or `null` if none | access token |
| POST | `/billing/webhook` | Razorpay webhook receiver — handles `subscription.activated`, `subscription.charged`, `subscription.pending`, `subscription.halted`, `subscription.cancelled`, `subscription.completed`; updates `User.plan` and the `Subscription` row | Razorpay signature (raw body) |

**Example — `POST /billing/subscription`**
```json
// Request
{ "plan": "PRO" }

// Response 200
{ "razorpaySubscriptionId": "sub_Nc...", "razorpayKeyId": "rzp_live_...", "plan": "PRO" }
```

**Example — `POST /billing/verify-payment`**
```json
// Request
{
  "razorpay_payment_id": "pay_Nc...",
  "razorpay_subscription_id": "sub_Nc...",
  "razorpay_signature": "b8a2...ef01"
}

// Response 200
{ "plan": "PRO", "status": "ACTIVE", "currentPeriodEnd": "2026-09-12T00:00:00.000Z", "cancelAtPeriodEnd": false }
```

## 10. AI Gateway

All AI endpoints share: request-shape validation, per-user/IP rate limiting, a server-side system prompt (never client-supplied), and a preflight `dataSentPreview` echoed back so the frontend can show "here's what will be sent" before first use (FR6). Responses may be streamed via SSE (`Accept: text/event-stream`).

| Method | Path | Description |
|---|---|---|
| POST | `/ai/explain` | `{ toolSlug, subject: "regex"\|"cron"\|"json-schema"\|"sql", input }` → plain-language explanation |
| POST | `/ai/generate` | `{ target: "regex"\|"cron"\|"json-schema", prompt, examples? }` → generated artifact + deterministic validation result |
| POST | `/ai/diff-summary` | `{ before, after, format: "text"\|"json" }` → natural-language summary of a diff |
| POST | `/ai/json-repair` | `{ input }` → attempts deterministic repair first (`repairedBy: "deterministic"`); falls back to AI only if needed (`repairedBy: "ai"`) |
| POST | `/ai/commit-message` | `{ diff }` → `{ commitMessage, prDescription }` generated from a pasted git diff |
| POST | `/ai/code-comment` | `{ code, language? }` → the same code with inline comments/docstrings added |
| POST | `/ai/client-code` | `{ sampleResponse, target: "fetch"\|"axios", typeName? }` → typed client function + response type generated from a sample JSON response |
| GET | `/ai/usage` | Current user's usage against their plan quota (counts only, no content) |

**Example — `POST /ai/generate`**
```json
// Request
{ "target": "cron", "prompt": "every weekday at 9am UTC" }

// Response 200
{
  "result": "0 9 * * 1-5",
  "explanation": "Runs at 9:00 AM UTC, Monday through Friday.",
  "validated": true,
  "model": "claude-haiku-4-5"
}
```

## 11. Network Tool Proxies (server-assisted, non-persistent)

These exist because the underlying operation cannot run client-side (CORS, DNS resolution, IP disclosure) — see ARCHITECTURE.md §8.3/Module 8 in FEATURE.md. No payload is persisted beyond transient abuse-prevention logs.

| Method | Path | Description |
|---|---|---|
| POST | `/net/http-request` | Proxies an outbound HTTP request the user configured `{ method, url, headers, body }`; domain allowlist/blocklist and size/timeout caps enforced |
| GET | `/net/dns?domain=&recordType=` | DNS record lookup (`recordType` one of A/AAAA/CNAME/MX/TXT/NS/SOA, defaults to A) |
| GET | `/net/ip-lookup?ip=` | IP geolocation/ASN lookup (defaults to caller's IP if omitted) |
| POST | `/net/webhook-inbox` | Creates a temporary inbox URL (`/net/webhook-inbox/:id`) that captures inbound requests for N minutes, polled by the client |
| GET | `/net/webhook-inbox/:id/events` | Poll captured webhook events for an inbox |
| POST | `/net/url-preview` | Fetches a URL server-side and extracts Open Graph/meta tags for the previewer tool |

## 12. API Keys (manage Public API access — session auth)

Lets a signed-in user create/list/revoke the keys their scripts/CI/CLI use to call §13's Public API. Managed via the normal session (`Authorization: Bearer <accessToken>`), not the API key itself.

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/api-keys` | `{ name }` → `{ id, name, key, keyPrefix, createdAt }` — **`key` (the raw secret) is returned only this once and never retrievable again** | access token |
| GET | `/api-keys` | List the caller's keys — `{ id, name, keyPrefix, lastUsedAt, revokedAt, createdAt }[]`, never the raw key | access token |
| DELETE | `/api-keys/:id` | Revoke a key (sets `revokedAt`; row kept for audit, not deleted) | access token |

## 13. Public API (Phase 4 — API-key auth, PRO/TEAM only)

Programmatic access to a small, deliberately curated subset of tools for CI/scripting use, per ARCHITECTURE.md §14.3 — not a mirror of every web tool. Auth via `Authorization: Bearer <api key>` (a key created through §12, distinct from the session access token used everywhere else); `FORBIDDEN` (403) if the caller's plan isn't PRO/TEAM, `UNAUTHENTICATED` (401) if the key is missing/invalid/revoked.

| Method | Path | Description |
|---|---|---|
| POST | `/v1/public/hash` | `{ input, algorithm: "md5"\|"sha1"\|"sha256"\|"sha512" }` → `{ digest }` |
| POST | `/v1/public/json-validate` | `{ input }` → `{ valid: boolean, error?: string }` — batch-friendly JSON validation for CI pipelines |

**Example — `POST /v1/public/hash`**
```bash
curl -X POST https://api.devtoolbox.dev/v1/public/hash \
  -H "Authorization: Bearer dtb_live_..." \
  -H "Content-Type: application/json" \
  -d '{"input": "hello world", "algorithm": "sha256"}'
```
```json
{ "digest": "b94d27b9934d3e08a52e52d7da7dacefac1a3ce9c3adbcf0002d0f30b3d6c1c" }
```

## 14. Admin (internal, `role: admin` only)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/stats` | Aggregate usage dashboards (tool popularity, AI cost, signups) |
| GET | `/admin/users?query=` | User lookup/support |
| POST | `/admin/users/:id/plan` | Manually adjust a user's plan (support/comp scenarios) |

## 15. Rate Limits (default, per plan)

| Surface | Anonymous | Free (signed-in) | Pro |
|---|---|---|---|
| Auth endpoints | 10/min/IP | — | — |
| `/shares` create | 20/hour/IP | 100/hour/user | 1000/hour/user |
| `/ai/*` | 5/hour/IP | 60/hour/user | 1000/hour/user |
| `/net/http-request` | 10/hour/IP | 60/hour/user | 500/hour/user |
| `/api-keys` | — | 30/hour/user | 30/hour/user |
| `/v1/public/*` | — (no anonymous access) | — (PRO/TEAM only) | 5000/hour/user |
| `/billing/subscription` (POST), `/billing/verify-payment`, `/billing/cancel-subscription` | — | 10/hour/user | 10/hour/user |
| `/billing/webhook` | not applicable — Razorpay-signature-authed, not plan-gated; a generous flat `100/min` global limit guards against replay/abuse | | |
| `/organizations/*` (incl. `/organizations/:id/sso*`) | — | 60/hour/user | 60/hour/user |
| `/sso/discover`, `/sso/oidc/*`, `/sso/saml/*` | 30/min/IP (discover), 10/min/IP (login flows) — unauthenticated by definition, same budget class as auth endpoints | — | — |
| All other CRUD | 300/min/user | 300/min/user | 300/min/user |

Rate-limit responses include `Retry-After` and `X-RateLimit-Remaining` headers. `/v1/public/*`'s limit is shared across all of a user's API keys (not one budget per key) — reuses `PlanThrottleGuard`'s existing per-user identity resolution rather than adding a new per-key rate-limit dimension; a user with multiple keys (e.g. one per CI pipeline) shares one budget across them, same as any other authenticated surface in this table. The "Pro" column now also covers any user whose *effective* plan resolves to TEAM via §17's org-owner-plan inheritance, not just `User.plan` directly — see AUDIT_REPORT.md §17.1's `resolveEffectivePlan` note.

## 16. Versioning

- URL-versioned (`/v1`). Breaking changes ship as `/v2`; `/v1` supported for a minimum 12 months after `/v2` GA, per CHANGELOG.md deprecation notices.

## 17. Team Workspaces (Phase 4)

MVP scope, since extended with email-token invites (§17.1) and custom branding for shared links (§8.1, §22), and now org-level SSO (§17.5, AUDIT_REPORT.md §23). Still deliberately deferred: org-level Razorpay billing. An organization's members get TEAM-tier rate limits/AI quota (§15's "Pro" column) whenever the organization's owner has `User.plan === "TEAM"` — there is no separate org-level subscription; the owner's existing personal billing (§9) is what makes an org "active."

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/organizations` | `{ name }` → creates an org, caller becomes `OWNER` | access token |
| GET | `/organizations` | List orgs the caller belongs to, with their role in each | access token |
| GET | `/organizations/:id` | Org detail + member list (`OWNER`/`ADMIN`: full; `MEMBER`: names/roles only, no usage figures) | access token, must be a member |
| PATCH | `/organizations/:id` | Rename | access token, `OWNER` only |
| PATCH | `/organizations/:id/branding` | `{ brandName?, brandLogoUrl? }` — shown on this org's attributed share links (§8.1) | access token, `OWNER` only |
| DELETE | `/organizations/:id` | Delete org (members keep their own snippets/pipelines; org-shared ones are deleted) | access token, `OWNER` only |
| POST | `/organizations/:id/members` | `{ email }` → `{ status: "added", member }` if an account already exists for that email (added immediately), or `{ status: "invited", invite }` otherwise — creates/refreshes a 7-day email-token invite and sends it (AUDIT_REPORT.md §21) instead of the old 404 | access token, `OWNER`/`ADMIN` |
| PATCH | `/organizations/:id/members/:userId` | `{ role: "ADMIN"\|"MEMBER" }` — change a member's role (cannot demote the last `OWNER`) | access token, `OWNER` only |
| DELETE | `/organizations/:id/members/:userId` | Remove a member (or leave, if `:userId` is the caller and not the last `OWNER`) | access token, `OWNER`/`ADMIN`, or self |
| GET | `/organizations/:id/usage` | Aggregate AI usage (tokens, request counts) across all members, last 30 days — same underlying `AiUsageEvent` rows as the personal `/ai/usage` endpoint, joined via membership, never raw prompt/response content (CLAUDE.md rule 8) | access token, `OWNER`/`ADMIN` |
| GET | `/organizations/:id/invites` | List pending (not accepted/revoked/expired) invites for the org | access token, `OWNER`/`ADMIN` |
| DELETE | `/organizations/:id/invites/:inviteId` | Revoke a pending invite (409 if it's already been accepted) | access token, `OWNER`/`ADMIN` |
| POST | `/organizations/invites/:token/accept` | Accepts an invite — the invite's email must match the caller's account email (case-insensitive), else 403. Idempotent if the caller already joined some other way. | access token |

Shared snippets/pipelines: `POST /snippets` and `POST /pipelines` (§6, §7) accept an optional `organizationId` — when set, the caller must be a member, and any org member can view/duplicate it; only the creator or an `OWNER`/`ADMIN` can edit/delete it. Two new read routes list what's shared into an org: `GET /snippets/organization/:organizationId`, `GET /pipelines/organization/:organizationId` (both access-token-authed, caller must be a member).

### 17.1 Email-token invites (AUDIT_REPORT.md §21)

Same hashed-opaque-token pattern as email-verify/password-reset (§2) — the raw token only ever appears in the invite link (`{FRONTEND_URL}/invites/{token}`, sent by email), never persisted or logged; the backend stores only its SHA-256 hash. Invites expire after 7 days. Accepting requires being signed in with the exact email address the invite was sent to; the frontend's `/invites/:token` page sends an unauthenticated visitor to `/login?next=/invites/:token` or `/register?next=/invites/:token` first, then retries the accept call once they're signed in.

**Example — `POST /organizations/:id/members` (no account exists yet)**
```json
// Request
{ "email": "new-hire@example.com" }

// Response 201
{
  "status": "invited",
  "invite": {
    "id": "8b1e...",
    "email": "new-hire@example.com",
    "role": "MEMBER",
    "invitedByEmail": "owner@acme.com",
    "createdAt": "2026-08-12T00:00:00Z",
    "expiresAt": "2026-08-19T00:00:00Z"
  }
}
```

**Example — `POST /organizations`**
```json
// Request
{ "name": "Acme Platform Team" }

// Response 201
{ "id": "9f2a...", "name": "Acme Platform Team", "role": "OWNER", "createdAt": "2026-08-11T00:00:00Z" }
```

### 17.5 Org SSO — OIDC + SAML (AUDIT_REPORT.md §23)

The last item deferred from the original team workspaces MVP pass. One connection per org, keyed by an email domain. Split into two route groups: admin configuration (nested under `/organizations/:id/sso`, `OWNER`-only) and public IdP-facing login endpoints (`/sso/*`, unauthenticated by definition). A first-time SSO sign-in JIT-provisions (just-in-time) both the `User` row (if none exists for the IdP-supplied email) and `OrganizationMember` (as `MEMBER`) — SSO login always happens in the context of one specific org, unlike personal GitHub/Google OAuth (§2), so auto-join is the point rather than a side effect to guard against.

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/organizations/:id/sso` | Current connection, or `null` if none configured. Never includes the OIDC client secret — only `oidcHasClientSecret: boolean` | access token, `OWNER`/`ADMIN` |
| POST | `/organizations/:id/sso` | Create or update the connection. Body discriminated by `protocol` (`"OIDC"` or `"SAML"`); `oidcClientSecret` is required on first create, optional on update (omit to leave the existing encrypted secret unchanged) | access token, `OWNER` only |
| POST | `/organizations/:id/sso/enabled` | `{ enabled: boolean }` — pause/resume without deleting the configuration | access token, `OWNER` only |
| DELETE | `/organizations/:id/sso` | Remove the connection entirely | access token, `OWNER` only |
| GET | `/sso/discover?domain=` | `{ available, protocol, organizationId }` — tells the login page whether an email domain has SSO to route to. Discloses only yes/no + protocol + org id, never a member list or org name | none |
| GET | `/sso/oidc/authorize?domain=&redirectUri=` | `{ url, state }` — builds the IdP authorize-redirect URL (via the IdP's `/.well-known/openid-configuration` discovery document) for the frontend to navigate to | none |
| POST | `/sso/oidc/callback` | `{ code, state, redirectUri }` → same `AuthTokenResponse` shape as `/auth/oauth/:provider/callback` (§2), sets the refresh-token cookie. Verifies the id_token's RS256 signature against the IdP's live JWKS (via `jose`), issuer, audience, and nonce | none |
| GET | `/sso/saml/authorize?domain=` | `{ url }` — the IdP's SSO URL to redirect to (SP-initiated) | none |
| POST | `/sso/saml/callback` | SAML ACS (assertion consumer service) endpoint — the IdP POSTs the assertion here directly as a browser form submission, not a frontend fetch. Validates the signed assertion (via `@node-saml/node-saml`), sets the refresh cookie, and 302-redirects to the frontend (`/account?sso=1` on success, `/login?ssoError=1` on failure) rather than returning JSON, since there's no frontend code in the loop to receive a JSON response | none |

**New dependencies, flagged per CLAUDE.md rule 10 before adding:** `jose` (JWKS fetch + JWT/RS256 verification — a security-sensitive primitive not worth hand-rolling, unlike the plain-fetch OAuth exchange §2 already does for GitHub/Google, which never needs to verify a signature) and `@node-saml/node-saml` (SAML XML signature verification — same rationale). Both confirmed with the user before implementation.

**Config:** `SSO_SECRET_ENCRYPTION_KEY` (AES-256-GCM master key, same shape as `HISTORY_ENCRYPTION_KEY` but a separate key) and `BACKEND_URL` (this backend's externally-reachable origin, needed for the SAML ACS callback URL an IdP dashboard is configured with ahead of time) — both optional in dev, degrading with a clear 503 from any SSO route that needs them rather than failing boot, same treatment as every other optional integration in this codebase.

## 18. Plugin Marketplace (Phase 4 — v1)

Community-submitted tools, executed entirely client-side in a sandboxed iframe (ARCHITECTURE.md §16) — these routes only ever move a manifest + a WASM binary + review metadata; the actual plugin execution never touches this backend. Listing/running is public; creating a plugin and submitting versions requires a signed-in user (any plan — publishing isn't paywalled); review-queue actions require `User.isAdmin`.

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/plugins` | `{ slug, name, description }` → creates a `DRAFT` plugin owned by the caller | access token |
| GET | `/plugins` | List `PUBLISHED` plugins | none |
| GET | `/plugins/:slug` | Detail — `PUBLISHED` to anyone, other statuses to the owner/an admin only (404 otherwise, same "don't confirm existence" posture as §6's private snippets) | optional |
| POST | `/plugins/:id/versions` | `{ manifest, wasmBase64 }` → validates (size ≤2MB decoded, WASM magic number), stores the version, and moves the plugin back to `IN_REVIEW` — every version goes through review, not just the first | access token, must own the plugin |
| GET | `/plugins/:slug/run` | `{ version, wasmBase64, checksumSha256 }` for the latest version — what the frontend `PluginRunner` fetches to execute a plugin. Same visibility rule as detail: `PUBLISHED` to anyone, other statuses to the owner/an admin | optional |
| GET | `/plugins/review-queue` | List `IN_REVIEW` plugins, oldest-updated first | access token, admin only |
| POST | `/plugins/:id/review` | `{ decision: "APPROVE" \| "REJECT" }` → `PUBLISHED` or `REJECTED` | access token, admin only |
| POST | `/plugins/:id/suspend` | Hides a `PUBLISHED` plugin from listings without deleting it | access token, admin only |

**v1 scope notes** (AUDIT_REPORT.md §18.2 has the full list): WASM stored as base64 text on `PluginVersion` (no S3/object storage — that infrastructure doesn't exist anywhere in this codebase yet); static submission inspection is size + magic-number only, not a full import-section allowlist parser; `User.isAdmin` is a new boolean field, the first real implementation of the "admin" concept §14 already referenced.

**Example — `POST /plugins/:id/versions`**
```json
// Request
{
  "manifest": { "id": "my-tool", "name": "My Tool", "version": "1.0.0", "description": "...", "author": "..." },
  "wasmBase64": "AGFzbQEAAAA..."
}

// Response 201
{ "id": "...", "version": "1.0.0", "manifest": { ... }, "checksumSha256": "...", "reviewedAt": null, "createdAt": "2026-08-11T00:00:00Z" }
```

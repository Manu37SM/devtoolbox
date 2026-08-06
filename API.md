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
| GET | `/snippets/:id` | Get one (owner or, if `isPublic`, anyone) |
| PATCH | `/snippets/:id` | Update |
| DELETE | `/snippets/:id` | Soft-delete |

## 7. Pipelines

| Method | Path | Description |
|---|---|---|
| GET | `/pipelines` | List own pipelines |
| POST | `/pipelines` | Create `{ name, description?, steps: [{ toolSlug, optionsJson }] }` |
| GET | `/pipelines/:id` | Get one |
| PATCH | `/pipelines/:id` | Update (name/description/steps, full replace of steps array) |
| DELETE | `/pipelines/:id` | Soft-delete |
| POST | `/pipelines/:id/duplicate` | Clone a pipeline (own or a public one) into the current user's account |

## 8. Share Links

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/shares` | Create a share link `{ toolSlug, payload }` (size-capped, default 30-day expiry) | optional (anonymous allowed, rate-limited harder) |
| GET | `/shares/:slug` | Resolve a share link's payload (increments `viewCount`) | none |
| DELETE | `/shares/:slug` | Delete own share link early | access token, must own |

**Example — `POST /shares`**
```json
// Request
{ "toolSlug": "json-formatter", "payload": { "input": "{...}", "options": { "indent": 2 } } }

// Response 201
{ "slug": "k3f9zQ2pLm7a", "url": "https://devtoolbox.dev/s/k3f9zQ2pLm7a", "expiresAt": "2026-08-29T00:00:00Z" }
```

## 9. AI Gateway

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

## 10. Network Tool Proxies (server-assisted, non-persistent)

These exist because the underlying operation cannot run client-side (CORS, DNS resolution, IP disclosure) — see ARCHITECTURE.md §8.3/Module 8 in FEATURE.md. No payload is persisted beyond transient abuse-prevention logs.

| Method | Path | Description |
|---|---|---|
| POST | `/net/http-request` | Proxies an outbound HTTP request the user configured `{ method, url, headers, body }`; domain allowlist/blocklist and size/timeout caps enforced |
| GET | `/net/dns?domain=&recordType=` | DNS record lookup (`recordType` one of A/AAAA/CNAME/MX/TXT/NS/SOA, defaults to A) |
| GET | `/net/ip-lookup?ip=` | IP geolocation/ASN lookup (defaults to caller's IP if omitted) |
| POST | `/net/webhook-inbox` | Creates a temporary inbox URL (`/net/webhook-inbox/:id`) that captures inbound requests for N minutes, polled by the client |
| GET | `/net/webhook-inbox/:id/events` | Poll captured webhook events for an inbox |
| POST | `/net/url-preview` | Fetches a URL server-side and extracts Open Graph/meta tags for the previewer tool |

## 11. Admin (internal, `role: admin` only)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/stats` | Aggregate usage dashboards (tool popularity, AI cost, signups) |
| GET | `/admin/users?query=` | User lookup/support |
| POST | `/admin/users/:id/plan` | Manually adjust a user's plan (support/comp scenarios) |

## 12. Rate Limits (default, per plan)

| Surface | Anonymous | Free (signed-in) | Pro |
|---|---|---|---|
| Auth endpoints | 10/min/IP | — | — |
| `/shares` create | 20/hour/IP | 100/hour/user | 1000/hour/user |
| `/ai/*` | 5/hour/IP | 60/hour/user | 1000/hour/user |
| `/net/http-request` | 10/hour/IP | 60/hour/user | 500/hour/user |
| All other CRUD | 300/min/user | 300/min/user | 300/min/user |

Rate-limit responses include `Retry-After` and `X-RateLimit-Remaining` headers.

## 13. Versioning

- URL-versioned (`/v1`). Breaking changes ship as `/v2`; `/v1` supported for a minimum 12 months after `/v2` GA, per CHANGELOG.md deprecation notices.

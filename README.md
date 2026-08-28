# DevToolbox

**A free, modern, AI-powered developer toolbox — every utility a developer reaches for daily, in one fast, private, ad-light workspace.**

DevToolbox bundles 67 tools across formatting, conversion, encoding, security, text, code, image, network, and generator utilities, wraps them in a consistent, keyboard-first UI (command palette, smart-paste detection, pipelines to chain tools together, local history/favorites, PWA/offline support), and lays the groundwork for an optional AI Assistant for tasks that go beyond deterministic transforms (explain this regex, generate a JSON schema from this payload, summarize this diff). Nearly every tool runs entirely client-side — nothing is sent to a server. Five Module 8 tools (HTTP Request Tester, DNS Lookup, IP Lookup, Webhook Tester, Meta Tag Previewer) are the deliberate exception: they proxy through a small backend because the underlying operation (DNS resolution, receiving real inbound webhook traffic, avoiding CORS) genuinely can't happen in a browser tab — each one says so visibly in its own UI. Optional accounts, cross-device sync, and the AI Assistant are live; every tool still works with no account and no backend.

> Status: **Live in production.** The full deterministic catalog (67 tools) plus optional accounts (email/password + GitHub/Google OAuth, org SSO via OIDC/SAML), cross-device Favorites/History/Snippets/Pipelines sync, Share Links, the AI Gateway and AI tools, the public API and CLI, the browser extension, team workspaces, and the Pro tier are all shipped. Every tool remains usable with zero account or backend setup — accounts are additive, never required.

---

## Why DevToolbox

The category is crowded — JSON formatters, Base64 encoders, and JWT decoders exist on dozens of domains — but it is crowded with the *same* product shipped over and over: a single tool, ad-heavy, inconsistent UX, no memory of what you did five minutes ago, and no story for anything that isn't a pure deterministic transform. DevToolbox differentiates on:

1. **Breadth with coherence** — one design system, one command palette, one keyboard model, across every tool, instead of 60 disconnected single-purpose pages.
2. **Privacy by default** — client-side execution is the default for every tool where it's technically possible. Server calls are explicit, visible, and limited to things that genuinely require them (AI features, URL shortening, team sync).
3. **AI as an accelerant, not a gimmick** — AI features solve problems deterministic tools structurally can't (explain, summarize, generate-from-example) rather than reskinning a formatter with a chat box.
4. **Workflows, not just tools** — chained pipelines ("decode JWT → format payload → diff against previous token"), history, and shareable snippets, because real developer tasks are rarely a single transform.
5. **Free core, forever** — the entire tool catalog is free and unauthenticated. Monetization never gates a tool behind a paywall.

## Documentation

| Document | Purpose |
|---|---|
| [SECURITY.md](./SECURITY.md) | Vulnerability disclosure policy |
| [LICENSE](./LICENSE) | MIT license |

Design, API, schema, and deployment docs previously lived in this repo root. They were
retired once the project went live; the history is still available in git
(`git log --diff-filter=D --name-only` to find them, `git show <commit>:<file>` to read one).

## Tech Stack

- **Frontend:** Next.js 15 (App Router) + React 19 + TypeScript, Tailwind CSS, Zustand (UI/theme state), Dexie/IndexedDB (local-first history, favorites, pipelines — no server-state library needed at this stage)
- **Backend:** Node.js + NestJS (TypeScript), PostgreSQL + Prisma, Redis, BullMQ — live, backing accounts, cross-device sync, sharing, billing, and the AI Gateway
- **AI layer:** Anthropic Claude API (Sonnet/Haiku tier routing) via a thin internal AI gateway service
- **Infra:** Docker, GitHub Actions CI/CD, Vercel (frontend) + Render (API + Redis, free tier) + Neon (Postgres, free tier), Cloudflare (CDN/WAF), S3-compatible object storage
- **Observability:** OpenTelemetry, Sentry, Grafana/Prometheus (self-hosted) or hosted equivalents

## Monorepo Layout

```
devtoolbox/
├── frontend/         # Next.js app (all client-side tools + shell UI)
├── backend/          # NestJS API (auth, AI gateway, sync, sharing, analytics)
├── docs/             # Architecture diagrams, ADRs, supplementary specs
├── scripts/          # Dev/ops scripts (bootstrap, seed, release)
└── .github/workflows # CI/CD pipelines
```



## Quick Start

```bash
git clone <repo-url> devtoolbox && cd devtoolbox
cp .env.example .env           # fill in JWT_ACCESS_SECRET/JWT_REFRESH_SECRET/HISTORY_ENCRYPTION_KEY — see below
npm install                    # installs frontend + backend + shared workspaces (run from repo root only)
docker compose up -d           # Postgres + Redis
npm run db:migrate:dev         # applies the Prisma migration (first run only, or after a schema change)
npm run dev                    # runs frontend (3000) + backend (4000) concurrently
```

Every tool works with zero accounts/backend running — client-side tools never touch the network, and Module 8's 5 server-proxied tools (HTTP Request Tester, DNS Lookup, IP Lookup, Webhook Tester, Meta Tag Previewer) are the only ones that need Redis. Postgres is now used too, for the optional-accounts/sync features (Phase 3, wave 1): register/login, Favorites/History sync, Snippets, Pipelines, Share Links. None of it is required to use the tool catalog — accounts are purely additive.

`JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`/`HISTORY_ENCRYPTION_KEY` must be set for the backend to boot at all (fail-fast env validation at boot) — generate each with `openssl rand -base64 32`. `GITHUB_OAUTH_CLIENT_ID`/`GOOGLE_OAUTH_CLIENT_ID` (+ secrets) are optional; email/password auth works without them, and the corresponding OAuth provider just returns a clear error if used unconfigured.

## License

MIT — see [LICENSE](./LICENSE). Free for personal and commercial use.

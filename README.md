# DevToolbox

**A free, modern, AI-powered developer toolbox — every utility a developer reaches for daily, in one fast, private, ad-light workspace.**

DevToolbox bundles 67 tools across formatting, conversion, encoding, security, text, code, image, network, and generator utilities, wraps them in a consistent, keyboard-first UI (command palette, smart-paste detection, pipelines to chain tools together, local history/favorites, PWA/offline support), and lays the groundwork for an optional AI Assistant for tasks that go beyond deterministic transforms (explain this regex, generate a JSON schema from this payload, summarize this diff). Nearly every tool runs entirely client-side — nothing is sent to a server. Five Module 8 tools (HTTP Request Tester, DNS Lookup, IP Lookup, Webhook Tester, Meta Tag Previewer) are the deliberate exception: they proxy through a small backend because the underlying operation (DNS resolution, receiving real inbound webhook traffic, avoiding CORS) genuinely can't happen in a browser tab — each one says so visibly in its own UI. Accounts/sync and the AI layer are still ahead on the roadmap, not live yet.

> Status: **Phase 2 (full deterministic tool catalog) complete — 67 tools shipped.** Phase 3 (accounts, sync, AI Gateway) is underway: optional accounts, email/password + GitHub/Google OAuth, cross-device Favorites/History sync, Snippets, server-synced Pipelines, and Share Links all shipped in wave 1, backed by the project's first Postgres/Prisma database. The AI Gateway and first AI tools haven't started yet. Every tool remains usable with zero account/backend setup — accounts are additive, never required. See [FEATURE.md](./FEATURE.md) for the full catalog/roadmap and [CHANGELOG.md](./CHANGELOG.md) for what's actually shipped, version by version.

---

## Why DevToolbox

The category is crowded — JSON formatters, Base64 encoders, and JWT decoders exist on dozens of domains — but it is crowded with the *same* product shipped over and over: a single tool, ad-heavy, inconsistent UX, no memory of what you did five minutes ago, and no story for anything that isn't a pure deterministic transform. See [ARCHITECTURE.md](./ARCHITECTURE.md#competitive-analysis) for the full landscape review. DevToolbox differentiates on:

1. **Breadth with coherence** — one design system, one command palette, one keyboard model, across every tool, instead of 60 disconnected single-purpose pages.
2. **Privacy by default** — client-side execution is the default for every tool where it's technically possible (see [ARCHITECTURE.md](./ARCHITECTURE.md#privacy--data-flow-model)). Server calls are explicit, visible, and limited to things that genuinely require them (AI features, URL shortening, team sync).
3. **AI as an accelerant, not a gimmick** — AI features solve problems deterministic tools structurally can't (explain, summarize, generate-from-example) rather than reskinning a formatter with a chat box.
4. **Workflows, not just tools** — chained pipelines ("decode JWT → format payload → diff against previous token"), history, and shareable snippets, because real developer tasks are rarely a single transform.
5. **Free core, forever** — the entire tool catalog is free and unauthenticated. Monetization (see [ARCHITECTURE.md](./ARCHITECTURE.md#monetization-strategy)) never gates a tool behind a paywall.

## Documentation Map

| Document | Purpose |
|---|---|
| [FEATURE.md](./FEATURE.md) | Full feature catalog, tool modules, prioritization, and roadmap |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Vision, goals, audience, competitive analysis, system architecture, NFRs, security, scalability, SEO, monetization |
| [DATABASE.md](./DATABASE.md) | Schema design, ERD, migrations strategy |
| [API.md](./API.md) | REST API reference, conventions, auth, error format |
| [UI_GUIDELINES.md](./UI_GUIDELINES.md) | Design system, component library, accessibility, theming |
| [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) | Local setup, folder structure, coding standards, how to add a new tool |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contribution workflow, PR standards, code of conduct |
| [CLAUDE.md](./CLAUDE.md) | Instructions for Claude / AI coding agents working in this repo |
| [AUDIT_REPORT.md](./AUDIT_REPORT.md) | Planning-phase audit: decisions made, risks, open items |
| [CHANGELOG.md](./CHANGELOG.md) | Version history |

## Tech Stack (summary — full rationale in ARCHITECTURE.md)

- **Frontend:** Next.js 15 (App Router) + React 19 + TypeScript, Tailwind CSS, Zustand (UI/theme state), Dexie/IndexedDB (local-first history, favorites, pipelines — no server-state library needed at this stage)
- **Backend:** Node.js + NestJS (TypeScript), PostgreSQL + Prisma, Redis, BullMQ — scaffolded per ARCHITECTURE.md but not yet load-bearing; no shipped tool currently depends on it
- **AI layer:** Anthropic Claude API (Sonnet/Haiku tier routing) via a thin internal AI gateway service
- **Infra:** Docker, GitHub Actions CI/CD, Vercel (frontend) + Fly.io/Render (API), Cloudflare (CDN/WAF), S3-compatible object storage
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

See [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) for the full directory breakdown of both apps.

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

`JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`/`HISTORY_ENCRYPTION_KEY` must be set for the backend to boot at all (fail-fast env validation, DEVELOPMENT_GUIDE.md §9) — generate each with `openssl rand -base64 32`. `GITHUB_OAUTH_CLIENT_ID`/`GOOGLE_OAUTH_CLIENT_ID` (+ secrets) are optional; email/password auth works without them, and the corresponding OAuth provider just returns a clear error if used unconfigured.

## License

MIT — see [LICENSE](./LICENSE). Free for personal and commercial use.

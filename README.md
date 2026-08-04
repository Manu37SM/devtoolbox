# DevToolbox

**A free, modern, AI-powered developer toolbox — every utility a developer reaches for daily, in one fast, private, ad-light workspace.**

DevToolbox bundles 62 tools across formatting, conversion, encoding, security, text, code, image, network, and generator utilities, wraps them in a consistent, keyboard-first UI (command palette, smart-paste detection, pipelines to chain tools together, local history/favorites, PWA/offline support), and lays the groundwork for an optional AI Assistant for tasks that go beyond deterministic transforms (explain this regex, generate a JSON schema from this payload, summarize this diff). Every shipped tool runs entirely client-side — nothing is sent to a server; that AI layer and accounts/sync are still ahead on the roadmap, not live yet.

> Status: **Phase 2 (full deterministic tool catalog) complete.** All P0/P1 client-side tools are shipped, along with pipelines, PWA/offline support, and an expanded command palette. Remaining Phase 2 scope is the server-proxied Module 8 tools (HTTP tester, webhook tester, DNS/IP lookup), which need real backend work. Phase 3 (accounts, sync, AI Gateway) hasn't started. See [FEATURE.md](./FEATURE.md) for the full catalog/roadmap and [CHANGELOG.md](./CHANGELOG.md) for what's actually shipped, version by version.

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
cp .env.example .env           # defaults are fine — no tool currently requires real values
npm install                    # installs frontend + backend + shared workspaces (run from repo root only)
npm run dev                    # runs frontend (3000) + backend (4000) concurrently
```

`docker compose up -d` (Postgres + Redis) is only needed once Phase 3 work starts using the backend for real — every shipped tool today is client-only and works with zero backend/database running.

## License

MIT — see [LICENSE](./LICENSE). Free for personal and commercial use.

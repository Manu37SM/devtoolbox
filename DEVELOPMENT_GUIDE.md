# DEVELOPMENT_GUIDE.md

Practical guide for engineers (human or AI-assisted) working in this repo: local setup, folder structure, coding standards, and — most importantly — the standardized contract for adding a new tool.

## 1. Prerequisites

- Node.js 22 LTS, npm 10+ (or pnpm 9+, see `package.json#packageManager`)
- Docker + Docker Compose (Postgres + Redis locally)
- Git

## 2. Local Setup

```bash
git clone <repo-url> devtoolbox && cd devtoolbox
cp .env.example .env                # fill in local secrets (AI key optional for frontend-only work)
docker compose up -d                # postgres:5432, redis:6379
npm install                         # installs all workspaces (frontend, backend, packages/shared)
npm run db:migrate                  # applies Prisma migrations
npm run db:seed                     # optional local fixtures
npm run dev                         # frontend :3000, backend :4000, concurrently
```

Frontend-only contributors (the majority of tool work) can run `npm run dev --workspace frontend` alone — nearly every tool needs zero backend connectivity to develop against.

## 3. Monorepo Structure

```text
devtoolbox/
├── frontend/
│   ├── src/
│   │   ├── app/                      # Next.js App Router
│   │   │   ├── (marketing)/          # landing, about, pricing — route group, own layout
│   │   │   ├── tools/
│   │   │   │   ├── [slug]/           # dynamic tool page: page.tsx resolves slug -> registry entry
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── opengraph-image.tsx
│   │   │   │   └── page.tsx          # tool catalog/index page
│   │   │   ├── pipelines/
│   │   │   ├── account/              # profile, settings, sync (Phase 3)
│   │   │   ├── s/[slug]/             # resolves a share link
│   │   │   ├── api/                  # Next.js route handlers ONLY for things that must be edge/SSR
│   │   │   │                         # (e.g., opengraph image generation, sitemap.xml) — NOT business logic
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── modules/
│   │   │   └── tools/                # ⭐ one subfolder per module (see FEATURE.md), one folder per tool inside
│   │   │       ├── data-format/
│   │   │       │   └── json-formatter/
│   │   │       │       ├── index.ts        # registry entry (metadata)
│   │   │       │       ├── transform.ts    # pure function(s) — the actual logic
│   │   │       │       ├── transform.test.ts
│   │   │       │       ├── schema.ts       # Zod schema for options/input
│   │   │       │       ├── ToolView.tsx    # React UI, composes shared components
│   │   │       │       └── content.mdx     # SEO "how it works" copy for the tool page
│   │   │       ├── encoding/
│   │   │       ├── security/
│   │   │       ├── text/
│   │   │       ├── code/
│   │   │       ├── converters/
│   │   │       ├── image/
│   │   │       ├── network/
│   │   │       ├── generators/
│   │   │       └── ai/
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn/ui-based primitives (Button, Input, Dialog...)
│   │   │   ├── layout/                # AppShell, TopBar, SideNav, CommandPalette
│   │   │   ├── tools/                 # ToolShell, OptionsPanel, OutputPane, DiffView, HistoryDrawer
│   │   │   └── shared/                # cross-cutting non-tool components (Toast host, ThemeProvider)
│   │   ├── hooks/                     # useDebouncedValue, useLocalHistory, useClipboard, useSmartPaste
│   │   ├── lib/                       # registry.ts (tool registry), analytics.ts, api-client.ts, workers/
│   │   ├── store/                     # Zustand stores: theme, palette, activePipeline
│   │   ├── styles/                    # Tailwind config, design tokens
│   │   ├── types/                     # shared frontend TS types not in packages/shared
│   │   └── config/                    # site config, feature flags
│   └── public/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/            # controller, service, dto/, strategies/ (jwt, github, google)
│   │   │   ├── users/
│   │   │   ├── sync/            # favorites, history, snippets, pipelines sub-resources
│   │   │   ├── share/
│   │   │   ├── ai-gateway/      # prompt templates, model routing, streaming controller
│   │   │   ├── analytics/
│   │   │   └── admin/
│   │   ├── common/
│   │   │   ├── decorators/      # @CurrentUser(), @Public()
│   │   │   ├── filters/         # global exception filter -> standard error format
│   │   │   ├── guards/          # JwtAuthGuard, RolesGuard, RateLimitGuard
│   │   │   ├── interceptors/    # logging, response transform
│   │   │   ├── pipes/           # ZodValidationPipe
│   │   │   └── utils/
│   │   ├── config/              # typed config module (env validation via Zod at boot)
│   │   ├── database/
│   │   │   ├── migrations/
│   │   │   └── seeds/
│   │   ├── jobs/                 # BullMQ processors (share-link cleanup, usage rollups)
│   │   ├── middleware/
│   │   └── tests/                # e2e (supertest) suites, one per module
│   └── prisma/
│       └── schema.prisma
├── packages/
│   └── shared/                   # types & Zod schemas shared frontend<->backend (AI gateway DTOs, tool metadata types)
├── docs/                         # ADRs, diagrams, supplementary specs
├── scripts/                      # bootstrap.sh, release.sh, generate-tool.ts (scaffolding CLI)
└── .github/workflows/            # ci.yml, deploy-frontend.yml, deploy-backend.yml
```

## 4. Coding Standards

- **TypeScript strict mode everywhere.** No `any` without a `// TODO(reason)` comment; prefer `unknown` + narrowing.
- **Pure logic separated from UI.** Every tool's `transform.ts` must be importable and testable with zero React/DOM dependency — this is what makes tools portable to Web Workers, SSR, and a future CLI.
- **Validation at the boundary.** Zod schemas validate both API DTOs (backend) and tool input/options (frontend) — no unvalidated data crosses a module boundary.
- **No default exports** except for Next.js page/layout files (framework requirement) — named exports everywhere else for better refactor-safety and IDE support.
- **Formatting/linting:** Prettier + ESLint (`@typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`), enforced via pre-commit hook (`lint-staged` + `husky`) and CI.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`...) — powers automated CHANGELOG.md generation.
- **File naming:** `kebab-case` for files/folders, `PascalCase` for React components, `camelCase` for functions/variables.

## 5. Adding a New Tool (the standardized contract)

Every tool — regardless of module — must ship these five pieces. Use `npm run generate:tool` (scaffolding script in `scripts/generate-tool.ts`) to stub all five from a prompt.

1. **`schema.ts`** — Zod schema for the tool's input and options. This is the single source of truth; the `OptionsPanel` UI is generated from it.
2. **`transform.ts`** — one or more pure functions implementing the actual logic. Must have no side effects, no DOM/window access (so it can run in a Worker, on the server for SSR/tests, or eventually a CLI). Heavy transforms (>~50ms typical input) must be Worker-eligible (documented via an `isWorkerEligible: true` flag in the registry entry).
3. **`transform.test.ts`** — Vitest unit tests covering: valid input, edge cases (empty, huge, malformed), and every documented option combination. Minimum coverage threshold enforced in CI (see below).
4. **`ToolView.tsx`** — the React UI, composed from `ToolShell` + shared components (`OptionsPanel`, `OutputPane`, `CodeEditor`, etc. — see UI_GUIDELINES.md §4). New bespoke layout code requires design review sign-off; the default path is composition only.
5. **`index.ts`** — the registry entry:

   ```ts
   export const jsonFormatterTool: ToolRegistryEntry = {
     slug: "json-formatter",
     name: "JSON Formatter",
     module: "data-format",
     description: "Format, validate, and minify JSON with syntax error highlighting.",
     aliases: ["json beautifier", "json validator", "pretty print json"],
     icon: "Braces",
     isClientOnly: true,
     isWorkerEligible: false,
     smartDetect: (input) => looksLikeJson(input),
     seo: { keywords: ["json formatter", "json validator", "json beautifier"] },
   };
   ```

6. Register the entry in `frontend/src/lib/registry.ts` (single array, becomes the source for the command palette, sitemap, catalog page, and related-tools linking — never hand-duplicate tool metadata elsewhere).
7. Add `content.mdx` with a short "how it works"/"common use cases" section per UI_GUIDELINES.md §8 and ARCHITECTURE.md §13 (SEO).

**Definition of done for a new tool:** unit tests passing with coverage threshold, Storybook story for any new shared component it required, Lighthouse ≥95 on its page, axe-core clean, entry in FEATURE.md status updated, CHANGELOG.md entry.

## 6. Testing Strategy

| Layer | Tool | Scope |
| --- | --- | --- |
| Unit (transform logic) | Vitest | Every `transform.ts` — the highest-leverage tests in the repo |
| Component | React Testing Library + Vitest | Shared components (`ui/`, `tools/`) and representative `ToolView`s |
| Visual/interaction | Storybook + Chromatic (or Percy) | Shared component states, catch unintended visual regressions |
| Accessibility | axe-core (via `@axe-core/playwright`) | Component library + fixed set of tool pages, run in CI |
| E2E | Playwright | Critical user journeys: use a tool, command palette search + smart-paste, create a pipeline, sign up/login, create + open a share link |
| Backend unit | Vitest/Jest | Service-layer logic (auth, sync ownership checks, AI gateway prompt assembly) |
| Backend e2e | Supertest | Full HTTP request/response per module, against a test database |
| Load | k6 (ad hoc, pre-launch and pre-major-release) | AI gateway and share endpoints under burst traffic |

Coverage gate: 80% line coverage minimum on `transform.ts` files and backend `service.ts` files, enforced in CI; UI components are tested for behavior, not coverage percentage.

## 7. CI/CD

- **CI (GitHub Actions, `ci.yml`):** on every PR — install (cached), typecheck, lint, unit tests, build, Storybook build + a11y check, Playwright smoke suite against a preview build.
- **Preview deploys:** every PR gets a Vercel preview URL (frontend) and an ephemeral backend environment (Fly.io/Render preview app) for full-stack PRs touching the API.
- **CD:** merge to `main` → automatic deploy to staging → manual promote to production (or automatic after a smoke-test gate, revisited once release cadence stabilizes). Backend deploys run Prisma migrations as a pre-deploy step with an automatic rollback plan if migration fails.
- **Release/versioning:** semantic-release driven by Conventional Commits, auto-generates CHANGELOG.md entries and git tags.

## 8. Logging, Monitoring, Analytics

- **Error tracking:** Sentry (frontend + backend), scrubbed of any tool input/output content via `beforeSend` redaction — stack traces and metadata only.
- **APM/tracing:** OpenTelemetry SDK in the backend, exported to a hosted backend (e.g., Grafana Cloud/Honeycomb) — traces auth, sync, AI gateway, and network-proxy request paths.
- **Metrics/dashboards:** Prometheus-format metrics (request rate/latency/error rate per route, AI token usage, queue depth) visualized in Grafana.
- **Product analytics:** privacy-respecting, aggregate-only event tracking (tool opened, transform run [no content], pipeline created, share created) via a self-hosted or privacy-first provider (e.g., Plausible/PostHog with input capture disabled) — never third-party ad-network trackers, per ARCHITECTURE.md §12/NFR privacy requirement.
- **Uptime:** external synthetic monitoring (e.g., Better Uptime/Checkly) against key routes and the AI gateway health endpoint.

## 9. Environment Configuration

`.env.example` documents every required variable with no real values:

```bash
# Backend
DATABASE_URL=
REDIS_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
HISTORY_ENCRYPTION_KEY=
FRONTEND_URL=
ANTHROPIC_API_KEY=
OBJECT_STORAGE_ENDPOINT=
OBJECT_STORAGE_BUCKET=
GITHUB_OAUTH_CLIENT_ID=
GITHUB_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
RESEND_API_KEY=
EMAIL_FROM=
SENTRY_DSN=

# Frontend
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_ANALYTICS_HOST=
NEXT_PUBLIC_GITHUB_CLIENT_ID=
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
```

Backend config is validated at boot via a Zod schema (`backend/src/config`) — the process fails fast with a clear message on any missing/malformed variable rather than failing later at first use.

Both workspaces' `dev`/`build`/`start`/`db:*` scripts are wrapped with `dotenv-cli` (`dotenv -e ../.env -- ...`) so a single root-level `.env` is the source of truth for both — Next.js and the Prisma CLI otherwise only look for env files inside their own workspace directory, not the monorepo root. `build`/`start` additionally force `NODE_ENV=production` via `cross-env` *before* `dotenv` loads the file, since `dotenv` never overrides a variable that's already set — without that, `.env`'s `NODE_ENV=development` (correct for `dev`) would leak into production commands and break `next build`'s static generation in confusing ways.

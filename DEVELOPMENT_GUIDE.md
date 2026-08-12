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
│   ├── prisma/
│   │   └── schema.prisma
│   └── Dockerfile                # production image, built via `turbo prune` (AUDIT_REPORT.md §24/§25)
├── render.yaml                   # Render Blueprint: backend web service + Postgres + Redis (Key Value), all free tier (AUDIT_REPORT.md §25)
├── packages/
│   └── shared/                   # types & Zod schemas shared frontend<->backend (AI gateway DTOs, tool metadata types)
├── docs/                         # ADRs, diagrams, supplementary specs
├── scripts/                      # bootstrap.sh, release.sh, generate-tool.ts (scaffolding CLI)
├── vercel.json                   # Vercel monorepo build config for the frontend
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

- **CI (GitHub Actions, `ci.yml`):** on every PR — install (cached), typecheck, lint, unit tests, build, Storybook build + a11y check.
- **CD — ✅ shipped (AUDIT_REPORT.md §24/§25):** `deploy-backend.yml` and `deploy-frontend.yml` both trigger via `workflow_run` on `ci.yml`'s completion on `main` — a broken build/lint/test run blocks both deploys, not just the one that happened to touch that workspace. Backend deploys to **Render** (`backend/Dockerfile` + `render.yaml`, built via `turbo prune` so the image only carries `@devtoolbox/backend` + `@devtoolbox/shared`, not the frontend/CLI/extension); `render.yaml`'s `preDeployCommand` runs `prisma migrate deploy` before any new instance starts serving traffic — no separate manual migration step. The deploy workflow POSTs to a Render Deploy Hook rather than relying on Render's own auto-deploy-on-push, so a redeploy only happens after this monorepo's full CI run passes (see AUDIT_REPORT.md §25 for why Fly.io was dropped in favor of Render — Fly lost its free tier in 2026). Frontend deploys to **Vercel** via the CLI (`vercel.json` at repo root, `installCommand: npm ci` + `buildCommand: npx turbo run build --filter=@devtoolbox/frontend` so the monorepo's shared package resolves correctly) rather than Vercel's own Git-integration auto-deploy, specifically so it's gated behind the same CI run as the backend.
- **Preview deploys — not yet built.** No per-PR ephemeral environments (Vercel preview URLs, ephemeral backend). A real gap for a team iterating with pull requests; not blocking for a single-maintainer / pre-launch setup, which is what CD was built for first.
- **Staging environment — not yet built.** `main` deploys straight to production; no staged rollout. Given the size of this deployment (single Render web service, single Vercel project), a staging tier is a reasonable next addition but wasn't built speculatively.
- **Release/versioning:** semantic-release driven by Conventional Commits is described in CHANGELOG.md's header note but not yet wired up as an actual CI step — CHANGELOG.md entries have been maintained by hand through this project's entire build-out so far.
- **Required GitHub Actions secrets** for the two deploy workflows: `RENDER_DEPLOY_HOOK_URL` (backend, from the devtoolbox-api service's Settings → Deploy Hook in the Render dashboard), `VERCEL_TOKEN`/`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` (frontend, obtained via `vercel link` once against the real Vercel project). Full step-by-step for every one of these is in PROD_READY.md.

## 8. Logging, Monitoring, Analytics

- **Error tracking — ✅ shipped (AUDIT_REPORT.md §24):** Sentry, backend (`@sentry/node`, initialized in `main.ts`) and frontend (`@sentry/nextjs`, `sentry.client/server/edge.config.ts` + `src/instrumentation.ts` + `src/app/global-error.tsx`). Deliberately narrow, per CLAUDE.md rule 8: no automatic request-body/cookie capture, no Session Replay (a dev-tools product's entire surface is "paste your data in" — Replay would routinely record exactly the content rule 8 forbids), `beforeSend` strips `request.data`/`extra` as defense-in-depth, and the backend's `GlobalExceptionFilter` only reports true 5xx/unhandled errors (never 4xx validation/auth errors, which are expected control flow and could echo user input in `exception.message`). No `tracesSampleRate` (performance tracing) enabled yet — error capture only.
- **APM/tracing, metrics/dashboards (OpenTelemetry, Prometheus/Grafana) — not yet built.** Still the plan for when traffic/team size justifies the operational overhead; error tracking alone (above) is the higher-priority first step and is what shipped.
- **Product analytics — not yet built.** `NEXT_PUBLIC_ANALYTICS_HOST` exists as a placeholder env var; no provider (Plausible/PostHog/etc.) is actually integrated yet.
- **Uptime monitoring — not yet built.** Render's own health check (`render.yaml`'s `healthCheckPath`, polling `GET /v1/health`) restarts an unhealthy backend instance automatically, but there's no external synthetic monitoring (Better Uptime/Checkly/etc.) alerting a human if the whole app goes down — and on the free plan, an idle instance sleeping after 15 minutes is expected behavior, not something a monitor should page on.

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
BACKEND_URL=                  # this backend's own origin — needed for the SAML ACS callback URL (§17.5)
SSO_SECRET_ENCRYPTION_KEY=    # org SSO client-secret encryption at rest
ANTHROPIC_API_KEY=
AI_MODEL_HAIKU=
AI_MODEL_SONNET=
OBJECT_STORAGE_ENDPOINT=
OBJECT_STORAGE_BUCKET=
GITHUB_OAUTH_CLIENT_ID=
GITHUB_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
RESEND_API_KEY=
EMAIL_FROM=
SENTRY_DSN=
RAZORPAY_KEY_ID=              # migrated off Stripe — AUDIT_REPORT.md §20 (no India support)
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
RAZORPAY_PLAN_ID_PRO=
RAZORPAY_PLAN_ID_TEAM=

# Frontend
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_ANALYTICS_HOST=
NEXT_PUBLIC_GITHUB_CLIENT_ID=
NEXT_PUBLIC_GOOGLE_CLIENT_ID=

# Frontend build-time only (source-map upload; not needed to run/build without them,
# only for readable stack traces in the Sentry dashboard) — set as CI secrets, not
# needed locally:
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
```

Backend config is validated at boot via a Zod schema (`backend/src/config`) — the process fails fast with a clear message on any missing/malformed variable rather than failing later at first use.

Both workspaces' `dev`/`build`/`start`/`db:*` scripts are wrapped with `dotenv-cli` (`dotenv -e ../.env -- ...`) so a single root-level `.env` is the source of truth for both — Next.js and the Prisma CLI otherwise only look for env files inside their own workspace directory, not the monorepo root. `build`/`start` additionally force `NODE_ENV=production` via `cross-env` *before* `dotenv` loads the file, since `dotenv` never overrides a variable that's already set — without that, `.env`'s `NODE_ENV=development` (correct for `dev`) would leak into production commands and break `next build`'s static generation in confusing ways.

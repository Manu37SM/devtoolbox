# AUDIT_REPORT.md

Planning-phase audit for DevToolbox. Records the key decisions made during architecture/planning, the reasoning behind them, known risks, and items intentionally left open for the implementation phase. Treat this as the paper trail for "why does the system look like this" — update it at the end of each major phase, don't just add to FEATURE.md/ARCHITECTURE.md silently.

## 1. Scope of This Audit

Covers the planning phase only: research, blueprint (ARCHITECTURE.md), feature catalog (FEATURE.md), schema (DATABASE.md), API design (API.md), design system (UI_GUIDELINES.md), dev process (DEVELOPMENT_GUIDE.md), and repo scaffolding. No feature code has been implemented; `frontend/` and `backend/` contain folder scaffolding only.

## 2. Key Decisions & Rationale

| Decision | Rationale | Alternative considered |
|---|---|---|
| Client-side-first execution for all deterministic tools | Matches category baseline (every credible competitor is client-side now, per research), removes infra cost/scaling concern for the bulk of the product, builds trust for sensitive payloads (API keys, tokens) | Server-side processing — rejected: adds cost, latency, and trust friction with no offsetting benefit for pure transforms |
| Next.js (App Router) over a pure SPA (Vite+React) | SEO requires real, statically generated, crawlable pages per tool (ARCHITECTURE.md §13) — a pure client SPA can't deliver that without significant extra tooling that Next.js provides natively | Vite SPA + prerendering plugin — rejected: reinvents what Next.js SSG already solves well |
| NestJS over a lighter framework (Express/Fastify raw) | Backend has genuinely separable domains (auth, sync, share, AI gateway, analytics) that benefit from NestJS's module/DI structure as the surface grows toward Phase 4 (teams, admin, public API) | Express + manual structure — rejected: would likely converge on reinventing Nest's patterns by Phase 3 anyway |
| PostgreSQL + Prisma | Relational shape (users, ownership, join tables for orgs) is a natural fit; Prisma's typed client keeps the shared-types story clean with `packages/shared` | MongoDB — rejected: no document-shaped data that benefits from schema flexibility here; relational integrity (ownership, cascades) matters more |
| REST over GraphQL | Resource shapes are simple CRUD plus a small task-specific AI surface; GraphQL's benefits (flexible nested queries) don't apply to this data shape | GraphQL — rejected for now; revisit only if Phase 4 team/admin dashboards develop genuinely complex nested query needs |
| AI Gateway as task-specific endpoints, not a generic chat passthrough | Keeps prompts server-controlled and reviewable, avoids prompt-injection risk of exposing a raw model passthrough, keeps request/response shapes typed | Generic `/ai/chat` endpoint — rejected: harder to rate-limit/cost-control per feature, harder to keep safe against payload-embedded instructions |
| Tool content never used in product analytics | Non-negotiable per ARCHITECTURE.md privacy NFR; also removes an entire category of security/compliance risk | N/A — not seriously considered otherwise |
| Local-first data model (IndexedDB) with optional server sync | Lets the entire MVP ship with zero required backend for the core experience, matches "no signup required" goal, and keeps the free tier meaningfully free | Server-required accounts — rejected: contradicts the no-login-required product goal and adds infra cost from day one |
| Monorepo (npm/pnpm workspaces + Turborepo) | Shared types (`packages/shared`) between frontend/backend need one source of truth; a monorepo keeps DTO drift from happening | Separate repos — rejected: DTO/type drift risk outweighs the marginal deployment-independence benefit at this team size |

## 3. Competitive Research Summary (see ARCHITECTURE.md §4 for full detail)

Reviewed: single-tool SEO sites (jsonformatter.org, json.site), aggregator web suites (AdminSo DevToolbox, Converter360, developer-toolbox.dev, fmt.hjlabs.in), and native/offline apps (DevToys, DevUtils.app, DevTools-X). Findings that directly shaped this blueprint:

- Client-side execution and "no signup" are now baseline expectations, not differentiators — confirmed the architecture's hard default rather than treating it as a headline feature.
- "Smart detection" (native apps auto-selecting a tool from clipboard content) has no strong web equivalent — informed the command palette's smart-paste requirement (FEATURE.md, cross-cutting features).
- No competitor treats tool chaining/workflows as first-class — informed the Pipelines feature as a Phase 2 differentiator.
- No competitor has a real AI layer beyond a single bolted-on "AI code gen" tool — informed the AI Gateway architecture and Module 10 tool set.
- Aggregator sites are visually near-identical to each other — informed the emphasis on a distinctive design system (UI_GUIDELINES.md) as a differentiator in its own right.

## 4. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| AI Gateway cost overrun from abuse (scripted usage against free tier) | Medium | Medium | Per-IP + per-user rate limits (API.md §12), response caching for idempotent requests, tiered model routing (Haiku for cheap tasks) |
| SEO underperformance vs. established single-tool domains with years of backlinks | Medium | High (core acquisition channel) | Breadth + internal linking strategy, genuinely useful content per tool page (not thin filler), long-tail coverage across 60+ tools compounds over time — accept this is a multi-quarter effort, not instant |
| "Breadth over depth" perception — a competitor could out-feature us on any single tool | Low-Medium | Medium | Prioritization (FEATURE.md) intentionally matches or exceeds competitor depth on the highest-traffic tools first; coherence/workflow value compounds where competitors can't easily follow |
| Scope creep — 60+ tools is a lot of surface to maintain at quality | High | Medium | Strict tool contract (DEVELOPMENT_GUIDE.md §5) keeps marginal cost per tool low and consistent; phased roadmap prevents building everything before validating the MVP core |
| Prompt injection via tool payloads reaching the AI gateway (e.g., a "diff summary" input containing instructions aimed at the model) | Medium | Medium-High | AI gateway system prompts explicitly frame user content as data, not instructions (CLAUDE.md rule 7); output is always constrained to the task shape (e.g., diff-summary can't emit arbitrary free-form actions) |
| Local-first data model complicates sync conflict resolution once accounts ship | Medium | Low-Medium | Last-write-wins with user-visible conflict prompt for pipelines specifically (the one entity worth protecting from silent overwrite) — documented in DATABASE.md §7, to be implemented in Phase 3 |
| Free-forever core conflicts with sustainable unit economics at scale | Low-Medium | High (long-term) | Client-side execution keeps marginal cost per tool-use near zero; the costed surfaces (AI, network proxies, storage) are exactly where Pro-tier quotas apply (ARCHITECTURE.md §14) |

## 5. Open Items for Implementation Phase

These are intentionally deferred — not oversights, but decisions better made with real usage data or during hands-on implementation:

- Exact model routing table per AI tool (which tasks get Haiku vs. Sonnet) — start conservative (cheapest model that meets quality bar), tune after real usage/cost data.
- Final choice of hosted vs. self-hosted product analytics provider (Plausible vs. PostHog vs. self-hosted) — either satisfies the privacy requirement; pick based on Phase 1 team bandwidth for self-hosting.
- Exact Pro-tier pricing — deferred to Phase 3 when there's usage data to model unit economics against.
- Object storage provider (S3 vs. R2 vs. Backblaze) — functionally interchangeable behind the abstraction in ARCHITECTURE.md §8.3; pick on cost at implementation time.
- Whether the plugin/marketplace system (ARCHITECTURE.md §15) uses WASM sandboxing or a server-review-only model for community tools — needs a dedicated security design pass before Phase 4, not decided here.
- Internationalization: framework is i18n-ready (NFR, §7) but no locales beyond English are scoped for translation work yet — revisit after MVP traction data shows demand.

## 6. Definition of "Planning Phase Complete"

- [x] Competitive landscape researched and documented
- [x] Vision, goals, audience, and differentiation strategy defined
- [x] Full feature catalog with prioritization and phased roadmap
- [x] Technical architecture (frontend, backend, data flow, privacy model) defined with rationale
- [x] Security, scalability, performance, accessibility, SEO, and monetization strategies documented
- [x] Database schema designed
- [x] REST API surface designed
- [x] Design system and component library specified
- [x] Folder structure scaffolded for both frontend and backend
- [x] Development process, testing strategy, and CI/CD approach documented
- [x] Core documentation set authored (README, FEATURE, ARCHITECTURE, DATABASE, API, UI_GUIDELINES, DEVELOPMENT_GUIDE, CONTRIBUTING, CLAUDE, AUDIT_REPORT, CHANGELOG)

**Status: Complete.** Ready to begin Phase 1 (MVP) implementation per FEATURE.md's phased roadmap, starting with the app shell and the first tranche of P0 tools.

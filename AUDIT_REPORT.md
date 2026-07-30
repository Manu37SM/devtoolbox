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

## 7. Phase 1 Implementation Progress (in-flight audit)

Updated as MVP implementation proceeds. See CHANGELOG.md for the dated entry log.

### 7.1 Shipped in this pass

- App shell: Next.js App Router layout, design tokens (light/dark) per UI_GUIDELINES.md §2, `AppShell`/`ToolShell`/`OptionsPanel`-equivalent composition primitives (`ToolShell`, `DualPane`, `OutputPane`, `CopyButton`), tool catalog page, dynamic `/tools/[slug]` page with static params + SEO metadata generation.
- **All 29 P0 tools from FEATURE.md's MVP scope**, each shipping the full contract (schema.ts, transform.ts, transform.test.ts, index.ts, content.mdx, ToolView.tsx):
  - Module 1: JSON Formatter, JSON↔YAML, JSON↔XML, JSON↔CSV, XML Formatter/Validator, YAML Formatter/Validator.
  - Module 2: Base64, URL Encode/Decode, HTML Entity Encode/Decode, JWT Decoder.
  - Module 3: Hash Generator (MD5/SHA-1/256/512), UUID Generator (v4/v7 + inspector), Password Generator.
  - Module 4: Text Diff Checker, Case Converter, Lorem Ipsum Generator, String/Word/Char Counter, Regex Tester/Debugger, Markdown↔HTML.
  - Module 5: JS/TS Beautifier, CSS Beautifier, HTML Beautifier, Cron Expression Builder/Parser.
  - Module 6: Number Base Converter, Unix Timestamp Converter, Color Converter.
  - Module 7: QR Code Generator (text/URL + WiFi/vCard payload builders).
  - Module 9: Random Number/String Generator, GUID/UUID Bulk Generator (reuses Module 3's UUID engine per FEATURE.md's note).
- 221 unit tests across all 29 `transform.ts` files, verified passing (Vitest) in an isolated sandbox check (full `npm install` in the monorepo could not complete within this session — see 7.3). Every tool's `.ts` source also verified clean against `tsc --strict` with zero errors, run across the entire `modules/tools` tree in one pass.

### 7.2 Deviations from the original plan (per CLAUDE.md rule 10)

- **New tool-specific dependencies added, flagged and approved before adding** (per CLAUDE.md's "flag before proceeding" rule for anything outside ARCHITECTURE.md's stack): `js-yaml` (JSON↔YAML, YAML Formatter), `qrcode` (QR Code Generator), `prettier` standalone + `plugins/babel`, `plugins/typescript`, `plugins/estree`, `plugins/postcss`, `plugins/html` (JS/TS, CSS, HTML Beautifiers), and `dompurify` (Markdown→HTML preview sanitization — this one was already named in ARCHITECTURE.md §9's plan but not yet added to `package.json`). ARCHITECTURE.md §8.2 updated with rationale in the same pass.
- **`@types/node`, `@types/react`, `@types/react-dom`, `@types/js-yaml`, `@types/qrcode`, `@types/dompurify` added to `frontend/package.json` devDependencies** — required for the TypeScript toolchain to compile the above at all.
- **Beautifier tools ship "beautify" only, not "minify."** FEATURE.md's Module 5 rows are named "JS/TS Beautifier & Minifier" etc.; Prettier (the approved formatting dependency) does not minify. Real minification needs a separate tool (terser for JS, csso for CSS, html-minifier-terser for HTML) — deliberately not added in this pass to avoid stacking multiple dependency approvals in one go. Tracked as a follow-up; flag before adding.
- **`frontend/src/lib/tool-transform.ts`** shared `TransformResult` type (introduced last pass) is now used by most — but not all — tools; a few (e.g. hash-generator, uuid-generator, cron-builder, text-diff) intentionally use their own richer result shape since a plain `{output,error}` string pair doesn't fit their data (arrays, structured stats, ISO date lists). This is the right call, not an inconsistency to fix.
- **`xml-core.ts`** (shared hand-rolled XML parser/serializer used by both `json-xml` and `xml-formatter`) lives at `modules/tools/data-format/xml-core.ts`, a module-level shared file sitting alongside — not inside — either tool's own folder, following the same "extract shared sub-problem" pattern as `lib/tool-transform.ts`.
- **Markdown→HTML sanitization happens in `ToolView.tsx`, not `transform.ts`.** DOMPurify requires a real DOM (`window`), which would violate the "transform.ts must be Worker/SSR/CLI-safe, zero DOM dependency" rule in DEVELOPMENT_GUIDE.md §5. `markdownToHtml()` is a pure parser returning **unsanitized** HTML by design (documented in its own docblock); the browser-only ToolView calls `DOMPurify.sanitize()` before rendering. Any other consumer of `markdownToHtml()` must sanitize before rendering — this is a sharp edge worth calling out explicitly to whoever builds the next Markdown-consuming tool (e.g. a future Pipelines feature).
- **Cron next-run calculation is computed in UTC**, not the browser's local timezone, for determinism (see `cron-builder/transform.ts`). This is disclosed in the tool's UI ("Next N runs (UTC)") and content.mdx. A local-timezone toggle is a reasonable Phase 2 addition.
- **Hash Generator ships MD5/SHA-1/SHA-256/SHA-512, not Keccak** (FEATURE.md lists "Keccak" in the P0 row). Keccak/SHA-3 needs a pure-JS implementation (not in WebCrypto) and was deferred; tracked as a follow-up.
- **CodeMirror 6 not yet wired in.** `components/ui/textarea.tsx` is a plain `<textarea>` standing in for the `CodeEditor` component named in UI_GUIDELINES.md §4/DEVELOPMENT_GUIDE.md. It matches the same value/onChange contract ToolView code depends on, so swapping in a real CodeMirror wrapper later won't require touching tool code — but syntax highlighting, line numbers, and the JetBrains Mono ligature toggle are not yet implemented.
- **Command palette, left nav, history drawer, favorites/pinning, and theme toggle UI are not yet built.** `AppShell` currently ships only a top bar + logo. These are P0 cross-cutting features per FEATURE.md and are the top priority for the next implementation pass.

### 7.3 Known gaps / tech debt for next session

- **Full monorepo `npm install` could not be completed in this working session** — the sandboxed shell environment enforces a 45s hard timeout per command with no persistent background processes, and installing the full dependency set (Next.js, Storybook, Playwright, Prisma, etc.) takes longer than that. Verification was instead done by mirroring the entire framework-agnostic `modules/tools/**/transform.ts` + `transform.test.ts` tree (all 29 tools) into an isolated scratch project with `vitest` + `zod` + `typescript` + the specific tool-level deps (`js-yaml`, `qrcode`, `prettier`) installed — all 221 tests pass and a full `tsc --strict` pass across every tool's `.ts` source is clean. **Action item: run `npm install` and `npm run build` locally/in CI before merging**, since `next build`, ESLint, and the full component tree (React/Next JSX, `.tsx` ToolViews) have not been compiled end-to-end in this session — only the pure transform logic was executed and typechecked directly; the `ToolView.tsx` files were reviewed by hand but not compiled or rendered.
- **No git history.** The mounted working directory does not support `git init`/`git add`/`git commit` in this sandbox (filesystem permission errors on `.git/objects`, likely due to the Windows-mount layer). The project has no commit history yet — **action item: initialize git and make an initial commit from a normal local shell** before continuing work, otherwise there's no way to review incremental diffs or roll back.
- **All 29 P0 tools are now shipped** — the Phase 1 tool backlog per FEATURE.md's "20 P0 tools" MVP target is complete (in fact all 29 P0-priority rows across every module are done, slightly exceeding the original MVP scope). Remaining Phase 1 work is the cross-cutting platform features below, not more tools.
- **Storybook stories, Playwright E2E, axe-core CI checks not yet added** for the shared components (`Button`, `Textarea`, `Badge`, `ToolShell`, `OutputPane`, `DualPane`, `CopyButton`) — required per DEVELOPMENT_GUIDE.md §5/§10 "definition of done" but out of scope for this pass given the install-time constraint above.
- **Minification** for the three Module 5 beautifier tools (see 7.2) needs a follow-up dependency approval (terser/csso/html-minifier-terser) before it can ship.
- **Left nav is still not built** — the command palette (now shipped, see §7.4) covers primary navigation for the MVP, but a persistent collapsible left nav (UI_GUIDELINES.md §3: "240px, collapsible to 64px icon rail") is still open.
- **Pipelines, PWA/offline, smart-paste completion polish** — Phase 2 scope per FEATURE.md's roadmap, not started.

### 7.4 Cross-cutting platform features (this pass)

All five remaining P0 cross-cutting features from FEATURE.md are now shipped:

- **Command palette** (`components/layout/CommandPalette.tsx`) — ⌘K/Ctrl+K global launcher (Radix Dialog), fuzzy search via a small dependency-free scorer (`lib/fuzzy-search.ts`, substring/prefix/alias/description matching — good enough for tens of tools; would need a real subsequence matcher at hundreds+), full keyboard navigation (↑/↓/Enter), and smart-paste detection (`lib/smart-detect.ts`) that recognizes JWTs, hex colors, UUIDs, Unix timestamps, JSON, and Base64 in the search input and offers a one-click jump to the matching tool. 23 unit tests across the two lib files, all passing.
- **Local history** (`lib/db.ts`, `hooks/useLocalHistory.ts`) — every tool visit is recorded to an IndexedDB `history` table via Dexie, capped at the 200 most recent entries (oldest trimmed automatically). `useRecentTools()` surfaces a deduplicated "most recently visited" list, rendered in a "Recently used" section on the home page.
- **Favorites/pinning** (`lib/db.ts`, `hooks/useFavorites.ts`, `components/tools/FavoriteButton.tsx`) — a star toggle in the tool page header (top-right, next to title) persists to a `favorites` IndexedDB table; a "Favorites" section on the home page surfaces pinned tools.
- **Dark/light/system theme** (`store/theme-store.ts`, `components/layout/ThemeToggle.tsx`) — Zustand store (persisted to localStorage) cycling light → dark → system, `.dark` class applied to `<html>`. The blocking inline script in `app/layout.tsx` was updated to read the *same* localStorage key and JSON envelope shape the zustand-persist middleware writes, so first paint resolves to the correct theme with no flash — this coupling is called out in comments in both files since the two must stay in sync if the storage key/shape ever changes.
- **Keyboard shortcuts overlay** (`components/layout/KeyboardShortcutsOverlay.tsx`) — opens on `?` (ignored while an `<input>`/`<textarea>` has focus, so it doesn't fire while a tool's own input contains a literal `?`), lists all current shortcuts.

**Architecture note on Server/Client component split:** `ToolShell.tsx` and `app/page.tsx` (the catalog) stay server components for SEO/static generation, per DEVELOPMENT_GUIDE.md's rendering strategy. The IndexedDB-backed bits (history recording, favorite toggle, "Favorites"/"Recently used" sections) are isolated into small client-only children (`ToolPageEffects.tsx`, `HomeQuickAccess.tsx`) rather than making the whole page client-rendered — this preserves static generation for the parts that matter for SEO while still allowing local-only interactivity.

**Verification:** `lib/db.ts`, `store/theme-store.ts`, `store/command-palette-store.ts`, `store/shortcuts-overlay-store.ts`, `lib/smart-detect.ts`, and `lib/fuzzy-search.ts` were typechecked against real `dexie`/`zustand` installs in an isolated scratch project (`tsc --strict`, zero errors) to confirm the Dexie `EntityTable` type and Zustand v5's `persist`/`partialize`/`onRehydrateStorage` APIs were used correctly — these are exactly the kind of library-version details that are easy to get subtly wrong without compiling against the real package. The `.tsx` components (which need React/Next JSX) were reviewed by hand but not compiled, per the same sandbox constraint noted in 7.3 — **action item: run `npm run typecheck` and `npm run build` for the full component tree once `npm install` can complete.**

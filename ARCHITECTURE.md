# ARCHITECTURE.md

Project blueprint for **DevToolbox** — vision, market context, system design, and cross-cutting requirements.

---

## 1. Vision

Be the default browser tab a developer opens for any "small task that isn't worth opening an IDE for" — formatting, converting, decoding, generating, testing, or understanding a piece of data — and make it feel like one coherent product rather than a directory of disposable single-page tools.

**North star:** a developer should be able to solve a multi-step data-wrangling problem (e.g., "I have a webhook payload, I need to decode the JWT in it, pretty-print the nested JSON, diff it against yesterday's payload, and share the result with a teammate") without leaving the tab, without an account, and without their data touching a server unless they explicitly ask for something that requires it.

## 2. Goals

### Product goals
- Ship a coherent catalog of 60+ tools across 10 modules (see FEATURE.md) behind one shell UI, one command palette, one keyboard model.
- Make every deterministic tool 100% client-side, instant, and usable with zero signup.
- Provide a small set of genuinely useful AI-assisted features that a static tool cannot replicate.
- Support lightweight persistence (history, snippets, pinned tools) that upgrades gracefully from "anonymous local-only" to "signed-in synced" without ever requiring the account.

### Business goals
- Build a sustainable, ad-light free product with optional monetization that never restricts core tool functionality (see §13).
- Establish enough differentiation (breadth + coherence + AI + workflows) to be defensible against single-tool SEO competitors.

### Engineering goals
- A codebase where adding tool #61 is a matter of implementing one module against a documented contract, not fighting architecture.
- Predictable performance: sub-200ms perceived interaction latency for all client-side tools.
- A test and CI/CD setup that makes shipping daily safe.

## 3. Target Audience

| Segment | Needs | Usage pattern |
|---|---|---|
| **Backend/API developers** | JSON/YAML/XML formatting, JWT debugging, hashing, HTTP client, UUID/timestamp utilities | Frequent, short bursts, often mid-debugging |
| **Frontend developers** | CSS/color tools, SVG/image utilities, regex tester, markdown preview, JSON↔TS type generation | Frequent, design-adjacent |
| **DevOps/SRE/platform engineers** | YAML/TOML converters (k8s, CI configs), cron builder, base64/certs, network/DNS tools | Occasional but high-stakes |
| **Data engineers/analysts** | CSV↔JSON, CSV↔SQL, diff tools, number base conversion | Batch-oriented, larger payloads |
| **Students/bootcamp learners** | Formatters, explainers ("what does this regex do"), generators | Learning-oriented, benefit most from AI explain features |
| **QA/Security-adjacent** | Hash/checksum, JWT inspection, TLS/cert decoding, payload diffing | Verification-oriented, high trust requirement on client-side-only claim |

Common thread: all segments want **speed and trust** over feature depth in any single tool. This shapes the "instant, no-login, no server round trip" default.

## 4. Competitive Analysis

Research summary (web landscape, mid-2026):

| Competitor type | Examples | Strengths | Weaknesses (our opportunity) |
|---|---|---|---|
| Single-tool SEO sites | jsonformatter.org, json.site, various "X converter" domains | Rank well for narrow keywords, simple | One tool per domain, heavy ads on older ones, no cross-tool workflow, inconsistent UX per site |
| Aggregator web suites | AdminSo DevToolbox, Converter360, developer-toolbox.dev, fmt.hjlabs.in | Multiple tools in one place, client-side execution, no signup | Shallow tool depth, little differentiation from each other, no AI layer, no persistence/history, generic UI templates, limited workflow chaining |
| Native/offline apps | **DevToys** (Windows/cross-platform, OSS, 30 tools, clipboard smart-detect), **DevUtils.app** (macOS, paid, clipboard smart-detect), **DevTools-X** (Tauri, 41 modules) | Deep tool set, offline-first trust, smart clipboard detection, polished native UX | Install friction, platform-specific, no web reach/SEO, DevUtils is paid, no AI layer, no team sharing |
| Swiss-army CLI (jq, yq, openssl, etc.) | N/A | Scriptable, trusted by power users | High learning curve, not discoverable, no visual/interactive layer |

**Key patterns observed:**
- Client-side-only execution is now table stakes for privacy-conscious tools; we adopt it as a hard default, not a differentiator alone.
- "Smart detection" (DevToys/DevUtils auto-picking the right tool from clipboard content) is a beloved UX pattern with no strong web equivalent — an opportunity.
- No competitor in either the web-suite or native-app category has a real AI layer beyond bolted-on "AI code generation" as one more tool in the list.
- No competitor treats **workflows/pipelines** (chaining tools) as a first-class concept — everything is single-tool, single-shot.
- Aggregator sites are visually interchangeable; strong, distinctive design (see UI_GUIDELINES.md) is itself a differentiator in a commoditized space.

### Our differentiation strategy
1. **Command palette + smart input detection** (⌘K opens any tool; pasting into the palette suggests the right tool based on content shape — JWT, JSON, hex color, UUID, etc.), closing the native-app UX gap on the web.
2. **Pipelines**: save and re-run a sequence of tool transforms as a named, shareable workflow.
3. **AI-augmented tools where AI adds real value**: explain-this-regex, generate-schema-from-JSON, natural-language-to-cron, summarize-this-diff, fix-this-JSON — always as an *optional* enhancement layered on top of a fully working deterministic tool, never a replacement for it.
4. **Local history + optional sync**: every tool remembers your last N inputs locally (IndexedDB); signing in (optional) syncs history/snippets/pipelines across devices.
5. **One coherent design system** across all 60+ tools instead of templated, near-identical pages.
6. **Genuinely free core** — no tool is ever paywalled; monetization lives entirely outside the tool experience (see §13).

## 5. Feature Roadmap (summary)

Full catalog, module breakdown, and prioritization lives in [FEATURE.md](./FEATURE.md). Summary tiers:

- **MVP (Phase 1):** Shell UI, command palette, 20 highest-traffic deterministic tools (JSON/YAML/XML/CSV formatting & conversion, Base64/URL/HTML encoding, JWT decoder, hash generator, UUID/timestamp tools, regex tester, diff checker, markdown preview, color tools).
- **Phase 2:** Remaining tool catalog (image tools, network tools, code beautifiers, generators), local history, favorites, pipelines (client-only, no sync).
- **Phase 3:** Accounts (optional), cloud sync of history/snippets/pipelines, sharing (short links to saved tool state), first AI features (explain, generate-from-example).
- **Phase 4:** Full AI assistant surface, team workspaces, browser extension, public API/CLI, plugin system for community tools.

## 6. Functional Requirements

- FR1: Every tool must be usable without authentication and without any network request for its core transform, where technically feasible client-side.
- FR2: All tools share one input/output shell pattern (input pane, output pane, action bar, options panel) unless the tool's nature requires a different layout (documented per-tool).
- FR3: The command palette (⌘K / Ctrl+K) must fuzzy-search all tools by name, alias, and category, and must support "smart paste" detection.
- FR4: Every tool records the last N (configurable, default 10) inputs/outputs to local device storage; users can clear this at any time.
- FR5: Users may optionally create an account (email+password or OAuth) to sync history, favorites, and saved pipelines across devices.
- FR6: AI-powered tools must clearly label themselves as AI-assisted, show what data will be sent to the AI provider before first use, and never be the only way to accomplish a task that has a deterministic equivalent.
- FR7: Users can chain 2+ tools into a named pipeline; pipeline execution runs entirely client-side unless a step requires the AI gateway.
- FR8: Users can share a tool's current input/output state via a short link; server stores only the minimum payload necessary and respects size/expiry limits (see DATABASE.md).
- FR9: The system must support keyboard-only operation for every core action (run, copy output, clear, switch tool).
- FR10: All destructive actions (clear history, delete pipeline, delete account) require explicit confirmation.

## 7. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Client-side tool operations complete in <100ms for inputs up to 1MB; page TTI < 2.5s on 4G/mid-tier device; Lighthouse performance score ≥ 95 on tool pages |
| **Availability** | 99.9% uptime target for API/AI gateway; frontend tool pages must degrade gracefully to "fully functional, no AI/sync" if backend is unreachable |
| **Scalability** | Backend stateless and horizontally scalable; must support traffic spikes (e.g., HN/Reddit front page) without degradation via CDN caching + autoscaling |
| **Security** | No tool payload persisted server-side without explicit user action (share/sync); AI requests never logged with raw payload beyond provider-required transient processing; see §12 |
| **Accessibility** | WCAG 2.2 AA conformance across the app shell and all tool UIs |
| **Privacy** | No third-party analytics trackers on tool input/output; only aggregate, anonymized usage metrics |
| **Maintainability** | New tool addable by one engineer in <1 day following the documented tool contract (DEVELOPMENT_GUIDE.md) |
| **Portability** | Core deterministic tool logic (pure functions) usable in browser, Node (SSR/tests), and potential future CLI/extension without modification |
| **Internationalization** | UI string layer i18n-ready from day one (English at launch; framework supports adding locales without refactor) |

## 8. Technical Architecture

### 8.1 High-level system diagram (textual)

```
┌────────────────────────────────────────────────────────────────────┐
│                             Client (Browser)                        │
│  Next.js App Router SPA/SSR hybrid                                  │
│  ┌───────────────┐  ┌───────────────────┐  ┌─────────────────────┐  │
│  │ Tool Modules   │  │ App Shell          │  │ Local persistence   │  │
│  │ (pure fns +    │  │ (palette, nav,     │  │ (IndexedDB via      │  │
│  │  React UI)     │  │  theme, layout)    │  │  Dexie: history,    │  │
│  │ 100% client    │  │                    │  │  favorites, drafts) │  │
│  └───────┬────────┘  └────────────────────┘  └─────────────────────┘  │
└──────────┼────────────────────────────────────────────────────────────┘
           │ HTTPS (only for: auth, sync, AI, share, analytics)
┌──────────▼────────────────────────────────────────────────────────────┐
│                         Edge / CDN (Cloudflare)                        │
│   Static asset caching, WAF, rate limiting, bot mitigation             │
└──────────┬──────────────────────────────────────────────────────────────┘
           │
┌──────────▼─────────────────────────────────────────────────────────────┐
│                     Backend API (NestJS, stateless pods)                │
│  ┌───────────┐ ┌────────────┐ ┌───────────┐ ┌───────────┐ ┌──────────┐ │
│  │ Auth       │ │ Sync       │ │ Share      │ │ AI Gateway │ │ Analytics│ │
│  │ (JWT+      │ │ (history/  │ │ (short     │ │ (routes to │ │ (event   │ │
│  │  refresh)  │ │  snippets/ │ │  links)    │ │  Claude API│ │  ingest) │ │
│  │            │ │  pipelines)│ │            │ │  w/ rate   │ │          │ │
│  │            │ │            │ │            │ │  limiting) │ │          │ │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └────┬─────┘ │
└────────┼──────────────┼──────────────┼──────────────┼─────────────┼───────┘
         │              │              │              │             │
   ┌─────▼──────────────▼──────────────▼───────┐ ┌────▼────┐  ┌─────▼─────┐
   │        PostgreSQL (Prisma ORM)              │ │  Redis  │  │  Object   │
   │  users, pipelines, shares, snippets, orgs    │ │ (cache, │  │  storage  │
   │                                              │ │  rate   │  │  (S3-     │
   │                                              │ │  limit, │  │  compat,  │
   │                                              │ │  queue) │  │  large    │
   └──────────────────────────────────────────────┘ └─────────┘  │  shares)  │
                                                                    └───────────┘
```

### 8.2 Frontend architecture

- **Framework:** Next.js 15 (App Router), React 19, TypeScript strict mode.
- **Rendering strategy:** Tool pages are statically generated (SSG) at build time for SEO (each tool has a real URL, real meta tags, real crawlable content) and hydrate into a fully client-side interactive app. No tool computation happens server-side by default.
- **State management:** Zustand for cross-cutting app state (theme, command palette, active pipeline); TanStack Query for any server state (auth session, synced data, AI responses); local component state otherwise. No Redux — unnecessary ceremony for this app's state shape.
- **Styling/design system:** Tailwind CSS + shadcn/ui (Radix primitives) as the component foundation, themed to a distinctive visual identity (see UI_GUIDELINES.md) rather than left as default shadcn styling.
- **Tool architecture:** Every tool is a self-contained module exporting (a) pure transform function(s), (b) a Zod schema for input validation/options, (c) a React UI component consuming the pure functions. This separation lets transform logic be unit-tested without React and reused in Node contexts (SSR meta generation, potential CLI).
- **Web Workers:** CPU-heavy transforms (large JSON diffing, image compression, hashing large payloads) run in a Web Worker pool to keep the main thread responsive.
- **Local persistence:** Dexie.js wrapper over IndexedDB for history/favorites/drafts; localStorage only for small UI preferences (theme, layout).
- **PWA:** App is installable and core tools work offline via a service worker precaching the app shell and tool bundles.
- **Tool-specific parsing/formatting libraries:** added as needed per tool rather than pre-selected wholesale, each imported only by the tool that needs it (code-split, not part of the core app bundle) — `js-yaml` (YAML parse/stringify, used by JSON↔YAML and the YAML Formatter), `qrcode` (QR Code Generator), `prettier` standalone + its `parser-babel`/`parser-postcss`/`parser-html` plugins (JS/TS, CSS, and HTML Beautifier/Minifier tools; Prettier is the de facto standard here — hand-rolling a comparable formatter is not worth the accuracy trade-off), `dompurify` (client-only HTML sanitization for Markdown → HTML preview output). Added 2026-07 during Phase 1 implementation per CLAUDE.md rule 10 (flagged and approved before adding).
- **Minification libraries:** `terser` (JS minify), `csso` (CSS minify), `html-minifier-terser` (HTML minify, delegates embedded CSS/JS minification to csso/terser internally) — power the Minify mode added to the JS/TS, CSS, and HTML Beautifier tools. Same code-split-per-tool policy as above. TypeScript input is not supported in Minify mode (Terser only parses plain JS syntax); the tool surfaces a clear error and directs the user to Beautify mode instead. Added 2026-07 during Phase 1 implementation per CLAUDE.md rule 10 (flagged and approved before adding).
- **CodeMirror 6 language packages:** `@codemirror/lang-json`, `-javascript` (covers JS and TS), `-css`, `-html`, `-xml`, `-yaml`, `-markdown`, plus `@codemirror/language` and `@codemirror/commands` (the latter for the Tab-to-indent keymap) — added alongside the already-approved `@codemirror/state`/`@codemirror/view`/`codemirror` core to give `components/ui/CodeEditor.tsx` real per-language syntax highlighting. Each tool's `ToolView.tsx` picks its own language(s); tools without a natural single-language shape (CSV, plain text) keep using the plain `Textarea`. Added 2026-07 during Phase 1 implementation per CLAUDE.md rule 10 (flagged and approved before adding).

### 8.3 Backend architecture

- **Framework:** NestJS (TypeScript) — modular, DI-driven, good fit for a system with clearly separable domains (auth, sync, share, AI gateway, analytics) and strong typing parity with the frontend.
- **Module boundaries:** `auth`, `users`, `sync` (history/favorites/pipelines), `share`, `ai-gateway`, `analytics`, `admin`, `api-keys` (Public API key management, Phase 4), `public-api` (the API-key-authed tool surface itself, deliberately separate from `api-keys` so key management stays on session auth while the tool surface stays on API-key auth). Each is a NestJS module with its own controller/service/DTO layer; no cross-module direct DB access — only through service interfaces.
- **API style:** REST (see API.md) for CRUD-shaped resources (auth, sync, share); a single AI gateway endpoint proxies structured requests to the Claude API with server-side prompt templates, so API keys never reach the client and requests can be rate-limited/sanitized centrally.
- **ORM/DB:** PostgreSQL via Prisma — strong typing, painless migrations, good fit for the relational shape of users/pipelines/shares.
- **Caching/queues:** Redis for session/rate-limit state and BullMQ-backed background jobs (share-link expiry cleanup, usage aggregation, async large-file share processing).
- **AI Gateway design:** thin orchestration layer — validates request shape, applies per-user/IP rate limits, selects model tier (Haiku for lightweight classification/detection tasks, Sonnet for explain/generate tasks), injects a task-specific system prompt, streams the response back. No raw user payload is persisted; only anonymized token/cost metrics are logged.
- **Billing (`stripe` SDK, Phase 4):** the one approved payment-provider dependency — see §14.2. Webhook signature verification (`stripe.webhooks.constructEvent`, raw request body required for that one route only) is this codebase's first instance of that pattern; every other inbound-request surface (Module 8's webhook-inbox tool) just captures/displays, it doesn't authenticate the sender.

### 8.4 Privacy & data flow model

Three explicit data-handling tiers, always visible to the user:

1. **Local-only (default for all deterministic tools):** input never leaves the browser. History is stored in IndexedDB on-device only.
2. **Server-assisted, ephemeral (AI features, some network tools like DNS/HTTP client that must proxy through a server to avoid CORS/leak client IP):** payload is sent over TLS, processed, returned, and not persisted beyond transient logs (with payload redacted) needed for abuse prevention.
3. **Server-persisted, explicit opt-in (sync, share links, snippets):** only created when the user takes an explicit action (sign in + enable sync, or click "Share"); user can delete at any time; share links have configurable expiry (default 30 days) and are unguessable (128-bit random IDs).

### 8.5 Monorepo & build tooling

- npm workspaces (or pnpm) monorepo: `frontend/`, `backend/`, plus a `packages/shared` package for types/schemas shared between the two (e.g., DTOs, Zod schemas for AI gateway requests) — avoids drift between frontend expectations and backend contracts. `packages/cli` (Phase 4) is the public-facing CLI, a thin HTTP client over the Public API (API.md §13) using `packages/shared`'s existing types for response shapes — it does not import backend or frontend code directly. `packages/extension` (Phase 4) is the Manifest V3 browser extension — self-contained, no dependency on `frontend`/`backend`/`packages/shared` at all, since a browser extension's build/runtime environment (service workers, content scripts, `chrome.*` APIs) doesn't share enough with either to make cross-importing worthwhile for a handful of small pure functions.
- Turborepo for task orchestration/caching across the monorepo (`build`, `lint`, `test` fan out per-package with caching).

## 9. Security Considerations

- **Transport:** HTTPS everywhere, HSTS, TLS 1.2+ only.
- **AuthN:** short-lived JWT access tokens (15 min) + httpOnly, secure, sameSite=strict refresh token cookie; rotating refresh tokens with reuse detection.
- **AuthZ:** role-based (`user`, `admin`) at the API layer; resource ownership checks on every sync/share/pipeline mutation (a user can only read/write their own records) enforced in the service layer, not just the controller.
- **Input validation:** every API DTO validated with `class-validator`/Zod; every client-side tool input validated before transform to prevent malformed-input crashes (never a security boundary substitute, but a correctness one).
- **Secrets:** all provider keys (Claude API key, DB creds, object storage) via environment variables/secret manager, never committed; `.env.example` documents required vars without values.
- **Rate limiting:** IP + user-based rate limiting at the edge (Cloudflare) and application layer (Redis token bucket) for auth endpoints, AI gateway, and share creation to prevent abuse/cost overrun.
- **CSRF:** refresh-token cookie is sameSite=strict + double-submit token for state-changing requests from the web app.
- **XSS:** strict CSP headers; all tool outputs rendered as text/data, never `dangerouslySetInnerHTML` unless output is explicitly a sanitized HTML preview tool (e.g., Markdown preview), which runs through DOMPurify.
- **Dependency hygiene:** automated dependency vulnerability scanning (`npm audit`/Dependabot/Snyk) in CI; lockfiles committed.
- **Abuse of AI gateway:** per-IP and per-user request quotas, payload size caps, and prompt-injection-aware system prompts (AI tools operate on data, not instructions from that data — the AI gateway never executes instructions found inside user-submitted tool payloads).
- **PII minimization:** no requirement to collect PII beyond email for optional accounts; no tracking of tool input content in analytics, ever.

## 10. Scalability Strategy

- **Frontend:** static tool pages served from CDN edge (Vercel/Cloudflare) — scales to near-infinite read traffic with no origin load; all heavy compute is client-side (the user's own CPU), which means DevToolbox's own infra scales independently of tool usage volume.
- **Backend:** stateless NestJS pods behind a load balancer, horizontally autoscaled on CPU/request-rate; all shared state in Postgres/Redis, never in-process, so any pod can serve any request.
- **Database:** vertical scaling initially (managed Postgres, e.g., RDS/Neon/Supabase), read replicas introduced when read traffic (sync/share reads) exceeds primary capacity; connection pooling via PgBouncer.
- **AI gateway:** the natural bottleneck (cost + latency); mitigated via aggressive per-user rate limits, response caching for idempotent requests (e.g., "explain this exact regex" cached by input hash), and tiered model routing (cheap/fast model for classification, larger model only when needed).
- **Object storage/CDN:** large share payloads (e.g., shared images) go to S3-compatible storage behind a CDN, not through the API pods.
- **Background jobs:** BullMQ + Redis for anything non-request-critical (share cleanup, usage rollups) so request-path latency isn't affected by housekeeping work.

## 11. Performance Goals

- Largest Contentful Paint < 1.8s (p75, mid-tier mobile).
- Time to Interactive < 2.5s.
- Tool transform latency: <100ms for typical payloads (<1MB), with a visible progress state and Web Worker offload beyond that.
- JS bundle: tool-level code-splitting so visiting `/tools/json-formatter` never downloads the image-compression or AI-explain bundles.
- API p95 latency < 200ms for CRUD endpoints; AI gateway p95 < 3s (streamed, so first token much sooner).

## 12. Accessibility

- WCAG 2.2 AA as the baseline conformance target for the entire app, not just marketing pages.
- Full keyboard operability: every tool reachable and usable via keyboard alone (Tab order, visible focus rings, ⌘K palette as a keyboard-first entry point).
- Semantic HTML and ARIA landmarks for the shell (nav, main, search); ARIA live regions for async results (e.g., "output updated," AI streaming responses).
- Color contrast ≥ 4.5:1 for body text in both light and dark themes; theme tokens defined so contrast is enforced at the design-token level (UI_GUIDELINES.md).
- Respect `prefers-reduced-motion` and `prefers-color-scheme`.
- Automated accessibility testing (axe-core) in CI on the component library and key pages; manual screen-reader pass (VoiceOver/NVDA) before each major release.

## 13. SEO Strategy

- Every tool is a real, statically generated, indexable page at a semantic URL (`/tools/json-formatter`, `/tools/base64-encode-decode`), not a client-only route — this is the single biggest SEO lever given how this category is won (long-tail "X to Y converter" queries).
- Unique, keyword-relevant title/meta description per tool, generated from a structured tool registry (single source of truth, no manual duplication/drift).
- Structured data (`SoftwareApplication`/`WebApplication` JSON-LD) per tool page for rich results.
- Fast Core Web Vitals (see §11) as a ranking factor.
- Canonical URLs, sitemap.xml auto-generated from the tool registry, robots.txt tuned to allow full tool catalog crawling.
- Content layer: a short "how it works" / "common use cases" section per tool page (human-written, reviewed for quality, not thin AI filler) to satisfy search intent beyond the widget itself and avoid thin-content penalties.
- Internal linking: related-tools module on every tool page (e.g., JSON formatter links to JSON↔YAML, JSON validator, JSON diff) to spread link equity and support pipeline discovery.

## 14. Monetization Strategy (never affects the free tool experience)

Hard rule: **no tool, no transform, no core functionality is ever paywalled, rate-limited for anonymous users below a generous threshold, or degraded to push upgrades.** Monetization is additive, not restrictive:

1. **Non-intrusive, contextual ads** on content-adjacent surfaces only (e.g., below-the-fold on tool pages, never inside the tool UI itself, never interstitials) — optional and can be fully disabled without losing functionality if replaced by other revenue.
2. **Pro tier (optional, for teams/power users):** higher AI usage quotas, team workspaces with shared pipelines/snippets, SSO, priority support, custom branding for shared links. The free tier's AI quota is generous enough for individual daily use; Pro removes the ceiling for heavy/team use, not the floor for individuals.
   - **Team workspaces — implemented (Phase 4), MVP scope:** org CRUD, member roles (OWNER/ADMIN/MEMBER), shared snippets/pipelines (optional `organizationId`, additive to normal ownership — DATABASE.md §3), an org AI-usage dashboard, and TEAM-tier quota inheritance for members whenever the org's owner personally holds a TEAM plan (`resolveEffectivePlan()`, no separate org-level Stripe subscription — see DATABASE.md's Organization model note). **Deliberately deferred, not yet built:** SSO, custom branding for shared links, and an email-token invite/accept flow (members are added directly by email if they already have an account; see AUDIT_REPORT.md §17.2). API.md §17.
   - **Implementation (Phase 4):** Stripe Checkout + Customer Portal (both Stripe-hosted — no custom card-collection UI in this codebase, so PCI scope stays minimal). PRO/TEAM prices are configured as Stripe Price IDs via env vars, not hardcoded dollar amounts in code, so pricing changes don't require a deploy. `User.plan` (already the single source of truth every plan check reads — `PlanThrottleGuard`, `ApiKeysService`, AI Gateway quotas) is kept in sync from Stripe subscription webhooks rather than trusted from the client at checkout time; a `Subscription` table (DATABASE.md §3) tracks the underlying Stripe subscription state for support/debugging, separate from the denormalized `User.plan` flag every other module already depends on.
3. **API/CLI access tier:** programmatic access to select tools (e.g., batch JSON validation, hash generation) for CI pipelines — a natural extension for teams already relying on DevToolbox manually.
4. **Sponsorship/"built by" placements:** tasteful, clearly labeled sponsor credits (e.g., "Network tools powered by X") rather than intrusive advertising, similar to open-source project sponsorship models.
5. **Donations/GitHub Sponsors** for the open-source-adjacent goodwill segment, especially if the core tool engine is open-sourced (see §15).

## 15. Future Roadmap (post-enterprise horizon)

- Open-source the client-side tool engine (`packages/shared` + tool modules) to build community trust and attract contributor-built tools (plugin architecture, versioned tool manifest).
- Browser extension (right-click "Format with DevToolbox" on any selected text/JSON on any page).
  - **Implementation (Phase 4):** Manifest V3, `packages/extension` — a curated context-menu subset (JSON Format, Base64/URL encode-decode, JWT Decode), same "select tools, not the whole catalog" scope as the Public API tier (§14.3). Each transform is a small, self-contained pure function inside the extension package rather than importing `frontend/src/modules/tools/*/transform.ts` directly — those files are pure by contract (CLAUDE.md rule 3) but live behind Next.js-specific path aliases/tooling not meant to cross into an unrelated build pipeline; same reasoning already applied to the Public API's hash/JSON-validate endpoints (AUDIT_REPORT.md §14.1). No network calls, no account/auth — the extension only ever touches the page's selected text and the clipboard.
- CLI (`npx devtoolbox format json`) sharing the exact same pure-function core as the web tools.
- VS Code extension wrapping the same tool engine for in-editor use.
- Team workspaces: shared pipelines, shared snippet libraries, org-level AI usage dashboards. **✅ Shipped (MVP scope)** — see §14.2 above and API.md §17.
- Public API with generous free tier for programmatic tool access.
- Plugin marketplace for community-contributed tools reviewed against the security/sandboxing model (likely WASM-sandboxed for untrusted third-party tool code). **✅ Shipped (v1)** — see §16.

## 16. Plugin Marketplace (Phase 4, v1 — ✅ shipped)

Flagged before implementation (CLAUDE.md rule 10: persists third-party executable content server-side by default; introduces untrusted code execution, a genuinely new architectural pattern) and confirmed by the user before any code was written. v1 shipped per the design below with the deviations logged in AUDIT_REPORT.md §18.2 — mainly: WASM stored as base64 text in Postgres rather than S3 (no object-storage infrastructure exists anywhere in this codebase to reuse), and static submission inspection is size + magic-number only, not a full WASM import-section parser (the sandbox itself, not static analysis, is the real security boundary — see §16.1).

### 16.1 Execution model: client-side WASM in a double-isolated sandbox, not a server runtime

Rule 1 ("client-side by default") applies to plugins too — a community tool should behave exactly like a first-party tool: no network call in its transform, nothing about running it touches the backend. That ruling also conveniently avoids the heaviest alternative: a server-side WASM runtime (`wasmtime`/`wasmer` or similar) would be a new top-level backend dependency, a new class of infrastructure (untrusted-code execution hosts, resource/CPU limits, DoS surface), and a genuinely different security model than anything in ARCHITECTURE.md §9 today.

Instead, plugins execute **entirely in the browser**, in a sandbox with two independent layers:

1. **Cross-origin isolation.** The plugin runner loads inside an `<iframe>` served from a dedicated, cookieless subdomain (e.g. `plugin-sandbox.devtoolbox.dev`) that shares no origin, no storage, and no auth cookies with the main app — the same pattern CodeSandbox/StackBlitz use for running arbitrary user code. Even a full sandbox-attribute escape can't reach `devtoolbox.dev`'s session or localStorage.
2. **`iframe sandbox` attribute**, deliberately minimal: `sandbox="allow-scripts"` only — no `allow-same-origin`, no `allow-forms`, no `allow-popups`, no `allow-top-navigation`. The sandbox origin's own CSP additionally sets `connect-src 'none'; frame-src 'none'` so even a compromised or malicious plugin has no network egress path — no `fetch`, no `WebSocket`, no image-beacon exfiltration.
3. **Protocol.** Parent ↔ iframe communication is one `postMessage` RPC shape: `{ input: string, options: Record<string, string | number | boolean> } → { output: string } | { error: string }`. Input/output size-capped (matches the existing per-tool size caps used elsewhere in the app). A 3-second execution timeout; on timeout the iframe is destroyed and recreated (never reused after a hang — no way to distinguish "slow" from "stuck/hostile" from outside the sandbox).
4. **Inside the sandbox**, the loaded WASM module gets the narrowest possible import surface: a single `abort(msg)` host function for panics, nothing else — no WASI `fd_write`/`fd_read`/`path_open`, no clock, no random beyond what the module brings compiled in. A plugin's `transform` export takes and returns only linear-memory strings; the runner marshals the postMessage payload in/out.

This means the actual novel *dependency* surface is small: no new backend package at all, and on the frontend just the browser's native `WebAssembly` object plus a small hand-written runner (no plugin-runtime library needed). The dependency-shaped decision that does need a call is what plugin **authors** compile from — Rust+`wasm-bindgen` or AssemblyScript are the two realistic options; DevToolbox itself doesn't depend on either, it would only document one as the recommended toolchain in a new `PLUGIN_AUTHORING.md` guide (docs-only, no repo dependency).

### 16.2 Submission & review pipeline — never auto-publish

Defense in depth: even though the sandbox above should contain a hostile plugin at runtime, nothing gets listed in the marketplace without a human reviewing it first. Automated gates run before a submission ever reaches a human queue:

1. Manifest schema validation (Zod, same as every other input boundary — CLAUDE.md rule 5): `id`, `name`, `version` (semver), `description`, `author`, declared `permissions` (in v1, always `[]` — no permission grants exist yet; the field is reserved for a future, even-narrower capability model rather than designed in speculatively now).
2. Static WASM inspection: reject on any imported function outside the `abort`-only allowlist (§16.1.4), reject over a size cap (2 MB), reject if the module declares a `start` function that isn't the expected `transform` export shape.
3. Checksum (`sha256`) computed and stored alongside the binary — same hashed-integrity habit as `ApiKey.keyHash`/`Session.refreshTokenHash`, applied here to detect any post-review tampering with the stored artifact rather than to keep the artifact secret.
4. ~~Binary stored in object storage (S3-compatible), not Postgres~~ — **v1 deviation:** `ShareLink.objectStorageKey`'s "precedent" turned out to be unimplemented (no S3 client exists anywhere in this codebase); rather than build object-storage infrastructure for this pass, v1 stores the base64-encoded WASM module directly on `PluginVersion` in Postgres, capped at 2MB decoded. See AUDIT_REPORT.md §18.2.
5. Human review queue (`Plugin.status: IN_REVIEW`) — a reviewer runs the plugin against a fixed adversarial test-input set (oversized input, malformed UTF-8, deeply nested/recursive structures where relevant) before flipping to `PUBLISHED`. This step has no code in v1 — it's a documented manual process, tracked the same honest way "priority support" was noted as a process commitment rather than a code surface in §17.2's team-workspaces write-up.
6. Post-publish, a plugin can be moved to `SUSPENDED` (hidden from listings/search, existing installs stop resolving new runs) if a problem surfaces later — rows are never deleted, matching this codebase's general soft-delete/audit-trail habit (DATABASE.md §1).

### 16.3 Data model sketch (for DATABASE.md, once implementation starts)

```text
Plugin        (id, slug, name, authorUserId, description, status: DRAFT|IN_REVIEW|PUBLISHED|REJECTED|SUSPENDED, createdAt)
PluginVersion (id, pluginId, version, objectStorageKey, manifestJson, checksumSha256, publishedAt, reviewedByUserId?)
```

Implemented as designed — see DATABASE.md §3 for the authoritative Prisma model and migration `20260811160000_add_plugin_marketplace`.

### 16.4 Frontend integration shape

Published plugins get a tool page like any first-party tool (`/tools/plugin-<slug>`), but instead of a bespoke `ToolView.tsx`, they render through one shared `PluginRunner` component that owns the iframe lifecycle and the postMessage protocol — every plugin gets the same generic input/output UI (`OptionsPanel`/`OutputPane`, reused per CLAUDE.md rule 4), not custom layout. This is deliberately narrower than the full 5-file tool contract (DEVELOPMENT_GUIDE.md §5), the same "curated, not a mirror of the full contract" posture already used for the Public API tier (§14.3) and the browser extension (§15's implementation note) — a community plugin trades UI flexibility for running at all.

### 16.5 Open questions before implementation can start

- Who reviews submissions, and what's the SLA — a real operational question, not a code one, and worth answering before building the review-queue UI.
- Whether `permissions: []` in the manifest ever needs to grow (e.g. a plugin that legitimately wants to read a second input field) — left unresolved rather than guessed at.
- Monetization interaction: is marketplace publishing free for everyone (consistent with §14's "never paywall a core tool," though a plugin isn't quite a core tool) or a PRO/TEAM-only publishing privilege — undecided.

---
See [FEATURE.md](./FEATURE.md) for the detailed tool catalog and prioritization, and [AUDIT_REPORT.md](./AUDIT_REPORT.md) for the log of key decisions made during this planning phase.

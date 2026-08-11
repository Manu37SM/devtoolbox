# FEATURE.md

Complete feature catalog for DevToolbox: modules, individual tools, prioritization, and phased roadmap.

Every tool below is scoped as a self-contained module per [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md#adding-a-new-tool). Priority: **P0** = MVP, **P1** = Phase 2, **P2** = Phase 3, **P3** = Phase 4/backlog. "Client-only" = never touches the network for its core function.

## Module 1 — Data Format Tools (JSON/YAML/XML/CSV/TOML)

| Tool | Priority | Client-only | Notes |
| --- | --- | --- | --- |
| JSON Formatter/Validator/Minifier | P0 | ✅ | Syntax highlighting, error line numbers, tree view toggle (✅ Shipped Phase 1) |
| JSON ↔ YAML | P0 | ✅ | (✅ Shipped Phase 1) |
| JSON ↔ XML | P0 | ✅ | Handles attributes, namespaces, CDATA (✅ Shipped Phase 1) |
| JSON ↔ CSV | P0 | ✅ | Nested object flattening options (✅ Shipped Phase 1) |
| JSON ↔ TOML | P1 | ✅ | Cargo.toml/pyproject.toml use case (✅ Shipped Phase 2) |
| JSON Path Tester (JSONPath/JMESPath) | P1 | ✅ | JMESPath (✅ Shipped Phase 2) |
| JSON Diff | P1 | ✅ | Structural diff, not text diff (✅ Shipped Phase 2) |
| JSON Schema Generator | P1 | ✅ | Infers schema from sample JSON (✅ Shipped Phase 2) |
| JSON → TypeScript / Go / Python types | P1 | ✅ | Type generation from sample payload (✅ Shipped Phase 2) |
| XML Formatter/Validator | P0 | ✅ | (✅ Shipped Phase 1) |
| YAML Formatter/Validator | P0 | ✅ | k8s/CI config use case (✅ Shipped Phase 1) |
| CSV ↔ TSV, CSV cleaner | P1 | ✅ | Delimiter detection, header handling (✅ Shipped Phase 2) |
| SQL Formatter/Minifier | P1 | ✅ | Multi-dialect (Postgres/MySQL/generic) (✅ Shipped Phase 2) |

## Module 2 — Encoding & Decoding

| Tool | Priority | Client-only | Notes |
| --- | --- | --- | --- |
| Base64 Encode/Decode (text + file) | P0 | ✅ | (✅ Shipped Phase 1) |
| URL Encode/Decode | P0 | ✅ | (✅ Shipped Phase 1) |
| HTML Entity Encode/Decode | P0 | ✅ | (✅ Shipped Phase 1) |
| JWT Decoder/Debugger | P0 | ✅ | Header/payload/signature view, expiry check, optional signature verify (client-side, key provided by user) (✅ Shipped Phase 1) |
| Hex ↔ Text / Hex ↔ Binary | P1 | ✅ | (✅ Shipped Phase 2) |
| GZip/Deflate Compress-Decompress | P1 | ✅ | Native CompressionStream/DecompressionStream (✅ Shipped Phase 2) |
| Punycode/IDN Encode-Decode | P2 | ✅ | |
| Certificate (PEM/CRT) Decoder | P2 | ✅ | Parses X.509 fields client-side |

## Module 3 — Security & Crypto

| Tool | Priority | Client-only | Notes |
| --- | --- | --- | --- |
| Hash Generator (MD5/SHA-1/SHA-256/SHA-512/Keccak) | P0 | ✅ | Text + file input (✅ Shipped Phase 1 text-only; file input added in a Phase 2 cleanup pass — Keccak still not implemented, only MD5/SHA-1/SHA-256/SHA-512) |
| UUID/ULID/NanoID Generator + Inspector | P0 | ✅ | Bulk generation, version detection (✅ Shipped Phase 1) |
| Password Generator | P0 | ✅ | Entropy meter, custom charset rules (✅ Shipped Phase 1) |
| Password Strength Analyzer | P1 | ✅ | Local zxcvbn-style scoring, never transmitted (✅ Shipped Phase 2) |
| HMAC Generator | P1 | ✅ | (✅ Shipped Phase 2) |
| bcrypt/argon2 Hash & Verify | P1 | ✅ | WASM implementation for correctness parity with server libs |
| RSA/EC Key Pair Generator | P2 | ✅ | Client-side WebCrypto |
| TOTP/2FA Code Generator (testing) | P2 | ✅ | |

## Module 4 — Text & String Tools

| Tool | Priority | Client-only | Notes |
| --- | --- | --- | --- |
| Text Diff Checker | P0 | ✅ | Side-by-side + inline, word/char/line modes (✅ Shipped Phase 1) |
| Case Converter (camel/snake/kebab/Pascal/etc.) | P0 | ✅ | (✅ Shipped Phase 1) |
| Lorem Ipsum Generator | P0 | ✅ | Word/paragraph/list-item modes (✅ Shipped Phase 1) |
| String/Word/Char Counter & Analyzer | P0 | ✅ | Reading time, byte size (✅ Shipped Phase 1) |
| Line Sort/Dedupe/Shuffle | P1 | ✅ | (✅ Shipped Phase 2) |
| Slugify | P1 | ✅ | (✅ Shipped Phase 2) |
| Text ↔ Table (Markdown/CSV/ASCII table) | P1 | ✅ | (✅ Shipped Phase 2) |
| Regex Tester/Debugger | P0 | ✅ | Live match highlighting, capture groups, multi-flavor (JS/PCRE) (✅ Shipped Phase 1) |
| Regex Cheat Sheet (reference) | P1 | ✅ | Static content module (✅ Shipped Phase 2) |
| Markdown ↔ HTML / Live Preview | P0 | ✅ | GFM support, sanitized render (✅ Shipped Phase 1) |

## Module 5 — Code Tools

| Tool | Priority | Client-only | Notes |
| --- | --- | --- | --- |
| JS/TS Beautifier & Minifier | P0 | ✅ | (✅ Shipped Phase 1 — beautify + minify; TS input not minifiable, see AUDIT_REPORT.md §7) |
| CSS Beautifier & Minifier | P0 | ✅ | (✅ Shipped Phase 1 — beautify + minify) |
| HTML Beautifier & Minifier | P0 | ✅ | (✅ Shipped Phase 1 — beautify + minify) |
| Code Diff (syntax-aware) | P1 | ✅ | Extends text diff with language-aware highlighting (✅ Shipped Phase 2) |
| CSS ↔ Tailwind class helper | P2 | ✅ | Suggests Tailwind utility equivalents |
| HTML ↔ JSX Converter | P1 | ✅ | (✅ Shipped Phase 2) |
| .env / dotenv Formatter & Validator | P1 | ✅ | (✅ Shipped Phase 2) |
| Cron Expression Builder/Parser | P0 | ✅ | Visual builder + next-run preview (✅ Shipped Phase 1) |

## Module 6 — Converters

| Tool | Priority | Client-only | Notes |
| --- | --- | --- | --- |
| Number Base Converter (bin/oct/dec/hex) | P0 | ✅ | (✅ Shipped Phase 1) |
| Unix Timestamp ↔ Human Date | P0 | ✅ | Timezone-aware, live clock (✅ Shipped Phase 1) |
| Timezone Converter | P1 | ✅ | (✅ Shipped Phase 2) |
| Unit Converter (data size, time, etc.) | P1 | ✅ | (✅ Shipped Phase 2) |
| Color Converter (HEX/RGB/HSL/CMYK/OKLCH) | P0 | ✅ | Live swatch preview (✅ Shipped Phase 1) |
| Color Palette Generator | P1 | ✅ | (✅ Shipped Phase 2) |
| Roman Numeral Converter | P2 | ✅ | |

## Module 7 — Image & Graphics Tools

| Tool | Priority | Client-only | Notes |
| --- | --- | --- | --- |
| Image Compressor (JPG/PNG/WebP) | P1 | ✅ | (✅ Shipped Phase 2 — native Canvas `toBlob` encoder, not a WASM/squoosh-style codec; documented v1 simplification) |
| Image Format Converter | P1 | ✅ | (✅ Shipped Phase 2) |
| SVG Optimizer/Minifier | P1 | ✅ | (✅ Shipped Phase 2 — via `svgo`'s browser build) |
| SVG ↔ PNG/JPEG/WebP Exporter | P1 | ✅ | (✅ Shipped Phase 2) |
| QR Code Generator (incl. WiFi/vCard) | P0 | ✅ | (✅ Shipped Phase 1) |
| QR Code Reader | P1 | ✅ | Camera or upload (✅ Shipped Phase 2 — upload only, no camera capture yet) |
| Favicon Generator | P1 | ✅ | Multi-size bundle export (✅ Shipped Phase 2 — zip bundle via `jszip`) |
| Placeholder/SVG Mockup Image Generator | P2 | ✅ | |
| Color Blindness Simulator | P2 | ✅ | |
| CSS Gradient Generator | P1 | ✅ | (✅ Shipped Phase 2 — lives in the `converters` module alongside Color Palette Generator) |
| Box Shadow / Border Radius Generator | P2 | ✅ | |

## Module 8 — Network & Web Tools

| Tool | Priority | Client-only | Notes |
| --- | --- | --- | --- |
| HTTP Request Tester (Postman-lite) | P1 | ⚠️ server-proxied | Server proxy needed to avoid CORS/leak client IP for arbitrary requests; opt-in, request shown to user before send (✅ Shipped Phase 2 — SSRF-guarded proxy, see backend/src/common/net/ssrf-guard.ts) |
| Webhook Tester (unique inbox URL) | P1 | ❌ server | Requires backend to receive/store inbound webhooks temporarily (✅ Shipped Phase 2 — Redis-backed, 30min TTL, capped at 50 events/inbox) |
| DNS Lookup | P1 | ❌ server | DNS resolution requires server-side or public API proxy (✅ Shipped Phase 2 — Node's native `dns/promises`, no external API) |
| IP Address Lookup / What's My IP | P1 | ❌ server | (✅ Shipped Phase 2 — geolocation via ip-api.com's free keyless tier; best-effort, falls back to bare IP on failure) |
| URL Parser/Inspector | P0 | ✅ | Client-side URL object breakdown (✅ Shipped Phase 2 — gap-fix; was marked P0 but never actually built until now) |
| User-Agent Parser | P1 | ✅ | (✅ Shipped Phase 2) |
| Meta Tag / Open Graph Previewer | P1 | ⚠️ server-proxied | Fetching arbitrary URLs for preview requires server fetch (✅ Shipped Phase 2 — SSRF-guarded, parses OG/meta tags via cheerio) |
| CIDR/Subnet Calculator | P1 | ✅ | (✅ Shipped Phase 2) |

## Module 9 — Generators & Test Data

| Tool | Priority | Client-only | Notes |
| --- | --- | --- | --- |
| Fake/Mock Data Generator (names, addresses, JSON records) | P1 | ✅ | Faker-backed, seedable for reproducibility (✅ Shipped Phase 2) |
| Random Number/String Generator | P0 | ✅ | (✅ Shipped Phase 1) |
| Placeholder Text (Lorem variants: Hipster/Corporate/Bacon) | P2 | ✅ | |
| GUID/UUID Bulk Generator | P0 | ✅ | (shared engine with Module 3) (✅ Shipped Phase 1) |
| Mock REST API Response Generator | P2 | ✅ | Generates sample JSON from a schema |

## Module 10 — AI-Powered Tools (differentiator layer)

All AI tools: clearly labeled, show data-sent preview before first use, deterministic fallback offered where one exists, backed by the AI Gateway (ARCHITECTURE.md §8.3).

| Tool | Priority | Notes |
| --- | --- | --- |
| Explain This (regex / JSON schema / cron expression / SQL query) | P2 | ✅ Shipped Phase 3 — plain-language explanation of a pasted expression |
| Generate From Example (JSON→schema description, sample→regex) | P2 | ✅ Shipped Phase 3 — infers a regex or JSON Schema purely from pasted examples, composed onto the existing /ai/generate endpoint |
| AI Diff Summary | P2 | ✅ Shipped Phase 3 — summarizes a large text/JSON diff in plain language |
| AI Commit Message / PR Description Generator | P3 | ✅ Shipped Phase 3 — from a pasted diff |
| Natural Language → Cron | P2 | ✅ Shipped Phase 3 — "every weekday at 9am" → cron expression, validated deterministically after generation |
| Natural Language → Regex | P2 | ✅ Shipped Phase 3 — generated regex is always validated against user-provided test strings before shown as "confirmed" |
| SQL Query Explainer | P2 | Covered by Explain This's `subject: "sql"` — no separate tool needed |
| Code Commenter / Docstring Generator | P3 | ✅ Shipped Phase 3 |
| AI JSON Repair (fix malformed JSON) | P2 | ✅ Shipped Phase 3 — deterministic repair attempted first; AI fallback for ambiguous cases |
| API Response → Client Code Generator | P3 | ✅ Shipped Phase 3 — given a sample response, generates a typed fetch/axios client stub |

## Cross-Cutting Platform Features

| Feature | Priority | Notes |
| --- | --- | --- |
| Command palette (⌘K) with fuzzy search + smart-paste detection | P0 | Detects clipboard/paste content shape and suggests the matching tool (✅ Shipped Phase 1 with 6 detectors: JSON, JWT, hex color, UUID, timestamp, base64; ✅ expanded Phase 2 to 15 detectors — adds CIDR, cron, SQL, User-Agent, .env, XML, YAML, CSV/TSV, hash digest, generic hex) |
| Local history per tool (IndexedDB) | P0 | (✅ Shipped Phase 1 — cross-tool recent list; see AUDIT_REPORT.md §7) |
| Favorites/pinning | P0 | (✅ Shipped Phase 1) |
| Dark/light/system theme | P0 | (✅ Shipped Phase 1) |
| Keyboard shortcuts overlay | P0 | (✅ Shipped Phase 1) |
| PWA/offline support | P1 | (✅ Shipped Phase 2) |
| Pipelines (chain tools, client-only) | P1 | (✅ Shipped Phase 2 — 23 compatible tools, single-input/single-output chains only, no per-step option customization yet) |
| Optional accounts (email + OAuth) | P2 | ✅ Shipped Phase 3 — email/password + GitHub/Google, with account-linking for signed-in users |
| Cross-device sync (history, favorites, pipelines) | P2 | ✅ Shipped Phase 3 — favorites are set-union merged, history is append-only (no conflict case), pipelines are last-write-wins with a user-visible confirm prompt (see DATABASE.md §7) |
| Shareable tool state (short links) | P2 | ✅ Shipped Phase 3 — Share Links module |
| Pipeline sharing | P2 | ✅ Shipped Phase 3 — via Share Links |
| Team workspaces | P3 | |
| Public API / CLI | P3 | |
| Browser extension | P3 | |
| Plugin system for community tools | P3 | |

## Phased Roadmap

### Phase 1 — MVP (target: coherent, launchable core)

- App shell: layout, navigation, theme, command palette (search only, smart-paste stretch goal), keyboard shortcuts.
- 20 P0 tools across Modules 1–6, 9 (the highest-search-volume, purely deterministic tools).
- Local history + favorites (IndexedDB), no accounts yet.
- Static tool pages with SEO metadata for all shipped tools.
- CI/CD, basic monitoring/error tracking live from day one.

### Phase 2 — Full deterministic catalog ✅ complete

- Remaining P1 tools across all modules, including Module 7 (image/graphics — shipped using native Canvas + `svgo`/`jsqr`/`jszip` instead of a WASM/squoosh-style pipeline, a documented v1 simplification) and the server-proxied subset of Module 8 (✅ shipped — first real backend build-out: NestJS `NetModule`, SSRF guard, Redis-backed webhook inbox; HTTP tester, webhook tester, DNS/IP lookup, meta tag previewer).
- Pipelines (client-only chaining). ✅ shipped
- PWA/offline support. ✅ shipped
- Smart-paste detection completed for the command palette. ✅ shipped (15 detectors)

### Phase 3 — Accounts, sync, first AI features

- Optional accounts, cross-device sync, share links. **✅ shipped (wave 1)** — email/password + GitHub/Google OAuth auth (rotating refresh tokens, reuse detection), account profile/export/delete, Favorites + History sync (AES-256-GCM at rest), Snippets, server-synced Pipelines (+ duplicate), Share Links. First Postgres/Prisma-backed surface in the app; see AUDIT_REPORT.md for deviations from the original DATABASE.md spec (VerificationToken table, UUIDv4 not v7, single-key history encryption).
- AI Gateway backend + first AI tools (Explain This, NL→Cron, NL→Regex, AI JSON Repair, AI Diff Summary). **✅ shipped** — task-specific `/ai/*` endpoints (never a generic chat passthrough, per ARCHITECTURE.md §8.3), Haiku for explain/generate, Sonnet for diff-summary, deterministic-first JSON repair, deterministic cron/regex validation after generation, per-plan-tier rate limits, GET /ai/usage. See AUDIT_REPORT.md §12.
- Pro tier groundwork (usage quotas, billing integration). Not started.

### Phase 4 — Enterprise/ecosystem

- Team workspaces, org AI quotas/admin dashboard.
- Public API + CLI. **✅ Groundwork shipped** — API keys (create/list/revoke, session-authed), a curated PRO/TEAM-only `/v1/public/*` surface (hash generation, batch JSON validation, per ARCHITECTURE.md §14.3's own examples), and `@devtoolbox/cli` (a thin `fetch`-based client, zero new dependencies). Not a mirror of every web tool — deliberately scoped to the two ARCHITECTURE.md examples; more public-API tools can be added incrementally. See AUDIT_REPORT.md §14.
- Browser extension, VS Code extension.
- Plugin marketplace (WASM-sandboxed community tools).
- Remaining P2/P3 tools and AI features.

## Prioritization Rationale

Tools were prioritized on three axes, weighted in this order:

1. **Search/usage volume** (per competitive research — JSON formatting, Base64, JWT, hashing, and timestamp tools dominate query volume across every competitor site reviewed).
2. **Implementation complexity vs. client-only feasibility** — pure client-side tools ship faster and de-risk the "no backend needed for MVP" goal; anything requiring a server (Module 8's DNS/webhook/HTTP tools) is deliberately deferred past MVP.
3. **Differentiation value** — AI tools and pipelines are placed after the deterministic catalog is solid, because they depend on (a) having enough tools to chain/explain and (b) a backend that doesn't exist yet at MVP.

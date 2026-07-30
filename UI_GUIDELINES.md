# UI_GUIDELINES.md

Design system and UI standards for DevToolbox. Goal: one coherent visual and interaction language across 60+ tools, distinctive enough not to read as "another templated dev-tools site" (see ARCHITECTURE.md §4 for why this matters competitively).

## 1. Design Principles

1. **Function first, personality second.** Every tool must be scannable and usable in under 5 seconds by someone who's never seen it before — no aesthetic choice may slow that down.
2. **One shell, sixty tools.** The chrome (nav, palette, input/output pattern, action bar) never changes between tools; only the middle content area is tool-specific.
3. **Dense but not cramped.** Developers value information density; we optimize for "more useful content visible without scrolling" over generous whitespace, while keeping WCAG-compliant spacing/contrast.
4. **Keyboard-first.** Every primary action has a shortcut; the mouse is optional, never required.
5. **Quiet by default, loud when it matters.** Neutral UI chrome; color is reserved for state (success/error/warning), syntax highlighting, and the small set of brand accent moments — not decoration.

## 2. Design Tokens

Implemented as CSS variables (Tailwind theme extension), so both light/dark themes and future white-label/Pro branding read from the same token names.

### Color
- `--color-bg-base`, `--color-bg-raised`, `--color-bg-overlay` — surface layering (3 levels: page, card, popover/modal).
- `--color-border-subtle`, `--color-border-default`
- `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`
- `--color-accent` (brand), `--color-accent-foreground`
- Semantic: `--color-success`, `--color-warning`, `--color-danger`, `--color-info`, each with a `-foreground` and `-muted-bg` pair for badges/alerts.
- Syntax highlighting palette: a dedicated token set (`--syntax-key`, `--syntax-string`, `--syntax-number`, `--syntax-boolean`, `--syntax-comment`, `--syntax-punctuation`) shared by every code/JSON/diff view so highlighting looks identical across tools.
- All color pairs validated at ≥4.5:1 contrast in both themes as part of the token definition, not left to per-component judgment.

### Typography
- UI font: **Inter** (variable) — proven legibility at small sizes for dense UI.
- Monospace font: **JetBrains Mono** — used for all code/data input-output panes; ligatures off by default (developer preference toggle to enable).
- Type scale: `xs (12px) / sm (13px) / base (14px) / md (16px) / lg (18px) / xl (22px) / 2xl (28px) / 3xl (36px)`. Base UI text is 14px, not 16px — intentional density choice for a data-tool product, revisited only if accessibility testing shows readability issues.
- Line height: 1.5 for prose, 1.4 for UI labels, 1.6 for monospace code panes.

### Spacing & Layout
- 4px base spacing unit; scale `1 (4px) 2 (8px) 3 (12px) 4 (16px) 6 (24px) 8 (32px) 12 (48px) 16 (64px)`.
- Standard tool page layout: fixed top bar (56px) + collapsible left nav (240px, collapsible to 64px icon rail) + main content area using a responsive two-pane (input/output) or single-pane-with-options layout depending on tool shape.
- Max content width unconstrained for tool panes (developers want full width for data); marketing/docs pages constrained to 720–960px measure for readability.

### Elevation & Radius
- Radius scale: `sm (4px) md (8px) lg (12px)`. Cards/panels use `md`; buttons/inputs use `sm`; modals use `lg`.
- Elevation via subtle border + shadow combination (not shadow alone) so it reads correctly in both themes; 3 levels (raised, popover, modal).

### Motion
- Durations: `fast 100ms` (hover/press), `base 150ms` (panel transitions), `slow 250ms` (modal/palette open). Easing: `ease-out` for entrances, `ease-in` for exits.
- All motion respects `prefers-reduced-motion: reduce` by dropping to instant/near-instant transitions.

## 3. Theming

- Light and dark themes at launch, system-preference default, user-overridable, persisted to localStorage.
- Theme switch must not cause layout shift or flash-of-unstyled-theme (resolved via a blocking inline script reading the persisted preference before first paint).
- Token architecture supports a future "Pro custom branding" (share-link page theming) without touching component code — components only ever reference semantic tokens, never raw hex values.

## 4. Component Library

Built on **shadcn/ui** (Radix primitives + Tailwind), customized to the token set above rather than left in default styling. Core components used across tools:

| Component | Usage |
|---|---|
| `Button` (variants: primary, secondary, ghost, destructive, icon) | All actions |
| `Input` / `Textarea` / `CodeEditor` (CodeMirror 6 wrapper) | Tool input panes |
| `OutputPane` (composed: CodeEditor read-only + copy/download/share action bar) | Tool output — standardized across all tools so output handling (copy, download, share, "open in new tool") is identical everywhere |
| `ToolShell` | Page-level layout wrapper every tool page uses: title, description, options panel slot, input/output slot(s), related-tools footer |
| `OptionsPanel` | Collapsible sidebar/drawer for tool-specific settings (e.g., JSON indent width), built from a schema (Zod) so options UIs are generated consistently, not hand-built per tool |
| `CommandPalette` | Global ⌘K search/launcher with smart-paste detection |
| `Toast` | Non-blocking feedback ("Copied to clipboard", "Share link created") |
| `Dialog` / `Sheet` | Confirmations, settings, mobile drawers |
| `Tabs` | Multi-mode tools (e.g., Encode/Decode as tabs of one tool) |
| `Badge` | Status/labels (e.g., "AI-assisted", "Beta", validation state) |
| `DiffView` | Reusable side-by-side/inline diff renderer shared by text diff, JSON diff, code diff |
| `HistoryDrawer` | Per-tool recent-inputs list, reusable across all tools |
| `EmptyState` | Consistent "nothing here yet" pattern |
| `Skeleton` | Loading placeholders matching final content shape |

**Rule:** no tool builds a bespoke input/output layout from scratch. New tools compose `ToolShell` + `OptionsPanel` + `CodeEditor`/`OutputPane` (or the small set of documented layout variants: single-pane, dual-pane, multi-tab) — see DEVELOPMENT_GUIDE.md for the tool contract.

## 5. Interaction Patterns

- **Live transform by default:** most tools transform on every keystroke (debounced ~150ms) rather than requiring a "Run" click, matching the instant-feedback expectation set by competitors — with an explicit "Run" button only for tools where auto-run is expensive or destructive (e.g., AI calls, large image compression).
- **Copy/Download/Share always in the same position** (top-right of the output pane) across every tool.
- **Errors inline, not modal:** validation/parse errors render inside the relevant pane with line/column info where available, never as a blocking dialog.
- **Command palette (⌘K/Ctrl+K):** opens from anywhere; typing searches tools by name/alias/category; pasting content triggers smart-detection suggestions ("This looks like a JWT — open JWT Decoder?").
- **Every tool deep-linkable:** current input/options reflected in the URL (compressed query param or, for large payloads, a local-only reference) so back/forward and bookmarking work as expected, without requiring the server-backed share-link feature.

## 6. Accessibility Standards (implementation detail; policy in ARCHITECTURE.md §12)

- Every interactive element reachable via Tab in a logical order; visible focus ring using `--color-accent` at all times (never `outline: none` without a replacement).
- All icon-only buttons carry `aria-label`.
- `OutputPane` updates announce via `aria-live="polite"` region so screen reader users know a transform completed.
- Color is never the sole indicator of state — validation errors pair an icon + text with the color, never color alone.
- Form/options controls always have a visible, associated `<label>` (no placeholder-as-label anti-pattern).
- Minimum touch target 44×44px on touch surfaces even where visual size is smaller (padding compensates).
- Automated axe-core checks run in CI against the component library (Storybook) and a fixed set of representative tool pages.

## 7. Responsive Behavior

- Breakpoints: `sm 640px / md 768px / lg 1024px / xl 1280px / 2xl 1536px` (Tailwind defaults).
- Below `lg`: left nav collapses to a bottom/hamburger drawer; dual-pane tools stack input above output instead of side-by-side.
- Command palette remains full-screen-modal on mobile rather than a floating popover.
- Touch-specific affordances (larger tap targets, no hover-only reveals) applied below `md`.

## 8. Content & Voice

- Tool descriptions: one sentence, plain language, states what it does and for whom ("Decode and inspect JSON Web Tokens — view header, payload, and expiry at a glance").
- Error messages are specific and actionable ("Unexpected token at line 4, column 12" not "Invalid input").
- AI features are always labeled with a small "AI" badge and, on first use per tool, a one-time preview of what data will be sent (per FR6).
- No dark patterns: no fake urgency, no disguised ads, no confirm-shaming on opt-outs (e.g., "No thanks" not "No, I don't want to save time").

## 9. Iconography & Illustration

- Icon set: **Lucide** (consistent stroke weight, large library, tree-shakeable) for all UI chrome and tool category icons.
- Each tool module (FEATURE.md) gets one consistent icon used in nav, cards, and command palette results — defined once in the tool registry, never duplicated per-usage.
- No stock illustration; empty states use simple, on-brand line-art generated once per state type, not per tool.

## 10. Storybook & Documentation

- Every shared component in `frontend/src/components/ui` has a Storybook story covering default/hover/focus/error/disabled/loading states.
- Storybook is the source of truth for visual QA and the accessibility CI checks (§6); component PRs require an accompanying story update.

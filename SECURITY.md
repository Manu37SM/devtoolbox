# Security Policy

DevToolbox is a free, AI-augmented developer tools platform. Most tools run entirely client-side and never send input to a server (see ARCHITECTURE.md §8.4's data-flow tiers); the surfaces that do touch a server — accounts/sync, sharing, billing, the AI Gateway, org SSO, the plugin sandbox — are where a security report is most likely to matter.

## Reporting a Vulnerability

Please report suspected security vulnerabilities privately rather than opening a public GitHub issue. Email **security@devtoolbox.dev** with:

- A description of the vulnerability and its potential impact
- Steps to reproduce (a minimal repro is ideal)
- Any relevant logs, screenshots, or proof-of-concept code

We aim to acknowledge reports within **3 business days** and to provide an initial assessment (severity, whether it's accepted, expected timeline) within **10 business days**. Critical, actively-exploitable issues affecting authentication, billing, or data isolation between users/orgs are treated as highest priority.

We currently do not run a paid bug bounty program. Credit in the CHANGELOG.md release notes is offered to reporters who want it, once a fix has shipped.

## Scope

**In scope:**
- The backend API (`backend/`) — auth, sync, sharing, billing, AI Gateway, organizations/SSO, public API, plugin marketplace
- The frontend web app (`frontend/`), including client-side tool transforms if a bug there could corrupt/leak data across the trust boundaries described in ARCHITECTURE.md §8.4
- The browser extension (`packages/extension`) and CLI (`packages/cli`)
- Infrastructure config in this repo (Dockerfile, render.yaml, GitHub Actions workflows) — e.g. a workflow that could leak secrets

**Out of scope:**
- Findings that require a compromised/malicious browser extension, OS-level malware, or physical device access
- Social engineering against DevToolbox staff or users
- Denial-of-service via sheer traffic volume (rate limiting is documented in API.md §12/§15; report a *bypass* of it, not the fact that a large enough flood degrades service)
- Vulnerabilities in third-party dependencies without a demonstrated, DevToolbox-specific exploit path (report upstream first; we track dependency updates separately)

## Supported Versions

DevToolbox is deployed continuously from `main` — there is no versioned release train to patch retroactively. The version running in production is always the target for a fix; there's nothing older to backport to.

## Security-Sensitive Design Notes (for context, not a full architecture doc)

A few things worth knowing before reporting, so a report can focus on an actual gap rather than documented, deliberate behavior:

- Passwords: Argon2id-hashed, never logged. Sessions: refresh tokens are opaque, hashed at rest (`Session.refreshTokenHash`), rotated on use, revoked entirely on password change.
- Org SSO client secrets and history-sync previews are encrypted at rest (AES-256-GCM, per-org/per-user key derivation) — see DATABASE.md §4 and AUDIT_REPORT.md §23/§24.
- Org-level SSO connections are scoped to the email domain they claim (AUDIT_REPORT.md §23.5); full DNS-based domain-ownership verification is a known, disclosed gap, not yet built — an org OWNER can still self-attest a domain for *new* account provisioning (not takeover of an existing account, which is blocked).
- The plugin marketplace executes third-party WASM inside a sandboxed, opaque-origin iframe with `sandbox="allow-scripts"` only and `connect-src 'none'` — see ARCHITECTURE.md §16.
- No tool input/output content is ever sent to error tracking (Sentry) or analytics — see CLAUDE.md rule 8 and AUDIT_REPORT.md §24 for how that's enforced (manual, minimal exception reporting; no session replay; no default request-body capture).

If you find a way around any of the above, that's exactly the kind of report we want.

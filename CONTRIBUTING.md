# CONTRIBUTING.md

Thanks for considering a contribution to DevToolbox. This project's whole premise is "one coherent product, not sixty disconnected tools" — so contribution standards lean deliberately consistent. Please read [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) before your first PR, especially §5 (the tool contract).

## Code of Conduct

Be respectful, assume good faith, keep feedback focused on the work. Harassment, discrimination, or bad-faith behavior of any kind is not tolerated and may result in removal from the project. Report concerns to the maintainers via the contact listed in the repository profile.

## Ways to Contribute

- **New tools** — the highest-value contribution. Check FEATURE.md for the prioritized backlog before proposing a new one; open an issue first if it's not already listed.
- **Bug fixes** — search existing issues before filing a new one; include repro steps and expected vs. actual behavior.
- **Accessibility fixes** — always welcome, fast-tracked for review.
- **Documentation** — corrections/clarifications to any file in this repo.
- **Design system improvements** — changes to `components/ui` require a Storybook story update and a rationale (what breaks/improves) in the PR description.

## Before You Start

1. Check open issues and PRs to avoid duplicate work.
2. For anything non-trivial (new tool, new shared component, architecture change), open an issue describing the approach first — saves everyone rework.
3. Fork, branch from `main`, name branches `type/short-description` (e.g., `feat/json-schema-generator`, `fix/base64-large-file-crash`).

## Development Workflow

1. Follow the local setup in DEVELOPMENT_GUIDE.md §2.
2. Follow the tool contract in DEVELOPMENT_GUIDE.md §5 exactly for new tools — PRs missing tests, registry entry, or `content.mdx` will be asked to complete them before review.
3. Run before pushing:
   ```bash
   npm run lint
   npm run typecheck
   npm run test
   npm run build
   ```
4. Commit using [Conventional Commits](https://www.conventionalcommits.org/): `feat: add json schema generator`, `fix: handle empty input in base64 decoder`, `docs: clarify sync conflict resolution`.

## Pull Request Standards

- One logical change per PR. A new tool is one PR; unrelated fixes go in their own PR.
- PR description must state: what changed, why, how it was tested, and screenshots/GIF for any UI change.
- Link the related issue (`Closes #123`).
- All CI checks must pass (lint, typecheck, unit tests, build, a11y check, Playwright smoke suite) — see DEVELOPMENT_GUIDE.md §7.
- New tools must meet the "Definition of done" in DEVELOPMENT_GUIDE.md §5 before merge.
- At least one maintainer approval required; two for changes touching `packages/shared`, auth, or the AI gateway (security-sensitive surfaces).
- Update CHANGELOG.md is automatic (semantic-release from commit messages) — do not hand-edit CHANGELOG.md in your PR.

## Design & UX Contributions

- Any new UI pattern must be proposed against [UI_GUIDELINES.md](./UI_GUIDELINES.md) — either it fits an existing token/component, or the guideline itself needs a documented update (separate PR, design-focused review).
- No tool may introduce a bespoke input/output layout without a documented reason and maintainer sign-off (default path is composing existing shared components).

## Security

- Do **not** open a public issue for security vulnerabilities. Follow the private disclosure process described in `SECURITY.md` (repository root, added at implementation start) or contact the maintainers directly.
- Any change touching auth, the AI gateway, or data persistence must explicitly address the relevant section of [ARCHITECTURE.md §9 (Security)](./ARCHITECTURE.md#9-security-considerations) in the PR description.

## AI-Assisted Contributions

AI-assisted code (including from Claude/Claude Code) is welcome and expected — see [CLAUDE.md](./CLAUDE.md) for repo-specific agent instructions. The contributor submitting the PR is responsible for reviewing and understanding every line, regardless of how it was generated; "an AI wrote it" is not an acceptable answer to review questions.

## Licensing

By contributing, you agree your contribution is licensed under this project's MIT license (see [LICENSE](./LICENSE)).

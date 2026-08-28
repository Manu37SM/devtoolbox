# @devtoolbox/cli

Command-line client for the DevToolbox Public API — a small, deliberately curated set of tools (hashing, batch JSON validation) for CI pipelines and scripts. Requires a PRO or TEAM plan.

## Setup

1. Create an API key at `devtoolbox.dev/account` → API keys (PRO/TEAM plan required).
2. Export it: `export DEVTOOLBOX_API_KEY=dtb_live_...`

## Usage

```bash
devtoolbox hash sha256 "hello world"
# b94d27b9934d3e08a52e52d7da7dacefac1a3ce9c3adbcf0002d0f30b3d6c1c

devtoolbox json-validate ./config.json
# {"valid":true}

cat data.json | devtoolbox json-validate -
# {"valid":false,"error":"..."}  — exits 1, safe to use as a CI gate
```

`DEVTOOLBOX_API_URL` overrides the default `https://api.devtoolbox.dev/v1` base (useful against a local/staging backend).

## Development

This package is a thin HTTP client (`src/client.ts`) over `packages/shared`'s existing DTOs — it does not import backend or frontend code. `npm run build` (from the repo root, via Turborepo) compiles `src/` to `dist/`; `npm run test` runs `src/**/*.test.ts` with Node's built-in test runner (no new test-framework dependency for this package).

# Production image for the NestJS backend. Built from the monorepo root
# (`docker build -f backend/Dockerfile .`) using `turbo prune` — the
# standard pattern for a Turborepo workspace — so the image only carries
# @devtoolbox/backend and its one internal dependency (@devtoolbox/shared),
# not the frontend, CLI, or extension packages. See AUDIT_REPORT.md §24/§25
# and DEVELOPMENT_GUIDE.md §7 for the full deploy story (this image ships to
# Render's free tier — see render.yaml at the repo root; switched off
# Fly.io because Fly no longer offers a real free tier).

FROM node:22-slim AS base
# Prisma's query engine needs OpenSSL at runtime; node:22-slim (Debian) has
# no cert/OpenSSL packages baked in by default the way the full node image
# does.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ── 1. Prune the monorepo down to just what @devtoolbox/backend needs ─────
FROM base AS pruner
WORKDIR /app
RUN npm install -g turbo@^2.1.0
COPY . .
RUN turbo prune @devtoolbox/backend --docker

# ── 2. Install deps (cached separately from source so `npm ci` only
#      re-runs when package.json/lockfiles actually change) ───────────────
FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
# `turbo prune --docker`'s out/json/ is package.json files only (that's the
# whole point — it's what makes this layer cacheable across builds where
# only source changed). `npm ci`'s postinstall runs `prisma generate`
# (backend/package.json), which needs backend/prisma/schema.prisma to
# exist — out/json/ doesn't carry it, only out/full/ (copied into the next
# stage) does. Copy just that one directory in ahead of `npm ci` rather
# than the full source, so this layer only invalidates when the Prisma
# schema itself changes, not on every unrelated source edit.
COPY --from=pruner /app/out/full/backend/prisma ./backend/prisma
# `npm ci`'s postinstall runs `prisma generate` (backend/package.json) —
# happens here, inside the linux build environment, so the generated query
# engine binary matches the runtime image rather than whatever OS built the
# image on a developer's machine.
RUN npm ci

# ── 3. Bring in full pruned source, build ──────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=installer /app .
COPY --from=pruner /app/out/full/ .
RUN npx turbo run build --filter=@devtoolbox/backend

# ── 4. Runtime image ───────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 devtoolbox && adduser --system --uid 1001 devtoolbox
COPY --from=builder --chown=devtoolbox:devtoolbox /app .
USER devtoolbox

EXPOSE 4000
# GET /health (public, unauthenticated — sso.controller's public-route
# pattern) is what Render's health check (render.yaml's `healthCheckPath`)
# polls; see health module added alongside this Dockerfile.
#
# Migration runs here, as the first step of container start, rather than
# via Render's `preDeployCommand` — that field is a paid-plan-only feature
# and Render's Blueprint validation rejects it outright on the free web
# service plan this app deploys on (render.yaml). `prisma migrate deploy`
# is safe to run on every boot: it's a no-op (exits immediately) when the
# database already has all migrations applied, so this costs nothing on
# ordinary restarts/redeploys with no schema change. `prisma` (the CLI) is
# a devDependency but is still present here — the installer stage above
# runs a full `npm ci`, not `--omit=dev`, and that node_modules carries
# through builder into this runtime image.
#
# `MIGRATE_DATABASE_URL` (DATABASE.md §6.1, checklist item #40) — migrations
# need DDL (CREATE/ALTER TABLE) privileges, which the app's day-to-day
# runtime role (`devtoolbox_app`, the whole point of the least-privilege
# split) deliberately does NOT have. Since this migration step and the app
# process both start from the same CMD/env, they can't just share
# `DATABASE_URL` once that's pointed at the restricted role — so this line
# only overrides `DATABASE_URL` for the `prisma migrate deploy` invocation
# (from `MIGRATE_DATABASE_URL`, the original admin/migration-role
# connection string), then the app itself starts with whatever
# `DATABASE_URL` actually is (the restricted role). Falls back to
# `DATABASE_URL` itself when `MIGRATE_DATABASE_URL` isn't set, so this is a
# no-op / fully backward compatible until that env var is actually added in
# Render — nothing breaks for anyone who hasn't done the role split yet.
CMD ["sh", "-c", "DATABASE_URL=\"${MIGRATE_DATABASE_URL:-$DATABASE_URL}\" npx prisma migrate deploy --schema=backend/prisma/schema.prisma && node backend/dist/backend/src/main.js"]

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
CMD ["node", "backend/dist/backend/src/main.js"]

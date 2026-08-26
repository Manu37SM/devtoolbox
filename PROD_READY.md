# Going to production — a complete, no-jargon walkthrough

## Current status

- **Backend (Render):** ✅ Deployed and live at `https://devtoolbox-api.onrender.com`.
- **Frontend (Vercel):** ✅ Deployed and live at `https://devtoolbox-frontend-final.vercel.app`.
- **GitHub Actions (§8):** ✅ Set up — all required secrets (`RENDER_DEPLOY_HOOK_URL`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`) are added, and `deploy-backend.yml`/`deploy-frontend.yml` deploy automatically on push to `main` after CI passes. Known issue: because Vercel's own Git-integration auto-deploy was never disabled (§7 step 9), every push now produces **two** frontend deploys — the Action's CLI-triggered one (`deploy-frontend.yml`, succeeding) and Vercel's own Git-triggered one (failing, shown as repeated "failed to deploy in the Production environment" notifications). The successful Action-triggered deploy is what's actually live; the failing one is redundant, not a sign the site is down — but it should be silenced by following §7 step 9 (Ignored Build Step) to stop the noise and the wasted build. Root-caused, not yet fixed as of this writing.
- **Domain + Razorpay:** ⏳ Domain not yet verified, Razorpay account not yet verified (Test Mode only) — not covered by this update, tracked separately.

This is a step-by-step guide to taking DevToolbox from "runs on my machine" to "live on the internet," written for someone who has never set up a production deploy before. It assumes no prior experience with any of these tools, and no `openssl` installed locally.

It covers, in order: (1) how to generate the random secret keys the app needs, without `openssl`; (2) every environment variable the app reads, what it's for, and exactly how to get its value; (3) the actual deploy steps for Render (backend) and Vercel (frontend); (4) a plain answer to "is this going to cost me money," service by service; (5) confirmation that everything here works from India.

If you get stuck on any step, the relevant doc is linked — `AUDIT_REPORT.md` explains *why* each architectural decision was made, this file only explains *how* to execute it.

---

## 1. The one-line answer to "will this cost me money?"

**No, not if you leave AI features off.** Every service below has a free tier that needs no credit card, except Anthropic's Claude API (which powers the AI tools — Explain This, AI Commit Message, etc.). That one is pay-as-you-go with no free tier. If you leave `ANTHROPIC_API_KEY` blank, the app runs completely free and the AI tools simply show "AI features are not configured" instead of erroring — nothing else breaks.

| Service | What it's for | Free tier? | Card required? |
|---|---|---|---|
| Render | Backend hosting + Redis | Yes, permanent | No |
| Neon | Postgres database | Yes, permanent (with usage limits) | No |
| Vercel | Frontend hosting | Yes, permanent | No |
| Sentry | Error tracking | Yes, permanent (Developer plan) | No |
| Resend | Sending emails (verify/reset) | Yes, 3,000 emails/month | No |
| GitHub OAuth app | "Sign in with GitHub" | Free, always | No |
| Google OAuth app | "Sign in with Google" | Free, always | No |
| Razorpay | Accepting payments (Pro/Team plans) | Free to register; Test Mode is fully free | No, until you go Live |
| Anthropic (Claude API) | AI-powered tools | **No free tier** — pay per request | Yes, if you want AI features |

Full detail on each is in §5.

---

## 2. Generating secrets without openssl

Several env vars need a random secret value (`JWT_ACCESS_SECRET`, `HISTORY_ENCRYPTION_KEY`, etc.). The docs elsewhere in this repo say "generate with `openssl rand -base64 32`" — that assumes you have `openssl` installed, which you don't. You don't need it: Node.js (which you already have, since this is a Node project) can generate the exact same kind of random value.

Open a terminal in the project folder and run this once for **each** secret you need (running it twice gives you two different values, which is correct — every secret below should be unique, never reused):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

That prints one line of random text, e.g. `k3F9s...==`. Copy the whole line — that's your secret. Run this command four separate times to get four different values for the four secrets listed in §3.1 below (don't reuse one value for multiple vars).

If you'd rather generate all four at once, run this instead:

```bash
node -e "for (let i = 0; i < 4; i++) console.log(require('crypto').randomBytes(32).toString('base64'))"
```

That's it — no installation, no extra tools. This works identically on Windows, macOS, and Linux, since it's just Node.

---

## 3. Backend environment variables

These live in the Render dashboard once deployed (see §6), and in a local `.env` file (copied from `.env.example`) for local development. Split into two groups: things that must be set for the app to boot at all, and things that are optional and degrade gracefully if left blank.

### 3.1 Required — the app won't start without these

| Variable | What it is | How to get it |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | Paste in yourself — see §6 step 3 for creating a Neon project/database and getting this string (`render.yaml` doesn't provision Postgres at all — it now lives on Neon, a separate provider from Render) |
| `REDIS_URL` | Redis connection string | **Auto-filled by Render** — see §6 |
| `JWT_ACCESS_SECRET` | Signs login session tokens | Run the command in §2, paste the output |
| `JWT_REFRESH_SECRET` | Signs long-lived refresh tokens | Run the command in §2 again — must be a **different** value from `JWT_ACCESS_SECRET` |
| `HISTORY_ENCRYPTION_KEY` | Encrypts users' synced tool-history previews at rest | Run the command in §2 again — a third, different value |
| `SSO_SECRET_ENCRYPTION_KEY` | Encrypts SSO client secrets at rest | Run the command in §2 again — a fourth, different value |

You'll set these directly in the Render dashboard when you create the service (§6) — `render.yaml` marks them `sync: false`, meaning Render won't auto-generate them, you paste each value in yourself.

**`CSRF_SECRET`** — not strictly required (falls back to `JWT_ACCESS_SECRET` if unset, so the app still boots and the CSRF protection still functions), but you should set a dedicated value in production rather than rely on the fallback. Run the command in §2 again — a fifth, different value.

### 3.2 Optional — the app boots fine without these, but the related feature is disabled until set

**`FRONTEND_URL`** / **`BACKEND_URL`** — your deployed frontend's and backend's own URLs (e.g. `https://devtoolbox.vercel.app` and `https://devtoolbox-api.onrender.com`). Both have a `localhost` default in code, so the backend boots fine without them — but leaving them unset once you're actually deployed breaks real functionality: CORS will reject requests from your real frontend origin, the SSO callback URL (API.md §17.5) will point at `localhost`, and any links in emails will be wrong. You won't know the real values until after §6 (`BACKEND_URL`) and §7 (`FRONTEND_URL`), so it's normal to deploy first with these blank/placeholder and come back to set the real values once both services are live — just don't skip that step.

**`ANTHROPIC_API_KEY`** — powers every AI tool (Explain This, NL→Cron, AI Commit Message, etc.). Leave blank to skip AI features entirely at zero cost; every AI tool page will show a friendly "not configured" message instead of an error.

To get one (only if you want AI features and accept the pay-as-you-go cost):
1. Go to [console.anthropic.com](https://console.anthropic.com) and sign up.
2. Add a payment method under **Settings → Billing** (required before you can use the API — there's no free trial credit by default).
3. Go to **Settings → API Keys → Create Key**, give it a name (e.g. "devtoolbox-prod"), and copy the value shown — it starts with `sk-ant-`. You only see it once.
4. Set `ANTHROPIC_API_KEY` to that value.
5. Optionally set a spending limit under **Settings → Limits** so you can never be surprised by a bill — this is worth doing immediately if you're cost-conscious.

**`SENTRY_DSN`** — sends backend crash reports to Sentry so you find out about errors instead of a user emailing you. Leave blank to skip; the app works fine without it, you just won't see errors anywhere.

Full step-by-step (this is the level of detail you asked for):
1. Go to [sentry.io](https://sentry.io) and click **Sign Up**. Use email, GitHub, or Google — free, no card asked.
2. After signup you'll be prompted to create an organization — give it any name (e.g. your username).
3. Click **Create Project**. On the platform picker, choose **Node.js** (for the backend) or more specifically **NestJS** if it's listed — either works, the framework-specific option just pre-fills a snippet you can ignore since it's already wired up in this codebase.
4. Name the project (e.g. `devtoolbox-backend`) and click **Create Project**.
5. Sentry will show you a "Configure SDK" page with a code snippet containing a `dsn: "https://..."` value. That URL-looking string is your DSN.
6. If you land on a different page later, you can always find it again at **Settings → Projects → (your project) → Client Keys (DSN)** — copy the value labeled **DSN**.
7. Set `SENTRY_DSN` to that value.
8. Repeat steps 3–7 for a second project (platform: **Next.js**) if you want frontend error tracking too — that DSN goes in `NEXT_PUBLIC_SENTRY_DSN` (§4), not this one. Or reuse the same DSN for both; either works.
9. (Optional, CI-only) For readable stack traces in the Sentry dashboard instead of minified code, go to **Settings → Auth Tokens → Create New Token** with the `project:releases` scope, and set that as the `SENTRY_AUTH_TOKEN` GitHub Actions secret (§8), along with `SENTRY_ORG` (your org slug, shown in the URL) and `SENTRY_PROJECT` (your project slug). This step is entirely optional — error capture works without it.

**`RESEND_API_KEY`** / **`EMAIL_FROM`** — sends real emails (email verification, password reset, org invites). Leave blank in dev; links are printed to the backend console log instead of emailed. Required in production, or your users can never verify their email or reset a forgotten password.

1. Go to [resend.com](https://resend.com) and sign up (free, no card).
2. Go to **API Keys → Create API Key**, name it, and copy the value — it starts with `re_`.
3. Set `RESEND_API_KEY` to that value.
4. For `EMAIL_FROM`, Resend's free tier only lets you send from `onboarding@resend.dev` until you verify your own domain. Either:
   - Leave `EMAIL_FROM` as `DevToolbox <onboarding@resend.dev>` to start sending immediately with no setup, or
   - Go to **Domains → Add Domain**, enter a domain you own, and add the DNS records Resend shows you (at your domain registrar) to verify it — then use `DevToolbox <noreply@yourdomain.com>`.

**`GITHUB_OAUTH_CLIENT_ID`** / **`GITHUB_OAUTH_CLIENT_SECRET`** — powers "Continue with GitHub." Leave both blank to hide that button; email/password login still works.

1. Go to [github.com/settings/developers](https://github.com/settings/developers) → **OAuth Apps → New OAuth App**.
2. Application name: anything (e.g. "DevToolbox"). Homepage URL: your frontend URL (e.g. `https://devtoolbox.vercel.app`). Authorization callback URL: `<your frontend URL>/auth/github/callback` — check `API.md` if the exact path has changed.
3. Click **Register application**. The **Client ID** is shown immediately — copy it into both `GITHUB_OAUTH_CLIENT_ID` (backend) and `NEXT_PUBLIC_GITHUB_CLIENT_ID` (frontend, §4) — same value in both places.
4. Click **Generate a new client secret**, copy it into `GITHUB_OAUTH_CLIENT_SECRET` (backend only — never put a secret in a `NEXT_PUBLIC_*` variable, those are visible in the browser).

**`GOOGLE_OAUTH_CLIENT_ID`** / **`GOOGLE_OAUTH_CLIENT_SECRET`** — same idea, for "Continue with Google."

1. Go to [console.cloud.google.com](https://console.cloud.google.com), create a project (or use an existing one) via the project dropdown at the top.
2. Go to **APIs & Services → OAuth consent screen**. Choose **External**, fill in an app name, your email, and click through to save (you don't need to submit for verification for personal/small-scale use — it works in "Testing" mode for a limited user list, or "In production" for unlimited but unverified, which shows a warning screen users click through).
3. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**. Application type: **Web application**. Add an Authorized redirect URI: `<your frontend URL>/auth/google/callback`.
4. Click **Create**. A popup shows your **Client ID** and **Client Secret** — copy the Client ID into `GOOGLE_OAUTH_CLIENT_ID` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (same value, both places), and the secret into `GOOGLE_OAUTH_CLIENT_SECRET` only.

**`RAZORPAY_KEY_ID`** / **`RAZORPAY_KEY_SECRET`** / **`RAZORPAY_WEBHOOK_SECRET`** / **`RAZORPAY_PLAN_ID_PRO`** / **`RAZORPAY_PLAN_ID_TEAM`** — powers paid Pro/Team subscriptions. Leave all blank to run the app as fully free/no-billing; `/billing/*` routes will return a clear "not configured" response instead of erroring, and every tool remains free regardless (billing only gates optional team/AI-quota features, never a core tool — see `CLAUDE.md` rule 2).

1. Go to [razorpay.com](https://razorpay.com) → **Sign Up**, using an Indian business/individual PAN as required by their KYC. Registration itself is free.
2. Once logged in, toggle to **Test Mode** (top-right switch in the dashboard) — Test Mode is entirely free and fully functional for development; you don't need to complete KYC/activation to use it.
3. Go to **Settings → API Keys → Generate Test Key**. Copy the **Key Id** into `RAZORPAY_KEY_ID` and the **Key Secret** into `RAZORPAY_KEY_SECRET`.
4. Go to **Subscriptions → Plans → Create Plan**, make one for your "Pro" tier and one for "Team" tier (set whatever price you want — this is just a plan definition, no money moves yet). Copy each plan's ID (`plan_...`) into `RAZORPAY_PLAN_ID_PRO` / `RAZORPAY_PLAN_ID_TEAM`.
5. Go to **Settings → Webhooks → Add New Webhook**, point it at `<your backend URL>/billing/webhook`, select the subscription-related events (`subscription.activated`, `subscription.cancelled`, etc. — see `API.md` §14 for the exact list this app listens for), and copy the **Webhook Secret** shown into `RAZORPAY_WEBHOOK_SECRET`.
6. Only switch to **Live Mode** (real money, per-transaction fees apply — no monthly cost, Razorpay only takes a cut per successful payment) once you're actually ready to accept real payments — repeat steps 3–5 in Live Mode to get a second set of live keys.

**`TURNSTILE_SECRET_KEY`** — enables bot-protection (captcha) verification on register/login/password-reset. Leave blank to skip verification entirely (fine for local dev; you should set this in production). Free, no card needed, no usage cap for standard traffic.

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) and sign up/log in (a free Cloudflare account, no domain required — Turnstile works standalone).
2. Go to **Turnstile** in the left sidebar → **Add Site**. Give it any name, add your frontend domain (e.g. `devtoolbox.vercel.app`, or `localhost` for testing), and choose the **Managed** widget mode.
3. After creating it, you'll see a **Site Key** and a **Secret Key**. Copy the **Secret Key** into `TURNSTILE_SECRET_KEY` (backend). The **Site Key** goes into `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (frontend, §4) — that one is public, safe to expose in the browser.
4. Once both keys are set (backend `TURNSTILE_SECRET_KEY`, frontend `NEXT_PUBLIC_TURNSTILE_SITE_KEY`) and both services redeploy, the captcha checkbox shows up automatically on the register/login/reset-password forms and starts being enforced — no further steps needed.

**`OBJECT_STORAGE_ENDPOINT`** / **`OBJECT_STORAGE_BUCKET`** / **`OBJECT_STORAGE_ACCESS_KEY`** / **`OBJECT_STORAGE_SECRET_KEY`** — not currently used by any shipped feature (scaffolded for future use per `ARCHITECTURE.md`). Leave all blank; nothing in the app reads them yet.

---

## 4. Frontend environment variables

Set these in the Vercel dashboard (**Project → Settings → Environment Variables**) — see §7.

| Variable | What it is | How to get it |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Where the frontend sends API requests | `<your Render backend URL>/v1`, e.g. `https://devtoolbox-api.onrender.com/v1` |
| `NEXT_PUBLIC_SITE_URL` | Your frontend's own public URL | Your Vercel URL or custom domain, e.g. `https://devtoolbox.vercel.app` — used to build `robots.txt`/`sitemap.xml` |
| `NEXT_PUBLIC_SENTRY_DSN` | Frontend error tracking | Same steps as backend `SENTRY_DSN` above, step 8 |
| `NEXT_PUBLIC_ANALYTICS_HOST` | Product analytics | Not wired up to any provider yet — leave blank |
| `NEXT_PUBLIC_GITHUB_CLIENT_ID` | "Continue with GitHub" button | Same value as backend `GITHUB_OAUTH_CLIENT_ID` above |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | "Continue with Google" button | Same value as backend `GOOGLE_OAUTH_CLIENT_ID` above |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Captcha widget on auth forms | Same **Site Key** from the Turnstile steps above (§3) — safe to expose publicly, that's what a site key is for |

Anything prefixed `NEXT_PUBLIC_` is visible to anyone who views your site's source — never put a secret (API key, password, client *secret*) in one of these. That's why only client *IDs* (not secrets) appear on this list.

---

## 5. Is this actually free? Service-by-service

- **Render (backend + Redis)** — genuinely free, no card. Trade-offs worth knowing: the free web service goes to sleep after 15 minutes with no traffic (next request takes ~30-60 seconds to wake it up — fine for a personal project, noticeable for real users). Free Redis is in-memory only and clears on restart, which is fine for this app's usage (job queue + rate-limit counters, nothing that needs to survive a restart).
- **Neon (Postgres)** — genuinely free, no card, and not subject to Render's one-free-instance-per-account limit (each Neon project is its own dedicated database). Trade-off worth knowing: Neon's free plan autosuspends the compute after a period of inactivity, so the first query after a quiet spell pays a brief cold-start (typically well under Render's ~30-60s, but check Neon's current docs for the exact number since free-tier limits do change over time) — same category of trade-off as Render's sleep, just shorter. Free-tier storage and compute-hour caps also apply; check Neon's pricing page for current numbers before you rely on this for real production volume.
- **Vercel (frontend)** — free tier is genuinely usable long-term for a project this size, no card needed.
- **Sentry** — the free "Developer" plan is permanent, no card, with a monthly event cap generous enough for a small app.
- **Resend** — 3,000 emails/month free, no card. This app only sends transactional emails (verify, reset, invites), so you'd need real user volume to exceed that.
- **GitHub/Google OAuth apps** — registering an OAuth app is always free; it's just a config entry in each platform's developer console, not a paid product.
- **Razorpay** — free to register, and **Test Mode is entirely free and fully functional** for as long as you want to stay there. Live Mode has no monthly fee either — Razorpay takes a small percentage per successful transaction, so you only pay when you're actually making money.
- **Anthropic (Claude API)** — the one real, unavoidable cost if you want AI features. No free tier, pay-as-you-go per request. If cost is a concern: leave `ANTHROPIC_API_KEY` blank (app runs 100% free, AI tools just show as unavailable), or set a hard spending limit in the Anthropic console so you can experiment without risk of a surprise bill.

---

## 6. Deploying the backend to Render

1. Push this repo to GitHub (if it isn't already).
2. Go to [render.com](https://render.com) → **Sign Up** (GitHub sign-in is fastest) — no card required.
3. **Get a Neon Postgres database ready first, before creating the Blueprint.** `render.yaml` intentionally has no `databases:` entry — Postgres lives on [Neon](https://neon.tech), not Render.
   - Go to [neon.tech](https://neon.tech) → **Sign Up** (GitHub sign-in is fastest) — no card required.
   - Click **Create a project**, name it (e.g. `devtoolbox`), pick a region close to your users, and accept the default Postgres version. Neon creates a default database (usually named `neondb`) inside the project — you can rename it or create a new one named `devtoolbox` from the Neon console's **Databases** tab if you'd rather match the name used elsewhere in this doc.
   - On the project's **Dashboard**, find the **Connection string** panel. Copy the **direct** (non-pooled) connection string — the one *without* `-pooler` in the hostname. Use the direct string for both `DATABASE_URL` and `MIGRATE_DATABASE_URL` below: this app is a single long-running Render web service (not serverless/edge functions juggling many short-lived connections), Prisma already pools connections internally, and `prisma migrate deploy` needs a direct connection rather than one going through Neon's PgBouncer-based pooler. Neon's connection string already includes `?sslmode=require`, which Prisma needs — don't strip it off.
   - **Already have data in the old Render Postgres database and moving a live app?** Dump it and restore into Neon before switching `DATABASE_URL` over, so you don't lose anything: `pg_dump "$OLD_RENDER_DATABASE_URL" --no-owner --no-privileges -Fc -f devtoolbox.dump` then `pg_restore --no-owner --no-privileges -d "$NEON_DIRECT_URL" devtoolbox.dump` (both commands need `pg_dump`/`pg_restore` installed locally — they ship with any Postgres client install). Do this during a short maintenance window, since writes to the old database after the dump won't carry over. If this is a fresh deploy with no real user data yet, skip this — `prisma migrate deploy` (below) creates the schema fresh on Neon.
   - You'll need this connection string in step 5.
4. Click **New → Blueprint**, then pick this repository. Render reads `render.yaml` at the repo root and shows the two resources it defines: the `devtoolbox-api` web service and the `devtoolbox-redis` cache. Click **Apply** — Render creates both. `REDIS_URL` is wired up automatically; `DATABASE_URL` is not (see step 5).
5. Once created, go to the `devtoolbox-api` service → **Environment** tab, and fill in every variable marked `sync: false` in `render.yaml` — that's `DATABASE_URL` (the connection string from step 3) plus the full list in §3.1 and §3.2 above (skip any optional one you're not using).
6. Still on the service page, go to **Settings** and turn **Auto-Deploy** off — this repo's `deploy-backend.yml` GitHub Action triggers deploys instead, only after CI passes (see `DEVELOPMENT_GUIDE.md` §7). If you'd rather use Render's own auto-deploy and skip that extra safety gate, leave it on instead and skip step 8.
7. Go to **Settings → Deploy Hook**, copy the URL shown.
8. In your GitHub repo, go to **Settings → Secrets and variables → Actions → New repository secret**, name it `RENDER_DEPLOY_HOOK_URL`, and paste the URL from step 7.
9. Push to `main` (or manually trigger the first deploy from the Render dashboard) — Render builds `backend/Dockerfile` and starts the service. Once it's up, visit `<your service URL>/v1/health` — you should see `{"status":"ok",...}`.

Database migrations run automatically — you don't need a separate manual step for them. Render's `preDeployCommand` field would be the natural place for this, but it's a paid-plan-only feature and Render's Blueprint validation rejects the whole deploy outright if it's set on a free web service (`"pre-deploy command is not supported for free tier services"`). Instead, `npx prisma migrate deploy` runs as the first step of the container's start command (see `backend/Dockerfile`'s `CMD`), every time the service boots. This is safe on ordinary restarts and redeploys with no schema change — it's a no-op once the database already has every migration applied. If you later upgrade `devtoolbox-api` to a paid Render plan, moving the migration to `preDeployCommand` in `render.yaml` is a fine (optional) cleanup, but leaving it in the Dockerfile also continues to work fine.

## 7. Deploying the frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → **Sign Up** (GitHub sign-in is fastest) — no card required.
2. Click **Add New → Project**, pick this repository. **Leave Root Directory as the repository root** (don't set it to `frontend`) — `vercel.json` at the repo root already scopes everything to the frontend workspace for you (`buildCommand: "npx turbo run build --filter=@devtoolbox/frontend"`, `outputDirectory: "frontend/.next"`), but only if Vercel is actually looking at the repo root for that file. Setting Root Directory to `frontend` makes Vercel look for `frontend/vercel.json` instead — which doesn't exist — silently discarding this config. With Root Directory left at the repo root, the Build Command/Output Directory/Install Command fields under **Build and Output Settings** should auto-populate to match `vercel.json` (`npx turbo run build --filter=@devtoolbox/frontend`, `frontend/.next`, `npm ci`) — you shouldn't need to type any of them in by hand.
3. In **Environment Variables**, add everything from §4 above.
4. Click **Deploy**. First deploy takes a few minutes.
5. Go to **Settings → General**, note your project's **Project ID**, and your account's **Org ID** — both are shown there, or run `vercel link` locally to get them.
6. In your GitHub repo, add three more Actions secrets (same location as step 8 above): `VERCEL_TOKEN` (generate one at **vercel.com → Account Settings → Tokens → Create**), `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (both from step 5).
7. Push to `main` — `deploy-frontend.yml` picks it up after CI passes and deploys via the Vercel CLI.
8. Go back to the Render dashboard (§6) and update `FRONTEND_URL` to your real Vercel URL, and update `NEXT_PUBLIC_API_BASE_URL` in Vercel to your real Render URL — these two need to point at each other's *actual* deployed addresses, not the placeholders.
9. **Do this once §8's GitHub Action secrets are set — it's what's currently causing the "failed to deploy" notifications (see Current status above).** Unlike Render, Vercel has no single "Auto-Deploy off" toggle — its Git integration keeps deploying on every push regardless of the Action, and in this repo's case that second, redundant Git-triggered deploy is actually failing (not just wasting a build — see the Current status note for why the failure itself isn't dangerous: the Action's deploy is the one that goes live). To make Vercel deploy *only* through the CI-gated Action: go to **Settings → Git → Ignored Build Step**, and set it to a command that always exits `0` (e.g. `exit 0`) — this makes Vercel skip every Git-triggered build while leaving the Git connection (PR comments, etc.) and CLI/Action-triggered deploys (`vercel deploy`, used by `deploy-frontend.yml`) working normally.

---

## 8. GitHub Actions secrets — full list

**Status: done.** All four required secrets are set and `deploy-backend.yml`/`deploy-frontend.yml` deploy automatically on push to `main` after CI passes. Set under **Settings → Secrets and variables → Actions** in the GitHub repo:

| Secret | Used by | Where it comes from |
|---|---|---|
| `RENDER_DEPLOY_HOOK_URL` | `deploy-backend.yml` | §6 step 7 |
| `VERCEL_TOKEN` | `deploy-frontend.yml` | §7 step 6 |
| `VERCEL_ORG_ID` | `deploy-frontend.yml` | §7 step 5 |
| `VERCEL_PROJECT_ID` | `deploy-frontend.yml` | §7 step 5 |
| `SENTRY_ORG` (optional) | source-map upload during **frontend** build | Your Sentry org slug (shown in the Sentry dashboard URL) |
| `SENTRY_PROJECT` (optional) | source-map upload during **frontend** build | Your **frontend** Sentry project's slug (the Next.js project, not the backend/NestJS one — see note below) |
| `SENTRY_AUTH_TOKEN` (optional) | source-map upload during **frontend** build | §3.2's Sentry step 9 |

**Not currently wired up.** As of this writing, none of `ci.yml`, `deploy-backend.yml`, or `deploy-frontend.yml` actually reference `SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN` — the source-map upload step this table describes hasn't been implemented in any workflow yet. It's fine to have `SENTRY_AUTH_TOKEN`/`SENTRY_ORG` set without `SENTRY_PROJECT` (or none of the three at all) — nothing currently reads them. This is unrelated to error tracking working at runtime, which only depends on `SENTRY_DSN` (backend, §3.2) and `NEXT_PUBLIC_SENTRY_DSN` (frontend, §4) being set on Render/Vercel — those are already live if you followed §3.2/§4.

If backend and frontend are different Sentry projects (they should be — one Node/NestJS project, one Next.js project), `SENTRY_PROJECT` as a single GitHub Actions secret can only ever hold one slug. That's fine as documented here because this row is specifically for the *frontend* build's source-map upload — the backend was never meant to use this secret. If a backend source-map/release step is added later, it needs its own separately-named secret (e.g. `SENTRY_PROJECT_BACKEND`), not a second value crammed into this one.

---

## 9. India availability

Every service recommended above works from India with no restriction: Render, Vercel, Sentry, Resend, and GitHub/Google's OAuth app registration all have no India-specific gating. Razorpay is built specifically for Indian businesses (which is why this app uses it instead of Stripe — Stripe doesn't support billing for India-based accounts, see `AUDIT_REPORT.md` §20 for that earlier swap). Anthropic's API is available in India as of this writing (Anthropic opened a Bengaluru office in early 2026), though — as noted throughout this file — it's the one paid-only piece if you choose to enable it.

One geographic trade-off worth knowing: Render's closest region to India is Singapore (no Mumbai region exists on Render yet), so backend requests have a bit more latency for India-based users than a Mumbai-hosted backend would. This is a real trade-off, not a hidden one — see `AUDIT_REPORT.md` §25 for the full comparison against the alternatives that were considered.

---

## 10. Quick checklist

- [x] Generated 4 unique secrets via `node -e "..."` (§2): `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `HISTORY_ENCRYPTION_KEY`, `SSO_SECRET_ENCRYPTION_KEY`
- [x] Render Blueprint deployed, all `sync: false` env vars filled in (§6) — live at `https://devtoolbox-api.onrender.com`
- [x] Vercel project deployed, all `NEXT_PUBLIC_*` env vars filled in (§7) — live at `https://devtoolbox-frontend-final.vercel.app`
- [x] `FRONTEND_URL` (Render) and `NEXT_PUBLIC_API_BASE_URL` (Vercel) point at each other's real URLs
- [x] `<backend URL>/v1/health` returns `{"status":"ok"}`
- [x] Decided whether to enable `ANTHROPIC_API_KEY` (cost) — set a spending limit if yes
- [x] Decided whether to enable Sentry, Resend, OAuth apps, Razorpay — each is independently optional
- [x] **GitHub Actions secrets set (§8) so `git push` to `main` deploys automatically** — done; still need to silence Vercel's redundant failing auto-deploy via §7 step 9 (Ignored Build Step)
- [ ] Domain verified
- [ ] Razorpay account verified (currently Test Mode only)
- [ ] **Post-launch auth hardening (2026-08-19):** set `CSRF_SECRET` and `TURNSTILE_SECRET_KEY`/`NEXT_PUBLIC_TURNSTILE_SITE_KEY` in Render/Vercel and run `backend/prisma/migrations/20260819104352_add_account_lockout_and_security_log` against production (`npm run db:migrate` / Render's release command already runs `prisma migrate deploy`, so this applies automatically on the next deploy — just confirm it went through). `CSRF_SECRET` alone is optional (falls back safely) but should be set for real. `TURNSTILE_SECRET_KEY` left unset just means captcha verification stays off, not a boot failure — see §3.
- [ ] Run `scripts/create-least-privilege-db-role.sql` against the production database (see DATABASE.md §6.1) — requires the current DB admin credential; can't be automated from this repo.

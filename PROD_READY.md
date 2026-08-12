# Going to production — a complete, no-jargon walkthrough

This is a step-by-step guide to taking DevToolbox from "runs on my machine" to "live on the internet," written for someone who has never set up a production deploy before. It assumes no prior experience with any of these tools, and no `openssl` installed locally.

It covers, in order: (1) how to generate the random secret keys the app needs, without `openssl`; (2) every environment variable the app reads, what it's for, and exactly how to get its value; (3) the actual deploy steps for Render (backend) and Vercel (frontend); (4) a plain answer to "is this going to cost me money," service by service; (5) confirmation that everything here works from India.

If you get stuck on any step, the relevant doc is linked — `AUDIT_REPORT.md` explains *why* each architectural decision was made, this file only explains *how* to execute it.

---

## 1. The one-line answer to "will this cost me money?"

**No, not if you leave AI features off.** Every service below has a free tier that needs no credit card, except Anthropic's Claude API (which powers the AI tools — Explain This, AI Commit Message, etc.). That one is pay-as-you-go with no free tier. If you leave `ANTHROPIC_API_KEY` blank, the app runs completely free and the AI tools simply show "AI features are not configured" instead of erroring — nothing else breaks.

| Service | What it's for | Free tier? | Card required? |
|---|---|---|---|
| Render | Backend hosting + Postgres + Redis | Yes, permanent | No |
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

That prints one line of random text, e.g. `k3F9s...==`. Copy the whole line — that's your secret. Run this command five separate times to get five different values for the five secrets listed in §3.1 below (don't reuse one value for multiple vars).

If you'd rather generate all five at once, run this instead:

```bash
node -e "for (let i = 0; i < 5; i++) console.log(require('crypto').randomBytes(32).toString('base64'))"
```

That's it — no installation, no extra tools. This works identically on Windows, macOS, and Linux, since it's just Node.

---

## 3. Backend environment variables

These live in the Render dashboard once deployed (see §6), and in a local `.env` file (copied from `.env.example`) for local development. Split into two groups: things that must be set for the app to boot at all, and things that are optional and degrade gracefully if left blank.

### 3.1 Required — the app won't start without these

| Variable | What it is | How to get it |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | **Auto-filled by Render** — see §6, you never type this in yourself |
| `REDIS_URL` | Redis connection string | **Auto-filled by Render** — see §6 |
| `JWT_ACCESS_SECRET` | Signs login session tokens | Run the command in §2, paste the output |
| `JWT_REFRESH_SECRET` | Signs long-lived refresh tokens | Run the command in §2 again — must be a **different** value from `JWT_ACCESS_SECRET` |
| `HISTORY_ENCRYPTION_KEY` | Encrypts users' synced tool-history previews at rest | Run the command in §2 again — a third, different value |
| `SSO_SECRET_ENCRYPTION_KEY` | Encrypts SSO client secrets at rest | Run the command in §2 again — a fourth, different value |
| `FRONTEND_URL` | Your deployed frontend's URL | The Vercel URL you get in §7 (e.g. `https://devtoolbox.vercel.app`), or your custom domain |
| `BACKEND_URL` | Your deployed backend's own URL | The Render URL you get in §6 (e.g. `https://devtoolbox-api.onrender.com`) |

You'll set these directly in the Render dashboard when you create the service (§6) — `render.yaml` marks them `sync: false`, meaning Render won't auto-generate them, you paste each value in yourself.

### 3.2 Optional — the app boots fine without these, but the related feature is disabled until set

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

Anything prefixed `NEXT_PUBLIC_` is visible to anyone who views your site's source — never put a secret (API key, password, client *secret*) in one of these. That's why only client *IDs* (not secrets) appear on this list.

---

## 5. Is this actually free? Service-by-service

- **Render (backend + Postgres + Redis)** — genuinely free, no card. Trade-offs worth knowing: the free web service goes to sleep after 15 minutes with no traffic (next request takes ~30-60 seconds to wake it up — fine for a personal project, noticeable for real users); free Postgres is deleted 30 days after creation (with a 14-day grace period), unless you upgrade to a paid instance type before then — put a calendar reminder for day 25 if you're staying on free. Free Redis is in-memory only and clears on restart, which is fine for this app's usage (job queue + rate-limit counters, nothing that needs to survive a restart).
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
3. Click **New → Blueprint**, then pick this repository. Render reads `render.yaml` at the repo root automatically and shows you the three resources it defines: the `devtoolbox-api` web service, the `devtoolbox-db` Postgres database, and the `devtoolbox-redis` cache.
4. Click **Apply** — Render creates all three. `DATABASE_URL` and `REDIS_URL` are wired up automatically between them; you don't type those in.
5. Once created, go to the `devtoolbox-api` service → **Environment** tab, and fill in every variable marked `sync: false` in `render.yaml` — that's the full list in §3.1 and §3.2 above (skip any optional one you're not using).
6. Still on the service page, go to **Settings** and turn **Auto-Deploy** off — this repo's `deploy-backend.yml` GitHub Action triggers deploys instead, only after CI passes (see `DEVELOPMENT_GUIDE.md` §7). If you'd rather use Render's own auto-deploy and skip that extra safety gate, leave it on instead and skip step 8.
7. Go to **Settings → Deploy Hook**, copy the URL shown.
8. In your GitHub repo, go to **Settings → Secrets and variables → Actions → New repository secret**, name it `RENDER_DEPLOY_HOOK_URL`, and paste the URL from step 7.
9. Push to `main` (or manually trigger the first deploy from the Render dashboard) — Render builds `backend/Dockerfile` and starts the service. Once it's up, visit `<your service URL>/v1/health` — you should see `{"status":"ok",...}`.

## 7. Deploying the frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → **Sign Up** (GitHub sign-in is fastest) — no card required.
2. Click **Add New → Project**, pick this repository. When prompted for the root directory, choose `frontend` (this is a monorepo — `vercel.json` at the repo root already configures the correct build command for that).
3. In **Environment Variables**, add everything from §4 above.
4. Click **Deploy**. First deploy takes a few minutes.
5. Go to **Settings → General**, note your project's **Project ID**, and your account's **Org ID** — both are shown there, or run `vercel link` locally to get them.
6. In your GitHub repo, add three more Actions secrets (same location as step 8 above): `VERCEL_TOKEN` (generate one at **vercel.com → Account Settings → Tokens → Create**), `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (both from step 5).
7. Push to `main` — `deploy-frontend.yml` picks it up after CI passes and deploys via the Vercel CLI.
8. Go back to the Render dashboard (§6) and update `FRONTEND_URL` to your real Vercel URL, and update `NEXT_PUBLIC_API_BASE_URL` in Vercel to your real Render URL — these two need to point at each other's *actual* deployed addresses, not the placeholders.

---

## 8. GitHub Actions secrets — full list

Set these under **Settings → Secrets and variables → Actions** in your GitHub repo:

| Secret | Used by | Where it comes from |
|---|---|---|
| `RENDER_DEPLOY_HOOK_URL` | `deploy-backend.yml` | §6 step 7 |
| `VERCEL_TOKEN` | `deploy-frontend.yml` | §7 step 6 |
| `VERCEL_ORG_ID` | `deploy-frontend.yml` | §7 step 5 |
| `VERCEL_PROJECT_ID` | `deploy-frontend.yml` | §7 step 5 |
| `SENTRY_ORG` (optional) | source-map upload during frontend build | Your Sentry org slug (shown in the Sentry dashboard URL) |
| `SENTRY_PROJECT` (optional) | source-map upload during frontend build | Your Sentry project slug |
| `SENTRY_AUTH_TOKEN` (optional) | source-map upload during frontend build | §3.2's Sentry step 9 |

The three `SENTRY_*` secrets are only needed for readable (non-minified) stack traces in the Sentry dashboard — skip them and everything else still works, you'll just see minified code in error reports.

---

## 9. India availability

Every service recommended above works from India with no restriction: Render, Vercel, Sentry, Resend, and GitHub/Google's OAuth app registration all have no India-specific gating. Razorpay is built specifically for Indian businesses (which is why this app uses it instead of Stripe — Stripe doesn't support billing for India-based accounts, see `AUDIT_REPORT.md` §20 for that earlier swap). Anthropic's API is available in India as of this writing (Anthropic opened a Bengaluru office in early 2026), though — as noted throughout this file — it's the one paid-only piece if you choose to enable it.

One geographic trade-off worth knowing: Render's closest region to India is Singapore (no Mumbai region exists on Render yet), so backend requests have a bit more latency for India-based users than a Mumbai-hosted backend would. This is a real trade-off, not a hidden one — see `AUDIT_REPORT.md` §25 for the full comparison against the alternatives that were considered.

---

## 10. Quick checklist

- [ ] Generated 4 unique secrets via `node -e "..."` (§2): `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `HISTORY_ENCRYPTION_KEY`, `SSO_SECRET_ENCRYPTION_KEY`
- [ ] Render Blueprint deployed, all `sync: false` env vars filled in (§6)
- [ ] Vercel project deployed, all `NEXT_PUBLIC_*` env vars filled in (§7)
- [ ] `FRONTEND_URL` (Render) and `NEXT_PUBLIC_API_BASE_URL` (Vercel) point at each other's real URLs
- [ ] `<backend URL>/v1/health` returns `{"status":"ok"}`
- [ ] Decided whether to enable `ANTHROPIC_API_KEY` (cost) — set a spending limit if yes
- [ ] Decided whether to enable Sentry, Resend, OAuth apps, Razorpay — each is independently optional
- [ ] GitHub Actions secrets set (§8) so `git push` to `main` deploys automatically

import path from "node:path";
import { fileURLToPath } from "node:url";
import { withSentryConfig } from "@sentry/nextjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Next.js only auto-loads `.env`/`.env.local` from its own directory
// (`frontend/`), never from a monorepo root. This project ships a single
// root `.env.example`/`.env` (DEVELOPMENT_GUIDE.md §2's `cp .env.example
// .env`), so without this, every `NEXT_PUBLIC_*` var (API base URL, Sentry
// DSN, OAuth client IDs, ...) is silently undefined when the frontend is
// started the documented way — that's what was causing "Cannot POST" on
// login: `apiBaseUrl()` should have thrown a friendly "backend not
// configured" error, but if the value it read was blank/malformed for any
// reason, requests fall back to a relative path and hit the Next.js dev
// server itself instead of the backend, which has no matching route and
// returns Express's raw "Cannot POST /path".
//
// `process.loadEnvFile` is a Node 22+ built-in (this project already
// requires Node 22 everywhere — see backend/Dockerfile, ci.yml) — no new
// dependency needed. Wrapped in try/catch because real deploys (Vercel)
// have no `.env` file on disk at all; env vars are injected directly into
// the process by the platform, and that's expected, not an error.
try {
  process.loadEnvFile(path.join(__dirname, "..", ".env"));
} catch {
  // No root .env on disk — normal in CI/production (Vercel), or if this
  // workspace has its own frontend/.env.local instead. Next's normal
  // frontend/.env* loading still runs after this either way.
}

// Parsed once at module scope, defensively: NEXT_PUBLIC_API_BASE_URL is a
// plain string env var a human types into the Vercel dashboard (or
// .env), so it's one accidental stray quote/space/missing-scheme away
// from not being a valid absolute URL. `new URL(...)` used to be called
// directly inline inside the headers() CSP builder below on a bad value,
// which threw straight out of next.config.mjs and hard-failed the
// *entire* production build ("TypeError: Invalid URL" at
// next.config.mjs's headers()) instead of just breaking the one CSP
// connect-src entry that depended on it. Fail soft instead: log a build
// warning and omit the extra origin from CSP rather than blocking
// deploys - same-origin `'self'` traffic is unaffected either way.
let apiOrigin = "";
if (process.env.NEXT_PUBLIC_API_BASE_URL) {
  try {
    apiOrigin = new URL(process.env.NEXT_PUBLIC_API_BASE_URL).origin;
  } catch {
    console.warn(
      `[next.config.mjs] NEXT_PUBLIC_API_BASE_URL is set but is not a valid absolute URL ` +
        `(got: ${JSON.stringify(process.env.NEXT_PUBLIC_API_BASE_URL)}). ` +
        `Expected something like "https://devtoolbox-api.onrender.com/v1". ` +
        `Skipping it in the CSP connect-src for this build.`,
    );
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the workspace root explicitly (monorepo root, one level up from
  // frontend/) rather than letting Next auto-detect it by searching for
  // the nearest lockfile. Auto-detection can pick the wrong directory if
  // an unrelated package-lock.json exists elsewhere on the filesystem
  // (e.g. a stray one in the user's home directory) — see AUDIT_REPORT.md
  // §7.9 for the incident that surfaced this.
  outputFileTracingRoot: path.join(__dirname, ".."),
  // html-minifier-terser (used client-side by the HTML Beautifier tool's
  // Minify mode — see modules/tools/code/html-beautifier/transform.ts)
  // pulls in clean-css, which unconditionally `require`s Node core
  // modules (fs, path, os) in a source-map-reading code path we never
  // actually invoke (we only call html-minifier-terser's `minify()`
  // programmatically on an in-memory string, never its file-reading
  // APIs). Webpack still tries to resolve those modules for the browser
  // bundle and fails since they don't exist there. This is the standard
  // Next.js fix: mark them as unavailable in client bundles rather than
  // erroring — safe here because the code paths that would actually call
  // them are never reached in our usage.
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
  // PWA/offline support (FEATURE.md's Cross-Cutting Platform Features, P1):
  // service workers are notorious for getting stuck on a stale cached
  // copy of themselves, since browsers historically applied their normal
  // HTTP caching heuristics to /sw.js just like any other static file —
  // delaying detection of a new worker version, sometimes indefinitely.
  // Force revalidation on every request for this one file specifically so
  // update checks (which the browser already runs periodically/on
  // navigation) actually see fresh bytes instead of a cached response.
  async headers() {
    // Security headers for every route (AUDIT_REPORT.md prod-readiness sweep).
    // The backend already sends these via helmet() (main.ts) for API
    // responses; this covers the actual HTML/asset responses users' browsers
    // render, which helmet never touches since it only runs on the NestJS
    // app.
    //
    // CSP note: this is intentionally permissive on script-src/style-src
    // ('unsafe-inline' for Next's inline bootstrap script + CSS-in-JS/inline
    // styles some tool UIs use, 'unsafe-eval'/'wasm-unsafe-eval' because
    // several client-side tool transforms — e.g. the image/QR/SVG tools —
    // use WebAssembly). Tightening this to a nonce-based CSP (no
    // 'unsafe-inline'/'unsafe-eval') is a real follow-up, but doing it
    // safely requires per-request nonce wiring through the App Router,
    // which is a bigger, separate change — not done speculatively here to
    // avoid shipping a CSP that silently breaks tool pages.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "worker-src 'self' blob:",
      "connect-src 'self' https://*.ingest.sentry.io https://*.ingest.de.sentry.io " +
        apiOrigin,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ]
      .join("; ")
      .trim();

    const securityHeaders = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "Content-Security-Policy", value: csp },
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache",
          },
        ],
      },
    ];
  },
};

// Sentry (AUDIT_REPORT.md §24) — `withSentryConfig` wraps the build to
// upload source maps and inject the client init; it's a no-op at runtime
// for anyone without SENTRY_ORG/SENTRY_PROJECT/SENTRY_AUTH_TOKEN set (build
// still succeeds, just without source-map upload — those three are only
// needed for readable stack traces in the Sentry dashboard, not for error
// capture itself, which only needs NEXT_PUBLIC_SENTRY_DSN). See
// sentry.client.config.ts/sentry.server.config.ts/sentry.edge.config.ts for
// the actual init + the CLAUDE.md rule 8 redaction rules.
//
// Skip it entirely when this config is loaded by Storybook rather than a
// real `next build`/`next dev`: @storybook/nextjs reuses this same file's
// webpack customizations to stay in sync with the app, but Sentry's
// webpack plugin taps into the compiler's Cache hooks in a way that
// assumes Next's own build/dev orchestration manages that compiler's
// lifecycle. Under Storybook's own builder-webpack5, compiler.close() runs
// on a compiler Sentry's plugin didn't fully wire up, crashing
// build-storybook with "Cannot read properties of undefined (reading
// 'tap')" during cache shutdown — a build-tool-compatibility issue, not
// anything about the app's actual Sentry setup. `process.env.STORYBOOK` is
// set by the Storybook CLI itself (build and dev), so this only skips
// Sentry for component-preview builds, which don't need source-map
// upload anyway.
export default process.env.STORYBOOK
  ? nextConfig
  : withSentryConfig(nextConfig, {
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      disableLogger: true,
    });

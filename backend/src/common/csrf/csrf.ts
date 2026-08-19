import { doubleCsrf } from "csrf-csrf";
import { REFRESH_TOKEN_COOKIE_NAME } from "../../modules/auth/auth.constants";

/**
 * Checklist item #22 — CSRF tokens for the two cookie-authenticated,
 * state-changing routes (`POST /auth/refresh`, `POST /auth/logout`).
 * Everything else in this API is bearer-token (Authorization header)
 * authenticated, which is not vulnerable to CSRF in the first place (a
 * cross-site form/script can make the browser attach cookies automatically,
 * but it cannot make the browser attach an arbitrary header) — so this is
 * deliberately scoped to just those two routes rather than applied
 * globally. Previously this gap was mitigated only by the strict
 * single-origin CORS allowlist + `sameSite` cookie (main.ts, auth.controller.ts)
 * — both still in place as defense-in-depth underneath this.
 *
 * Double-submit-cookie pattern: `getSessionIdentifier` ties the CSRF token
 * to the caller's refresh-token cookie (already httpOnly/secure/sameSite —
 * see setRefreshCookie), so a token generated for one session can't be
 * replayed against another. Requires `CSRF_SECRET` in the environment
 * (new — see .env.example); falls back to JWT_ACCESS_SECRET only to avoid
 * hard-crashing environments that haven't set it yet, but a dedicated
 * secret should be provisioned in production.
 */
export const {
  doubleCsrfProtection,
  generateCsrfToken,
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET ?? process.env.JWT_ACCESS_SECRET ?? "insecure-dev-only-csrf-secret",
  getSessionIdentifier: (req) => (req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] as string | undefined) ?? "anonymous",
  cookieName:
    process.env.NODE_ENV === "production" ? "__Host-csrf" : "csrf",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  },
  // GET/HEAD/OPTIONS never mutate state — no CSRF token required for them.
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
});

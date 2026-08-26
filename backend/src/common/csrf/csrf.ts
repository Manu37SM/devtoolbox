import { doubleCsrf } from "csrf-csrf";
import { REFRESH_TOKEN_COOKIE_NAME } from "../../modules/auth/auth.constants";

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

  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
});

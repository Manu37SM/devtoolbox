export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 min, per ARCHITECTURE.md §9
export const REFRESH_TOKEN_TTL_DAYS = 30;
export const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";
export const REFRESH_TOKEN_COOKIE_PATH = "/v1/auth";

export const EMAIL_VERIFY_TTL_HOURS = 24;
export const PASSWORD_RESET_TTL_MINUTES = 30;

// Account lockout (checklist item #37) — layered on top of AUTH_THROTTLE's
// 10/min/IP limit (auth.controller.ts) which only slows a single-IP
// attacker; this stops credential stuffing distributed across many IPs by
// locking the *account* itself after repeated failures.
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const ACCOUNT_LOCKOUT_MINUTES = 15;

import type { OAuthProvider } from "@devtoolbox/shared";

const OAUTH_STATE_STORAGE_KEY = "devtoolbox-oauth-state";

/** "signin" covers both login and register (identical flow — the backend
 * links-or-creates by verified email either way). "link" is the
 * already-signed-in "Connect GitHub/Google" flow from /account, which
 * hits a different, authenticated backend endpoint on the way back. */
export type OAuthFlowMode = "signin" | "link";

interface StoredOAuthState {
  state: string;
  mode: OAuthFlowMode;
}

/** Builds the provider's own authorize URL and redirects the browser to
 * it — the backend never issues this redirect itself (see
 * `backend/src/modules/auth/oauth.service.ts`'s docblock: the documented
 * API.md §2 contract is a single POST callback with a `code`, so the
 * frontend owns the whole authorize→callback round-trip). A random
 * `state` value (plus which flow triggered it) is generated and stashed
 * in sessionStorage, then checked back on the callback page — the
 * standard OAuth CSRF mitigation, extended to also survive the full-page
 * redirect round-trip telling the callback page which endpoint to call. */
export function startOAuthFlow(provider: OAuthProvider, mode: OAuthFlowMode = "signin"): void {
  const clientId =
    provider === "github"
      ? process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID
      : process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!clientId) {
    // eslint-disable-next-line no-alert
    alert(`${provider === "github" ? "GitHub" : "Google"} sign-in isn't configured for this deployment.`);
    return;
  }

  const state = crypto.randomUUID();
  const stored: StoredOAuthState = { state, mode };
  sessionStorage.setItem(OAUTH_STATE_STORAGE_KEY, JSON.stringify(stored));

  const redirectUri = oauthRedirectUri(provider);
  const url =
    provider === "github"
      ? new URL("https://github.com/login/oauth/authorize")
      : new URL("https://accounts.google.com/o/oauth2/v2/auth");

  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  if (provider === "github") {
    url.searchParams.set("scope", "read:user user:email");
  } else {
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
  }

  window.location.href = url.toString();
}

export function oauthRedirectUri(provider: OAuthProvider): string {
  return `${window.location.origin}/auth/callback/${provider}`;
}

/** Called once on the callback page. Returns the flow mode if `state`
 * matches what `startOAuthFlow` stashed, or `null` if it doesn't (missing,
 * expired, or tampered with) — either way the stashed value is cleared
 * (one-shot use). */
export function consumeOAuthState(receivedState: string | null): OAuthFlowMode | null {
  const raw = sessionStorage.getItem(OAUTH_STATE_STORAGE_KEY);
  sessionStorage.removeItem(OAUTH_STATE_STORAGE_KEY);
  if (!raw || !receivedState) return null;

  try {
    const stored = JSON.parse(raw) as StoredOAuthState;
    return stored.state === receivedState ? stored.mode : null;
  } catch {
    return null;
  }
}

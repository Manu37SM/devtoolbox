import type { OAuthProvider } from "@devtoolbox/shared";

const OAUTH_STATE_STORAGE_KEY = "devtoolbox-oauth-state";

/** Builds the provider's own authorize URL and redirects the browser to
 * it — the backend never issues this redirect itself (see
 * `backend/src/modules/auth/oauth.service.ts`'s docblock: the documented
 * API.md §2 contract is a single POST callback with a `code`, so the
 * frontend owns the whole authorize→callback round-trip). A random
 * `state` value is generated and stashed in sessionStorage, then checked
 * back on the callback page — the standard OAuth CSRF mitigation. */
export function startOAuthFlow(provider: OAuthProvider): void {
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
  sessionStorage.setItem(OAUTH_STATE_STORAGE_KEY, state);

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

/** Called once on the callback page. Returns true if `state` matches what
 * `startOAuthFlow` stashed (and clears it either way — one-shot use). */
export function consumeOAuthState(receivedState: string | null): boolean {
  const expected = sessionStorage.getItem(OAUTH_STATE_STORAGE_KEY);
  sessionStorage.removeItem(OAUTH_STATE_STORAGE_KEY);
  return Boolean(expected) && expected === receivedState;
}

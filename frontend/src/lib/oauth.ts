import type { OAuthProvider } from "@devtoolbox/shared";

const OAUTH_STATE_STORAGE_KEY = "devtoolbox-oauth-state";

export type OAuthFlowMode = "signin" | "link";

interface StoredOAuthState {
  state: string;
  mode: OAuthFlowMode;
}

export function startOAuthFlow(provider: OAuthProvider, mode: OAuthFlowMode = "signin"): void {
  const clientId =
    provider === "github"
      ? process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID
      : process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!clientId) {

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

import type { TransformResult } from "@/lib/tool-transform";
import { bytesToBase64 } from "@/lib/byte-input";
import type { OauthRequestBuilderOptions } from "./schema";

const b64u = (b: Uint8Array) => bytesToBase64(b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export async function pkceChallenge(verifier: string): Promise<string> {
  return b64u(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
}
export function randomToken(bytes = 32): string { return b64u(crypto.getRandomValues(new Uint8Array(bytes))); }

export interface Endpoints { authorize: string; token: string; device: string; provider: string }

/** Known provider URL layouts, derived from the issuer when endpoints are not given. */
export function endpointsFor(issuer: string): Endpoints {
  const i = issuer.replace(/\/+$/, "");
  if (/\/realms\/[^/]+$/.test(i)) return { provider: "Keycloak", authorize: `${i}/protocol/openid-connect/auth`, token: `${i}/protocol/openid-connect/token`, device: `${i}/protocol/openid-connect/auth/device` };
  if (/login\.microsoftonline\.com\/[^/]+(\/v2\.0)?$/.test(i)) { const base = i.replace(/\/v2\.0$/, ""); return { provider: "Microsoft Entra ID", authorize: `${base}/oauth2/v2.0/authorize`, token: `${base}/oauth2/v2.0/token`, device: `${base}/oauth2/v2.0/devicecode` }; }
  if (/accounts\.google\.com$/.test(i)) return { provider: "Google", authorize: "https://accounts.google.com/o/oauth2/v2/auth", token: "https://oauth2.googleapis.com/token", device: "https://oauth2.googleapis.com/device/code" };
  if (/\.okta(preview)?\.com\/oauth2\/[^/]+$/.test(i)) return { provider: "Okta (custom authorization server)", authorize: `${i}/v1/authorize`, token: `${i}/v1/token`, device: `${i}/v1/device/authorize` };
  if (/\.okta(preview)?\.com$/.test(i)) return { provider: "Okta (org authorization server)", authorize: `${i}/oauth2/v1/authorize`, token: `${i}/oauth2/v1/token`, device: `${i}/oauth2/v1/device/authorize` };
  if (/\.auth0\.com$/.test(i)) return { provider: "Auth0", authorize: `${i}/authorize`, token: `${i}/oauth/token`, device: `${i}/oauth/device/code` };
  return { provider: "generic (check /.well-known/openid-configuration)", authorize: `${i}/authorize`, token: `${i}/token`, device: `${i}/device_authorization` };
}

export function parseFields(input: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const line of input.split(/\r?\n/)) { const x = /^\s*([\w-]+)\s*:\s*(.*)$/.exec(line); if (x && x[2]!.trim()) m.set(x[1]!.toLowerCase().replace(/-/g, "_"), x[2]!.trim()); }
  return m;
}

/** application/x-www-form-urlencoded, as RFC 6749 requires for Basic client credentials too. */
const form = (s: string) => encodeURIComponent(s).replace(/%20/g, "+").replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
const sq = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

export async function runOauthRequestBuilder(input: string, options: OauthRequestBuilderOptions): Promise<TransformResult> {
  if (!input.trim()) return { output: "", error: null };
  const f = parseFields(input);
  const notes: string[] = [];
  const issuer = f.get("issuer");
  const ep = issuer ? endpointsFor(issuer) : null;
  const authorizeUrl = f.get("authorize_url") ?? ep?.authorize;
  const tokenUrl = f.get("token_url") ?? ep?.token;
  const deviceUrl = f.get("device_url") ?? ep?.device;
  if (ep && !(f.get("authorize_url") && f.get("token_url"))) notes.push(`Endpoints derived for ${ep.provider} from the issuer; confirm them in ${issuer!.replace(/\/+$/, "")}/.well-known/openid-configuration.`);
  const clientId = f.get("client_id");
  const secret = f.get("client_secret");
  const scope = f.get("scope");

  if (options.flow === "callback") {
    const cb = f.get("callback");
    if (!cb) return { output: "", error: { message: 'Add "callback:" with the redirect URL your app received.' } };
    let url: URL;
    try { url = new URL(cb); } catch { return { output: "", error: { message: "callback is not a valid URL." } }; }
    const params = new URLSearchParams(url.search);
    const frag = new URLSearchParams(url.hash.replace(/^#/, ""));
    const get = (k: string) => params.get(k) ?? frag.get(k);
    const out: string[] = [];
    if (get("error")) out.push(`ERROR: ${get("error")}${get("error_description") ? ` - ${get("error_description")}` : ""}`, ({ access_denied: "The user or the server denied the request.", invalid_scope: "A requested scope is unknown or not allowed for this client.", unauthorized_client: "This client may not use this grant type.", invalid_request: "A parameter is missing or malformed (often redirect_uri mismatch).", login_required: "prompt=none was used but the user has no session.", consent_required: "prompt=none was used but consent is needed." } as Record<string, string>)[get("error")!] ?? "");
    if (get("code")) out.push(`code: ${get("code")}`);
    if (get("access_token")) { out.push(`access_token: ${get("access_token")!.slice(0, 12)}... (implicit flow: the token was in the URL ${url.hash ? "fragment" : "query"})`); notes.push("The implicit flow is deprecated in OAuth 2.1; use the authorization code flow with PKCE."); }
    if (get("id_token")) out.push("id_token: present (validate signature, iss, aud, exp and nonce)");
    if (get("iss")) out.push(`iss: ${get("iss")} (RFC 9207 mix-up protection: compare with the issuer you used)`);
    const state = get("state");
    if (state) out.push(`state: ${state}${f.get("state") ? (f.get("state") === state ? "  (matches the expected state)" : "  (DOES NOT MATCH the expected state: possible CSRF, reject it)") : "  (compare with the state you stored before redirecting)"}`);
    else out.push("state: missing. Without state the callback cannot be tied to your request (CSRF risk).");
    if (get("code") && tokenUrl) out.push("", "Exchange the code by switching the flow to \"Authorization code\" and adding code: and code_verifier:.");
    return { output: [...out.filter(Boolean), ...(notes.length ? ["", ...notes.map((n) => `Note: ${n}`)] : [])].join("\n"), error: null };
  }

  if (!clientId) return { output: "", error: { message: 'Add "client_id:".' } };
  if (options.flow !== "authorization-code" || f.get("code")) if (!tokenUrl) return { output: "", error: { message: 'Add "token_url:" or "issuer:".' } };

  const body: [string, string][] = [];
  const headers: string[] = ["Content-Type: application/x-www-form-urlencoded"];
  const clientAuth = () => {
    if (options.clientAuth === "basic" && secret) headers.push(`Authorization: Basic ${bytesToBase64(new TextEncoder().encode(`${form(clientId)}:${form(secret)}`))}`);
    else { body.push(["client_id", clientId]); if (options.clientAuth === "post" && secret) body.push(["client_secret", secret]); }
    if (options.clientAuth === "basic" && !secret) notes.push("No client_secret given, so client_id is sent in the body (public client).");
  };
  const curl = (url: string) => `curl -X POST ${sq(url)} \\\n${headers.map((h) => `  -H ${sq(h)}`).join(" \\\n")} \\\n${body.map(([k, v]) => `  --data-urlencode ${sq(`${k}=${v}`)}`).join(" \\\n")}`;
  const out: string[] = [];

  switch (options.flow) {
    case "authorization-code": {
      if (!authorizeUrl) return { output: "", error: { message: 'Add "authorize_url:" or "issuer:".' } };
      const redirect = f.get("redirect_uri");
      if (!redirect) return { output: "", error: { message: 'Add "redirect_uri:".' } };
      const verifier = f.get("code_verifier") ?? randomToken(32);
      if (!/^[A-Za-z0-9\-._~]{43,128}$/.test(verifier)) return { output: "", error: { message: "code_verifier must be 43-128 characters of A-Z a-z 0-9 - . _ ~ (RFC 7636)." } };
      const challenge = await pkceChallenge(verifier);
      const state = f.get("state") ?? randomToken(16);
      const q = new URLSearchParams({ response_type: "code", client_id: clientId, redirect_uri: redirect });
      if (scope) q.set("scope", scope);
      q.set("state", state);
      if (scope?.split(/\s+/).includes("openid")) q.set("nonce", f.get("nonce") ?? randomToken(16));
      q.set("code_challenge", challenge);
      q.set("code_challenge_method", "S256");
      if (f.get("audience")) q.set("audience", f.get("audience")!);
      if (f.get("prompt")) q.set("prompt", f.get("prompt")!);
      out.push("1. Send the user to:", `${authorizeUrl}?${q.toString().replace(/\+/g, "%20")}`, "", `   code_verifier (keep it server-side or in session storage): ${verifier}`, `   state: ${state}${f.get("state") ? "" : " (generated)"}`);
      body.push(["grant_type", "authorization_code"], ["code", f.get("code") ?? "<code from the callback>"], ["redirect_uri", redirect], ["code_verifier", verifier]);
      clientAuth();
      out.push("", "2. Exchange the code:", curl(tokenUrl ?? "<token_url>"));
      notes.push("Check that state in the callback equals the value you sent, and that redirect_uri is byte-for-byte the registered one.");
      break;
    }
    case "client-credentials":
      body.push(["grant_type", "client_credentials"]);
      if (scope) body.push(["scope", scope]);
      if (f.get("audience")) body.push(["audience", f.get("audience")!]);
      if (f.get("resource")) body.push(["resource", f.get("resource")!]);
      clientAuth();
      if (!secret) notes.push("client_credentials normally needs a client secret or a private-key JWT (client_assertion).");
      out.push(curl(tokenUrl!));
      break;
    case "refresh-token":
      body.push(["grant_type", "refresh_token"], ["refresh_token", f.get("refresh_token") ?? "<refresh_token>"]);
      if (scope) body.push(["scope", scope]);
      clientAuth();
      notes.push("Many servers rotate refresh tokens: store the new one from the response and discard the old one.");
      out.push(curl(tokenUrl!));
      break;
    case "device-code":
      if (!deviceUrl) return { output: "", error: { message: 'Add "device_url:" or "issuer:".' } };
      body.push(["client_id", clientId]);
      if (scope) body.push(["scope", scope]);
      out.push("1. Request a device code:", curl(deviceUrl), "", "2. Show user_code and verification_uri to the user, then poll every `interval` seconds:");
      body.length = 0;
      body.push(["grant_type", "urn:ietf:params:oauth:grant-type:device_code"], ["device_code", "<device_code>"]);
      clientAuth();
      out.push(curl(tokenUrl!), "", "   Keep polling while the response is authorization_pending; back off by 5s on slow_down.");
      break;
    case "password":
      body.push(["grant_type", "password"], ["username", f.get("username") ?? "<username>"], ["password", f.get("password") ? "********" : "<password>"]);
      if (scope) body.push(["scope", scope]);
      clientAuth();
      out.push(curl(tokenUrl!));
      notes.push("The resource owner password grant is removed in OAuth 2.1 and blocks MFA. Use it only for legacy migrations; the password is masked here on purpose.");
      break;
  }
  if (secret) notes.push("This output contains your client secret. Do not paste it into tickets or chat.");
  return { output: [...out, ...(notes.length ? ["", ...notes.map((n) => `Note: ${n}`)] : [])].join("\n"), error: null };
}

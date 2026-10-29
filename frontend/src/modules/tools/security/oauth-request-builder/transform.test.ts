import { describe, expect, it } from "vitest";
import { endpointsFor, pkceChallenge, runOauthRequestBuilder } from "./transform";
import type { OauthRequestBuilderOptions } from "./schema";

const run = async (s: string, o: Partial<OauthRequestBuilderOptions>) => runOauthRequestBuilder(s, { flow: "authorization-code", clientAuth: "basic", ...o });

describe("PKCE", () => {
  it("matches the RFC 7636 appendix B example", async () => {
    expect(await pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
});

describe("endpointsFor", () => {
  it("knows common providers", () => {
    expect(endpointsFor("https://id.acme.com/realms/bank/").token).toBe("https://id.acme.com/realms/bank/protocol/openid-connect/token");
    expect(endpointsFor("https://login.microsoftonline.com/contoso/v2.0").authorize).toBe("https://login.microsoftonline.com/contoso/oauth2/v2.0/authorize");
    expect(endpointsFor("https://dev-1.okta.com/oauth2/default").token).toBe("https://dev-1.okta.com/oauth2/default/v1/token");
    expect(endpointsFor("https://acme.eu.auth0.com").device).toBe("https://acme.eu.auth0.com/oauth/device/code");
    expect(endpointsFor("https://accounts.google.com").token).toBe("https://oauth2.googleapis.com/token");
    expect(endpointsFor("https://auth.example.com").provider).toContain("generic");
  });
});

describe("runOauthRequestBuilder", () => {
  const AUTH = "issuer: https://id.acme.com/realms/bank\nclient_id: web-app\nclient_secret: s3cret\nredirect_uri: https://app.acme.com/callback\nscope: openid profile\nstate: xyz\nnonce: n-1\ncode_verifier: dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
  it("builds the authorize URL with PKCE and the token exchange", async () => {
    const out = (await run(AUTH, {})).output;
    expect(out).toContain("https://id.acme.com/realms/bank/protocol/openid-connect/auth?response_type=code&client_id=web-app&redirect_uri=https%3A%2F%2Fapp.acme.com%2Fcallback&scope=openid%20profile&state=xyz&nonce=n-1&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=S256");
    expect(out).toContain("-H 'Authorization: Basic d2ViLWFwcDpzM2NyZXQ='");
    expect(out).toContain("--data-urlencode 'code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'");
    expect(out).toContain("Endpoints derived for Keycloak");
    expect(out).toContain("contains your client secret");
  });
  it("sends credentials in the body for client_secret_post and builds client credentials", async () => {
    const out = (await run("token_url: https://auth.example.com/oauth/token\nclient_id: svc\nclient_secret: pw\nscope: payments:write\naudience: https://api.example.com", { flow: "client-credentials", clientAuth: "post" })).output;
    expect(out).toContain("--data-urlencode 'grant_type=client_credentials'");
    expect(out).toContain("--data-urlencode 'client_secret=pw'");
    expect(out).toContain("--data-urlencode 'audience=https://api.example.com'");
    expect(out).not.toContain("Authorization: Basic");
  });
  it("covers device code, refresh and masks passwords", async () => {
    expect((await run("issuer: https://acme.eu.auth0.com\nclient_id: cli", { flow: "device-code" })).output).toContain("urn:ietf:params:oauth:grant-type:device_code");
    expect((await run("issuer: https://acme.eu.auth0.com\nclient_id: cli\nrefresh_token: rt-1", { flow: "refresh-token" })).output).toContain("--data-urlencode 'refresh_token=rt-1'");
    const pw = (await run("token_url: https://x/token\nclient_id: c\nusername: ann\npassword: hunter2", { flow: "password" })).output;
    expect(pw).toContain("password=********");
    expect(pw).not.toContain("hunter2");
    expect(pw).toContain("removed in OAuth 2.1");
  });
  it("parses callbacks, errors and state mismatches", async () => {
    expect((await run("callback: https://app/cb?code=abc&state=xyz\nstate: xyz", { flow: "callback" })).output).toContain("state: xyz  (matches the expected state)");
    expect((await run("callback: https://app/cb?code=abc&state=evil\nstate: xyz", { flow: "callback" })).output).toContain("DOES NOT MATCH");
    const err = (await run("callback: https://app/cb?error=access_denied&error_description=User%20cancelled", { flow: "callback" })).output;
    expect(err).toContain("ERROR: access_denied - User cancelled");
    expect(err).toContain("state: missing");
    expect((await run("callback: https://app/cb#access_token=eyJabcdefghijklmn&state=s", { flow: "callback" })).output).toContain("implicit flow");
  });
  it("validates required fields", async () => {
    expect((await run("issuer: https://x", {})).error?.message).toBe('Add "client_id:".');
    expect((await run("issuer: https://x\nclient_id: a", {})).error?.message).toBe('Add "redirect_uri:".');
    expect((await run("issuer: https://x\nclient_id: a\nredirect_uri: https://a\ncode_verifier: short", {})).error?.message).toContain("43-128");
  });
});

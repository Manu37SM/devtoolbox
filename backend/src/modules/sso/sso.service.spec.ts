import { ConfigService } from "@nestjs/config";
import { ConflictException, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { SsoService } from "./sso.service";
import { AuthService } from "../auth/auth.service";
import { encryptSecret } from "../../common/crypto/secret-encryption";

const MASTER_KEY = Buffer.alloc(32, 7).toString("base64");

// jose's RS256 verification talks to a live JWKS endpoint by design — mocked
// entirely here, same rationale billing.service.spec.ts mocks the `razorpay`
// SDK: this test suite verifies SsoService's own logic (state handling,
// nonce checks, JIT provisioning, error paths), not jose's or node-saml's
// correctness, which are out of scope for this codebase to re-test.
const mockJwtVerify = jest.fn();
jest.mock("jose", () => ({
  jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
  createRemoteJWKSet: jest.fn(() => "mock-jwks"),
}));

const mockValidatePostResponseAsync = jest.fn();
const mockGetAuthorizeUrlAsync = jest.fn();
jest.mock("@node-saml/node-saml", () => ({
  SAML: jest.fn().mockImplementation(() => ({
    getAuthorizeUrlAsync: (...args: unknown[]) => mockGetAuthorizeUrlAsync(...args),
    validatePostResponseAsync: (...args: unknown[]) => mockValidatePostResponseAsync(...args),
  })),
}));

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    ssoConnection: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    ssoIdentity: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    organizationMember: {
      findUnique: jest.fn().mockResolvedValue({ organizationId: "org-1", userId: "user-1", role: "OWNER" }),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    ...overrides,
  } as unknown as import("../../database/prisma.service").PrismaService;
}

function makeConfig(
  values: Record<string, string | undefined> = {
    SSO_SECRET_ENCRYPTION_KEY: MASTER_KEY,
    FRONTEND_URL: "https://app.devtoolbox.dev",
  },
) {
  return { get: jest.fn((key: string) => values[key]) } as unknown as ConfigService;
}

function makeAuth() {
  return {
    createSession: jest.fn().mockResolvedValue({ raw: "refresh-raw", expiresAt: new Date() }),
    buildAuthResponse: jest.fn().mockReturnValue({ accessToken: "at", expiresIn: 900, user: {} }),
  } as unknown as AuthService;
}

describe("SsoService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  describe("connection admin", () => {
    it("rejects upsert for a non-OWNER", async () => {
      const prisma = makePrisma({
        organizationMember: { findUnique: jest.fn().mockResolvedValue({ role: "MEMBER" }) },
      });
      const service = new SsoService(prisma, makeConfig(), makeAuth());
      await expect(
        service.upsertConnection("user-1", "org-1", {
          protocol: "OIDC",
          domain: "acme.com",
          oidcIssuer: "https://idp.example.com",
          oidcClientId: "client-1",
          oidcClientSecret: "shh",
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("requires oidcClientSecret on first create", async () => {
      const prisma = makePrisma();
      const service = new SsoService(prisma, makeConfig(), makeAuth());
      await expect(
        service.upsertConnection("user-1", "org-1", {
          protocol: "OIDC",
          domain: "acme.com",
          oidcIssuer: "https://idp.example.com",
          oidcClientId: "client-1",
        }),
      ).rejects.toThrow("oidcClientSecret is required");
    });

    it("creates an OIDC connection, encrypting the client secret", async () => {
      const prisma = makePrisma({
        ssoConnection: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockImplementation(({ data }) => ({
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          })),
        },
      });
      const service = new SsoService(prisma, makeConfig(), makeAuth());
      const result = await service.upsertConnection("user-1", "org-1", {
        protocol: "OIDC",
        domain: "ACME.com",
        oidcIssuer: "https://idp.example.com",
        oidcClientId: "client-1",
        oidcClientSecret: "shh",
      });
      expect(result.domain).toBe("acme.com"); // lowercased
      expect(result.oidcHasClientSecret).toBe(true);
      expect((prisma.ssoConnection.create as jest.Mock).mock.calls[0][0].data.oidcClientSecretEnc).not.toBe("shh");
    });

    it("update without a new secret keeps the existing encrypted secret", async () => {
      const existingSecretEnc = encryptSecret(MASTER_KEY, "org-1", "old-secret");
      const prisma = makePrisma({
        ssoConnection: {
          findUnique: jest.fn().mockResolvedValue({ id: "conn-1", oidcClientSecretEnc: existingSecretEnc }),
          update: jest.fn().mockImplementation(({ data }) => ({ ...data, createdAt: new Date(), updatedAt: new Date() })),
        },
      });
      const service = new SsoService(prisma, makeConfig(), makeAuth());
      const result = await service.upsertConnection("user-1", "org-1", {
        protocol: "OIDC",
        domain: "acme.com",
        oidcIssuer: "https://idp.example.com",
        oidcClientId: "client-1",
      });
      expect(result.oidcHasClientSecret).toBe(true);
      expect((prisma.ssoConnection.update as jest.Mock).mock.calls[0][0].data.oidcClientSecretEnc).toBe(existingSecretEnc);
    });

    it("surfaces a duplicate domain as a 409", async () => {
      const prisma = makePrisma({
        ssoConnection: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockRejectedValue({ code: "P2002" }),
        },
      });
      const service = new SsoService(prisma, makeConfig(), makeAuth());
      await expect(
        service.upsertConnection("user-1", "org-1", {
          protocol: "SAML",
          domain: "acme.com",
          samlEntryPoint: "https://idp.example.com/sso",
          samlIssuer: "https://idp.example.com",
          samlCert: "-----BEGIN CERTIFICATE-----",
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("discover", () => {
    it("returns unavailable for an unknown domain", async () => {
      const prisma = makePrisma();
      const service = new SsoService(prisma, makeConfig(), makeAuth());
      await expect(service.discover("nope.com")).resolves.toEqual({ available: false, protocol: null, organizationId: null });
    });

    it("returns the protocol + org for an enabled connection", async () => {
      const prisma = makePrisma({
        ssoConnection: {
          findUnique: jest.fn().mockResolvedValue({ enabled: true, protocol: "OIDC", organizationId: "org-1" }),
        },
      });
      const service = new SsoService(prisma, makeConfig(), makeAuth());
      await expect(service.discover("ACME.com")).resolves.toEqual({ available: true, protocol: "OIDC", organizationId: "org-1" });
    });

    it("treats a disabled connection as unavailable", async () => {
      const prisma = makePrisma({
        ssoConnection: { findUnique: jest.fn().mockResolvedValue({ enabled: false, protocol: "OIDC", organizationId: "org-1" }) },
      });
      const service = new SsoService(prisma, makeConfig(), makeAuth());
      await expect(service.discover("acme.com")).resolves.toEqual({ available: false, protocol: null, organizationId: null });
    });
  });

  describe("OIDC login", () => {
    const connection = {
      id: "conn-1",
      organizationId: "org-1",
      protocol: "OIDC",
      enabled: true,
      domain: "acme.com",
      oidcIssuer: "https://idp.example.com",
      oidcClientId: "client-1",
      oidcClientSecretEnc: encryptSecret(MASTER_KEY, "org-1", "shh"),
    };

    function mockDiscoveryAndToken(idToken: string) {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            authorization_endpoint: "https://idp.example.com/authorize",
            token_endpoint: "https://idp.example.com/token",
            jwks_uri: "https://idp.example.com/jwks",
          }),
        })
        .mockResolvedValueOnce({ json: async () => ({ id_token: idToken }) });
    }

    it("builds an authorize URL with client_id/nonce/state", async () => {
      const prisma = makePrisma({ ssoConnection: { findUnique: jest.fn().mockResolvedValue(connection) } });
      const service = new SsoService(prisma, makeConfig(), makeAuth());
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          authorization_endpoint: "https://idp.example.com/authorize",
          token_endpoint: "https://idp.example.com/token",
          jwks_uri: "https://idp.example.com/jwks",
        }),
      });
      const { url, state } = await service.buildOidcAuthorizeUrl("acme.com", "https://app.devtoolbox.dev/sso/callback");
      expect(url).toContain("https://idp.example.com/authorize");
      expect(url).toContain("client_id=client-1");
      expect(state).toBeTruthy();
    });

    it("rejects a domain with no enabled OIDC connection", async () => {
      const prisma = makePrisma();
      const service = new SsoService(prisma, makeConfig(), makeAuth());
      await expect(
        service.buildOidcAuthorizeUrl("nope.com", "https://app.devtoolbox.dev/sso/callback"),
      ).rejects.toThrow();
    });

    it("completes login for a first-time user (JIT provisioning + org join)", async () => {
      const prisma = makePrisma({
        ssoConnection: { findUnique: jest.fn().mockResolvedValue(connection) },
        ssoIdentity: { findUnique: jest.fn().mockResolvedValue(null) },
        user: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: "user-new", email: "alice@acme.com" }),
        },
        organizationMember: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() },
      });
      const auth = makeAuth();
      const service = new SsoService(prisma, makeConfig(), auth);
      mockDiscoveryAndToken("id-token-value");
      mockJwtVerify.mockResolvedValue({ payload: { sub: "sub-123", email: "alice@acme.com", nonce: "nonce-abc" } });

      const state = Buffer.from(JSON.stringify({ connectionId: "conn-1", nonce: "nonce-abc" })).toString("base64url");
      const result = await service.handleOidcCallback("code-1", state, "https://app.devtoolbox.dev/sso/callback", {});

      expect(prisma.user.create).toHaveBeenCalled();
      expect(prisma.organizationMember.create).toHaveBeenCalledWith({
        data: { organizationId: "org-1", userId: "user-new", role: "MEMBER" },
      });
      expect(auth.createSession).toHaveBeenCalledWith("user-new", {});
      expect(result.tokens.accessToken).toBe("at");
    });

    it("links to an existing account matched by email instead of creating a duplicate", async () => {
      const prisma = makePrisma({
        ssoConnection: { findUnique: jest.fn().mockResolvedValue(connection) },
        ssoIdentity: { findUnique: jest.fn().mockResolvedValue(null) },
        user: {
          findUnique: jest.fn().mockResolvedValue({ id: "user-existing", email: "bob@acme.com" }),
          create: jest.fn(),
          update: jest.fn().mockResolvedValue({ id: "user-existing", email: "bob@acme.com" }),
        },
        organizationMember: { findUnique: jest.fn().mockResolvedValue({ userId: "user-existing" }), create: jest.fn() },
      });
      const service = new SsoService(prisma, makeConfig(), makeAuth());
      mockDiscoveryAndToken("id-token-value");
      mockJwtVerify.mockResolvedValue({ payload: { sub: "sub-456", email: "bob@acme.com", nonce: "nonce-xyz" } });

      const state = Buffer.from(JSON.stringify({ connectionId: "conn-1", nonce: "nonce-xyz" })).toString("base64url");
      await service.handleOidcCallback("code-1", state, "https://app.devtoolbox.dev/sso/callback", {});

      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalled();
      // Already a member — no duplicate membership created.
      expect(prisma.organizationMember.create).not.toHaveBeenCalled();
    });

    it("rejects a nonce mismatch (replay defense)", async () => {
      const prisma = makePrisma({ ssoConnection: { findUnique: jest.fn().mockResolvedValue(connection) } });
      const service = new SsoService(prisma, makeConfig(), makeAuth());
      mockDiscoveryAndToken("id-token-value");
      mockJwtVerify.mockResolvedValue({ payload: { sub: "sub-1", email: "a@acme.com", nonce: "actual-nonce" } });

      const state = Buffer.from(JSON.stringify({ connectionId: "conn-1", nonce: "different-nonce" })).toString("base64url");
      await expect(
        service.handleOidcCallback("code-1", state, "https://app.devtoolbox.dev/sso/callback", {}),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("rejects when the IdP returns no email and this is a first-time identity", async () => {
      const prisma = makePrisma({
        ssoConnection: { findUnique: jest.fn().mockResolvedValue(connection) },
        ssoIdentity: { findUnique: jest.fn().mockResolvedValue(null) },
      });
      const service = new SsoService(prisma, makeConfig(), makeAuth());
      mockDiscoveryAndToken("id-token-value");
      mockJwtVerify.mockResolvedValue({ payload: { sub: "sub-1", nonce: "n1" } });

      const state = Buffer.from(JSON.stringify({ connectionId: "conn-1", nonce: "n1" })).toString("base64url");
      await expect(
        service.handleOidcCallback("code-1", state, "https://app.devtoolbox.dev/sso/callback", {}),
      ).rejects.toThrow("identity provider did not return an email");
    });

    it("rejects a redirectUri that isn't on this app's own origin", async () => {
      const prisma = makePrisma({ ssoConnection: { findUnique: jest.fn().mockResolvedValue(connection) } });
      const service = new SsoService(prisma, makeConfig(), makeAuth());
      await expect(service.buildOidcAuthorizeUrl("acme.com", "https://evil.example.com/callback")).rejects.toThrow(
        "own origin",
      );
    });

    // Regression test for the account-takeover finding in AUDIT_REPORT.md
    // §23.5: an SsoConnection is fully configured by its org's OWNER,
    // including which IdP it trusts — nothing before this check stopped a
    // connection at attacker-controlled-idp.example.com from asserting an
    // email at a domain it has no relationship to, which would otherwise
    // link the login to an existing victim account at that email.
    it("rejects an asserted email whose domain doesn't match the connection's domain", async () => {
      const prisma = makePrisma({
        ssoConnection: { findUnique: jest.fn().mockResolvedValue(connection) }, // connection.domain = "acme.com"
        ssoIdentity: { findUnique: jest.fn().mockResolvedValue(null) },
      });
      const service = new SsoService(prisma, makeConfig(), makeAuth());
      mockDiscoveryAndToken("id-token-value");
      mockJwtVerify.mockResolvedValue({ payload: { sub: "sub-attacker", email: "victim@totally-different.com", nonce: "n2" } });

      const state = Buffer.from(JSON.stringify({ connectionId: "conn-1", nonce: "n2" })).toString("base64url");
      await expect(
        service.handleOidcCallback("code-1", state, "https://app.devtoolbox.dev/sso/callback", {}),
      ).rejects.toThrow("only authorized for @acme.com");
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("SAML login", () => {
    const connection = {
      id: "conn-2",
      organizationId: "org-1",
      protocol: "SAML",
      enabled: true,
      domain: "acme.com",
      samlEntryPoint: "https://idp.example.com/sso",
      samlIssuer: "https://idp.example.com",
      samlCert: "-----BEGIN CERTIFICATE-----",
    };

    it("completes login for a returning identity", async () => {
      const prisma = makePrisma({
        ssoConnection: { findUnique: jest.fn().mockResolvedValue(connection) },
        ssoIdentity: { findUnique: jest.fn().mockResolvedValue({ userId: "user-1" }) },
        user: { findUnique: jest.fn().mockResolvedValue({ id: "user-1", email: "carol@acme.com" }) },
        organizationMember: { findUnique: jest.fn().mockResolvedValue({ userId: "user-1" }), create: jest.fn() },
      });
      const auth = makeAuth();
      const service = new SsoService(prisma, makeConfig(), auth);
      mockValidatePostResponseAsync.mockResolvedValue({ profile: { nameID: "carol-nameid", email: "carol@acme.com" } });

      const result = await service.handleSamlCallback("saml-response-body", "conn-2", "https://backend/sso/saml/callback", {});
      expect(auth.createSession).toHaveBeenCalledWith("user-1", {});
      expect(result.tokens.accessToken).toBe("at");
    });

    it("rejects a missing relayState", async () => {
      const prisma = makePrisma();
      const service = new SsoService(prisma, makeConfig(), makeAuth());
      await expect(service.handleSamlCallback("resp", undefined, "https://x", {})).rejects.toThrow("relay state");
    });

    it("rejects an assertion with no NameID", async () => {
      const prisma = makePrisma({ ssoConnection: { findUnique: jest.fn().mockResolvedValue(connection) } });
      const service = new SsoService(prisma, makeConfig(), makeAuth());
      mockValidatePostResponseAsync.mockResolvedValue({ profile: null });
      await expect(service.handleSamlCallback("resp", "conn-2", "https://x", {})).rejects.toThrow(UnauthorizedException);
    });

    // Same account-takeover regression as the OIDC test above (AUDIT_REPORT.md
    // §23.5) — a SAML connection's entryPoint/cert are equally attacker-
    // supplied at connection-creation time, so an assertion's email must be
    // bound to the connection's own claimed domain too.
    it("rejects an asserted email whose domain doesn't match the connection's domain", async () => {
      const prisma = makePrisma({
        ssoConnection: { findUnique: jest.fn().mockResolvedValue(connection) }, // connection.domain = "acme.com"
        ssoIdentity: { findUnique: jest.fn().mockResolvedValue(null) },
      });
      const service = new SsoService(prisma, makeConfig(), makeAuth());
      mockValidatePostResponseAsync.mockResolvedValue({
        profile: { nameID: "attacker-nameid", email: "victim@totally-different.com" },
      });
      await expect(service.handleSamlCallback("resp", "conn-2", "https://x", {})).rejects.toThrow(
        "only authorized for @acme.com",
      );
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });
});

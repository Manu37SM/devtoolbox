-- Org-level SSO (AUDIT_REPORT.md §23) — the last item deferred from the
-- original team workspaces MVP pass.

-- CreateEnum
CREATE TYPE "SsoProtocol" AS ENUM ('OIDC', 'SAML');

-- CreateTable: one SSO connection per org (MVP: single IdP per org)
CREATE TABLE "SsoConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "protocol" "SsoProtocol" NOT NULL,
    "domain" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "oidcIssuer" TEXT,
    "oidcClientId" TEXT,
    "oidcClientSecretEnc" TEXT,
    "samlEntryPoint" TEXT,
    "samlIssuer" TEXT,
    "samlCert" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SsoConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable: links a User to the org SSO connection they authenticated
-- through (mirrors OAuthAccount's provider/providerUserId shape).
CREATE TABLE "SsoIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ssoConnectionId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SsoIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SsoConnection_organizationId_key" ON "SsoConnection"("organizationId");
CREATE UNIQUE INDEX "SsoConnection_domain_key" ON "SsoConnection"("domain");
CREATE UNIQUE INDEX "SsoIdentity_ssoConnectionId_externalId_key" ON "SsoIdentity"("ssoConnectionId", "externalId");
CREATE INDEX "SsoIdentity_userId_idx" ON "SsoIdentity"("userId");

-- AddForeignKey
ALTER TABLE "SsoConnection" ADD CONSTRAINT "SsoConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SsoIdentity" ADD CONSTRAINT "SsoIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SsoIdentity" ADD CONSTRAINT "SsoIdentity_ssoConnectionId_fkey" FOREIGN KEY ("ssoConnectionId") REFERENCES "SsoConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

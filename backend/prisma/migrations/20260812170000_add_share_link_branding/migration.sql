-- Custom branding for org-shared links (AUDIT_REPORT.md §22) — deferred
-- from the original team workspaces MVP pass, shipped now.

-- AlterTable: Organization branding fields
ALTER TABLE "Organization" ADD COLUMN "brandName" TEXT;
ALTER TABLE "Organization" ADD COLUMN "brandLogoUrl" TEXT;

-- AlterTable: ShareLink org attribution
ALTER TABLE "ShareLink" ADD COLUMN "organizationId" TEXT;

-- CreateIndex
CREATE INDEX "ShareLink_organizationId_idx" ON "ShareLink"("organizationId");

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

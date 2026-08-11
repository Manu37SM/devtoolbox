-- AlterTable
ALTER TABLE "Snippet" ADD COLUMN "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Pipeline" ADD COLUMN "organizationId" TEXT;

-- CreateIndex
CREATE INDEX "Snippet_organizationId_idx" ON "Snippet"("organizationId");

-- CreateIndex
CREATE INDEX "Pipeline_organizationId_idx" ON "Pipeline"("organizationId");

-- AddForeignKey
ALTER TABLE "Snippet" ADD CONSTRAINT "Snippet_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pipeline" ADD CONSTRAINT "Pipeline_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

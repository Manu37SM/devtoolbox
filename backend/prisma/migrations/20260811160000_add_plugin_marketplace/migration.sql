-- AlterTable
ALTER TABLE "User" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateEnum
CREATE TYPE "PluginStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'REJECTED', 'SUSPENDED');

-- CreateTable
CREATE TABLE "Plugin" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "status" "PluginStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plugin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PluginVersion" (
    "id" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "manifestJson" JSONB NOT NULL,
    "wasmBase64" TEXT NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PluginVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plugin_slug_key" ON "Plugin"("slug");

-- CreateIndex
CREATE INDEX "Plugin_authorUserId_idx" ON "Plugin"("authorUserId");

-- CreateIndex
CREATE INDEX "Plugin_status_idx" ON "Plugin"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PluginVersion_pluginId_version_key" ON "PluginVersion"("pluginId", "version");

-- CreateIndex
CREATE INDEX "PluginVersion_pluginId_idx" ON "PluginVersion"("pluginId");

-- AddForeignKey
ALTER TABLE "Plugin" ADD CONSTRAINT "Plugin_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PluginVersion" ADD CONSTRAINT "PluginVersion_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "Plugin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PluginVersion" ADD CONSTRAINT "PluginVersion_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "SecurityEventType" AS ENUM ('LOGIN_FAILED', 'LOGIN_SUCCEEDED', 'ACCOUNT_LOCKED', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED', 'REFRESH_TOKEN_REUSE_DETECTED', 'ADMIN_ACTION');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lockedUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SecurityEventLog" (
    "id" TEXT NOT NULL,
    "type" "SecurityEventType" NOT NULL,
    "userId" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SecurityEventLog_userId_createdAt_idx" ON "SecurityEventLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityEventLog_type_createdAt_idx" ON "SecurityEventLog"("type", "createdAt");

-- AddForeignKey
ALTER TABLE "SecurityEventLog" ADD CONSTRAINT "SecurityEventLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

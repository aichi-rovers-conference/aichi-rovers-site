/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `EmailQueue` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `idempotencyKey` to the `EmailQueue` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."EmailQueue" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "idempotencyKey" TEXT NOT NULL,
ADD COLUMN     "lockId" TEXT,
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "EmailQueue_idempotencyKey_key" ON "public"."EmailQueue"("idempotencyKey");

-- CreateIndex
CREATE INDEX "EmailQueue_status_scheduledAt_idx" ON "public"."EmailQueue"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "EmailQueue_lockedAt_idx" ON "public"."EmailQueue"("lockedAt");

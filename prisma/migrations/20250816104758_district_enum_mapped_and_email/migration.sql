/*
  Warnings:

  - A unique constraint covering the columns `[reiwa,seq]` on the table `Meeting` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `Participant` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Participant_name_idx";

-- DropIndex
DROP INDEX "Participant_district_rsAge_idx";

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN "email" TEXT;

-- CreateTable
CREATE TABLE "EmailQueue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "participantId" TEXT NOT NULL,
    "meetingCode" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "queuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" DATETIME,
    CONSTRAINT "EmailQueue_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "meetingCode" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    CONSTRAINT "EmailToken_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "EmailQueue_status_queuedAt_idx" ON "EmailQueue"("status", "queuedAt");

-- CreateIndex
CREATE INDEX "EmailQueue_participantId_meetingCode_idx" ON "EmailQueue"("participantId", "meetingCode");

-- CreateIndex
CREATE UNIQUE INDEX "EmailToken_token_key" ON "EmailToken"("token");

-- CreateIndex
CREATE INDEX "EmailToken_participantId_meetingCode_idx" ON "EmailToken"("participantId", "meetingCode");

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_reiwa_seq_key" ON "Meeting"("reiwa", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_email_key" ON "Participant"("email");

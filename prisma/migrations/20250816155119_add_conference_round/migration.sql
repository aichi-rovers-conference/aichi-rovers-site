/*
  Warnings:

  - You are about to drop the `ConferenceYear` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ConferenceYear";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "ConferenceRound" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fy" TEXT NOT NULL,
    "round" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "heroUrl" TEXT,
    "intro" TEXT,
    "sections" JSONB NOT NULL DEFAULT [],
    "gallery" JSONB NOT NULL DEFAULT [],
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ConferenceRound_fy_round_idx" ON "ConferenceRound"("fy", "round");

-- CreateIndex
CREATE UNIQUE INDEX "ConferenceRound_fy_round_key" ON "ConferenceRound"("fy", "round");

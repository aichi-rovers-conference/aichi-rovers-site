-- CreateTable
CREATE TABLE "ConferenceYear" (
    "fy" TEXT NOT NULL PRIMARY KEY,
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
CREATE INDEX "ConferenceYear_createdAt_idx" ON "ConferenceYear"("createdAt");

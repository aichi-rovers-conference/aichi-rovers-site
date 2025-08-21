/*
  Warnings:

  - You are about to drop the `ConferenceRound` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."ConferenceRound";

-- CreateTable
CREATE TABLE "public"."MeetingReport" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "round" INTEGER NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "reportUrl" TEXT,
    "coverUrl" TEXT,
    "youtubeId" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MeetingReport_slug_key" ON "public"."MeetingReport"("slug");

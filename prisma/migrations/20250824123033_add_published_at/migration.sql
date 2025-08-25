/*
  Warnings:

  - You are about to drop the column `createdAt` on the `MeetingReport` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `MeetingReport` table. All the data in the column will be lost.
  - The `pageGalleryLayout` column on the `MeetingReport` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[fiscalYear,round]` on the table `MeetingReport` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."MeetingReport" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "lead" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "schedule" JSONB,
ADD COLUMN     "sections" JSONB,
ADD COLUMN     "sectionsGroups" JSONB,
ADD COLUMN     "subtitle" TEXT,
DROP COLUMN "pageGalleryLayout",
ADD COLUMN     "pageGalleryLayout" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MeetingReport_fiscalYear_round_key" ON "public"."MeetingReport"("fiscalYear", "round");

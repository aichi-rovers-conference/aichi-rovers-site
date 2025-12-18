/*
  Warnings:

  - The values [OPEN,IN_PROGRESS,DECLINED] on the enum `SuggestionStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `authorName` on the `Suggestion` table. All the data in the column will be lost.
  - You are about to drop the column `canPublish` on the `Suggestion` table. All the data in the column will be lost.
  - You are about to drop the column `contact` on the `Suggestion` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Suggestion` table. All the data in the column will be lost.
  - You are about to alter the column `body` on the `Suggestion` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(2000)`.
  - The `category` column on the `Suggestion` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `subject` to the `Suggestion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."SuggestionStatus_new" AS ENUM ('NEW', 'REVIEWED', 'RESOLVED', 'SPAM');
ALTER TABLE "public"."Suggestion" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Suggestion" ALTER COLUMN "status" TYPE "public"."SuggestionStatus_new" USING ("status"::text::"public"."SuggestionStatus_new");
ALTER TYPE "public"."SuggestionStatus" RENAME TO "SuggestionStatus_old";
ALTER TYPE "public"."SuggestionStatus_new" RENAME TO "SuggestionStatus";
DROP TYPE "public"."SuggestionStatus_old";
ALTER TABLE "public"."Suggestion" ALTER COLUMN "status" SET DEFAULT 'NEW';
COMMIT;

-- AlterTable
ALTER TABLE "public"."Suggestion" DROP COLUMN "authorName",
DROP COLUMN "canPublish",
DROP COLUMN "contact",
DROP COLUMN "title",
ADD COLUMN     "adminNote" VARCHAR(1000),
ADD COLUMN     "contactEmail" VARCHAR(254),
ADD COLUMN     "ipHash" VARCHAR(64),
ADD COLUMN     "origin" VARCHAR(80),
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "subject" VARCHAR(80) NOT NULL,
ADD COLUMN     "userAgent" VARCHAR(256),
ALTER COLUMN "body" SET DATA TYPE VARCHAR(2000),
DROP COLUMN "category",
ADD COLUMN     "category" VARCHAR(40),
ALTER COLUMN "status" SET DEFAULT 'NEW';

-- DropEnum
DROP TYPE "public"."SuggestionCategory";

-- CreateIndex
CREATE INDEX "Suggestion_status_createdAt_idx" ON "public"."Suggestion"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Suggestion_createdAt_idx" ON "public"."Suggestion"("createdAt");

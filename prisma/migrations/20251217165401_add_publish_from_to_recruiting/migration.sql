/*
  Warnings:

  - Made the column `publishFrom` on table `Recruiting` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Recruiting" ALTER COLUMN "publishFrom" SET NOT NULL,
ALTER COLUMN "publishFrom" SET DEFAULT CURRENT_TIMESTAMP;

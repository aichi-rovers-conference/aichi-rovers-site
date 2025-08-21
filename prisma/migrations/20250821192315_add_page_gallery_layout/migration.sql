/*
  Warnings:

  - The values [MASONRY,ROWS,CAROUSEL] on the enum `GalleryLayout` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."GalleryLayout_new" AS ENUM ('GRID', 'SLIDESHOW');
ALTER TABLE "public"."MeetingReport" ALTER COLUMN "pageGalleryLayout" TYPE "public"."GalleryLayout_new" USING ("pageGalleryLayout"::text::"public"."GalleryLayout_new");
ALTER TYPE "public"."GalleryLayout" RENAME TO "GalleryLayout_old";
ALTER TYPE "public"."GalleryLayout_new" RENAME TO "GalleryLayout";
DROP TYPE "public"."GalleryLayout_old";
COMMIT;

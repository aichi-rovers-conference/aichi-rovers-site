-- CreateEnum
CREATE TYPE "public"."GalleryLayout" AS ENUM ('MASONRY', 'GRID', 'ROWS', 'CAROUSEL');

-- AlterTable
ALTER TABLE "public"."MeetingReport" ADD COLUMN     "pageGalleryLayout" "public"."GalleryLayout";

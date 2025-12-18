-- CreateEnum
CREATE TYPE "public"."SuggestionStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'DECLINED');

-- CreateEnum
CREATE TYPE "public"."SuggestionCategory" AS ENUM ('BUG', 'FEATURE', 'OTHER');

-- CreateTable
CREATE TABLE "public"."Suggestion" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "public"."SuggestionCategory" NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT true,
    "authorName" TEXT,
    "contact" TEXT,
    "canPublish" BOOLEAN NOT NULL DEFAULT true,
    "status" "public"."SuggestionStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Suggestion_pkey" PRIMARY KEY ("id")
);

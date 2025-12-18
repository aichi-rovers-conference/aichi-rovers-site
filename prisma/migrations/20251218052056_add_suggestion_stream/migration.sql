-- AlterTable
ALTER TABLE "public"."Suggestion" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publicNote" VARCHAR(1000),
ADD COLUMN     "resolvedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Suggestion_isPublic_updatedAt_idx" ON "public"."Suggestion"("isPublic", "updatedAt");

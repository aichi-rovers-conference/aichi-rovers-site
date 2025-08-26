-- CreateTable
CREATE TABLE "public"."Recruiting" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "area" TEXT NOT NULL,
    "url" TEXT,
    "urlDesc" TEXT,
    "imageUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recruiting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Recruiting_deadline_isPublished_idx" ON "public"."Recruiting"("deadline", "isPublished");

-- CreateIndex
CREATE INDEX "Recruiting_date_idx" ON "public"."Recruiting"("date");

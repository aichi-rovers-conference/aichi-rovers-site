-- CreateTable
CREATE TABLE "public"."SubmissionNonce" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "SubmissionNonce_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionNonce_nonce_key" ON "public"."SubmissionNonce"("nonce");

-- CreateIndex
CREATE INDEX "SubmissionNonce_pollId_createdAt_idx" ON "public"."SubmissionNonce"("pollId", "createdAt");

-- CreateIndex
CREATE INDEX "SubmissionNonce_pollId_nonce_idx" ON "public"."SubmissionNonce"("pollId", "nonce");

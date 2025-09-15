-- CreateTable
CREATE TABLE "public"."ExecutiveMember" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "role" TEXT,
    "birthDate" TIMESTAMP(3),
    "hometown" TEXT,
    "photoUrl" TEXT,
    "extras" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExecutiveMember_pkey" PRIMARY KEY ("id")
);

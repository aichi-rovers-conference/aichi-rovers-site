import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const items = await prisma.suggestion.findMany({
    where: {
      isPublic: true,
      NOT: { status: "SPAM" },
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 120,
    select: {
      id: true,
      subject: true,
      category: true,
      status: true,
      publicNote: true,
      createdAt: true,
      updatedAt: true,
      resolvedAt: true,
    },
  });

  return NextResponse.json({ items });
}

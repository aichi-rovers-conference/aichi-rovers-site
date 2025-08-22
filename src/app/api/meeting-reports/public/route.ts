import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const rows = await prisma.meetingReport.findMany({
      where: { isPublished: true },
      orderBy: [{ date: "desc" }, { round: "asc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        date: true,
        round: true,
        fiscalYear: true,
        reportUrl: true,
        coverUrl: true,
        youtubeId: true,
        isPublished: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(rows);
  } catch (err) {
    console.error("[GET /api/meeting-reports/public] error", err);
    return NextResponse.json([], { status: 500 });
  }
}

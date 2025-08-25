import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const rows = await prisma.meetingReport.findMany({
      where: { isPublished: true }, // 必要なら publishedAt: { not: null } を併記
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
        // publishedAt: true, // 使うなら返す
      },
    });

    return NextResponse.json(rows, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (err) {
    console.error("[GET /api/meeting-reports/public] error", err);
    return NextResponse.json([], {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}

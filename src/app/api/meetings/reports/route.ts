// app/api/meetings/reports/public/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma"; 

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? "0");

  const reports = await prisma.meetingReport.findMany({
    where: { isPublished: true },
    orderBy: [{ date: "desc" }, { id: "desc" }],
    ...(limit > 0 ? { take: limit } : {}),
    select: {
      id: true, title: true, slug: true, date: true, round: true, fiscalYear: true,
      reportUrl: true, coverUrl: true, youtubeId: true,
    },
  });

  // 返却形式をフロントの型に合わせて整形
  const items = reports.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    date: r.date.toISOString().slice(0, 10), // YYYY-MM-DD
    round: r.round as 1|2|3|4,
    fiscalYear: r.fiscalYear,
    reportUrl: r.reportUrl ?? `/arc/conference/reports/${r.slug}`,
    thumb: r.coverUrl ?? null,
    youtubeId: r.youtubeId ?? null,
  }));

  return NextResponse.json(items, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}

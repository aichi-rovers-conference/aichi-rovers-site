// app/api/meeting-reports/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { GalleryLayout as DbGalleryLayout } from "@prisma/client";

const toDbLayout = (v: any): DbGalleryLayout | null => {
  const s = String(v ?? "").toLowerCase();
  const E = DbGalleryLayout as any;
  if (E.GRID && E.SLIDESHOW) return s === "grid" ? E.GRID : s === "slideshow" ? E.SLIDESHOW : null;
  if (E.grid && E.slideshow) return s === "grid" ? E.grid : s === "slideshow" ? E.slideshow : null;
  return null;
};

export async function POST(req: Request) {
  const body = await req.json();
  const created = await prisma.meetingReport.create({
    data: {
      title: body.title,
      slug: body.slug,
      date: new Date(body.date),
      round: body.round,
      fiscalYear: body.fiscalYear,
      reportUrl: body.reportUrl ?? null,
      coverUrl: body.coverUrl ?? null,
      youtubeId: body.youtubeId ?? null,
      isPublished: !!body.isPublished,
      pageGallery: body.pageGallery ?? [],
      groups: body.groups ?? [],
      pageGalleryLayout: toDbLayout(body.pageGalleryLayout),
    },
    select: { id: true, slug: true, pageGalleryLayout: true },
  });
  return NextResponse.json({ ok: true, data: created });
}

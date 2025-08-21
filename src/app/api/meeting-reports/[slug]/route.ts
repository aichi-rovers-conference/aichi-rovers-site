// app/api/meeting-reports/[slug]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GalleryLayout as DbGalleryLayout } from "@prisma/client";

// "grid"/"slideshow" → Prisma enum へ（大文字/小文字の両対応）
const toDbLayout = (v: any): DbGalleryLayout | null => {
  const s = String(v ?? "").toLowerCase();
  const E = DbGalleryLayout as any;
  if (E.GRID && E.SLIDESHOW) return s === "grid" ? E.GRID : s === "slideshow" ? E.SLIDESHOW : null;
  if (E.grid && E.slideshow) return s === "grid" ? E.grid : s === "slideshow" ? E.slideshow : null;
  return null;
};

// ===== GET （公開のみ返す。?preview=1 の時は下書きも返す）=====
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const slug = decodeURIComponent(params.slug);
  const url = new URL(req.url);
  const preview = url.searchParams.get("preview") === "1";

  const report = await prisma.meetingReport.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      slug: true,
      date: true,
      fiscalYear: true,
      round: true,
      reportUrl: true,
      coverUrl: true,
      youtubeId: true,
      isPublished: true,
      updatedAt: true,
      pageGallery: true,
      groups: true,
      pageGalleryLayout: true, // ← レイアウトも返す
      // 旧互換が必要なら subtitle/lead/schedule/sections も追加
    },
  });

  if (!report || (!report.isPublished && !preview)) {
    return NextResponse.json({ ok: false, message: "not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: report });
}

// ===== PUT （存在すれば更新・無ければ作成）=====
export async function PUT(req: Request, { params }: { params: { slug: string } }) {
  const slug = decodeURIComponent(params.slug);
  const body = await req.json();

  const pageGalleryLayoutCreate = toDbLayout(body.pageGalleryLayout);
  const pageGalleryLayoutUpdate = { set: toDbLayout(body.pageGalleryLayout) };

  const dataCommon = {
    title: String(body.title ?? ""),
    date: new Date(body.date),
    round: Number(body.round ?? 1),
    fiscalYear: Number(body.fiscalYear),
    reportUrl: body.reportUrl ? String(body.reportUrl) : null,
    coverUrl: body.coverUrl ? String(body.coverUrl) : null,
    youtubeId: body.youtubeId ? String(body.youtubeId) : null,
    isPublished: !!body.isPublished,
    pageGallery: Array.isArray(body.pageGallery) ? body.pageGallery : [],
    // エディタは payload.sections で送る想定。後方互換で body.groups も許容
    groups: Array.isArray(body.sections)
      ? body.sections
      : Array.isArray(body.groups)
      ? body.groups
      : [],
  } as const;

  const updated = await prisma.meetingReport.upsert({
    where: { slug },
    create: {
      slug,
      ...dataCommon,
      pageGalleryLayout: pageGalleryLayoutCreate, // create は値そのもの
    },
    update: {
      ...dataCommon,
      pageGalleryLayout: pageGalleryLayoutUpdate, // update は { set: 値 }
    },
    select: {
      id: true,
      slug: true,
      isPublished: true,
      pageGalleryLayout: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ ok: true, data: updated });
}

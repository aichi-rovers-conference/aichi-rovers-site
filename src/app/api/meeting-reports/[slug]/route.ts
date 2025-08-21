// src/app/api/meeting-reports/[slug]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { GalleryLayout as DbGalleryLayout } from "@prisma/client";

// キャッシュさせない（必要なら）
export const revalidate = 0;

// "grid"/"slideshow"（大文字小文字混在可）→ Prisma enum へ
const toDbLayout = (v: any): DbGalleryLayout | null => {
  const s = String(v ?? "").toLowerCase();
  const E = DbGalleryLayout as any;
  if (E.GRID && E.SLIDESHOW) return s === "grid" ? E.GRID : s === "slideshow" ? E.SLIDESHOW : null;
  if (E.grid && E.slideshow) return s === "grid" ? E.grid : s === "slideshow" ? E.slideshow : null;
  return null;
};

// DB enum → UI 値（"grid" | "slideshow"）
const fromDbLayout = (v: any): "grid" | "slideshow" | null => {
  if (v == null) return null;
  const s = String(v).toLowerCase();
  return s === "slideshow" ? "slideshow" : s === "grid" ? "grid" : null;
};

export async function GET(_req: Request, context: any) {
  const slug = decodeURIComponent(context?.params?.slug ?? "");
  if (!slug) return NextResponse.json({ ok: false, message: "Bad request" }, { status: 400 });

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
      groups: true,               // 本文セクション(JSON)
      pageGalleryLayout: true,    // enum
      // 旧互換が必要なら subtitle / lead / schedule / sections も追加で select
    },
  });

  if (!report) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });

  // 必要なら enum → UI 値へ寄せて返却
  const data = {
    ...report,
    pageGalleryLayout: fromDbLayout(report.pageGalleryLayout),
  };

  return NextResponse.json({ ok: true, data });
}

export async function PUT(req: Request, context: any) {
  const slug = decodeURIComponent(context?.params?.slug ?? "");
  if (!slug) return NextResponse.json({ ok: false, message: "Bad request" }, { status: 400 });

  const body = await req.json();

  // UI 側は sections で送ってくる想定（後方互換で groups も許可）
  const groups =
    Array.isArray(body.sections) ? body.sections :
    Array.isArray(body.groups) ? body.groups : [];

  const updated = await prisma.meetingReport.update({
    where: { slug },
    data: {
      title: body.title,
      date: new Date(body.date),
      round: body.round,
      fiscalYear: body.fiscalYear,
      reportUrl: body.reportUrl ?? null,
      coverUrl: body.coverUrl ?? null,
      youtubeId: body.youtubeId ?? null,
      isPublished: !!body.isPublished,
      pageGallery: body.pageGallery ?? [],
      groups, // ← 子ギャラリーの layout も JSON に含まれて保存されます
      pageGalleryLayout: { set: toDbLayout(body.pageGalleryLayout) }, // ← 重要
    },
    select: {
      id: true,
      slug: true,
      isPublished: true,
      pageGalleryLayout: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    ok: true,
    data: {
      ...updated,
      pageGalleryLayout: fromDbLayout(updated.pageGalleryLayout),
    },
  });
}

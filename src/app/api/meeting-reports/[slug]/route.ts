// src/app/api/meeting-reports/[slug]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { GalleryLayout as DbGalleryLayout } from "@prisma/client";

// 実行環境（Prisma を安定動作させるため）
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// キャッシュしない
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

// 共通：ctx から params を安全に取り出す（Next の型に依存しない）
function getParams(ctx: unknown): { slug: string } {
  const { params } = (ctx as { params?: unknown }) ?? {};
  if (!params || typeof params !== "object" || params === null) return { slug: "" };
  const slug = decodeURIComponent(String((params as Record<string, unknown>).slug ?? ""));
  return { slug };
}

// ---- GET ----
export async function GET(_req: Request, ctx: unknown) {
  try {
    const { slug } = getParams(ctx);
    if (!slug) {
      return NextResponse.json({ ok: false, message: "Bad request" }, { status: 400 });
    }

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
        groups: true,             // 本文セクション(JSON)
        pageGalleryLayout: true,  // enum
      },
    });

    if (!report) {
      return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        ...report,
        pageGalleryLayout: fromDbLayout(report.pageGalleryLayout),
      },
    });
  } catch (err) {
    console.error("[GET /api/meeting-reports/[slug]]", err);
    return NextResponse.json({ ok: false, message: "Internal error" }, { status: 500 });
  }
}

// ---- PUT ----
export async function PUT(req: Request, ctx: unknown) {
  try {
    const { slug } = getParams(ctx);
    if (!slug) {
      return NextResponse.json({ ok: false, message: "Bad request" }, { status: 400 });
    }

    const body = await req.json();

    // UI 側は sections で送ってくる想定（後方互換で groups も許可）
    const groups =
      Array.isArray(body.sections) ? body.sections :
      Array.isArray(body.groups) ? body.groups : [];

    const updated = await prisma.meetingReport.update({
      where: { slug },
      data: {
        title: body.title,
        date: body.date ? new Date(body.date) : undefined,
        round: body.round,
        fiscalYear: body.fiscalYear,
        reportUrl: body.reportUrl ?? null,
        coverUrl: body.coverUrl ?? null,
        youtubeId: body.youtubeId ?? null,
        isPublished: !!body.isPublished,
        pageGallery: body.pageGallery ?? [],
        groups, // 子ギャラリーの layout も JSON に含まれて保存
        pageGalleryLayout: { set: toDbLayout(body.pageGalleryLayout) }, // enum を安全にセット
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
  } catch (err) {
    console.error("[PUT /api/meeting-reports/[slug]]", err);
    return NextResponse.json({ ok: false, message: "Internal error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma, $Enums } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function coerceJstDate(input: unknown): Date {
  const s = String(input ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T00:00:00.000+09:00`);
  const d = new Date(s);
  return isNaN(d.valueOf()) ? new Date() : d;
}
function emptyToNull<T>(v: T): T | null {
  return typeof v === "string" && v.trim() === "" ? null : (v as any);
}
function reiwaFromFiscalYear(fy: number) {
  return Math.max(1, fy - 2018); // 令和1=2019
}
function buildSlug(raw: any): string {
  const explicit = typeof raw?.slug === "string" ? raw.slug.trim() : "";
  if (explicit) return explicit;
  const fy = Number(raw?.fiscalYear);
  const round = Number(raw?.round);
  if (Number.isFinite(fy) && Number.isFinite(round) && fy > 0 && round > 0) {
    return `r${reiwaFromFiscalYear(fy)}-${round}`;
  }
  return `report-${Date.now().toString(36)}`;
}

// 'grid' | 'slideshow' -> Prisma Enum ("GRID" | "SLIDESHOW")
function asGalleryLayoutEnum(v: unknown): $Enums.GalleryLayout | null {
  const s = String(v ?? "").toLowerCase();
  if (s === "grid") return "GRID" as $Enums.GalleryLayout;
  if (s === "slideshow") return "SLIDESHOW" as $Enums.GalleryLayout;
  return null;
}

/** Create 用：publishedAt / subtitle は送らない */
function toCreateData(raw: any, slug: string): Prisma.MeetingReportCreateInput {
  return {
    slug,
    title: String(raw?.title ?? ""),
    date: coerceJstDate(raw?.date),
    fiscalYear: Number(raw?.fiscalYear),
    round: Number(raw?.round),
    isPublished: Boolean(raw?.isPublished),

    reportUrl: emptyToNull(raw?.reportUrl),
    coverUrl: emptyToNull(raw?.coverUrl),
    youtubeId: emptyToNull(raw?.youtubeId),

    // lead はスキーマにある前提。不要ならこの行を削除してください
    lead: emptyToNull(raw?.lead),

    pageGallery: (Array.isArray(raw?.pageGallery) ? raw.pageGallery : []) as Prisma.InputJsonValue,
    pageGalleryLayout: asGalleryLayoutEnum(raw?.pageGalleryLayout) ?? ("GRID" as $Enums.GalleryLayout),
    sections: (Array.isArray(raw?.sections) ? raw.sections : []) as Prisma.InputJsonValue,
    groups: (Array.isArray(raw?.groups) ? raw.groups : []) as Prisma.InputJsonValue,
    schedule: (Array.isArray(raw?.schedule) ? raw.schedule : []) as Prisma.InputJsonValue,
    sectionsGroups: (Array.isArray(raw?.sectionsGroups) ? raw.sectionsGroups : []) as Prisma.InputJsonValue,
  };
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json().catch(() => ({}));
    const slug = buildSlug(raw);

    const existing = await prisma.meetingReport.findFirst({
      where: { slug },
      select: { id: true },
    });

    const data = toCreateData(raw, slug);

    const saved = existing
      ? await prisma.meetingReport.update({ where: { id: existing.id }, data })
      : await prisma.meetingReport.create({ data });

    return NextResponse.json({
      ok: true,
      data: saved,
      previewUrl: saved.reportUrl || `/arc/conference/reports/${saved.slug}`,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "create failed" }, { status: 400 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 204 });
}

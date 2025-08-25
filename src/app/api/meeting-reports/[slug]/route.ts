import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ================= ユーティリティ ================= */

function fiscalYearFromReiwa(reiwa: number) {
  // 2019 = 令和1
  return 2018 + Math.max(1, reiwa);
}

function isReiwaSlug(slug: string) {
  // r7-3 / R7-3 など
  const m = slug.match(/^r(\d+)-(\d+)$/i);
  if (!m) return null;
  return { reiwa: Number(m[1]), round: Number(m[2]) };
}

function coerceJstDate(input: unknown): Date {
  const s = String(input ?? "").trim();
  // "YYYY-MM-DD" は JST の 00:00 で固定
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T00:00:00.000+09:00`);
  const d = new Date(s);
  return isNaN(d.valueOf()) ? new Date() : d;
}

function emptyToNull<T>(v: T): T | null {
  return typeof v === "string" && v.trim() === "" ? null : (v as any);
}

const LAYOUTS = ["grid", "slideshow"] as const;
type Layout = (typeof LAYOUTS)[number];
function asLayout(v: unknown): Layout | null {
  const s = String(v ?? "").toLowerCase();
  return LAYOUTS.includes(s as Layout) ? (s as Layout) : null;
}

/** Update 用：undefined は「変更しない」 */
function toUpdateData(raw: any): Prisma.MeetingReportUpdateInput {
  const layout =
    raw?.pageGalleryLayout === undefined ? undefined : asLayout(raw?.pageGalleryLayout);

  return {
    title: raw?.title != null ? String(raw.title) : undefined,
    date: raw?.date != null ? coerceJstDate(raw.date) : undefined,
    fiscalYear: typeof raw?.fiscalYear === "number" ? raw.fiscalYear : undefined,
    round: typeof raw?.round === "number" ? raw.round : undefined,

    isPublished: raw?.isPublished != null ? Boolean(raw.isPublished) : undefined,
    // 公開に切り替えた時だけ publishedAt を上書き
    publishedAt: raw?.isPublished === true ? new Date() : undefined,

    reportUrl: raw?.reportUrl !== undefined ? emptyToNull(raw.reportUrl) : undefined,
    coverUrl: raw?.coverUrl !== undefined ? emptyToNull(raw.coverUrl) : undefined,
    youtubeId: raw?.youtubeId !== undefined ? emptyToNull(raw.youtubeId) : undefined,

    // lead / schedule / sections / groups など JSON 項目
    lead: raw?.lead !== undefined ? emptyToNull(raw.lead) : undefined,
    pageGallery: Array.isArray(raw?.pageGallery)
      ? (raw.pageGallery as Prisma.InputJsonValue)
      : undefined,
    pageGalleryLayout: layout === undefined ? undefined : (layout as any), // DB が String? でも OK
    sections: Array.isArray(raw?.sections)
      ? (raw.sections as Prisma.InputJsonValue)
      : undefined,
    groups: Array.isArray(raw?.groups) ? (raw.groups as Prisma.InputJsonValue) : undefined,
    schedule: Array.isArray(raw?.schedule)
      ? (raw.schedule as Prisma.InputJsonValue)
      : undefined,
    sectionsGroups: Array.isArray(raw?.sectionsGroups)
      ? (raw.sectionsGroups as Prisma.InputJsonValue)
      : undefined,
  };
}

/** Create 用：必須項目は明示。空は null に正規化 */
function toCreateData(slug: string, raw: any): Prisma.MeetingReportCreateInput {
  return {
    slug,
    title: String(raw?.title ?? ""),
    date: coerceJstDate(raw?.date),
    fiscalYear: Number(raw?.fiscalYear),
    round: Number(raw?.round),
    isPublished: Boolean(raw?.isPublished),
    publishedAt: raw?.isPublished ? new Date() : null,

    reportUrl: emptyToNull(raw?.reportUrl),
    coverUrl: emptyToNull(raw?.coverUrl),
    youtubeId: emptyToNull(raw?.youtubeId),
    lead: emptyToNull(raw?.lead),

    pageGallery: (Array.isArray(raw?.pageGallery) ? raw.pageGallery : []) as Prisma.InputJsonValue,
    pageGalleryLayout: (asLayout(raw?.pageGalleryLayout) ?? "grid") as any,
    sections: (Array.isArray(raw?.sections) ? raw.sections : []) as Prisma.InputJsonValue,
    groups: (Array.isArray(raw?.groups) ? raw.groups : []) as Prisma.InputJsonValue,
    schedule: (Array.isArray(raw?.schedule) ? raw.schedule : []) as Prisma.InputJsonValue,
    sectionsGroups: (Array.isArray(raw?.sectionsGroups) ? raw.sectionsGroups : []) as Prisma.InputJsonValue,
  };
}

/* ================= ハンドラ ================= */

// GET: 公開済みのみ返す（r{令和}-{回} も解釈）
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = decodeURIComponent(params.slug);

    // r{令和}-{回} → 年度+回で検索（公開のみ）
    const rew = isReiwaSlug(slug);
    let data = null as any;
    if (rew) {
      const fiscalYear = fiscalYearFromReiwa(rew.reiwa);
      data = await prisma.meetingReport.findFirst({
        where: { fiscalYear, round: rew.round, isPublished: true },
      });
    }
    // 通常の slug（公開のみ）
    if (!data) {
      data = await prisma.meetingReport.findFirst({
        where: { slug, isPublished: true },
      });
    }

    if (!data) {
      return NextResponse.json({ ok: false, message: "not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    console.error("[GET /api/meeting-reports/[slug]]", e);
    return NextResponse.json({ ok: false, message: e?.message ?? "get failed" }, { status: 500 });
  }
}

// PUT: r{令和}-{回} なら年度/回で upsert、それ以外は slug 一意で upsert
export async function PUT(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const slug = decodeURIComponent(params.slug);
  const raw = await req.json().catch(() => ({}));
  try {
    const rew = isReiwaSlug(slug);

    if (rew) {
      const fiscalYear = fiscalYearFromReiwa(rew.reiwa);
      const existing = await prisma.meetingReport.findFirst({
        where: { fiscalYear, round: rew.round },
        select: { id: true },
      });

      if (existing) {
        const saved = await prisma.meetingReport.update({
          where: { id: existing.id },
          data: toUpdateData(raw),
        });
        return NextResponse.json({ ok: true, slug, data: saved });
      }

      const createData = toCreateData(slug, {
        ...raw,
        fiscalYear,
        round: rew.round,
      });
      const saved = await prisma.meetingReport.create({ data: createData });
      return NextResponse.json({ ok: true, slug, data: saved });
    }

    // 通常 slug
    const existing = await prisma.meetingReport.findFirst({
      where: { slug },
      select: { id: true },
    });

    if (existing) {
      const saved = await prisma.meetingReport.update({
        where: { id: existing.id },
        data: toUpdateData(raw),
      });
      return NextResponse.json({ ok: true, slug, data: saved });
    }

    const createData = toCreateData(slug, raw);
    const saved = await prisma.meetingReport.create({ data: createData });
    return NextResponse.json({ ok: true, slug, data: saved });
  } catch (e: any) {
    console.error("[PUT /api/meeting-reports/[slug]]", e);
    return NextResponse.json({ ok: false, message: e?.message ?? "put failed" }, { status: 500 });
  }
}

// PATCH: 既存があれば更新、無ければ作成（slug ベース／r形式は年度+回）
export async function PATCH(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const slug = decodeURIComponent(params.slug);
  const raw = await req.json().catch(() => ({}));
  try {
    const rew = isReiwaSlug(slug);

    if (rew) {
      const fiscalYear = fiscalYearFromReiwa(rew.reiwa);
      const existing = await prisma.meetingReport.findFirst({
        where: { fiscalYear, round: rew.round },
        select: { id: true },
      });

      if (existing) {
        const saved = await prisma.meetingReport.update({
          where: { id: existing.id },
          data: toUpdateData(raw),
        });
        return NextResponse.json({ ok: true, slug, data: saved });
      }

      const created = await prisma.meetingReport.create({
        data: toCreateData(slug, { ...raw, fiscalYear, round: rew.round }),
      });
      return NextResponse.json({ ok: true, slug, data: created });
    }

    // 通常 slug
    const existing = await prisma.meetingReport.findFirst({
      where: { slug },
      select: { id: true },
    });

    if (!existing) {
      const created = await prisma.meetingReport.create({
        data: toCreateData(slug, raw),
      });
      return NextResponse.json({ ok: true, slug, data: created });
    }

    const saved = await prisma.meetingReport.update({
      where: { id: existing.id },
      data: toUpdateData(raw),
    });
    return NextResponse.json({ ok: true, slug, data: saved });
  } catch (e: any) {
    console.error("[PATCH /api/meeting-reports/[slug]]", e);
    return NextResponse.json({ ok: false, message: e?.message ?? "patch failed" }, { status: 500 });
  }
}

// DELETE: r形式なら 年度+回、通常は slug で削除
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const slug = decodeURIComponent(params.slug);
  try {
    const rew = isReiwaSlug(slug);

    if (rew) {
      const fiscalYear = fiscalYearFromReiwa(rew.reiwa);
      const existing = await prisma.meetingReport.findFirst({
        where: { fiscalYear, round: rew.round },
        select: { id: true },
      });
      if (existing) await prisma.meetingReport.delete({ where: { id: existing.id } });
      return NextResponse.json({ ok: true, slug });
    }

    const existing = await prisma.meetingReport.findFirst({
      where: { slug },
      select: { id: true },
    });
    if (existing) await prisma.meetingReport.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true, slug });
  } catch (e: any) {
    console.error("[DELETE /api/meeting-reports/[slug]]", e);
    return NextResponse.json({ ok: false, message: e?.message ?? "delete failed" }, { status: 500 });
  }
}

export async function OPTIONS() {
  // 必要に応じて CORS ヘッダをここで付与してもOK
  return NextResponse.json({}, { status: 204 });
}

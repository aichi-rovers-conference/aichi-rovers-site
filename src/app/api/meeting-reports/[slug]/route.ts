import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma, $Enums } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = { slug: string };
type Ctx = { params: Params | Promise<Params> };

const isPromise = (v: unknown): v is Promise<unknown> => !!v && typeof (v as any).then === "function";
async function getParams(ctx?: Partial<Ctx>): Promise<Params> {
  const raw = ctx?.params;
  const p = isPromise(raw) ? await raw : (raw as Params | undefined);
  const slug = decodeURIComponent(String(p?.slug ?? ""));
  return { slug };
}

function fiscalYearFromReiwa(reiwa: number) { return 2018 + Math.max(1, reiwa); }
function coerceJstDate(input: unknown): Date {
  const s = String(input ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T00:00:00.000+09:00`);
  const d = new Date(s); return isNaN(d.valueOf()) ? new Date() : d;
}
function emptyToNull<T>(v: T): T | null { return typeof v === "string" && v.trim() === "" ? null : (v as any); }
function asGalleryLayout(v: unknown): $Enums.GalleryLayout | null {
  const s = String(v ?? "").toLowerCase();
  if (s === "grid") return "grid" as $Enums.GalleryLayout;
  if (s === "slideshow") return "slideshow" as $Enums.GalleryLayout;
  return null;
}

/** Update 用：undefined は「変更しない」。subtitle は送らない */
function toUpdateData(raw: any): Prisma.MeetingReportUpdateInput {
  const layout = raw?.pageGalleryLayout === undefined ? undefined : asGalleryLayout(raw?.pageGalleryLayout);
  return {
    title: raw?.title != null ? String(raw.title) : undefined,
    date: raw?.date != null ? coerceJstDate(raw.date) : undefined,
    fiscalYear: typeof raw?.fiscalYear === "number" ? raw.fiscalYear : undefined,
    round: typeof raw?.round === "number" ? raw.round : undefined,
    isPublished: raw?.isPublished != null ? Boolean(raw.isPublished) : undefined,
    publishedAt: raw?.isPublished === true ? new Date() : undefined,

    reportUrl: raw?.reportUrl !== undefined ? emptyToNull(raw.reportUrl) : undefined,
    coverUrl: raw?.coverUrl !== undefined ? emptyToNull(raw.coverUrl) : undefined,
    youtubeId: raw?.youtubeId !== undefined ? emptyToNull(raw.youtubeId) : undefined,

    // lead は必要なら残す（スキーマに無ければ消してください）
    lead: raw?.lead !== undefined ? emptyToNull(raw.lead) : undefined,

    pageGallery: Array.isArray(raw?.pageGallery) ? (raw.pageGallery as Prisma.InputJsonValue) : undefined,
    pageGalleryLayout: layout === undefined ? undefined : layout, // enum or null
    sections: Array.isArray(raw?.sections) ? (raw.sections as Prisma.InputJsonValue) : undefined,
    groups: Array.isArray(raw?.groups) ? (raw.groups as Prisma.InputJsonValue) : undefined,
    schedule: Array.isArray(raw?.schedule) ? (raw.schedule as Prisma.InputJsonValue) : undefined,
    sectionsGroups: Array.isArray(raw?.sectionsGroups) ? (raw.sectionsGroups as Prisma.InputJsonValue) : undefined,
  };
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { slug } = await getParams(ctx);
  try {
    let data: any | null = null;

    const m = slug.match(/^r(\d+)-(\d+)$/i);
    if (m) {
      const reiwa = Number(m[1]); const round = Number(m[2]); const fiscalYear = fiscalYearFromReiwa(reiwa);
      data = await prisma.meetingReport.findFirst({ where: { fiscalYear, round, isPublished: true } });
    }
    if (!data) {
      data = await prisma.meetingReport.findFirst({ where: { slug, isPublished: true } });
    }
    if (!data) return NextResponse.json({ ok: false, message: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "get failed" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { slug } = await getParams(ctx);
  const raw = await req.json().catch(() => ({}));
  try {
    const m = slug.match(/^r(\d+)-(\d+)$/i);
    if (m) {
      const reiwa = Number(m[1]); const round = Number(m[2]); const fiscalYear = fiscalYearFromReiwa(reiwa);
      const existing = await prisma.meetingReport.findFirst({ where: { fiscalYear, round }, select: { id: true } });
      if (existing) {
        const saved = await prisma.meetingReport.update({ where: { id: existing.id }, data: toUpdateData(raw) });
        return NextResponse.json({ ok: true, slug, data: saved });
      }
      // create 用（必須フィールドは明示）
      const createData: Prisma.MeetingReportCreateInput = {
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
        pageGalleryLayout: asGalleryLayout(raw?.pageGalleryLayout) ?? ("grid" as $Enums.GalleryLayout),
        sections: (Array.isArray(raw?.sections) ? raw.sections : []) as Prisma.InputJsonValue,
        groups: (Array.isArray(raw?.groups) ? raw.groups : []) as Prisma.InputJsonValue,
        schedule: (Array.isArray(raw?.schedule) ? raw.schedule : []) as Prisma.InputJsonValue,
        sectionsGroups: (Array.isArray(raw?.sectionsGroups) ? raw.sectionsGroups : []) as Prisma.InputJsonValue,
      };
      const saved = await prisma.meetingReport.create({ data: createData });
      return NextResponse.json({ ok: true, slug, data: saved });
    }

    // r形式でない：slug 一意
    const existing = await prisma.meetingReport.findFirst({ where: { slug }, select: { id: true } });
    if (existing) {
      const saved = await prisma.meetingReport.update({ where: { id: existing.id }, data: toUpdateData(raw) });
      return NextResponse.json({ ok: true, slug, data: saved });
    }
    const createData: Prisma.MeetingReportCreateInput = {
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
      pageGalleryLayout: asGalleryLayout(raw?.pageGalleryLayout) ?? ("grid" as $Enums.GalleryLayout),
      sections: (Array.isArray(raw?.sections) ? raw.sections : []) as Prisma.InputJsonValue,
      groups: (Array.isArray(raw?.groups) ? raw.groups : []) as Prisma.InputJsonValue,
      schedule: (Array.isArray(raw?.schedule) ? raw.schedule : []) as Prisma.InputJsonValue,
      sectionsGroups: (Array.isArray(raw?.sectionsGroups) ? raw.sectionsGroups : []) as Prisma.InputJsonValue,
    };
    const saved = await prisma.meetingReport.create({ data: createData });
    return NextResponse.json({ ok: true, slug, data: saved });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "put failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { slug } = await getParams(ctx);
  const raw = await req.json().catch(() => ({}));
  try {
    const existing = await prisma.meetingReport.findFirst({ where: { slug }, select: { id: true } });
    if (!existing) {
      const createData: Prisma.MeetingReportCreateInput = {
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
        pageGalleryLayout: asGalleryLayout(raw?.pageGalleryLayout) ?? ("grid" as $Enums.GalleryLayout),
        sections: (Array.isArray(raw?.sections) ? raw.sections : []) as Prisma.InputJsonValue,
        groups: (Array.isArray(raw?.groups) ? raw.groups : []) as Prisma.InputJsonValue,
        schedule: (Array.isArray(raw?.schedule) ? raw.schedule : []) as Prisma.InputJsonValue,
        sectionsGroups: (Array.isArray(raw?.sectionsGroups) ? raw.sectionsGroups : []) as Prisma.InputJsonValue,
      };
      const created = await prisma.meetingReport.create({ data: createData });
      return NextResponse.json({ ok: true, slug, data: created });
    }
    const saved = await prisma.meetingReport.update({ where: { id: existing.id }, data: toUpdateData(raw) });
    return NextResponse.json({ ok: true, slug, data: saved });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "patch failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { slug } = await getParams(ctx);
  try {
    const existing = await prisma.meetingReport.findFirst({ where: { slug }, select: { id: true } });
    if (existing) await prisma.meetingReport.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true, slug });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "delete failed" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 204 });
}

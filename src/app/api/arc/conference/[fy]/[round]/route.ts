// app/api/arc/conference/[fy]/[round]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../../lib/prisma";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs"; // Prisma を Node 実行で安定させる
export const dynamic = "force-dynamic";
export const revalidate = 0;

const asJson = (v: unknown): Prisma.InputJsonValue => v as Prisma.InputJsonValue;

/* 受け取った fy/round を正規化 */
function canonFy(input: string) {
  const m = String(input).trim().match(/^r\s*(\d+)$/i);
  return m ? `R${Number(m[1])}` : String(input).toUpperCase();
}
function canonRound(input: string) {
  const n = Number(String(input).trim());
  return Number.isFinite(n) ? String(n) : String(input).trim();
}

/* 型（DB 側は JSON 列を想定）*/
type SectionText = { id: string; type: "text"; title?: string; body?: string };
type SectionTimelineItem = { id: string; date?: string; title: string; description?: string };
type SectionTimeline = { id: string; type: "timeline"; title?: string; items: SectionTimelineItem[] };
type Section = SectionText | SectionTimeline;
type GalleryItem = { id: string; url: string; caption?: string };

type Payload = {
  fy: string;
  round: string;
  title: string;
  subtitle?: string;
  heroUrl?: string;
  intro?: string;
  sections: Section[];
  gallery: GalleryItem[];
  published?: boolean;
};

/** Next.js 15: params は Promise なので await する */
type ParamsP = Promise<{ fy: string; round: string }>;
const getParams = async (paramsP: ParamsP) => {
  const { fy, round } = await paramsP;
  return { fy: canonFy(fy), round: canonRound(round) };
};

export async function GET(_req: NextRequest, { params }: { params: ParamsP }) {
  try {
    const { fy, round } = await getParams(params);
    const data = await prisma.conferenceRound.findUnique({
      where: { fy_round: { fy, round } },
    });
    if (!data) {
      return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
    }
    return NextResponse.json(
      { ok: true, data },
      { headers: { "Cache-Control": "no-store, must-revalidate" } }
    );
  } catch {
    return NextResponse.json({ ok: false, message: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: ParamsP }) {
  try {
    const fromParams = await getParams(params);
    const body = (await req.json().catch(() => ({}))) as Partial<Payload>;

    const fy = canonFy(body.fy ?? fromParams.fy);
    const round = canonRound(body.round ?? fromParams.round);

    if (!fy) return NextResponse.json({ ok: false, message: "fy is required" }, { status: 400 });
    if (!round) return NextResponse.json({ ok: false, message: "round is required" }, { status: 400 });

    const title = String(body.title ?? "").trim();
    if (!title) return NextResponse.json({ ok: false, message: "title is required" }, { status: 400 });

    const sections = Array.isArray(body.sections) ? body.sections : [];
    const gallery = Array.isArray(body.gallery) ? body.gallery : [];

    const saved = await prisma.conferenceRound.upsert({
      where: { fy_round: { fy, round } },
      update: {
        title,
        subtitle: body.subtitle ?? null,
        heroUrl: body.heroUrl ?? null,
        intro: body.intro ?? null,
        sections: asJson(sections),
        gallery: asJson(gallery),
        published: Boolean(body.published),
      },
      create: {
        fy,
        round,
        title,
        subtitle: body.subtitle ?? null,
        heroUrl: body.heroUrl ?? null,
        intro: body.intro ?? null,
        sections: asJson(sections),
        gallery: asJson(gallery),
        published: Boolean(body.published),
      },
    });

    return NextResponse.json(
      { ok: true, data: saved },
      { headers: { "Cache-Control": "no-store, must-revalidate" } }
    );
  } catch {
    return NextResponse.json({ ok: false, message: "Internal Server Error" }, { status: 500 });
  }
}

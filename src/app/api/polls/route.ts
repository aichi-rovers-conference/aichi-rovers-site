// src/app/api/polls/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { QuestionType } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

/** ---------- helpers (no-any) ---------- */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function normalizeScaleConfig(raw: unknown) {
  const r = isRecord(raw) ? raw : {};
  const minRaw = Number((r as Record<string, unknown>).min);
  const maxRaw = Number((r as Record<string, unknown>).max);
  const min: 0 | 1 = minRaw === 0 ? 0 : 1;
  let max = Math.min(10, Math.max(2, Number.isFinite(maxRaw) ? maxRaw : 5));
  if (max <= min) max = Math.min(10, Math.max(2, min + 1));
  return {
    min,
    max,
    minLabel: typeof r["minLabel"] === "string" ? (r["minLabel"] as string) : "",
    maxLabel: typeof r["maxLabel"] === "string" ? (r["maxLabel"] as string) : "",
  };
}

type TextConfig = {
  placeholder?: string;
  multiline?: boolean;
  rows?: number | string;
};

function normalizeTextConfig(raw: unknown): Required<Omit<TextConfig, "rows">> & { rows?: number } {
  const r = isRecord(raw) ? raw : {};
  const multiline = typeof r["multiline"] === "boolean" ? (r["multiline"] as boolean) : true;
  const rows = multiline
    ? Math.max(1, Math.min(50, Number.isFinite(+r["rows"]!) ? +(r["rows"] as number | string) : 4))
    : undefined;
  const placeholder =
    typeof r["placeholder"] === "string"
      ? (r["placeholder"] as string)
      : multiline
      ? "長文回答"
      : "回答を入力";
  return { multiline, rows, placeholder };
}

type RatingShape = "star" | "heart" | "thumb";
function normalizeRatingConfig(raw: unknown): { count: number; shape: RatingShape } {
  const r = isRecord(raw) ? raw : {};
  const n = Number(r["count"] ?? r["max"] ?? r["ratingCount"]);
  let count = Number.isFinite(n) ? Math.floor(n) : 5;
  if (count < 3) count = 3;
  if (count > 9) count = 9;

  const shapeRaw = typeof r["shape"] === "string" ? (r["shape"] as string).toLowerCase() : "";
  const shape: RatingShape = (["star", "heart", "thumb"].includes(shapeRaw) ? shapeRaw : "star") as RatingShape;

  return { count, shape };
}

/** ---------- GET ---------- */
export async function GET() {
  const polls = await prisma.poll.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: "desc" },
    include: {
      questions: {
        orderBy: { index: "asc" },
        include: { choices: { orderBy: { index: "asc" } } },
      },
    },
  });

  // レスポンスに RATING の「rating」をミラー
  const out = polls.map((p) => ({
    ...p,
    questions: p.questions.map((q) => {
      const cfg = q.config ?? null;
      const rating = q.type === QuestionType.RATING ? normalizeRatingConfig(cfg) : undefined;
      return { ...q, ...(rating ? { rating } : {}) };
    }),
  }));

  return NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
}

/** ---------- POST ---------- */
type NewQuestion = {
  type: "radio" | "checkbox" | "text" | "scale" | "rating";
  title: string;
  options?: string[];
  scale?: { min: 0 | 1; max: number; minLabel?: string; maxLabel?: string };
  rating?: { count: number; shape: RatingShape };
  config?: TextConfig;
  text?: TextConfig; // 互換のため
};

type NewPollBody = {
  title: string;
  desc?: string;
  closesAt?: string;
  questions: NewQuestion[];
};

export async function POST(req: Request) {
  const raw = (await req.json().catch(() => null)) as unknown;
  if (!isRecord(raw)) return NextResponse.json({ error: "Bad Request" }, { status: 400 });

  const title = String(raw.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "title が必要です" }, { status: 400 });

  const questions = Array.isArray(raw.questions) ? (raw.questions as NewQuestion[]) : [];
  if (questions.length === 0) {
    return NextResponse.json({ error: "questions が必要です" }, { status: 400 });
  }

  try {
    const poll = await prisma.$transaction(async (tx) => {
      const created = await tx.poll.create({
        data: {
          title,
          desc: (raw.desc as string | undefined) ?? null,
          closesAt: raw.closesAt ? new Date(String(raw.closesAt)) : null,
          isPublic: true,
        },
      });

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const type = q.type.toUpperCase() as keyof typeof QuestionType;

        let config: unknown;
        if (q.type === "scale") config = normalizeScaleConfig(q.scale);
        else if (q.type === "rating") config = normalizeRatingConfig(q.rating);
        else if (q.type === "text") config = normalizeTextConfig(q.config ?? q.text);

        const question = await tx.question.create({
          data: {
            pollId: created.id,
            index: i,
            type: QuestionType[type],
            title: (q.title ?? "無題の質問").trim(),
            required: false,
            ...(config ? { config } : {}),
          },
        });

        if (q.type === "radio" || q.type === "checkbox") {
          const items = (q.options ?? []).map((label, idx) => ({
            questionId: question.id,
            index: idx,
            label: String(label).trim(),
          }));
          if (items.length) await tx.choice.createMany({ data: items });
        }
      }
      return created;
    });

    const full = await prisma.poll.findUnique({
      where: { id: poll.id },
      include: {
        questions: {
          orderBy: { index: "asc" },
          include: { choices: { orderBy: { index: "asc" } } },
        },
      },
    });

    if (!full) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const out = {
      ...full,
      questions: full.questions.map((q) => {
        const cfg = q.config ?? null;
        const rating = q.type === QuestionType.RATING ? normalizeRatingConfig(cfg) : undefined;
        return { ...q, ...(rating ? { rating } : {}) };
      }),
    };

    return NextResponse.json(out, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "作成に失敗しました" }, { status: 500 });
  }
}

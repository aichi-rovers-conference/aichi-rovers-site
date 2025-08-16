// app/api/polls/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { QuestionType } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeScaleConfig(raw: any) {
  const minRaw = Number(raw?.min);
  const maxRaw = Number(raw?.max);
  const min: 0 | 1 = minRaw === 0 ? 0 : 1;
  let max = Math.min(10, Math.max(2, Number.isFinite(maxRaw) ? maxRaw : 5));
  if (max <= min) max = Math.min(10, Math.max(2, min + 1));
  return {
    min,
    max,
    minLabel: typeof raw?.minLabel === "string" ? raw.minLabel : "",
    maxLabel: typeof raw?.maxLabel === "string" ? raw.maxLabel : "",
  };
}

function normalizeTextConfig(raw: any) {
  const multiline =
    typeof raw?.multiline === "boolean" ? raw.multiline : true;
  const rows =
    multiline
      ? Math.max(1, Math.min(50, Number.isFinite(+raw?.rows) ? +raw.rows : 4))
      : undefined;
  const placeholder =
    typeof raw?.placeholder === "string"
      ? raw.placeholder
      : multiline
      ? "長文回答"
      : "回答を入力";
  return { multiline, rows, placeholder };
}


function normalizeRatingConfig(raw: any) {
  const n = Number(raw?.count ?? raw?.max ?? raw?.ratingCount);
  let count = Number.isFinite(n) ? Math.floor(n) : 5;
  if (count < 3) count = 3;
  if (count > 9) count = 9;

  const shapeRaw = typeof raw?.shape === "string" ? raw.shape.toLowerCase() : "";
  const shape = (["star", "heart", "thumb"].includes(shapeRaw) ? shapeRaw : "star") as
    | "star"
    | "heart"
    | "thumb";

  return { count, shape };
}

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

  // レスポンスで RATING は rating をトップレベルにミラー
  const out = polls.map((p) => ({
    ...p,
    questions: p.questions.map((q: any) => {
      const cfg = q.config ?? null;
      const type = q.type as keyof typeof QuestionType;
      const rating =
        type === "RATING" ? normalizeRatingConfig(cfg ?? {}) : undefined;
      return {
        ...q,
        ...(rating ? { rating } : {}),
      };
    }),
  }));

  return NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
}

type NewQuestion = {
  type: "radio" | "checkbox" | "text" | "scale" | "rating";
  title: string;
  options?: string[];
  scale?: { min: 0 | 1; max: number; minLabel?: string; maxLabel?: string };
  rating?: { count: number; shape: "star" | "heart" | "thumb" };
  config?: TextConfig;
  text?: TextConfig;
};

type TextConfig = {
  placeholder?: string;
  multiline?: boolean;
  rows?: number | string; // 文字列で来てもOKにしておく
};

export async function POST(req: Request) {
  const body = await req.json();
  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "title が必要です" }, { status: 400 });

  const questions: NewQuestion[] = Array.isArray(body.questions) ? body.questions : [];
  if (questions.length === 0)
    return NextResponse.json({ error: "questions が必要です" }, { status: 400 });

  try {
    const poll = await prisma.$transaction(async (tx) => {
      const created = await tx.poll.create({
        data: {
          title,
          desc: body.desc ?? null,
          closesAt: body.closesAt ? new Date(body.closesAt) : null,
          isPublic: true,
        },
      });

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const type = q.type.toUpperCase() as any; // Prisma enum に合わせる

        let config: any | undefined;
        if (q.type === "scale") {
          config = normalizeScaleConfig(q.scale ?? {});
        } else if (q.type === "rating") {
          config = normalizeRatingConfig(q.rating ?? {});
        } else if (q.type === "text") {
          config = normalizeTextConfig(q.config ?? q.text ?? {});
        }

        const question = await tx.question.create({
          data: {
            pollId: created.id,
            index: i,
            type,
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

    // ★ レスポンスに rating をミラー
    const out = {
      ...full,
      questions: full.questions.map((q: any) => {
        const cfg = q.config ?? null;
        const type = q.type as keyof typeof QuestionType;
        const rating =
          type === "RATING" ? normalizeRatingConfig(cfg ?? {}) : undefined;
        return {
          ...q,
          ...(rating ? { rating } : {}),
        };
      }),
    };

    return NextResponse.json(out, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "作成に失敗しました" }, { status: 500 });
  }
}

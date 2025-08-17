// app/api/polls/[id]/responses/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import type { QuestionType } from "@prisma/client";

export const revalidate = 0;
export const dynamic = "force-dynamic";

type IdParams = { id: string };

export async function GET(
  _req: Request,
  ctx: { params: Promise<IdParams> } // ← Next.js 15: Promise を await
) {
  const { id: pollId } = await ctx.params;

  const poll = await prisma.poll.findUnique({
    where: { id: pollId as any },
    select: {
      id: true,
      title: true,
      questions: {
        orderBy: { index: "asc" },
        select: {
          id: true,
          index: true,
          type: true,
          title: true,
          required: true,
          config: true,
          choices: {
            orderBy: { index: "asc" },
            select: { id: true, index: true, label: true },
          },
        },
      },
    },
  });

  if (!poll) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const items: any[] = [];

  for (const q of poll.questions) {
    // 回答者数（submissionId のユニーク数）
    const distinctSubs = await prisma.answer.findMany({
      where: { questionId: q.id },
      distinct: ["submissionId"],
      select: { submissionId: true },
    });
    const respondentCount = distinctSubs.length;

    if (q.type === "RADIO") {
      // 選択肢ごとの件数（NULLは除外）
      const grouped = await prisma.answer.groupBy({
        by: ["choiceId"],
        where: { questionId: q.id, NOT: { choiceId: null } },
        _count: { _all: true },
      });
      const counts = new Map<string, number>();
      grouped.forEach((g) => counts.set(g.choiceId as string, g._count._all));

      items.push({
        questionId: q.id,
        type: q.type,
        title: q.title,
        respondentCount,
        choices: q.choices.map((c) => ({
          id: c.id,
          label: c.label,
          count: counts.get(c.id) ?? 0,
        })),
      });
      continue;
    }

    if (q.type === "CHECKBOX") {
      // 中間テーブルから集計
      const grouped = await prisma.answerChoice.groupBy({
        by: ["choiceId"],
        where: { answer: { questionId: q.id } },
        _count: { _all: true },
      });
      const counts = new Map<string, number>();
      grouped.forEach((g) => counts.set(g.choiceId, g._count._all));

      items.push({
        questionId: q.id,
        type: q.type,
        title: q.title,
        respondentCount,
        choices: q.choices.map((c) => {
          const count = counts.get(c.id) ?? 0;
          return {
            id: c.id,
            label: c.label,
            count,
            percent: respondentCount ? Math.round((count * 100) / respondentCount) : 0,
          };
        }),
      });
      continue;
    }

    if (q.type === "TEXT") {
      const answers = await prisma.answer.findMany({
        where: { questionId: q.id, NOT: { text: null } },
        select: { text: true },
        orderBy: { createdAt: "asc" },
      });
      const texts = answers
        .map((a) => (a.text ?? "").trim())
        .filter((t) => t !== "");

      items.push({
        questionId: q.id,
        type: q.type,
        title: q.title,
        respondentCount,
        texts,
      });
      continue;
    }

    if (q.type === "SCALE") {
      const min = Number((q.config as any)?.min ?? 1);
      const max = Number((q.config as any)?.max ?? 5);

      const answers = await prisma.answer.findMany({
        where: { questionId: q.id, NOT: { scaleValue: null } },
        select: { scaleValue: true },
      });

      const counts: Record<number, number> = {};
      for (let v = min; v <= max; v++) counts[v] = 0;
      for (const a of answers) {
        const v = a.scaleValue as number | null;
        if (typeof v === "number" && v >= min && v <= max) counts[v] += 1;
      }

      items.push({
        questionId: q.id,
        type: q.type,
        title: q.title,
        respondentCount,
        min,
        max,
        buckets: Array.from({ length: max - min + 1 }, (_, i) => {
          const v = min + i;
          return { value: v, count: counts[v] ?? 0 };
        }),
      });
      continue;
    }

    if (q.type === "RATING") {
      const min = 1;
      const max = Number((q.config as any)?.count ?? (q.config as any)?.max ?? 5);

      const answers = await prisma.answer.findMany({
        where: { questionId: q.id, NOT: { ratingValue: null } },
        select: { ratingValue: true },
      });

      const counts: Record<number, number> = {};
      for (let v = min; v <= max; v++) counts[v] = 0;
      for (const a of answers) {
        const v = a.ratingValue as number | null;
        if (typeof v === "number" && v >= min && v <= max) counts[v] += 1;
      }

      items.push({
        questionId: q.id,
        type: q.type,
        title: q.title,
        respondentCount,
        min,
        max,
        buckets: Array.from({ length: max - min + 1 }, (_, i) => {
          const v = min + i;
          return { value: v, count: counts[v] ?? 0 };
        }),
      });
      continue;
    }
  }

  return NextResponse.json(
    { poll: { id: poll.id, title: poll.title }, items },
    { headers: { "Cache-Control": "no-store, must-revalidate" } }
  );
}

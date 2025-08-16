// app/api/polls/[id]/responses/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma"; 

type QuestionType = "RADIO" | "CHECKBOX" | "TEXT" | "SCALE" | "RATING";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> } 
) {
  const { id: pollId } = await params;             

  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
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

  if (!poll) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const uniq = <T, K>(arr: T[], key: (v: T) => K) => {
    const s = new Set<K>();
    for (const v of arr) s.add(key(v));
    return s.size;
  };

  const items: any[] = [];
  for (const q of poll.questions) {
    const answers = await prisma.answer.findMany({
      where: { questionId: q.id },
      select: {
        id: true,
        submissionId: true,
        choiceId: true,
        text: true,
        scaleValue: true,
        ratingValue: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const respondentCount = uniq(answers, (a) => a.submissionId);

    if (q.type === "RADIO") {
      const counts: Record<string, number> = {};
      for (const c of q.choices) counts[c.id] = 0;
      for (const a of answers) {
        if (a.choiceId) counts[a.choiceId] = (counts[a.choiceId] ?? 0) + 1;
      }
      items.push({
        questionId: q.id,
        type: q.type,
        title: q.title,
        respondentCount,
        choices: q.choices.map((c) => ({
          id: c.id,
          label: c.label,
          count: counts[c.id] ?? 0,
        })),
      });
    } else if (q.type === "CHECKBOX") {
      const acs = await prisma.answerChoice.findMany({
        where: { answer: { questionId: q.id } },
        select: { choiceId: true },
      });
      const counts: Record<string, number> = {};
      for (const c of q.choices) counts[c.id] = 0;
      for (const r of acs) counts[r.choiceId] = (counts[r.choiceId] ?? 0) + 1;

      items.push({
        questionId: q.id,
        type: q.type,
        title: q.title,
        respondentCount,
        choices: q.choices.map((c) => ({
          id: c.id,
          label: c.label,
          count: counts[c.id] ?? 0,
          percent: respondentCount ? Math.round((counts[c.id] * 100) / respondentCount) : 0,
        })),
      });
    } else if (q.type === "TEXT") {
      const texts = answers
        .map((a) => a.text)
        .filter((t): t is string => !!t && t.trim() !== "");
      items.push({
        questionId: q.id,
        type: q.type,
        title: q.title,
        respondentCount,
        texts,
      });
    } else if (q.type === "SCALE") {
      const min = Number((q.config as any)?.min ?? 1);
      const max = Number((q.config as any)?.max ?? 5);
      const counts: Record<number, number> = {};
      for (let v = min; v <= max; v++) counts[v] = 0;
      for (const a of answers) {
        const v = a.scaleValue;
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
    } else if (q.type === "RATING") {
      const max = Number((q.config as any)?.count ?? (q.config as any)?.max ?? 5);
      const min = 1;
      const counts: Record<number, number> = {};
      for (let v = min; v <= max; v++) counts[v] = 0;
      for (const a of answers) {
        const v = a.ratingValue;
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
    }
  }

  return NextResponse.json(
    { poll: { id: poll.id, title: poll.title }, items },
    { headers: { "Cache-Control": "no-store, must-revalidate" } }
  );
}

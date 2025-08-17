// app/api/polls/[id]/submissions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import type { QuestionType } from "@prisma/client";
import { randomUUID } from "node:crypto";

export const revalidate = 0;
export const dynamic = "force-dynamic";

type AnyIncoming = {
  questionId: string;
  type: QuestionType;
  choiceId?: string;
  choiceIds?: string[];
  text?: string;
  scaleValue?: number | string;
  ratingValue?: number | string;
  value?: string;
  values?: string[];
  label?: string;
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

function pickIncoming(raw: unknown): AnyIncoming[] | undefined {
  if (Array.isArray(raw)) return raw as AnyIncoming[];
  if (isRecord(raw) && Array.isArray(raw.answers)) return raw.answers as AnyIncoming[];
  if (isRecord(raw) && isRecord(raw.data) && Array.isArray(raw.data.answers)) {
    return raw.data.answers as AnyIncoming[];
  }
  return undefined;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> } // params は Promise
) {
  try {
    const { id: pollId } = await ctx.params;

    // 受け取り（型安全に）
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      raw = undefined;
    }
    const incoming = pickIncoming(raw);
    if (!Array.isArray(incoming)) {
      return NextResponse.json({ error: "answers is required" }, { status: 400 });
    }

    const poll = await prisma.poll.findUnique({
      where: { id: pollId as any },
      select: {
        id: true,
        questions: {
          select: {
            id: true,
            type: true,
            required: true,
            config: true,
            choices: { select: { id: true, label: true }, orderBy: { index: "asc" } },
          },
          orderBy: { index: "asc" },
        },
      },
    });
    if (!poll) return NextResponse.json({ error: "Poll not found" }, { status: 404 });

    const qMap = new Map(poll.questions.map((q) => [q.id, q]));

    const normalized = incoming
      .map((a): AnyIncoming | null => {
        const q = qMap.get(a.questionId);
        if (!q || q.type !== a.type) return null;

        if (q.type === "RADIO") {
          let cid = a.choiceId;
          if (!cid && (a.value || a.label)) {
            const key = String(a.value ?? a.label ?? "").trim();
            const hit = q.choices.find((c) => c.id === key || c.label === key);
            if (hit) cid = hit.id;
          }
          return { ...a, choiceId: cid ?? undefined };
        }

        if (q.type === "CHECKBOX") {
          // id/label いずれでも解決可、重複は除去
          let cids = Array.isArray(a.choiceIds) ? a.choiceIds.slice() : undefined;
          if (!cids && Array.isArray(a.values)) {
            const want = new Set(a.values.map((v) => String(v)));
            cids = q.choices
              .filter((c) => want.has(c.id) || want.has(c.label))
              .map((c) => c.id);
          }
          cids = Array.from(new Set(cids ?? []));
          return { ...a, choiceIds: cids };
        }

        if (q.type === "TEXT") {
          const text = (a.text ?? "").toString().trim();
          return text ? { ...a, text: text.slice(0, 10_000) } : null;
        }

        if (q.type === "SCALE") {
          const min = Number((q.config as any)?.min ?? 1);
          const max = Number((q.config as any)?.max ?? 5);
          const num = Number(a.scaleValue);
          if (Number.isFinite(num) && num >= min && num <= max) {
            return { ...a, scaleValue: num };
          }
          return null;
        }

        // RATING
        const min = 1;
        const max = Number((q.config as any)?.count ?? (q.config as any)?.max ?? 5);
        const num = Number(a.ratingValue);
        if (Number.isFinite(num) && num >= min && num <= max) {
          return { ...a, ratingValue: num };
        }
        return null;
      })
      .filter(Boolean) as AnyIncoming[];

    if (normalized.length === 0) {
      return NextResponse.json({ error: "no valid answers" }, { status: 400 });
    }

    const fingerprint =
      isRecord(raw) && typeof raw.fingerprint === "string" && raw.fingerprint.trim() !== ""
        ? raw.fingerprint
        : randomUUID();

    const created = await prisma.submission.create({
      data: {
        pollId,
        fingerprint,
        answers: {
          create: normalized.map((a) => {
            switch (a.type) {
              case "RADIO":
                return {
                  question: { connect: { id: a.questionId } },
                  choiceId: a.choiceId ?? null,
                };
              case "CHECKBOX":
                return {
                  question: { connect: { id: a.questionId } },
                  choices:
                    (a.choiceIds?.length ?? 0) > 0
                      ? { create: a.choiceIds!.map((cid) => ({ choiceId: cid })) }
                      : undefined,
                };
              case "TEXT":
                return {
                  question: { connect: { id: a.questionId } },
                  text: a.text ?? null,
                };
              case "SCALE":
                return {
                  question: { connect: { id: a.questionId } },
                  scaleValue: a.scaleValue as number,
                };
              case "RATING":
                return {
                  question: { connect: { id: a.questionId } },
                  ratingValue: a.ratingValue as number,
                };
            }
          }),
        },
      },
      select: { id: true },
    });

    return NextResponse.json(
      { ok: true, submissionId: created.id, accepted: normalized.length },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    if (e?.code === "P2002") {
      // 例: (pollId, fingerprint) のユニーク制約違反
      return NextResponse.json({ error: "Duplicate submission" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  return NextResponse.json({ ok: true, id, where: "/api/polls/[id]/submissions" });
}

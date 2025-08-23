import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import type { QuestionType } from "@prisma/client";

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
  if (isRecord(raw) && Array.isArray((raw as any).answers)) return (raw as any).answers as AnyIncoming[];
  if (isRecord(raw) && isRecord((raw as any).data) && Array.isArray((raw as any).data.answers)) {
    return (raw as any).data.answers as AnyIncoming[];
  }
  return undefined;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pollId } = await ctx.params;

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

    // —— ここが重要：クライアントからの nonce を必須にする ——
    const nonce =
      isRecord(raw) && typeof (raw as any).nonce === "string" && (raw as any).nonce.trim() !== ""
        ? (raw as any).nonce.trim()
        : null;

    if (!nonce) {
      return NextResponse.json({ error: "nonce is required" }, { status: 400 });
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
          let cids = Array.isArray(a.choiceIds) ? a.choiceIds.slice() : undefined;
          if (!cids && Array.isArray(a.values)) {
            const want = new Set(a.values.map((v) => String(v)));
            cids = q.choices.filter((c) => want.has(c.id) || want.has(c.label)).map((c) => c.id);
          }
          cids = Array.from(new Set((cids ?? []).filter(Boolean)));
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
          if (Number.isFinite(num) && num >= min && num <= max) return { ...a, scaleValue: num };
          return null;
        }

        // RATING
        const min = 1;
        const max = Number((q.config as any)?.count ?? (q.config as any)?.max ?? 5);
        const num = Number(a.ratingValue);
        if (Number.isFinite(num) && num >= min && num <= max) return { ...a, ratingValue: num };
        return null;
      })
      .filter(Boolean) as AnyIncoming[];

    if (normalized.length === 0) {
      return NextResponse.json({ error: "no valid answers" }, { status: 400 });
    }

    // —— クリティカルセクション：nonce を“消費”してから作成する ——
    const result = await prisma.$transaction(async (tx) => {
      // まだ未使用の nonce を使用済みにする（同時到達でも1件だけ成功）
      const upd = await tx.submissionNonce.updateMany({
        where: { pollId, nonce, usedAt: null },
        data: { usedAt: new Date() },
      });

      if (upd.count === 0) {
        // 既に使われた or 存在しない nonce
        const existing = await tx.submission.findUnique({
          where: { pollId_fingerprint: { pollId, fingerprint: nonce } },
          select: { id: true },
        });
        if (existing) {
          return { existed: true, id: existing.id };
        }
        // nonceがない場合は再送扱い
        throw Object.assign(new Error("Duplicate submission"), { code: "ALREADY_USED" });
      }

      // 正常：nonce を fingerprint として採用（ユニーク併用）
      const created = await tx.submission.create({
        data: {
          pollId,
          fingerprint: nonce,
          answers: {
            create: normalized.map((a) => {
              switch (a.type) {
                case "RADIO":
                  return {
                    question: { connect: { id: a.questionId } },
                    ...(a.choiceId ? { choice: { connect: { id: a.choiceId } } } : {}),
                  };
                case "CHECKBOX":
                  return {
                    question: { connect: { id: a.questionId } },
                    choices:
                      Array.isArray(a.choiceIds) && a.choiceIds.length > 0
                        ? {
                            create: Array.from(new Set(a.choiceIds.filter(Boolean))).map((cid) => ({
                              choice: { connect: { id: cid } },
                            })),
                          }
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
                    scaleValue: Number(a.scaleValue),
                  };
                case "RATING":
                  return {
                    question: { connect: { id: a.questionId } },
                    ratingValue: Number(a.ratingValue),
                  };
              }
            }),
          },
        },
        select: { id: true },
      });

      return { existed: false, id: created.id };
    });

    return NextResponse.json(
      { ok: true, submissionId: result.id },
      { status: result.existed ? 200 : 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    if (e?.code === "ALREADY_USED") {
      return NextResponse.json({ error: "Duplicate submission" }, { status: 409 });
    }
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "Duplicate submission" }, { status: 409 });
    }
    if (e?.code === "P2003" || e?.code === "P2025") {
      const detail =
        process.env.NODE_ENV === "production" ? "Invalid relation reference" : `${e.code}: ${e.message}`;
      return NextResponse.json({ error: detail }, { status: 400 });
    }
    console.error("API /polls/[id]/submissions error:", e);
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Internal Error" : (e?.message || "Internal Error") },
      { status: 500 }
    );
  }
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return NextResponse.json({ ok: true, id, where: "/api/polls/[id]/submissions" });
}

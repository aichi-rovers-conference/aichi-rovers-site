// app/api/polls/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { Prisma, QuestionType } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type IdParams = { id: string };

// 文字列 or 数字ID許容（DBが文字列IDでも動くよう any キャストで吸収）
const asId = (raw: string): string | number => (/^\d+$/.test(raw) ? Number(raw) : raw);

const pickStr = (...vals: unknown[]) => {
  for (const v of vals) {
    if (typeof v === "string") {
      const s = v.trim();
      if (s !== "") return s;
    }
  }
  return undefined;
};

// enum のユニオン型
type QuestionTypeDB = (typeof QuestionType)[keyof typeof QuestionType];

/** フロントの表記ゆれ → DBの QuestionType へ正規化 */
function normalizeQuestionTypeForDB(t: unknown): QuestionTypeDB | undefined {
  if (typeof t !== "string") return undefined;
  const s = t.trim().toLowerCase();

  const values = Object.values(QuestionType) as string[];
  const same = values.find((v) => v.toLowerCase() === s);
  if (same) return same as QuestionTypeDB;

  const map: Record<string, QuestionTypeDB> = {
    radio: QuestionType.RADIO,
    single: QuestionType.RADIO,
    singlechoice: QuestionType.RADIO,
    choice: QuestionType.RADIO,

    checkbox: QuestionType.CHECKBOX,
    checkboxes: QuestionType.CHECKBOX,
    multiple: QuestionType.CHECKBOX,
    multichoice: QuestionType.CHECKBOX,

    text: QuestionType.TEXT,
    shorttext: QuestionType.TEXT,
    textbox: QuestionType.TEXT,
    longtext: QuestionType.TEXT,
    paragraph: QuestionType.TEXT,
    textarea: QuestionType.TEXT,

    scale: QuestionType.SCALE,
    linear: QuestionType.SCALE,
    scalequestion: QuestionType.SCALE,

    rating: QuestionType.RATING,
    ratingquestion: QuestionType.RATING,
    stars: QuestionType.RATING,
  };
  return map[s];
}

type ChoiceInput = { id?: string | number; label: string; index?: number };

function normalizeChoiceInputs(q: any): ChoiceInput[] {
  if (Array.isArray(q?.choices)) {
    return q.choices.map((c: any, i: number) => ({
      id: c?.id,
      label: String(c?.label ?? ""),
      index: typeof c?.index === "number" ? c.index : i,
    }));
  }
  if (Array.isArray(q?.options)) {
    return q.options.map((label: any, i: number) => ({
      label: String(label ?? ""),
      index: i,
    }));
  }
  return [];
}

async function nextQuestionIndex(
  tx: Prisma.TransactionClient,
  pollId: string | number,
  cache: Record<string, number>
): Promise<number> {
  const key = String(pollId);
  if (cache[key] == null) {
    const last = await tx.question.findFirst({
      where: { pollId: pollId as any },
      select: { index: true },
      orderBy: { index: "desc" },
    });
    cache[key] = (last?.index ?? -1) + 1;
  }
  const n = cache[key];
  cache[key] = n + 1;
  return n;
}

async function nextChoiceIndex(
  tx: Prisma.TransactionClient,
  questionId: string | number,
  cache: Record<string, number>
): Promise<number> {
  const key = String(questionId);
  if (cache[key] == null) {
    const last = await tx.choice.findFirst({
      where: { questionId: questionId as any },
      select: { index: true },
      orderBy: { index: "desc" },
    });
    cache[key] = (last?.index ?? -1) + 1;
  }
  const n = cache[key];
  cache[key] = n + 1;
  return n;
}

/* ---------- config 正規化 ---------- */
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
  const multiline = typeof raw?.multiline === "boolean" ? raw.multiline : true;
  const rows = multiline
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

/* ---------- upsert 質問/選択肢 ---------- */
async function updateOrCreateQuestion(
  tx: Prisma.TransactionClient,
  pollId: string | number,
  q: any,
  nextQIndexCache: Record<string, number>
): Promise<string> {
  const dataUpdate: Record<string, any> = {};

  const qTitle = pickStr(q?.title, q?.text, q?.name, q?.label, q?.question, q?.prompt);
  if (qTitle !== undefined) dataUpdate.title = qTitle;

  const qHelp = pickStr(q?.helpText, q?.help, q?.hint, q?.description);
  if (qHelp !== undefined) (dataUpdate as any).helpText = qHelp;

  let dbType: QuestionTypeDB | undefined;
  if (typeof q.type === "string") {
    dbType = normalizeQuestionTypeForDB(q.type);
    if (dbType) dataUpdate.type = dbType;
  }

  if (typeof q.required === "boolean") dataUpdate.required = q.required;
  if (typeof q.index === "number") dataUpdate.index = q.index;

  // タイプに応じて config を正規化
  if (dbType === QuestionType.SCALE) {
    const src = q?.scale ?? q?.config;
    if (src) dataUpdate.config = normalizeScaleConfig(src);
  } else if (dbType === QuestionType.RATING) {
    const src = q?.rating ?? q?.config;
    if (src) dataUpdate.config = normalizeRatingConfig(src);
  } else if (dbType === QuestionType.TEXT) {
    const src = q?.config ?? q?.text;
    if (src) dataUpdate.config = normalizeTextConfig(src);
  }

  // 既存なら update
  if (typeof q?.id === "string" && q.id) {
    try {
      const res = await tx.question.update({
        where: { id: q.id },
        data: dataUpdate as any,
      });
      return res.id;
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025")) {
        throw e;
      }
    }
  }

  // 新規なら create
  const idx =
    typeof q?.index === "number" ? q.index : await nextQuestionIndex(tx, pollId, nextQIndexCache);

  const createType = dbType ?? QuestionType.TEXT;
  let createConfig: any | undefined;
  if (createType === QuestionType.SCALE) {
    createConfig = normalizeScaleConfig(q?.scale ?? q?.config ?? {});
  } else if (createType === QuestionType.RATING) {
    createConfig = normalizeRatingConfig(q?.rating ?? q?.config ?? {});
  } else if (createType === QuestionType.TEXT) {
    createConfig = normalizeTextConfig(q?.config ?? q?.text ?? {});
  }

  const qTitleCreate =
    pickStr(q?.title, q?.text, q?.name, q?.label, q?.question, q?.prompt) ?? "無題の質問";
  const qHelpCreate = pickStr(q?.helpText, q?.help, q?.hint, q?.description);

  const created = await tx.question.create({
    data: {
      pollId: pollId as any,
      title: qTitleCreate,
      type: createType,
      required: !!q?.required,
      index: idx,
      ...(qHelpCreate !== undefined ? { helpText: qHelpCreate } : {}),
      ...(createConfig ? { config: createConfig } : {}),
    } as any,
  });

  return created.id;
}

async function updateOrCreateChoice(
  tx: Prisma.TransactionClient,
  questionId: string | number,
  c: any,
  nextCIndexCache: Record<string, number>
): Promise<void> {
  const dataUpdate: Record<string, any> = {};
  if (typeof c.label === "string") dataUpdate.label = c.label;
  if (typeof c.index === "number") dataUpdate.index = c.index;

  if (typeof c?.id === "string" && c.id) {
    try {
      await tx.choice.update({
        where: { id: c.id },
        data: dataUpdate as any,
      });
      return;
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025")) {
        throw e;
      }
    }
  }

  const idx =
    typeof c?.index === "number" ? c.index : await nextChoiceIndex(tx, questionId, nextCIndexCache);

  await tx.choice.create({
    data: {
      questionId: questionId as any,
      label: typeof c?.label === "string" ? c.label : "",
      index: idx,
    } as any,
  });
}

/* ========== DELETE（params を await） ========== */
export async function DELETE(_req: Request, ctx: { params: Promise<IdParams> }) {
  const { id } = await ctx.params;
  await prisma.poll.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

/* ========== GET（TEXT の config を整形して返す） ========== */

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export async function GET(_req: Request, { params }: { params: Promise<IdParams> }) {
  const { id } = await params;

  const poll = await prisma.poll.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { index: "asc" },
        include: { choices: { orderBy: { index: "asc" } } },
      },
    },
  });
  if (!poll) return NextResponse.json({ error: "not found" }, { status: 404 });

  const questions = poll.questions.map((q) => {
    const t = String(q.type); // "TEXT" | "RADIO" | "CHECKBOX" | "SCALE" | "RATING"
    if (t !== "TEXT") return q;

    // TEXT は config に placeholder/multiline/rows を必ず付けて返す
    const src = (q.config as any) ?? {};
    const multiline = typeof src.multiline === "boolean" ? src.multiline : true;
    const rows = multiline ? clamp(Number.isFinite(+src.rows) ? +src.rows : 4, 1, 50) : undefined;
    const placeholder =
      typeof src.placeholder === "string" ? src.placeholder : multiline ? "長文回答" : "回答を入力";

    return { ...q, config: { ...src, multiline, rows, placeholder } };
  });

  // 正規化した questions を反映させて返す
  return NextResponse.json(
    { ...poll, questions },
    { headers: { "Cache-Control": "no-store, must-revalidate" } }
  );
}

/* ========== PUT/PATCH（params を await 済み） ========== */

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return PATCH(req, ctx);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;
  const id = asId(rawId);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const title = pickStr(body?.title, body?.name);
  const descriptionForDB = pickStr(
    body?.description,
    body?.desc,
    body?.detail,
    body?.details,
    body?.summary,
    body?.note
  );

  try {
    const exists = await prisma.poll.findUnique({ where: { id } as any, select: { id: true } });
    if (!exists) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    const updated = await prisma.$transaction(async (tx) => {
      const pollUpdateData: Record<string, any> = {};
      if (title !== undefined) pollUpdateData.title = title;
      if (descriptionForDB !== undefined) pollUpdateData.desc = descriptionForDB;

      if (Object.keys(pollUpdateData).length) {
        await tx.poll.update({ where: { id } as any, data: pollUpdateData });
      }

      const nextQIndexCache: Record<string, number> = {};
      const nextCIndexCache: Record<string, number> = {};

      const questionsInputRaw =
        body?.questions ?? body?.items ?? body?.questionList ?? body?.qs ?? null;
      const questionsInput: any[] = Array.isArray(questionsInputRaw) ? questionsInputRaw : [];

      for (const q of questionsInput) {
        const questionId = await updateOrCreateQuestion(tx, id, q, nextQIndexCache);

        // choices 同期
        const existing = await tx.choice.findMany({
          where: { questionId: questionId as any },
          select: { id: true, index: true },
          orderBy: { index: "asc" },
        });

        const inputs = normalizeChoiceInputs(q);
        for (const entry of inputs) {
          const label = entry.label;
          const idxFromInput = typeof entry.index === "number" ? entry.index : undefined;

          if (entry.id) {
            await tx.choice.update({
              where: { id: entry.id as any },
              data: { label, ...(idxFromInput != null ? { index: idxFromInput } : {}) } as any,
            });
            continue;
          }

          if (idxFromInput != null && existing[idxFromInput]) {
            await tx.choice.update({
              where: { id: existing[idxFromInput].id },
              data: { label, ...(idxFromInput != null ? { index: idxFromInput } : {}) } as any,
            });
            continue;
          }

          const newIndex =
            idxFromInput != null ? idxFromInput : await nextChoiceIndex(tx, questionId, nextCIndexCache);

          await tx.choice.create({
            data: { questionId: questionId as any, label, index: newIndex } as any,
          });
        }
      }

      const after = await tx.poll.findUnique({
        where: { id } as any,
        include: {
          questions: {
            orderBy: { index: "asc" },
            include: {
              choices: {
                select: { id: true, label: true, index: true },
                orderBy: { index: "asc" },
              },
            },
          },
        },
      });
      if (!after) return null;

      const grouped = await tx.answerChoice.groupBy({
        by: ["choiceId"],
        where: { answer: { question: { pollId: after.id as any } } },
        _count: { choiceId: true },
      });
      const countMap = new Map(grouped.map((g) => [g.choiceId, g._count.choiceId]));

      const questions = after.questions.map((q) => {
        const cfg = (q as any).config ?? null;
        const type = (q as any).type as QuestionTypeDB;
        const rating = type === QuestionType.RATING ? normalizeRatingConfig(cfg ?? {}) : undefined;

        return {
          id: q.id,
          title: q.title,
          type: type,
          required: (q as any).required ?? false,
          helpText: (q as any).helpText ?? undefined,
          index: (q as any).index,
          config: cfg,
          ...(rating ? { rating } : {}),
          choices: q.choices.map((c) => ({
            id: c.id,
            label: c.label,
            index: c.index,
            votes: Array.from({ length: countMap.get(c.id) ?? 0 }),
          })),
        };
      });

      return {
        id: after.id,
        title: (after as any).title ?? "無題のフォーム",
        description: (after as any).desc ?? (after as any).description ?? undefined,
        questions,
      };
    });

    if (!updated) return NextResponse.json({ ok: false, error: "not_found_after" }, { status: 404 });
    return NextResponse.json(
      { ok: true, poll: updated },
      { headers: { "Cache-Control": "no-store, must-revalidate" } }
    );
  } catch (e: any) {
    const isKnown = e instanceof Prisma.PrismaClientKnownRequestError;
    const payload: any = { ok: false, error: "update_failed", detail: String(e?.message ?? e) };
    if (isKnown) payload.prisma = { code: e.code, meta: e.meta };
    console.error("PATCH /api/polls/[id] failed:", e);
    return NextResponse.json(payload, { status: 500 });
  }
}

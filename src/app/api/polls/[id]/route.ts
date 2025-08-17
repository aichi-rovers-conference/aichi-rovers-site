// app/api/polls/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { Prisma, QuestionType as QuestionTypeEnum } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const asJson = (v: unknown): Prisma.InputJsonValue => v as Prisma.InputJsonValue;

/* ========= utils ========= */
type IdParams = { id: string };

const asId = (raw: string): string | number => (/^\d+$/.test(raw) ? Number(raw) : raw);

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const pickStr = (...vals: unknown[]) => {
  for (const v of vals) {
    if (typeof v === "string") {
      const s = v.trim();
      if (s !== "") return s;
    }
  }
  return undefined;
};

const toInt = (v: unknown): number | undefined => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return undefined;
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/* ========= types ========= */
type QuestionTypeDB = (typeof QuestionTypeEnum)[keyof typeof QuestionTypeEnum];

type ChoiceInput = { id?: string | number; label: string; index?: number };

type ScaleConfig = {
  min: 0 | 1;
  max: number;
  minLabel: string;
  maxLabel: string;
};

type TextConfig = {
  placeholder: string;
  multiline: boolean;
  rows?: number;
};

type RatingConfig = {
  count: number;
  shape: "star" | "heart" | "thumb";
};

/* ========= normalize ========= */
function normalizeQuestionTypeForDB(t: unknown): QuestionTypeDB | undefined {
  if (typeof t !== "string") return undefined;
  const s = t.trim().toLowerCase();

  const values = Object.values(QuestionTypeEnum) as string[];
  const same = values.find((v) => v.toLowerCase() === s);
  if (same) return same as QuestionTypeDB;

  const map: Record<string, QuestionTypeDB> = {
    radio: QuestionTypeEnum.RADIO,
    single: QuestionTypeEnum.RADIO,
    singlechoice: QuestionTypeEnum.RADIO,
    choice: QuestionTypeEnum.RADIO,

    checkbox: QuestionTypeEnum.CHECKBOX,
    checkboxes: QuestionTypeEnum.CHECKBOX,
    multiple: QuestionTypeEnum.CHECKBOX,
    multichoice: QuestionTypeEnum.CHECKBOX,

    text: QuestionTypeEnum.TEXT,
    shorttext: QuestionTypeEnum.TEXT,
    textbox: QuestionTypeEnum.TEXT,
    longtext: QuestionTypeEnum.TEXT,
    paragraph: QuestionTypeEnum.TEXT,
    textarea: QuestionTypeEnum.TEXT,

    scale: QuestionTypeEnum.SCALE,
    linear: QuestionTypeEnum.SCALE,
    scalequestion: QuestionTypeEnum.SCALE,

    rating: QuestionTypeEnum.RATING,
    ratingquestion: QuestionTypeEnum.RATING,
    stars: QuestionTypeEnum.RATING,
  };
  return map[s];
}

function normalizeChoiceInputs(q: unknown): ChoiceInput[] {
  if (!isRecord(q)) return [];
  const out: ChoiceInput[] = [];

  const choices = q.choices;
  if (Array.isArray(choices)) {
    choices.forEach((c, i) => {
      const label = (isRecord(c) && typeof c.label === "string" ? c.label : "") || "";
      const index = isRecord(c) && typeof c.index === "number" ? c.index : i;
      const id =
        isRecord(c) && (typeof c.id === "string" || typeof c.id === "number") ? c.id : undefined;
      out.push({ id, label, index });
    });
    return out;
  }

  const options = q.options;
  if (Array.isArray(options)) {
    options.forEach((label, i) => {
      out.push({ label: String(label ?? ""), index: i });
    });
  }
  return out;
}

function normalizeScaleConfig(raw: unknown): ScaleConfig {
  const r = isRecord(raw) ? raw : {};
  const minRaw = toInt(r.min);
  const maxRaw = toInt(r.max);

  const min: 0 | 1 = minRaw === 0 ? 0 : 1;
  let max = Math.min(10, Math.max(2, Number.isFinite(maxRaw ?? NaN) ? (maxRaw as number) : 5));
  if (max <= min) max = Math.min(10, Math.max(2, min + 1));

  return {
    min,
    max,
    minLabel: typeof r.minLabel === "string" ? r.minLabel : "",
    maxLabel: typeof r.maxLabel === "string" ? r.maxLabel : "",
  };
}

function normalizeTextConfig(raw: unknown): TextConfig {
  const r = isRecord(raw) ? raw : {};
  const multiline = typeof r.multiline === "boolean" ? r.multiline : true;
  const rows = multiline ? clamp(toInt(r.rows) ?? 4, 1, 50) : undefined;
  const placeholder =
    typeof r.placeholder === "string" ? r.placeholder : multiline ? "長文回答" : "回答を入力";
  return { multiline, rows, placeholder };
}

function normalizeRatingConfig(raw: unknown): RatingConfig {
  const r = isRecord(raw) ? raw : {};
  const n = toInt(r.count) ?? toInt(r.max) ?? toInt((r as Record<string, unknown>).ratingCount);
  let count = Number.isFinite(n ?? NaN) ? Math.floor(n as number) : 5;
  count = clamp(count, 3, 9);

  const shapeRaw = typeof r.shape === "string" ? r.shape.toLowerCase() : "";
  const shape: RatingConfig["shape"] =
    shapeRaw === "heart" ? "heart" : shapeRaw === "thumb" ? "thumb" : "star";

  return { count, shape };
}

/* ========= index helpers ========= */
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

/* ========= upsert question / choice ========= */
async function updateOrCreateQuestion(
  tx: Prisma.TransactionClient,
  pollId: string | number,
  qRaw: unknown,
  nextQIndexCache: Record<string, number>
): Promise<string> {
  const q = isRecord(qRaw) ? qRaw : {};

  // Prisma の型に引っかからないよう Record で組み立て→渡すときにキャスト
  const dataUpdate: Record<string, unknown> = {};

  const qTitle = pickStr(q.title, q.text, q.name, q.label, q.question, q.prompt);
  if (qTitle !== undefined) dataUpdate.title = qTitle;

  // ← ここは DB に helpText フィールドが無い前提。保存したいなら config に混ぜる
  const qHelp = pickStr(q.helpText, q.help, q.hint, q.description);

  let dbType: QuestionTypeDB | undefined;
  if (typeof q.type === "string") {
    dbType = normalizeQuestionTypeForDB(q.type);
    if (dbType) dataUpdate.type = dbType;
  }

  if (typeof q.required === "boolean") dataUpdate.required = q.required;
  if (typeof q.index === "number") dataUpdate.index = q.index;

  // ---- config を正規化。qHelp があれば config に同梱 ----
  const mergeHelp = (cfg: Record<string, unknown> | undefined) =>
    qHelp !== undefined ? { ...(cfg ?? {}), helpText: qHelp } : cfg;

  if (dbType === QuestionTypeEnum.SCALE) {
    const src = (q.scale ?? q.config) as unknown;
    if (src) dataUpdate.config = asJson(mergeHelp(normalizeScaleConfig(src)));
  } else if (dbType === QuestionTypeEnum.RATING) {
    const src = (q.rating ?? q.config) as unknown;
    if (src) dataUpdate.config = asJson(mergeHelp(normalizeRatingConfig(src)));
  } else if (dbType === QuestionTypeEnum.TEXT) {
    const src = (q.config ?? q.text) as unknown;
    if (src) dataUpdate.config = asJson(mergeHelp(normalizeTextConfig(src)));
  } else if (qHelp !== undefined) {
    // タイプ不明でも help だけは config に保存しておく
    dataUpdate.config = asJson({ helpText: qHelp });
  }

  // ---- 既存なら update ----
  if (typeof q.id === "string" && q.id) {
    try {
      const res = await tx.question.update({
        where: { id: q.id },
        data: dataUpdate as Prisma.QuestionUpdateInput,
      });
      return res.id;
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025")) {
        throw e;
      }
      // not found → create にフォールバック
    }
  }

  // ---- 新規なら create ----
  const idx =
    typeof q.index === "number" ? q.index : await nextQuestionIndex(tx, pollId, nextQIndexCache);

  const createType: QuestionTypeEnum = dbType ?? QuestionTypeEnum.TEXT;

  let createConfig: Record<string, unknown> | undefined;
  if (createType === QuestionTypeEnum.SCALE) {
    createConfig = normalizeScaleConfig(q.scale ?? q.config ?? {});
  } else if (createType === QuestionTypeEnum.RATING) {
    createConfig = normalizeRatingConfig(q.rating ?? q.config ?? {});
  } else if (createType === QuestionTypeEnum.TEXT) {
    createConfig = normalizeTextConfig(q.config ?? q.text ?? {});
  }
  // help を同梱
  createConfig = qHelp !== undefined ? { ...(createConfig ?? {}), helpText: qHelp } : createConfig;

  const qTitleCreate = qTitle ?? "無題の質問";

  const created = await tx.question.create({
    data: {
      // Unchecked を避けるため relation で接続
      poll: { connect: { id: pollId as any } },
      title: qTitleCreate,
      type: createType,
      required: !!q.required,
      index: idx,
      ...(createConfig ? { config: asJson(createConfig) } : {}),
    } as Prisma.QuestionCreateInput,
  });

  return created.id;
}


async function updateOrCreateChoice(
  tx: Prisma.TransactionClient,
  questionId: string | number,
  cRaw: unknown,
  nextCIndexCache: Record<string, number>
): Promise<void> {
  const c = isRecord(cRaw) ? cRaw : {};
  const dataUpdate: Prisma.ChoiceUpdateInput = {};

  if (typeof c.label === "string") dataUpdate.label = c.label;
  if (typeof c.index === "number") dataUpdate.index = c.index;

  const hasId = typeof c.id === "string" || typeof c.id === "number";

  if (hasId) {
    try {
      await tx.choice.update({
        where: { id: c.id as any },
        data: dataUpdate,
      });
      return;
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025")) {
        throw e;
      }
      // not found → create にフォールバック
    }
  }

  const idx =
    typeof c.index === "number" ? c.index : await nextChoiceIndex(tx, questionId, nextCIndexCache);

  const choiceCreateData: Prisma.ChoiceCreateInput = {
    question: { connect: { id: questionId as any } },
    label: typeof c.label === "string" ? c.label : "",
    index: idx,
  };
  await tx.choice.create({ data: choiceCreateData });
}

/* ========= DELETE ========= */
export async function DELETE(_req: Request, ctx: { params: Promise<IdParams> }) {
  const { id } = await ctx.params;
  await prisma.poll.delete({ where: { id } as any });
  return NextResponse.json({ ok: true });
}

/* ========= GET ========= */
export async function GET(_req: Request, { params }: { params: Promise<IdParams> }) {
  const { id } = await params;

  const poll = await prisma.poll.findUnique({
    where: { id } as any,
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
    const src = (q as unknown as { config?: unknown }).config ?? {};
    const cfg = normalizeTextConfig(src);
    return { ...q, config: cfg };
  });

  return NextResponse.json(
    { ...poll, questions },
    { headers: { "Cache-Control": "no-store, must-revalidate" } }
  );
}

/* ========= PUT / PATCH ========= */
export async function PUT(req: Request, ctx: { params: Promise<IdParams> }) {
  return PATCH(req, ctx);
}

export async function PATCH(req: Request, ctx: { params: Promise<IdParams> }) {
  const { id: rawId } = await ctx.params;
  const id = asId(rawId);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const b = isRecord(body) ? body : {};

  const title = pickStr(b.title, b.name);
  const descriptionForDB = pickStr(
    b.description,
    b.desc,
    b.detail,
    b.details,
    b.summary,
    b.note
  );

  try {
    const exists = await prisma.poll.findUnique({ where: { id } as any, select: { id: true } });
    if (!exists) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    const updated = await prisma.$transaction(async (tx) => {
      const pollUpdateData: Prisma.PollUpdateInput = {};
      if (title !== undefined) pollUpdateData.title = title;
      if (descriptionForDB !== undefined) pollUpdateData.desc = descriptionForDB;

      if (Object.keys(pollUpdateData).length) {
        await tx.poll.update({ where: { id } as any, data: pollUpdateData });
      }

      const nextQIndexCache: Record<string, number> = {};
      const nextCIndexCache: Record<string, number> = {};

      const questionsInputRaw = b.questions ?? b.items ?? b.questionList ?? b.qs ?? null;
      const questionsInput: unknown[] = Array.isArray(questionsInputRaw) ? questionsInputRaw : [];

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
              data: { label, ...(idxFromInput != null ? { index: idxFromInput } : {}) },
            });
            continue;
          }

          if (idxFromInput != null && existing[idxFromInput]) {
            await tx.choice.update({
              where: { id: existing[idxFromInput].id },
              data: { label, ...(idxFromInput != null ? { index: idxFromInput } : {}) },
            });
            continue;
          }

          const newIndex =
            idxFromInput != null ? idxFromInput : await nextChoiceIndex(tx, questionId, nextCIndexCache);

          await tx.choice.create({
            data: { question: { connect: { id: questionId as any } }, label, index: newIndex },
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
        const cfg = (q as unknown as { config?: unknown }).config ?? null;
        const type = q.type as QuestionTypeDB;
        const rating = type === QuestionTypeEnum.RATING ? normalizeRatingConfig(cfg ?? {}) : undefined;

        return {
          id: q.id,
          title: q.title,
          type,
          required: (q as unknown as { required?: boolean }).required ?? false,
          helpText: (q as unknown as { helpText?: string }).helpText ?? undefined,
          index: q.index,
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
        title: (after as unknown as { title?: string }).title ?? "無題のフォーム",
        description:
          (after as unknown as { desc?: string; description?: string }).desc ??
          (after as unknown as { desc?: string; description?: string }).description ??
          undefined,
        questions,
      };
    });

    if (!updated) return NextResponse.json({ ok: false, error: "not_found_after" }, { status: 404 });
    return NextResponse.json(
      { ok: true, poll: updated },
      { headers: { "Cache-Control": "no-store, must-revalidate" } }
    );
  } catch (e) {
    const err = e as unknown as { message?: string } & Partial<Prisma.PrismaClientKnownRequestError>;
    const payload: Record<string, unknown> = {
      ok: false,
      error: "update_failed",
      detail: String(err?.message ?? e),
    };
    if ((e as any)?.code) payload.prisma = { code: (e as any).code, meta: (e as any).meta };
    console.error("PATCH /api/polls/[id] failed:", e);
    return NextResponse.json(payload, { status: 500 });
  }
}

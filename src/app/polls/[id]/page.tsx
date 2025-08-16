// app/polls/[id]/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";

import ScaleQuestion from "@/components/polls/ScaleQuestion";
import CheckboxQuestion from "@/components/polls/CheckboxQuestion";
import RadioQuestion from "@/components/polls/RadioQuestion";
import TextQuestion from "@/components/polls/TextQuestion";
import RatingQuestion from "@/components/polls/RatingQuestion";

/* ===================== 型 ===================== */

// UI側の質問タイプ（小文字）
export type QuestionType = "text" | "single" | "multiple" | "linear" | "rating";

export type Question = {
  id: string;
  title: string;
  helpText?: string;
  type: QuestionType | string; // 外部API互換で string も受ける
  required?: boolean;

  // 選択肢（radio/checkbox 用）
  options?: string[];
  choices?: { id: string; label: string }[];

  // 既存互換（scale が top-level にあるケース）
  min?: number | string;
  max?: number | string;
  minLabel?: string;
  maxLabel?: string;

  // API がここに入れて返す場合（scale/text 両方）
  config?: {
    // scale 用
    min?: number | string;
    max?: number | string;
    minLabel?: string;
    maxLabel?: string;
    // text 用
    placeholder?: string;
    multiline?: boolean;
    rows?: number | string;
  };

  // editor 互換（scale）
  scale?: {
    min: 0 | 1 | string;
    max: number | string;
    minLabel?: string;
    maxLabel?: string;
  };

  // 互換（text）
  text?: {
    placeholder?: string;
    multiline?: boolean;
    rows?: number | string;
  };
};

export type Poll = {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
};

/* ===================== ユーティリティ ===================== */

const cls = (...xs: Array<string | false | undefined | null>) => xs.filter(Boolean).join(" ");

const toNum = (x: unknown, fallback: number) => {
  const n = typeof x === "number" ? x : typeof x === "string" ? Number(x) : NaN;
  return Number.isFinite(n) ? n : fallback;
};

type ScaleShape = { min: 0 | 1; max: number; minLabel: string; maxLabel: string };

// 質問から scale を正規化（top-level / scale / config のどれでもOK・文字列にも対応）
function normalizeScaleFromQuestion(q: Question): ScaleShape {
  const src =
    (q as any).scale ??
    (q as any).config ?? {
      min: (q as any).min,
      max: (q as any).max,
      minLabel: (q as any).minLabel,
      maxLabel: (q as any).maxLabel,
    };

  const rawMin = (src as any)?.min;
  const min = rawMin === 0 || rawMin === "0" ? 0 : (1 as 0 | 1);

  let max = toNum((src as any)?.max, 5);
  // 2〜10にクランプし、min + 1 以上
  max = Math.min(10, Math.max(2, Math.max(min + 1, max)));

  return {
    min,
    max,
    minLabel: (src as any)?.minLabel ?? "",
    maxLabel: (src as any)?.maxLabel ?? "",
  };
}

// テキスト設定を正規化（config / text / デフォルト）
function normalizeTextConfig(q: Question) {
  const src =
    (q as any).config?.text ??
    (q as any).text ??
    (q as any).config ?? {
      placeholder: (q as any).placeholder,
      multiline: (q as any).multiline,
      rows: (q as any).rows,
    };

  const multiline =
    typeof src.multiline === "boolean"
      ? src.multiline
      : typeof (q as any).multiline === "boolean"
      ? (q as any).multiline
      : true;

  const _toNum = (x: unknown, fb: number) => {
    const n = typeof x === "number" ? x : typeof x === "string" ? Number(x) : NaN;
    return Number.isFinite(n) ? n : fb;
  };
  const rowsRaw = src.rows ?? (q as any).rows;
  const rows = multiline ? Math.max(1, Math.min(50, _toNum(rowsRaw, 4))) : undefined;

  const ph = src.placeholder ?? (q as any).placeholder;
  const placeholder = typeof ph === "string" ? ph : multiline ? "長文回答" : "回答を入力";

  return { multiline, rows, placeholder };
}

function getOptions(q: Question): string[] {
  const optAny = (q as any).options;
  if (Array.isArray(optAny) && optAny.length > 0) {
    const first = optAny[0];
    if (typeof first === "string") return optAny as string[];
    return (optAny as Array<any>).map((o) => (typeof o === "string" ? o : o?.label ?? ""));
  }
  const cs: Array<any> | undefined = (q as any).choices;
  if (Array.isArray(cs) && cs.length > 0) {
    return cs.map((c) => c?.label ?? "");
  }
  return [];
}

function getChoiceIdMap(q: Question): Record<string, string> | null {
  const cs = (q as any).choices as Array<{ id: string; label: string }> | undefined;
  if (Array.isArray(cs) && cs.length > 0) {
    const map: Record<string, string> = {};
    for (const c of cs) map[c.label] = c.id;
    return map;
  }
  return null;
}

// 外部APIの type を UI の小文字タイプに寄せる
function normalizeType(t: string | undefined): QuestionType {
  const s = (t ?? "").toLowerCase();
  if (["shorttext", "longtext", "paragraph", "textarea", "text", "textbox"].includes(s)) return "text";
  if (["single", "radio", "singlechoice", "choice"].includes(s)) return "single";
  if (["multiple", "checkbox", "multichoice", "checkboxes"].includes(s)) return "multiple";
  if (["linear", "scale", "scalequestion"].includes(s)) return "linear";
  if (["rating", "ratingquestion", "stars"].includes(s)) return "rating";
  // 未知は text にフォールバック
  return "text";
}

/* ===================== バリデーション ===================== */

function validateRequired(q: Question, value: unknown): string | null {
  if (!q.required) return null;
  const type = normalizeType(String(q.type));
  switch (type) {
    case "text":
    case "single":
      if (!value || (typeof value === "string" && value.trim() === "")) return "この質問は必須です";
      return null;
    case "multiple":
      if (!Array.isArray(value) || (value as unknown[]).length === 0) return "この質問は必須です";
      return null;
    case "linear":
    case "rating":
      if (value === null || value === undefined || value === "") return "この質問は必須です";
      return null;
    default:
      return null;
  }
}

/* ===================== API 送信用シリアライズ ===================== */
/** サーバーAPIの期待する配列形に変換（type は大文字に寄せる） */
function serializeAnswersForApi(poll: Poll, raw: Record<string, unknown>) {
  type Out =
    | { questionId: string; type: "RADIO"; choiceId?: string; value?: string }
    | { questionId: string; type: "CHECKBOX"; choiceIds: string[]; values?: string[] }
    | { questionId: string; type: "TEXT"; text: string }
    | { questionId: string; type: "SCALE"; scaleValue?: number }
    | { questionId: string; type: "RATING"; ratingValue?: number };

  const out: Out[] = [];
  for (const q of poll.questions) {
    const t = normalizeType(String(q.type));
    const v = raw[q.id];

    if (t === "single") {
      // ラベルを選ばせている前提 → id に解決（idが無い場合は value に退避）
      const label = v == null ? "" : String(v);
      const map = getChoiceIdMap(q);
      if (map) {
        out.push({ questionId: q.id, type: "RADIO", choiceId: map[label] ?? undefined, value: label });
      } else {
        out.push({ questionId: q.id, type: "RADIO", value: label });
      }
      continue;
    }

    if (t === "multiple") {
      const labels = Array.isArray(v) ? (v as string[]) : [];
      const map = getChoiceIdMap(q);
      if (map) {
        const ids = labels.map((l) => map[l]).filter(Boolean);
        out.push({ questionId: q.id, type: "CHECKBOX", choiceIds: ids, values: labels });
      } else {
        out.push({ questionId: q.id, type: "CHECKBOX", choiceIds: [], values: labels });
      }
      continue;
    }

    if (t === "text") {
      out.push({ questionId: q.id, type: "TEXT", text: String(v ?? "") });
      continue;
    }

    if (t === "linear") {
      const num = Number(v);
      out.push({ questionId: q.id, type: "SCALE", scaleValue: Number.isFinite(num) ? num : undefined });
      continue;
    }

    if (t === "rating") {
      const num = Number(v);
      out.push({ questionId: q.id, type: "RATING", ratingValue: Number.isFinite(num) ? num : undefined });
      continue;
    }
  }
  return out;
}

/* ===================== 質問カード ===================== */

function QuestionCard(props: {
  q: Question;
  value: unknown;
  onChange: (val: unknown) => void;
  error?: string | null;
}) {
  const { q, value, onChange, error } = props;
  const type = normalizeType(String(q.type));

  return (
    <div className={cls("relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm", error && "border-red-300")}>
      {/* 左アクセントバー */}
      <div className="absolute left-0 top-0 h-full w-1.5 rounded-l-xl bg-purple-600" />

      <div className="mb-3">
        <div className="flex items-start gap-2">
          <h3 className="text-base sm:text-lg font-semibold text-slate-800">
            {q.title}
            {q.required && <span className="ml-1.5 align-middle text-red-500">*</span>}
          </h3>
        </div>
        {q.helpText && <p className="mt-1 text-sm text-slate-500">{q.helpText}</p>}
      </div>

      {/* 入力UI */}
      {type === "text" && (() => {
        const t = normalizeTextConfig(q);
        return (
          <TextQuestion
            mode="answer"
            name={q.id}
            multiline={t.multiline}
            rows={t.rows}
            placeholder={t.placeholder}
            value={String(value ?? "")}
            onValueChange={(v) => onChange(v)}
          />
        );
      })()}

      {type === "single" && (
        <RadioQuestion
          mode="answer"
          name={q.id}
          options={getOptions(q)}
          value={String(value ?? "")}
          onValueChange={(v) => onChange(v)} // v はラベル文字列
        />
      )}

      {type === "multiple" && (
        <CheckboxQuestion
          mode="answer"
          options={getOptions(q)}
          name={q.id}
          value={Array.isArray(value) ? (value as string[]) : []}
          onValueChange={((upd) => {
            const current = Array.isArray(value) ? (value as string[]) : [];
            const next = typeof upd === "function" ? (upd as (prev: string[]) => string[])(current) : upd;
            onChange(next);
          }) as React.Dispatch<React.SetStateAction<string[]>>}
          classNameItem="inline-flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-slate-50"
          classNameInput="h-4 w-4 accent-purple-600"
          classNameLabel="text-slate-800"
        />
      )}

      {type === "linear" && (() => {
        const s = normalizeScaleFromQuestion(q);
        const qForScale = { ...(q as any), scale: s } as any;
        return (
          <ScaleQuestion
            mode="answer"
            q={qForScale}
            name={q.id}
            value={Number(value ?? s.min)}
            onValueChange={(v) => onChange(v)}
          />
        );
      })()}

      {type === "rating" && (
        <RatingQuestion
          mode="answer"
          q={q as any}
          name={q.id}
          value={Number(value ?? 1)}
          onValueChange={(v) => onChange(v)}
        />
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}

/* ===================== 本体 ===================== */

export default function PollAnswerPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const pollId = params?.id as string;

  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [answers, setAnswers] = useState<Record<string, any>>({});

  const progress = useMemo(() => {
    if (!poll) return 0;
    const req = poll.questions.filter((q) => q.required);
    if (req.length === 0) return 100;
    const filled = req.filter((q) => !validateRequired(q, answers[q.id])).length;
    return Math.round((filled / req.length) * 100);
  }, [poll, answers]);

  useEffect(() => {
    let alive = true;
    async function run() {
      try {
        setLoading(true);
        const res = await fetch(`/api/polls/${pollId}`, { cache: "no-store" });
        if (!res.ok) throw new Error("failed to load");
        const data: Poll = await res.json();
        if (!alive) return;
        setPoll(data);

        // 初期値
        const init: Record<string, unknown> = {};
        for (const q of data.questions) {
          const type = normalizeType(String(q.type));
          if (type === "multiple") init[q.id] = [] as string[];
          else if (type === "linear") init[q.id] = normalizeScaleFromQuestion(q).min;
          else if (type === "rating") init[q.id] = 1;
          else init[q.id] = ""; // text / single
        }
        setAnswers(init);
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    }
    if (pollId) run();
    return () => {
      alive = false;
    };
  }, [pollId]);

  useEffect(() => {
    if (!poll) return;
    const snapshot = poll.questions.map((q) => ({
      id: q.id,
      type: String(q.type),
      RESOLVED: normalizeTextConfig(q),
      RAW: {
        top_level: {
          placeholder: (q as any).placeholder,
          multiline: (q as any).multiline,
          rows: (q as any).rows,
        },
        config: (q as any).config,
        text: (q as any).text,
      },
    }));
    console.log("TEXT-CONFIG RESOLVED\n" + JSON.stringify(snapshot, null, 2));
  }, [poll]);

  const update = (qid: string, val: unknown) => {
    setAnswers((prev) => ({ ...prev, [qid]: val }));
    setErrors((prev) => ({ ...prev, [qid]: null }));
  };

  // ====== 送信 ======
  const onSubmit = async () => {
    if (!poll) return;

    // 必須チェック
    const e: Record<string, string | null> = {};
    for (const q of poll.questions) {
      const err = validateRequired(q, answers[q.id]);
      if (err) e[q.id] = err;
    }
    setErrors(e);
    if (Object.values(e).some(Boolean)) {
      const first = poll.questions.find((q) => e[q.id]);
      if (first) {
        document.getElementById(`q-${first.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    try {
      // API 期待形（配列）に変換
      const answersArray = serializeAnswersForApi(poll, answers);
      const body = { answers: answersArray };

      console.log("SUBMIT body (answers[]):", body);

      const endpoint = `/api/polls/${encodeURIComponent(poll.id)}/submissions`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const text = await res.text().catch(() => "");
      if (!res.ok) {
        if (res.status === 409) throw new Error("同じ端末からは既に回答済みの可能性があります。");
        throw new Error(text || `failed to submit (HTTP ${res.status})`);
      }

      alert("送信が完了しました。ご回答ありがとうございます！");
      router.push(`/polls/${poll.id}/thanks`);
      // router.push(`/polls/${poll.id}/thanks`);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "送信に失敗しました。時間をおいて再度お試しください。");
    }
  };

  /* ===================== レンダリング ===================== */

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="h-44 w-full bg-gradient-to-r from-purple-600 to-indigo-600" />
        <div className="-mt-16 px-4 pb-24">
          <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white shadow-md">
            <div className="p-6">
              <div className="mb-2 h-7 w-3/5 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
            </div>
            <div className="h-px w-full bg-slate-100" />
            <div className="space-y-5 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!poll) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="h-44 w-full bg-gradient-to-r from-purple-600 to-indigo-600" />
        <div className="-mt-16 px-4 pb-24">
          <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-md">
            フォームが見つかりませんでした。
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* ヘッダーバー（Googleフォーム風） */}
      <div className="h-44 w-full bg-gradient-to-r from-purple-600 to-indigo-600" />

      {/* メインカード */}
      <div className="-mt-16 px-4 pb-24">
        <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white shadow-md">
          {/* タイトル & 進捗 */}
          <header className="flex items-start gap-3 p-6">
            <div className="mt-1 h-6 w-1.5 rounded bg-purple-600" />
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-slate-800">{poll.title || "無題のフォーム"}</h1>
              {poll.description && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{poll.description}</p>}
            </div>
          </header>

          <div className="px-6 pb-2">
            <div className="h-1.5 w-full rounded-full bg-slate-200">
              <div className="h-1.5 rounded-full bg-purple-600 transition-[width] duration-300" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-1 text-right text-xs text-slate-500">回答率 {progress}%</div>
          </div>

          <div className="h-px w-full bg-slate-100" />

          {/* 質問エリア */}
          <section className="space-y-6 p-6">
            {poll.questions.map((q) => (
              <div id={`q-${q.id}`} key={q.id}>
                <QuestionCard q={q} value={answers[q.id]} onChange={(v) => {
                  setAnswers((prev) => ({ ...prev, [q.id]: v }));
                  setErrors((prev) => ({ ...prev, [q.id]: null }));
                }} error={errors[q.id]} />
              </div>
            ))}
          </section>

          {/* フッター */}
          <div className="flex items-center justify-between px-6 pb-6">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              戻る
            </button>
            <button
              type="button"
              onClick={onSubmit}
              className="rounded-full bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-purple-700"
            >
              送信
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

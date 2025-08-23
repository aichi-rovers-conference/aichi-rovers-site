// app/polls/[id]/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";

import ScaleQuestion from "@/src/components/polls/ScaleQuestion";
import CheckboxQuestion from "@/src/components/polls/CheckboxQuestion";
import RadioQuestion from "@/src/components/polls/RadioQuestion";
import TextQuestion from "@/src/components/polls/TextQuestion";
import RatingQuestion from "@/src/components/polls/RatingQuestion";

/* ===================== 型 ===================== */

export type QuestionType = "text" | "single" | "multiple" | "linear" | "rating";

export type Question = {
  id: string;
  title: string;
  helpText?: string;
  type: QuestionType | string;
  required?: boolean;
  options?: string[];
  choices?: { id: string; label: string }[];
  min?: number | string;
  max?: number | string;
  minLabel?: string;
  maxLabel?: string;
  config?: {
    min?: number | string;
    max?: number | string;
    minLabel?: string;
    maxLabel?: string;
    placeholder?: string;
    multiline?: boolean;
    rows?: number | string;
  };
  scale?: { min: 0 | 1 | string; max: number | string; minLabel?: string; maxLabel?: string };
  text?: { placeholder?: string; multiline?: boolean; rows?: number | string };
};

export type Poll = {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
};

/* ===================== ユーティリティ ===================== */

const cls = (...xs: Array<string | false | undefined | null>) => xs.filter(Boolean).join(" ");
const toNum = (x: unknown, fb: number) => (Number.isFinite(Number(x)) ? Number(x) : fb);
type ScaleShape = { min: 0 | 1; max: number; minLabel: string; maxLabel: string };

function normalizeScaleFromQuestion(q: Question): ScaleShape {
  const src =
    (q as any).scale ??
    (q as any).config ?? { min: (q as any).min, max: (q as any).max, minLabel: (q as any).minLabel, maxLabel: (q as any).maxLabel };
  const rawMin = (src as any)?.min;
  const min = rawMin === 0 || rawMin === "0" ? 0 : (1 as 0 | 1);
  let max = toNum((src as any)?.max, 5);
  max = Math.min(10, Math.max(2, Math.max(min + 1, max)));
  return { min, max, minLabel: (src as any)?.minLabel ?? "", maxLabel: (src as any)?.maxLabel ?? "" };
}

function normalizeTextConfig(q: Question) {
  const src =
    (q as any).config?.text ??
    (q as any).text ??
    (q as any).config ?? { placeholder: (q as any).placeholder, multiline: (q as any).multiline, rows: (q as any).rows };
  const multiline = typeof src.multiline === "boolean" ? src.multiline : typeof (q as any).multiline === "boolean" ? (q as any).multiline : true;
  const rowsRaw = src.rows ?? (q as any).rows;
  const rows = multiline ? Math.max(1, Math.min(50, toNum(rowsRaw, 4))) : undefined;
  const ph = src.placeholder ?? (q as any).placeholder;
  const placeholder = typeof ph === "string" ? ph : multiline ? "長文回答" : "回答を入力";
  return { multiline, rows, placeholder };
}

function getOptions(q: Question): string[] {
  const optAny = (q as any).options;
  if (Array.isArray(optAny) && optAny.length > 0) {
    return typeof optAny[0] === "string" ? (optAny as string[]) : (optAny as any[]).map((o) => (typeof o === "string" ? o : o?.label ?? ""));
  }
  const cs: Array<any> | undefined = (q as any).choices;
  return Array.isArray(cs) && cs.length > 0 ? cs.map((c) => c?.label ?? "") : [];
}

function getChoiceIdMap(q: Question): Record<string, string> | null {
  const cs = (q as any).choices as Array<{ id: string; label: string }> | undefined;
  if (!Array.isArray(cs) || cs.length === 0) return null;
  const map: Record<string, string> = {};
  for (const c of cs) map[c.label] = c.id;
  return map;
}

function normalizeType(t: string | undefined): QuestionType {
  const s = (t ?? "").toLowerCase();
  if (["shorttext", "longtext", "paragraph", "textarea", "text", "textbox"].includes(s)) return "text";
  if (["single", "radio", "singlechoice", "choice"].includes(s)) return "single";
  if (["multiple", "checkbox", "multichoice", "checkboxes"].includes(s)) return "multiple";
  if (["linear", "scale", "scalequestion"].includes(s)) return "linear";
  if (["rating", "ratingquestion", "stars"].includes(s)) return "rating";
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
      const label = v == null ? "" : String(v);
      const map = getChoiceIdMap(q);
      out.push(map ? { questionId: q.id, type: "RADIO", choiceId: map[label] ?? undefined, value: label } : { questionId: q.id, type: "RADIO", value: label });
      continue;
    }
    if (t === "multiple") {
      const labels = Array.isArray(v) ? (v as string[]) : [];
      const map = getChoiceIdMap(q);
      const ids = map ? labels.map((l) => map[l]).filter(Boolean) : [];
      out.push({ questionId: q.id, type: "CHECKBOX", choiceIds: ids, values: labels });
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

function QuestionCard(props: { q: Question; value: unknown; onChange: (val: unknown) => void; error?: string | null }) {
  const { q, value, onChange, error } = props;
  const type = normalizeType(String(q.type));

  return (
    <div className={cls("relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm", error && "border-red-300")}>
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

      {type === "text" && (() => {
        const t = normalizeTextConfig(q);
        return <TextQuestion mode="answer" name={q.id} multiline={t.multiline} rows={t.rows} placeholder={t.placeholder} value={String(value ?? "")} onValueChange={(v) => onChange(v)} />;
      })()}

      {type === "single" && <RadioQuestion mode="answer" name={q.id} options={getOptions(q)} value={String(value ?? "")} onValueChange={(v) => onChange(v)} />}

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
        return <ScaleQuestion mode="answer" q={qForScale} name={q.id} value={Number(value ?? s.min)} onValueChange={(v) => onChange(v)} />;
      })()}

      {type === "rating" && <RatingQuestion mode="answer" q={q as any} name={q.id} value={Number(value ?? 1)} onValueChange={(v) => onChange(v)} />}

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
  const [submitting, setSubmitting] = useState(false);

  // ★ 送信用ワンタイムトークン（nonce）
  const nonceRef = useRef<string>("");

  // ★ 同期ロック（1フレーム内の連打をただちに無効化）
  const submittingLockRef = useRef(false);

  const progress = useMemo(() => {
    if (!poll) return 0;
    const req = poll.questions.filter((q) => q.required);
    if (req.length === 0) return 100;
    const filled = req.filter((q) => !validateRequired(q, answers[q.id])).length;
    return Math.round((filled / req.length) * 100);
  }, [poll, answers]);

  // フォーム本体のロード
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
        const init: Record<string, unknown> = {};
        for (const q of data.questions) {
          const type = normalizeType(String(q.type));
          if (type === "multiple") init[q.id] = [] as string[];
          else if (type === "linear") init[q.id] = normalizeScaleFromQuestion(q).min;
          else if (type === "rating") init[q.id] = 1;
          else init[q.id] = "";
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

  // ★ 送信用 nonce を取得（ページ表示ごとに1回）
  useEffect(() => {
    let alive = true;
    async function getNonce() {
      try {
        const r = await fetch(`/api/polls/${pollId}/nonce`, { cache: "no-store" });
        if (!r.ok) throw new Error("failed to get nonce");
        const j = await r.json();
        if (alive) nonceRef.current = j.nonce;
      } catch (e) {
        console.error(e);
        nonceRef.current = "";
      }
    }
    if (pollId) getNonce();
    return () => {
      alive = false;
    };
  }, [pollId]);

  const update = (qid: string, val: unknown) => {
    setAnswers((prev) => ({ ...prev, [qid]: val }));
    setErrors((prev) => ({ ...prev, [qid]: null }));
  };

  // ====== 送信 ======
  const onSubmit = async () => {
    // ★ 即時ロック
    if (submittingLockRef.current) return;
    submittingLockRef.current = true;
    setSubmitting(true);

    if (!poll) {
      submittingLockRef.current = false;
      setSubmitting(false);
      return;
    }

    // 必須チェック
    const e: Record<string, string | null> = {};
    for (const q of poll.questions) {
      const err = validateRequired(q, answers[q.id]);
      if (err) e[q.id] = err;
    }
    setErrors(e);
    if (Object.values(e).some(Boolean)) {
      const first = poll.questions.find((q) => e[q.id]);
      if (first) document.getElementById(`q-${first.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      submittingLockRef.current = false;
      setSubmitting(false);
      return;
    }

    // ★ nonce が無ければ送信不可（ページ再読込を促す）
    if (!nonceRef.current) {
      alert("送信トークンの取得に失敗しました。ページを再読み込みしてからもう一度お試しください。");
      submittingLockRef.current = false;
      setSubmitting(false);
      return;
    }

    try {
      const answersArray = serializeAnswersForApi(poll, answers);
      const body = { answers: answersArray, nonce: nonceRef.current };

      const endpoint = `/api/polls/${encodeURIComponent(poll.id)}/submissions`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      // 二重送信 (409) は成功扱いでOK（サーバで既存IDを返す場合もあり）
      if (!res.ok && res.status !== 409) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `failed to submit (HTTP ${res.status})`);
      }

      alert("送信が完了しました。ご回答ありがとうございます！");
      router.push(`/polls/${poll.id}/thanks`);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "送信に失敗しました。時間をおいて再度お試しください。");
      submittingLockRef.current = false;
      setSubmitting(false);
    }

    // 成功時は遷移でアンマウントされるはずだが、保険で解除
    setTimeout(() => {
      submittingLockRef.current = false;
      setSubmitting(false);
    }, 1500);
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
      <div className="h-44 w-full bg-gradient-to-r from-purple-600 to-indigo-600" />
      <div className="-mt-16 px-4 pb-24">
        <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white shadow-md">
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

          <section className="space-y-6 p-6">
            {poll.questions.map((q) => (
              <div id={`q-${q.id}`} key={q.id}>
                <QuestionCard
                  q={q}
                  value={answers[q.id]}
                  onChange={(v) => {
                    setAnswers((prev) => ({ ...prev, [q.id]: v }));
                    setErrors((prev) => ({ ...prev, [q.id]: null }));
                  }}
                  error={errors[q.id]}
                />
              </div>
            ))}
          </section>

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
              disabled={submitting}
              aria-busy={submitting}
              className="rounded-full bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "送信中…" : "送信"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

// app/polls/[id]/results/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const NF_JA = new Intl.NumberFormat("ja-JP");

type QuestionType = "RADIO" | "CHECKBOX" | "TEXT" | "SCALE" | "RATING";

type RadioItem = {
  questionId: string;
  type: "RADIO";
  title: string;
  respondentCount: number;
  choices: { id: string; label: string; count: number }[];
};

type CheckboxItem = {
  questionId: string;
  type: "CHECKBOX";
  title: string;
  respondentCount: number;
  choices: { id: string; label: string; count: number; percent: number }[];
};

type TextItem = {
  questionId: string;
  type: "TEXT";
  title: string;
  respondentCount: number;
  texts: string[];
};

type Bucket = { value: number; count: number };

type ScaleItem = {
  questionId: string;
  type: "SCALE";
  title: string;
  respondentCount: number;
  min: number;
  max: number;
  buckets: Bucket[];
};

type RatingItem = {
  questionId: string;
  type: "RATING";
  title: string;
  respondentCount: number;
  min: number;
  max: number;
  buckets: Bucket[];
};

type Item = RadioItem | CheckboxItem | TextItem | ScaleItem | RatingItem;

type ResponsesPayload = {
  poll: { id: string; title: string | null };
  items: Item[];
};

export default function ResultsPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const [data, setData] = useState<ResponsesPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const ac = new AbortController();
    (async () => {
      try {
        setError(null);
        const r = await fetch(`/api/polls/${id}/responses`, { cache: "no-store", signal: ac.signal });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = (await r.json()) as ResponsesPayload;
        setData(json);
      } catch (e: any) {
        if (e?.name !== "AbortError") setError("読み込みに失敗しました");
      }
    })();
    return () => ac.abort();
  }, [id]);

  if (error) return <main className="p-6 text-center text-sm text-red-600">{error}</main>;
  if (!data) return <Skeleton />;

  const pollTitle = data.poll.title ?? "無題のフォーム";

  return (
    <main className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <div className="h-40 w-full bg-gradient-to-r from-purple-600 to-indigo-600" />
      <div className="-mt-12 px-4 pb-16">
        <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white shadow-md">
          <header className="flex items-start gap-3 p-6">
            <div className="mt-1 h-6 w-1.5 rounded bg-purple-600" />
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-slate-800">
                {pollTitle} <span className="text-sm text-slate-500">（結果）</span>
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                質問 {NF_JA.format(data.items.length)} 件
              </p>
            </div>
          </header>
          <div className="h-px w-full bg-slate-100" />

          {/* 各質問のカード */}
          <section className="p-6">
            <ol className="space-y-6">
              {data.items.map((item, idx) => (
                <li key={item.questionId} className="rounded-xl border border-slate-100 p-5">
                  <h2 className="mb-1 text-lg font-medium text-slate-800">
                    {idx + 1}. {item.title}
                  </h2>
                  <p className="mb-4 text-xs text-slate-500">
                    回答者 {NF_JA.format(item.respondentCount)} 人
                  </p>

                  {item.type === "RADIO" && <RadioResult item={item} />}
                  {item.type === "CHECKBOX" && <CheckboxResult item={item} />}
                  {item.type === "TEXT" && <TextResult item={item} />}
                  {item.type === "SCALE" && <ScaleOrRatingResult item={item} label="スコア" />}
                  {item.type === "RATING" && <ScaleOrRatingResult item={item} label="評価" />}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      {/* 下部ボタン */}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 flex justify-center">
        <Link
          href="/exec/polls"
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-purple-600 px-6 py-2 text-sm font-medium text-white shadow-md transition hover:bg-purple-700"
          aria-label="アンケート一覧へ"
        >
          アンケート一覧へ
        </Link>
      </div>
    </main>
  );
}

/* ====== 各タイプの描画コンポーネント ====== */

// RADIO: 円グラフ + 凡例
function RadioResult({ item }: { item: RadioItem }) {
  const total = item.choices.reduce((s, c) => s + c.count, 0);
  const segments = useMemo(() => {
    // conic-gradient で円グラフ（割合が0の項目も凡例には残す）
    let acc = 0;
    const parts: { color: string; from: number; to: number }[] = [];
    const palette = genPalette(item.choices.length);
    item.choices.forEach((c, i) => {
      const p = total ? (c.count / total) * 100 : 0;
      parts.push({ color: palette[i], from: acc, to: acc + p });
      acc += p;
    });
    return parts;
  }, [item, total]);

  return (
    <div className="grid gap-5 md:grid-cols-[240px,1fr]">
      <div className="mx-auto size-48 rounded-full border border-slate-200"
        style={{
          background: segments.length
            ? `conic-gradient(${segments
                .map((s) => `${s.color} ${s.from}% ${s.to}%`)
                .join(", ")})`
            : undefined,
        }}
        aria-label="円グラフ"
        role="img"
      />
      <ul className="space-y-2">
        {item.choices.map((c, i) => {
          const pct = total ? Math.round((c.count * 100) / total) : 0;
          return (
            <li key={c.id} className="flex items-center gap-3">
              <span
                className="inline-block size-3 rounded-sm"
                style={{ backgroundColor: genPalette(item.choices.length)[i] }}
                aria-hidden
              />
              <span className="flex-1 text-sm text-slate-700">{c.label}</span>
              <span className="text-sm text-slate-500">{c.count} 票・{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// CHECKBOX: 棒グラフ（回答者比%）
function CheckboxResult({ item }: { item: CheckboxItem }) {
  const maxPct = Math.max(1, ...item.choices.map((c) => c.percent));
  return (
    <ul className="space-y-3">
      {item.choices.map((c) => (
        <li key={c.id}>
          <div className="mb-1 flex items-center justify-between gap-4">
            <div className="text-sm text-slate-700">{c.label}</div>
            <div className="shrink-0 text-xs text-slate-500">
              {c.count} 件・{c.percent}%
            </div>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100" role="img" aria-label="棒グラフ">
            <div
              className="h-full rounded-full bg-indigo-600 transition-[width] duration-700"
              style={{ width: `${(c.percent / maxPct) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

// TEXT: 回答一覧（スクロール）
function TextResult({ item }: { item: TextItem }) {
  if (!item.texts.length) {
    return <div className="py-6 text-sm text-slate-500">回答はありません。</div>;
  }
  return (
    <div className="max-h-80 overflow-auto rounded-lg border border-slate-200">
      <ul>
        {item.texts.map((t, i) => (
          <li key={i} className="border-b border-slate-100 p-3 text-sm text-slate-800">
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

// SCALE / RATING: 値ごとの棒グラフ
function ScaleOrRatingResult({
  item,
  label,
}: {
  item: ScaleItem | RatingItem;
  label: string;
}) {
  const total = item.buckets.reduce((s, b) => s + b.count, 0);
  const maxCount = Math.max(1, ...item.buckets.map((b) => b.count));

  return (
    <div className="space-y-3">
      {item.buckets.map((b) => {
        const pct = total ? Math.round((b.count * 100) / total) : 0;
        return (
          <div key={b.value}>
            <div className="mb-1 flex items-center justify-between gap-4">
              <div className="text-sm text-slate-700">
                {label} {b.value}
              </div>
              <div className="shrink-0 text-xs text-slate-500">
                {b.count} 票・{pct}%
              </div>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100" role="img" aria-label="棒グラフ">
              <div
                className="h-full rounded-full bg-purple-600 transition-[width] duration-700"
                style={{ width: `${(b.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ====== 共有UI ====== */

function Skeleton() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="h-40 w-full bg-gradient-to-r from-purple-600 to-indigo-600" />
      <div className="-mt-12 px-4 pb-16">
        <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white shadow-md">
          <div className="p-6">
            <div className="mb-2 h-7 w-3/5 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="h-px w-full bg-slate-100" />
          <div className="space-y-5 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-slate-100 p-4">
                <div className="mb-3 h-4 w-1/2 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-1/3 animate-pulse rounded-full bg-slate-300" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-6 flex justify-center">
        <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-slate-200 px-6 py-2 text-sm font-medium text-slate-500">
          読み込み中…
        </div>
      </div>
    </main>
  );
}

// パレット（Googleフォームっぽい柔らかい色）
function genPalette(n: number) {
  const base = [
    "#7c3aed", // purple-600
    "#06b6d4", // cyan-500
    "#f59e0b", // amber-500
    "#10b981", // emerald-500
    "#ef4444", // red-500
    "#3b82f6", // blue-500
    "#a855f7", // violet-500
    "#14b8a6", // teal-500
    "#eab308", // yellow-500
    "#f97316", // orange-500
  ];
  const arr: string[] = [];
  for (let i = 0; i < n; i++) arr.push(base[i % base.length]);
  return arr;
}

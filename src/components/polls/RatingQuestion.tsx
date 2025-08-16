"use client";
import React, { useMemo, useState } from "react";
import type { Question } from "./types";

type Rating = NonNullable<Question["rating"]>;

type EditProps = {
  mode?: "edit" | "create";
  q: Question;
  onChange: (next: Question) => void;
};

type AnswerProps = {
  mode: "answer";
  q: Question;
  name?: string;
  value: number;
  onValueChange: (v: number) => void;
  disabled?: boolean;
};

type Props = EditProps | AnswerProps;

/* ---------- helpers ---------- */
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const toInt = (v: unknown, def = NaN) => {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : def;
  }
  return def;
};

/** 回答ページ用：rating の保存場所の揺れを吸収して正規化 */
function normalizeRatingFromQuestion(q: any): Rating {
  const src = q?.rating ?? q?.config ?? q ?? {};
  const toInt = (v: unknown) =>
    typeof v === "number" ? v : typeof v === "string" ? parseInt(v, 10) : NaN;

  let count =
    toInt(src.count) ??
    toInt(src.ratingCount) ??
    toInt(src.max) ??            // ★ 追加: config.max を拾う
    toInt(q?.config?.max) ??     // ★ 追加: config.max 別経路
    toInt(q?.max) ??             // ★ 追加: top-level max も拾う
    toInt(q?.count) ??
    NaN;

  if (!Number.isFinite(count)) count = 5;
  count = Math.min(9, Math.max(3, Math.floor(count))); // 3〜9 にクランプ

  const shape = (src.shape ?? q?.shape ?? "star") as Rating["shape"];
  return { count, shape };
}

/* ---------- Icons ---------- */
const Star = ({ filled }: { filled: boolean }) => (
  <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden>
    <path
      d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z"
      fill={filled ? "#F59E0B" : "none"}
      stroke="#F59E0B"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

const Heart = ({ filled }: { filled: boolean }) => (
  <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path
      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41 1.01 4.13 2.44h0.74C13.09 5.01 14.76 4 16.5 4
         19 4 21 6 21 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      fill={filled ? "#EF4444" : "none"}
      stroke="#EF4444"
      strokeWidth="1.5"
    />
  </svg>
);

const Thumb = ({ filled }: { filled: boolean }) => (
  <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden>
    <path
      d="M14 9V4a2 2 0 0 0-2-2l-1 5-4 5v8h10a2 2 0 0 0 2-2l-1-9h-4zM7 21H4v-8h3v8z"
      fill={filled ? "#3B82F6" : "none"}
      stroke="#3B82F6"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

export default function RatingQuestion(props: Props) {
  const isAnswer = props.mode === "answer";
  const q = props.q;

  // ★ 編集/新規は q.rating をそのまま編集。回答は正規化関数で拾うフィールドを統一。
  const rating: Rating = useMemo(() => {
    return isAnswer ? normalizeRatingFromQuestion(q) : (q.rating ?? { count: 5, shape: "star" });
  }, [isAnswer, q]);

  const setRating = (patch: Partial<Rating>) => {
  if (isAnswer) return;
  let count = patch.count ?? rating.count;
  count = Math.min(9, Math.max(3, Math.floor(count)));
  const shape = (patch.shape ?? rating.shape) as Rating["shape"];

  // ★ q.rating と config.* 双方に反映（backend がどちらを保存してもOKに）
  const next = {
    ...q,
    rating: { count, shape },
    config: {
      ...(q as any).config,
      count,
      ratingCount: count,
      max: count, // ← API が max を参照している場合に備えて同期
    },
  };
  (props as EditProps).onChange(next);
};

  const items = useMemo(() => Array.from({ length: rating.count }, (_, i) => i + 1), [rating.count]);
  const Icon = rating.shape === "star" ? Star : rating.shape === "heart" ? Heart : Thumb;

  /* ---------- Edit/Create プレビュー ---------- */
  if (!isAnswer) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">評価の数</span>
            <select
              value={rating.count}
              onChange={(e) => setRating({ count: Number(e.target.value) })}
              className="appearance-none rounded-full border border-slate-200 bg-white pl-3 pr-8 py-1.5 text-sm shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              aria-label="評価の数"
            >
              {Array.from({ length: 7 }, (_, i) => i + 3).map((n) => ( // 3..9
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">選択肢の形</span>
            <select
              value={rating.shape}
              onChange={(e) => setRating({ shape: e.target.value as Rating["shape"] })}
              className="appearance-none rounded-full border border-slate-200 bg-white pl-3 pr-9 py-1.5 text-sm shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              aria-label="選択肢の形"
            >
              <option value="star">星</option>
              <option value="heart">ハート</option>
              <option value="thumb">グッドマーク</option>
            </select>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl">
          <div className="flex w-full items-center" role="img" aria-label="rating-preview">
            {items.map((n) => (
              <span key={n} className="flex-1 grid place-items-center" aria-hidden>
                <Icon filled={false} />
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">プレビュー（作成/編集画面では選択できません）</p>
        </div>
      </div>
    );
  }

  /* ---------- Answer ---------- */
  const { onValueChange, value, name, disabled } = props as AnswerProps;
  const groupName = name ?? `rating-${q.id ?? "anon"}`;
  const [hover, setHover] = useState<number | null>(null);

  return (
    <div className="rounded-xl ring-1 ring-slate-200 bg-white p-4 shadow-sm">
      <div
        className={`flex w-full items-center ${disabled ? "opacity-60" : ""}`}
        role="radiogroup"
        aria-label="rating"
        aria-disabled={disabled ? "true" : "false"}
      >
        {items.map((n) => {
          const filled = value >= n;
          const ghost = !filled && hover !== null && hover >= n;
          return (
            <button
              type="button"
              key={n}
              name={groupName}
              onClick={() => !disabled && onValueChange(n)}
              onMouseEnter={() => !disabled && setHover(n)}
              onMouseLeave={() => setHover(null)}
              aria-checked={value === n}
              role="radio"
              disabled={disabled}
              aria-label={`${n}`}
              className={`group flex-1 grid place-items-center rounded-lg py-1 transition
                ${disabled ? "cursor-not-allowed" : "cursor-pointer hover:scale-[1.06] hover:bg-slate-100"}
                focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400/60`}
            >
              <span className={`inline-block ${filled ? "drop-shadow-[0_1px_2px_rgba(0,0,0,0.10)]" : ""} ${ghost ? "opacity-90" : ""}`}>
                <Icon filled={filled} />
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-right text-sm text-slate-600">
        選択: <span className="font-medium text-slate-800">{value}</span>
      </p>
    </div>
  );
}

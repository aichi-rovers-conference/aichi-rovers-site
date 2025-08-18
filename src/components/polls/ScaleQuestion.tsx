"use client";
import React, { useMemo } from "react";
import type { Question } from "./types";

/** 内部で扱う正規化後のスケール型（ラベルは必ず string） */
type Scale = { min: 0 | 1; max: number; minLabel: string; maxLabel: string };

type EditProps = {
  mode?: "edit" | "create";
  q: Question;
  onChange: (next: Question) => void;
  placeholderMin?: string;
  placeholderMax?: string;
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

/* ===================== Util ===================== */
// 数値化（"10"→10 等を許容）
const toNum = (x: unknown, fallback: number) => {
  const n = typeof x === "number" ? x : typeof x === "string" ? Number(x) : NaN;
  return Number.isFinite(n) ? n : fallback;
};
// 文字列化（undefined を許容せず string を返す）
const toStr = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : v == null ? fallback : String(v);

/** スケールの正規化（min: 0|1, max: 2..10 かつ min+1 以上、ラベルは必ず string） */
function normalizeScale(src?: Partial<Question["scale"]> | Record<string, unknown>): Scale {
  const rawMin = (src as any)?.min;
  const min: 0 | 1 = rawMin === 0 || rawMin === "0" ? 0 : 1;

  // max は 2..10 に制限し、かつ min+1 以上
  let max = toNum((src as any)?.max, 5);
  max = Math.max(min + 1, Math.min(10, Math.max(2, max)));

  return {
    min,
    max,
    minLabel: toStr((src as any)?.minLabel, ""),
    maxLabel: toStr((src as any)?.maxLabel, ""),
  };
}

/** Question からスケール情報を抽出 → 正規化 */
function normalizeScaleFromQuestion(q: Question): Scale {
  const src =
    (q as any).scale ??
    {
      min: (q as any).min,
      max: (q as any).max,
      minLabel: (q as any).minLabel, // ★ タイポ注意
      maxLabel: (q as any).maxLabel,
      // もし config に入ってくるケースがあるなら上書きで拾う
      ...(q as any).config,
    };
  return normalizeScale(src);
}

/* ===================== Component ===================== */
export default function ScaleQuestion(props: Props) {
  const isAnswer = props.mode === "answer";
  const q = props.q;

  // q 由来を常に正規化（min/max/label を確実に揃える）
  const scale: Scale = normalizeScaleFromQuestion(q);

  const numbers = useMemo(() => {
    const arr: number[] = [];
    for (let n = scale.min; n <= scale.max; n++) arr.push(n);
    return arr;
  }, [scale.min, scale.max]);

  const setScale = (patch: Partial<Scale>) => {
    if (isAnswer) return;
    const next = normalizeScale({ ...scale, ...patch });

    (props as EditProps).onChange({
      ...(q as any),
      scale: next,
      // 互換: top-level にも書いておく（既存データ構造への配慮）
      min: next.min,
      max: next.max,
      minLabel: next.minLabel,
      maxLabel: next.maxLabel,
      // API が期待する config にもミラー
      config: {
        ...(q as any).config,
        min: next.min,
        max: next.max,
        minLabel: next.minLabel,
        maxLabel: next.maxLabel,
      },
    } as any);
  };

  if (!isAnswer) {
    const {
      placeholderMin = "最小値ラベル（省略可）",
      placeholderMax = "最大値ラベル（省略可）",
    } = props as EditProps;

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">最小</span>
            <select
              value={scale.min}
              onChange={(e) => setScale({ min: Number(e.target.value) as 0 | 1 })}
              className="appearance-none rounded-full border border-slate-200 bg-white pl-3 pr-8 py-1.5 text-sm shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              aria-label="最小値"
            >
              <option value={1}>1</option>
              <option value={0}>0</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">最大</span>
            <select
              value={scale.max}
              onChange={(e) => setScale({ max: Number(e.target.value) })}
              className="appearance-none rounded-full border border-slate-200 bg-white pl-3 pr-8 py-1.5 text-sm shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              aria-label="最大値"
            >
              {Array.from({ length: 9 }, (_, i) => i + 2).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-xl ring-1 ring-slate-200 bg-white p-4 shadow-sm">
          <div
            className="flex items-center justify-between gap-2"
            role="radiogroup"
            aria-label="scale-preview"
            aria-disabled="true"
          >
            {numbers.map((n) => (
              <label key={n} className="flex flex-col items-center gap-1 px-1">
                <input
                  type="radio"
                  disabled
                  name={`scale-preview-${q.id ?? "new"}`}
                  className="h-4 w-4 rounded-full border-slate-300 bg-slate-100"
                />
                <span className="text-xs text-slate-600">{n}</span>
              </label>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <input
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[15px] outline-none shadow-sm placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              placeholder={placeholderMin}
              value={scale.minLabel}
              onChange={(e) => setScale({ minLabel: e.target.value })}
              aria-label="最小側ラベル"
            />
            <input
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[15px] outline-none shadow-sm placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              placeholder={placeholderMax}
              value={scale.maxLabel}
              onChange={(e) => setScale({ maxLabel: e.target.value })}
              aria-label="最大側ラベル"
            />
          </div>

          {(scale.minLabel || scale.maxLabel) && (
            <div className="mt-3 flex items-start justify-between text-xs text-slate-600">
              <span className="max-w-[45%] truncate">{scale.minLabel}</span>
              <span className="max-w-[45%] truncate text-right">{scale.maxLabel}</span>
            </div>
          )}

          <p className="mt-2 text-xs text-slate-400">プレビュー（作成画面では選択できません）</p>
        </div>
      </div>
    );
  }

  // 回答モード
  const { onValueChange, value, name, disabled } = props as AnswerProps;
  const groupName = name ?? `scale-answer-${q.id ?? "anon"}`;

  return (
    <div className="rounded-xl ring-1 ring-slate-200 bg-white p-4 shadow-sm">
      <div
        className="flex items-center justify-between gap-2"
        role="radiogroup"
        aria-label="linear-scale"
        aria-disabled={disabled ? "true" : "false"}
      >
        {numbers.map((n) => (
          <label key={n} className="flex flex-col items-center gap-1 px-1">
            <input
              type="radio"
              name={groupName}
              value={n}
              checked={value === n}
              onChange={() => onValueChange(n)}
              disabled={disabled}
              className="h-4 w-4 rounded-full border-slate-300 accent-purple-600"
              aria-label={`${n}`}
            />
            <span className="text-xs text-slate-600">{n}</span>
          </label>
        ))}
      </div>

      {(scale.minLabel || scale.maxLabel) && (
        <div className="mt-3 flex items-start justify-between text-xs text-slate-600">
          <span className="max-w-[45%] truncate">{scale.minLabel}</span>
          <span className="max-w-[45%] truncate text-right">{scale.maxLabel}</span>
        </div>
      )}

      <p className="mt-3 text-right text-sm text-slate-600">
        選択: <span className="font-medium text-slate-800">{value}</span>
      </p>
    </div>
  );
}

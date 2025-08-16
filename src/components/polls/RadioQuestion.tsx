"use client";
import React, { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const cls = (...xs: Array<string | false | null | undefined>) =>
  xs.filter(Boolean).join(" ");

// 既存の“ビルダー用”props（後方互換）
type BuilderProps = {
  mode?: "builder"; // 省略時は builder として振る舞う
  options: string[];
  onChange: (next: string[]) => void; // 既存の型を維持
  name?: string;
  placeholderBase?: string;
};

// 回答用 props（新規）
type AnswerProps = {
  mode: "answer";
  options: string[];
  value: string;
  onValueChange: (v: string) => void;
  name?: string;
  classNameItem?: string;
  classNameInput?: string;
  classNameLabel?: string;
};

export type RadioQuestionProps = BuilderProps | AnswerProps;

export default function RadioQuestion(props: RadioQuestionProps) {
  const { name = "radio-question" } = props as any;

  // ===== 編集/新規（builder）モード =====
  if (props.mode !== "answer") {
    const { options, onChange, placeholderBase = "選択肢" } = props as BuilderProps;

    const setAt = useCallback(
      (i: number, v: string) => {
        const next = options.slice();
        next[i] = v;
        onChange(next);
      },
      [options, onChange]
    );

    const add = useCallback(() => {
      onChange([...options, ""]);
    }, [options, onChange]);

    const removeAt = useCallback(
      (i: number) => {
        const next = options.slice(0, i).concat(options.slice(i + 1));
        onChange(next.length ? next : ["", ""]);
      },
      [options, onChange]
    );

    return (
      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-700">
          選択肢（単一選択）
        </label>

        {/* ▼ 余計な枠を廃止し、縦リスト＋下線のみ */}
        <div className="space-y-1">
          <AnimatePresence initial={false}>
            {options.map((label, i) => (
              <motion.div
                key={`opt-${i}`}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                className="group flex items-center gap-3 py-2 rounded-md hover:bg-slate-50"
              >
                {/* プレビュー用（無効） */}
                <input
                  type="radio"
                  name={name}
                  disabled
                  className="h-4 w-4"
                />

                {/* ラベル編集（ボーダー枠→下線へ） */}
                <input
                  className="flex-1 bg-transparent px-1 py-1.5 border-0 border-b border-slate-200 text-[15px] outline-none focus:border-violet-400 focus:ring-0"
                  placeholder={`${placeholderBase} ${i + 1}`}
                  value={label}
                  onChange={(e) => setAt(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      add();
                    }
                    if (e.key === "Backspace" && label === "") {
                      e.preventDefault();
                      removeAt(i);
                    }
                  }}
                  aria-label={`${placeholderBase} ${i + 1}`}
                />

                {/* 削除（リンク風・ゴースト） */}
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="ml-1 text-sm text-slate-400 hover:text-rose-600 focus:outline-none underline-offset-4 hover:underline transition-opacity opacity-0 group-hover:opacity-100"
                  aria-label={`選択肢${i + 1}を削除`}
                >
                  削除
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div>
          <button
            type="button"
            onClick={add}
            className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 active:scale-95 transition"
          >
            <span className="text-lg leading-none">＋</span>
            選択肢を追加
          </button>
        </div>
      </div>
    );
  }

  // ===== 回答（answer）モード =====
  const { options, value, onValueChange, classNameItem, classNameInput, classNameLabel } =
    props as AnswerProps;

  return (
    <div className="flex flex-col gap-2">
      {options.map((opt, i) => {
        const id = `${name}-${i}`;
        return (
          <label
            key={id}
            htmlFor={id}
            className={cls(
              "group inline-flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-slate-50",
              classNameItem
            )}
          >
            <input
              id={id}
              type="radio"
              name={name}
              className={cls("h-4 w-4 accent-purple-600", classNameInput)}
              checked={value === opt}
              onChange={() => onValueChange(opt)}
            />
            <span className={cls("text-slate-800", classNameLabel)}>
              {opt || `選択肢 ${i + 1}`}
            </span>
          </label>
        );
      })}
    </div>
  );
}

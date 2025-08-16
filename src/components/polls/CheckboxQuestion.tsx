"use client";
import React, { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// クラス結合ヘルパー
const cls = (...xs: Array<string | false | null | undefined>) =>
  xs.filter(Boolean).join(" ");

type BuilderProps = {
  mode: "builder";
  options: string[];
  onOptionsChange: React.Dispatch<React.SetStateAction<string[]>>;
  name?: string;
  placeholderBase?: string;
};

type AnswerProps = {
  mode: "answer";
  options: string[];
  /** 現在選択されている値（ラベル文字列の配列） */
  value: string[];
  /** 回答更新（記録側で保持 or 親で保存） */
  onValueChange: React.Dispatch<React.SetStateAction<string[]>>;
  name?: string;
  /** 見た目を上書きする任意クラス（未指定ならデフォルト） */
  classNameItem?: string;
  classNameInput?: string;
  classNameLabel?: string;
};

type CheckboxQuestionProps = BuilderProps | AnswerProps;

export default function CheckboxQuestion(props: CheckboxQuestionProps) {
  const { name = "checkbox-question" } = props as any;

  // ===== builder（作成/編集）モード =====
  if (props.mode === "builder") {
    const { options, onOptionsChange, placeholderBase = "選択肢" } =
      props as BuilderProps;

    const setAt = useCallback(
      (i: number, v: string) => {
        onOptionsChange((prev) => {
          const next = prev.slice();
          next[i] = v;
          return next;
        });
      },
      [onOptionsChange]
    );

    const add = useCallback(() => {
      onOptionsChange((prev) => [...prev, ""]);
    }, [onOptionsChange]);

    const removeAt = useCallback(
      (i: number) => {
        onOptionsChange((prev) => {
          const next = prev.slice(0, i).concat(prev.slice(i + 1));
          return next.length ? next : ["", ""];
        });
      },
      [onOptionsChange]
    );

    return (
      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-700">
          選択肢（複数選択）
        </label>

        {/* ▼ 余計な枠は廃止。縦リスト＋行ホバー＋入力は下線のみ */}
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
                <input type="checkbox" name={name} disabled className="h-4 w-4" />

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

                {/* 削除（リンク風・ゴースト表示） */}
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

  // ===== answer（回答）モード =====
  const {
    options,
    value,
    onValueChange,
    classNameItem,
    classNameInput,
    classNameLabel,
  } = props as AnswerProps;

  const toggle = useCallback(
    (label: string) => {
      onValueChange((prev) =>
        prev.includes(label) ? prev.filter((v) => v !== label) : [...prev, label]
      );
    },
    [onValueChange]
  );

  return (
    <div className="flex flex-col gap-2">
      {options.map((label, i) => {
        const id = `${name}-${i}`;
        const checked = value.includes(label);
        return (
          <label
            key={`ans-${i}-${label}`}
            htmlFor={id}
            className={cls(
              "group inline-flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-slate-50",
              classNameItem
            )}
          >
            <input
              id={id}
              type="checkbox"
              name={name}
              className={cls("h-4 w-4 accent-purple-600", classNameInput)}
              checked={checked}
              onChange={() => toggle(label)}
            />
            <span className={cls("text-slate-800", classNameLabel)}>
              {label || `選択肢 ${i + 1}`}
            </span>
          </label>
        );
      })}
    </div>
  );
}

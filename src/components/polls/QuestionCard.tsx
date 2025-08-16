"use client";
import { motion } from "framer-motion";
import { useState } from "react";
import RadioQuestion from "./RadioQuestion";
import CheckboxQuestion from "./CheckboxQuestion";
import TextQuestion from "./TextQuestion";
import ScaleQuestion from "./ScaleQuestion";
import RatingQuestion from "./RatingQuestion";
import type { Dispatch, SetStateAction } from "react";
import type { QuestionType } from "./types";
import type { Question } from "./types";

export default function QuestionCard({
    q,
    onChange,
    onRemove,
    index,
}: {
    q: Question;
    onChange: (next: Question) => void;
    onRemove: () => void;
    index: number;
}) {
    const setTitle = (v: string) => onChange({ ...q, title: v });
    // TextQuestion用
    const textCfg = {
        placeholder:
            (q as any).text?.placeholder ??
            ((q as any).text?.multiline ?? true ? "長文回答" : "回答を入力"),
        multiline: (q as any).text?.multiline ?? true,
        rows:
            ((q as any).text?.multiline ?? true)
                ? ((q as any).text?.rows ?? 4)
                : undefined
    };
    
    const setOptions: Dispatch<SetStateAction<string[]>> = (upd) => {
        const prev = q.options ?? [];
        const next =
        typeof upd === "function" ? (upd as (prev: string[]) => string[])(prev) : upd;
        onChange({ ...q, options: next });
    };

    const setType = (t: QuestionType) => {
        if (t === "text" && !(q as any).text) {
            onChange({ ...q, type: t, text: { placeholder: "長文回答", multiline: true, rows: 4 } as any });
        } else {
            onChange({ ...q, type: t });
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-5 md:p-6 space-y-4"
        >
            {/* ヘッダー（設問タイプ切替＆削除） */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                        Q{index + 1}
                    </span>

                    {/* カスタム矢印付きセレクト（Googleフォーム調） */}
                    <div className="relative">
                        <select
                            value={q.type}
                            onChange={(e) => setType(e.target.value as QuestionType)}
                            className="appearance-none rounded-full border border-slate-200 bg-white pl-3 pr-9 py-1.5 text-sm shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                            aria-label="設問タイプ"
                        >
                            <option value="text">自由記述（テキスト）</option>
                            <option value="radio">単一選択（ラジオ）</option>
                            <option value="checkbox">複数選択（チェック）</option>
                            <option value="scale">均等メモリ（スケール）</option>
                            <option value="rating">評価（レーティング）</option>
                        </select>
                        {/* 下向き矢印（data URI） */}
                        <span
                            aria-hidden
                            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 inline-block h-4 w-4 opacity-70"
                            style={{
                                backgroundImage:
                                    "url(\"data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M5 8l5 5 5-5' stroke='%2367798f' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
                                backgroundRepeat: "no-repeat",
                                backgroundPosition: "center",
                            }}
                        />
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onRemove}
                    className="inline-flex items-center gap-1 rounded-full border border-transparent px-3 py-1.5 text-sm text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-100"
                    aria-label="この質問を削除"
                >
                    削除
                </button>
            </div>

            {/* タイトル */}
            <input
                className="w-full bg-transparent text-lg md:text-xl font-medium rounded-xl border border-slate-200 p-3 placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 outline-none"
                placeholder="無題の質問"
                value={q.title}
                onChange={(e) => setTitle(e.target.value)}
            />

            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

            {/* 選択肢エディタ（カード内統一） */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 md:p-4">
                {q.type === "radio" ? (
                    <RadioQuestion options={q.options ?? []} onChange={setOptions} />
                ) : q.type === "checkbox" ? (
                    <CheckboxQuestion
                        mode="builder" 
                        options={q.options ?? []}
                        onOptionsChange={setOptions} 
                    />
                ) : q.type === "text" ? (
                    <TextQuestion
                        mode="edit"
                        placeholder={textCfg.placeholder}
                        multiline={textCfg.multiline}
                        rows={textCfg.rows}
                        onConfigChange={(next: any) =>
                            onChange({
                                ...q,
                                text: {
                                    placeholder:
                                        next?.placeholder ??
                                        ((next?.multiline ?? textCfg.multiline) ? "長文回答" : "回答を入力"),
                                    multiline: typeof next?.multiline === "boolean" ? next.multiline : textCfg.multiline,
                                    rows:
                                        (typeof next?.multiline === "boolean" ? next.multiline : textCfg.multiline)
                                            ? (Number.isFinite(+next?.rows) ? +next.rows : (textCfg.rows ?? 4))
                                            : undefined,
                                } as any,
                            })
                        }
                    />
                ) : q.type === "scale" ? (
                    <ScaleQuestion q={q} onChange={onChange} />
                ) : (
                    <RatingQuestion q={q} onChange={onChange} />
                )}
            </div>
        </motion.div>
    );
}

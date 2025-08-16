"use client";
import { useState, useRef, useEffect  } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { QuestionType } from "./types";

export default function AddQuestionMenu({
    onAdd,
    disabled,
}: {
    onAdd: (type: QuestionType) => void;
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (!ref.current) return;
            if (!ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, []);

    const items: Array<{ type: QuestionType; label: string; icon:string }> = [
        { type: "radio",    label: "ラジオボタン",          icon: "🔘" },
        { type: "checkbox", label: "チェックボックス",      icon: "☑️" },
        { type: "text",     label: "自由記述（テキスト）",  icon: "✏️" },
        { type: "scale",    label: "均等メモリ（スケール）", icon: "📏" },
        { type: "rating",   label: "評価（レーティング）",  icon: "⭐" },
    ];

    return (
        <div
            ref={ref}
            className="relative inline-block"
            onMouseEnter={() => !disabled && setOpen(true)}
            onMouseLeave={() => setOpen(false)}
        >
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-95 disabled:opacity-50 focus:outline-none focus:ring-4 focus:ring-violet-200"
                aria-haspopup="menu"
                aria-expanded={open}
            >
                <span className="text-lg leading-none">＋</span>
                質問を追加
            </button>

            <AnimatePresence>
                {open && !disabled && (
                    <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: -8, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale:0.98 }}
                        transition={{ type: "spring", stiffness: 380, damping: 26, mass: 0.7 }}
                        className="absolute left-0 bottom-full mb-2 w-72 rounded-2xl bg-white ring-1 ring-slate-200 shadow-lg p-2 z-40"
                        role="menu"
                    >
                        {items.map((it) => (
                            <button
                                key={it.type}
                                type="button"
                                onClick={() => {
                                    onAdd(it.type);
                                    setOpen(false);
                                }}
                                className="w-full text-left flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                                role="menuitem"
                            >
                                <span className="text-base">{it.icon}</span>
                                <div className="flex-1">
                                    <div className="text-sm text-slate-900">{it.label}</div>
                                    <div className="text-xs text-slate-500">
                                        {it.type === "radio" && "単一選択の質問を追加"}
                                        {it.type === "checkbox" && "複数選択の質問を追加"}
                                        {it.type === "text" && "自由記述の回答欄を追加"}
                                        {it.type === "scale" && "0/1〜2〜10の範囲で評価"}
                                        {it.type === "rating" && "星/ハート/グッドで評価"}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
// app/polls/new/page.tsx
"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import ScrollProgressBar from "@/src/app/polls/ScrollProgressBar";
import { AnimatePresence, motion } from "framer-motion";
import QuestionCard from "@/src/components/polls/QuestionCard";
import { Question, QuestionType } from "@/src/components/polls/types"
import AddQuestionMenu from "@/src/components/polls/AddQuestionMenu";
import ArcHeader from "@/src/components/ArcHeader";

const MAX_QUESTIONS = 20;
const uid = () => `tmp_${Math.random().toString(36).slice(2, 10)}`;

export default function NewPollPage() {
  const router = useRouter();

  const [title, setTitle] = useState("無題のアンケート");
  const [desc, setDesc] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [closesAt, setClosesAt] = useState<string>("");

  const [questions, setQuestions] = useState<Question[]>([
    { id: uid(), type: "radio", title: "無題の質問", options: ["選択肢", ""] },
  ]);

  const canAddMore = questions.length < MAX_QUESTIONS;

  const addQuestion = (type: QuestionType) => {
    if (!canAddMore) return;
    const id = uid();
    const q: Question =
      type === "scale"
        ? {
            id,
            type,
            title: "無題の質問",
            options: [] as string[],
            scale: { min: 1, max: 5, minLabel: "", maxLabel: "" },
          }
        : type === "rating"
        ? { id, type, title: "無題の質問", options: [] as string[], rating: { count: 5, shape: "star" } }
        : type === "text"
        ? {
            id,
            type,
            title: "無題の質問",
            text: { placeholder: "長文回答", multiline: true, rows: 4 },
          }
        : { id, type, title: "無題の質問", options: ["選択肢", ""] as string[] };
    setQuestions((qs) => [...qs, q]);
  };

  const updateQuestion = (id: string, next: Question) =>
    setQuestions((qs) => qs.map((q) => (q.id === id ? next : q)));

  const removeQuestion = (id?: string) => setQuestions((qs) => qs.filter((q) => q.id !== id));

  const payload = useMemo(() => {
    return {
      title: title.trim(),
      desc: desc.trim() || null,
      isPublic,
      closesAt: closesAt || null,
      questions: questions.map((q, index) => ({
        id: (q as any).serverId ?? undefined,
        index,
        type: q.type,
        title: q.title.trim(),
        options: (q.options ?? []).map((o) => o.trim()).filter(Boolean),
        scale: q.type === "scale" ? q.scale : undefined,
        rating: q.type === "rating" ? q.rating : undefined,
        config:
          q.type === "text"
            ? {
                placeholder: q.text?.placeholder ?? (q.text?.multiline ? "長文回答" : "回答を入力"),
                multiline: q.text?.multiline ?? true,
                rows: (q.text?.multiline ?? true) ? (q.text?.rows ?? 4) : undefined,
              }
            : undefined,
      })),
    };
  }, [title, desc, isPublic, closesAt, questions]);

  const submit = async () => {
    // バリデーション
    if (!payload.title) return alert("アンケートタイトルを入力してください。");
    if (payload.questions.length === 0) return alert("質問を1つ以上追加してください。");

    for (const q of payload.questions) {
      if (!q.title?.trim()) return alert("各質問にタイトルを入力してください。");

      if (q.type === "radio" || q.type === "checkbox") {
        const opts = (q.options ?? []).map((o) => o.trim()).filter(Boolean);
        if (opts.length < 1) return alert("選択式の質問には少なくとも1つの選択肢が必要です。");
      } else if (q.type === "scale") {
        const s = q.scale!;
        if (!s || ![0, 1].includes(s.min) || s.max < 2 || s.max > 10 || s.max <= s.min) {
          return alert("均等メモリの範囲が不正です（最少は0または1、最大は2～10、最大は最小より大きい必要があります）。");
        }
      } else if (q.type === "rating") {
        const r = q.rating!;
        if (!r || r.count < 2 || r.count > 10) return alert("評価の数は 2～10 で指定してください。");
      }
    }

    // 作成API
    const res = await fetch("/api/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      alert("作成に失敗しました");
      return;
    }

    // ★ ここを変更：作成後に /exec/polls/new へ遷移（/exec/polls/new/page.tsx のURL）
    router.push("/exec/polls");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") history.back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-slate-50 to-slate-50 text-slate-900">
      <ScrollProgressBar />
      <div className="h-2 w-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400" />
      <ArcHeader />

      <main className="max-w-3xl mx-auto p-5 md:p-6 space-y-6">
        <section className="rounded-2xl bg-white/90 ring-1 ring-slate-200 shadow-sm p-5 md:p-6 space-y-4">
          <input
            className="w-full text-2xl md:text-3xl font-bold bg-transparent border-0 focus:outline-none focus:ring-0 placeholder:text-slate-400"
            placeholder="無題のアンケート"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
          <textarea
            className="w-full bg-white/60 border border-slate-200 rounded-xl p-3 shadow-sm focus:border-violet-400 focus:ring-4 focus:ring-violet-100 transition"
            placeholder="フォームの説明"
            rows={3}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </section>

        <AnimatePresence initial={false}>
          {questions.map((q, idx) => (
            <motion.div
              key={q.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-5"
            >
              <QuestionCard
                q={q}
                index={idx}
                onChange={(next) => updateQuestion(q.id, next)}
                onRemove={() => removeQuestion(q.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        <div className="flex flex-wrap items-center gap-3">
          <AddQuestionMenu onAdd={(type) => addQuestion(type)} disabled={!canAddMore} />
          <span className="ml-auto text-xs text-slate-500">{questions.length}/{MAX_QUESTIONS}</span>
        </div>

        <div className="pt-2">
          <motion.button
            onClick={submit}
            whileTap={{ scale: 0.98 }}
            className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm hover:opacity-95 focus:outline-none focus:ring-4 focus:ring-violet-200"
          >
            作成する
          </motion.button>
        </div>

        <p className="text-center text-xs text-slate-400 py-6">プレビュー表示は作成後のページで確認できます</p>
      </main>
    </div>
  );
}

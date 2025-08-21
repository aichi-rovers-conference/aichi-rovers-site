// app/exec/polls/[id]/edit/page.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ScrollProgressBar from "@/src/app/polls/ScrollProgressBar";
import { AnimatePresence, motion } from "framer-motion";
import QuestionCard from "@/src/components/polls/QuestionCard";
import AddQuestionMenu from "@/src/components/polls/AddQuestionMenu";
import type { Question, QuestionType } from "@/src/components/polls/types";
import ArcHeader from "@/src/components/ArcHeader";

const MAX_QUESTIONS = 20;
const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `tmp_${crypto.randomUUID()}`
    : `tmp_${Math.random().toString(36).slice(2, 10)}`;

export default function ExecEditPollPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("無題のアンケート");
  const [desc, setDesc] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [closesAt, setClosesAt] = useState<string>("");

  const [questions, setQuestions] = useState<Question[]>([]);
  const canAddMore = questions.length < MAX_QUESTIONS;

  useEffect(() => {
    (async () => {
      const p = await fetch(`/api/polls/${id}`, { cache: "no-store" }).then((r) => r.json());
      const mapped: Question[] = (p.questions ?? []).map((q: any) => {
        const cfg = q.config ?? {};
        const options = (q.choices ?? []).map((c: any) => c.label);
        const base: Question = {
          id: q.id,
          serverId: q.id,
          type: String(q.type).toLowerCase() as QuestionType,
          title: q.title ?? "無題の質問",
          options,
        };
        if (base.type === "text") {
          const multiline = typeof cfg.multiline === "boolean" ? cfg.multiline : true;
          base.text = {
            multiline,
            rows: multiline ? (Number.isFinite(+cfg.rows) ? +cfg.rows : 4) : undefined,
            placeholder: typeof cfg.placeholder === "string"
              ? cfg.placeholder
              : multiline ? "長文回答" : "回答を入力",
          };
        }
        if (base.type === "scale") {
          base.scale = {
            min: (cfg.min ?? 1) as 0 | 1,
            max: cfg.max ?? 5,
            minLabel: cfg.minLabel ?? "",
            maxLabel: cfg.maxLabel ?? "",
          };
        }
        if (base.type === "rating") {
          base.rating = { count: cfg.count ?? 5, shape: cfg.shape ?? "star" };
        }
        return base;
      });

      setTitle(p.title ?? "無題のアンケート");
      setDesc(p.description ?? p.desc ?? "");
      setIsPublic(p.isPublic ?? true);
      setClosesAt(p.closesAt ? new Date(p.closesAt).toISOString().slice(0, 16) : "");
      setQuestions(mapped.length ? mapped : [{ id: uid(), type: "radio", title: "無題の質問", options: ["選択肢", ""] }]);
      setLoading(false);
    })();
  }, [id]);

  const addQuestion = (type: QuestionType) => {
    if (!canAddMore) return;
    const idLocal = uid();
    const q: Question =
      type === "scale"
        ? { id: idLocal, type, title: "無題の質問", options: [], scale: { min: 1, max: 5, minLabel: "", maxLabel: "" } }
        : type === "rating"
        ? { id: idLocal, type, title: "無題の質問", options: [], rating: { count: 5, shape: "star" } }
        : type === "text"
        ? { id: idLocal, type, title: "無題の質問", options: [] }
        : { id: idLocal, type, title: "無題の質問", options: ["選択肢", ""] };
    setQuestions((qs) => [...qs, q]);
  };

  const updateQuestion = (idLocal: string, next: Question) =>
    setQuestions((qs) => qs.map((x) => (x.id === idLocal ? next : x)));

  const removeQuestion = (idLocal: string) =>
    setQuestions((qs) => qs.filter((x) => x.id !== idLocal));

  const payload = useMemo(
    () => ({
      title: title.trim(),
      desc: desc.trim() || null,
      isPublic,
      closesAt: closesAt || null,
      questions: questions.map((q, index) => ({
        id: q.serverId ?? undefined,
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
    }),
    [title, desc, isPublic, closesAt, questions]
  );

  const validate = () => {
    if (!payload.title) return "タイトルを入力してください";
    if (payload.questions.length === 0) return "質問を1つ以上追加してください";
    for (const q of payload.questions) {
      if (!q.title) return "各質問にタイトルを入力してください";
      if (q.type === "radio" || q.type === "checkbox") {
        if ((q.options?.length ?? 0) < 1) return "選択式の質問には少なくとも1つの選択肢が必要です";
      }
      if (q.type === "scale") {
        const s = q.scale!;
        if (![0, 1].includes(s.min) || s.max < 2 || s.max > 10 || s.max <= s.min) {
          return "均等メモリの範囲が不正です（最少は0または1、最大は2～10、最大は最小より大きい必要があります）";
        }
      }
      if (q.type === "rating") {
        const r = q.rating!;
        if (r.count < 2 || r.count > 10) return "評価の数は2～10で指定してください";
      }
    }
    return null;
  };

  const save = async () => {
    const msg = validate();
    if (msg) return alert(msg);

    const res = await fetch(`/api/polls/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      alert("保存に失敗しました");
      return;
    }
    // ★ 保存後は運営側の一覧へ
    router.push("/exec/polls");
  };

  if (loading) return <div className="p-6">読み込み中…</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-slate-50 to-slate-50 text-slate-900">
      <ScrollProgressBar />
      <div className="h-2 w-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400" />

      {/* 共通ヘッダー */}
      <ArcHeader />

      <main className="max-w-3xl mx-auto p-5 md:p-6 space-y-6">
        {/* タイトルカード */}
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
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              公開する
            </label>
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <span>締切（任意）</span>
              <input
                type="datetime-local"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 outline-none"
              />
            </div>
          </div>
        </section>

        {/* 設問 */}
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
                onChange={(next) => setQuestions((qs) => qs.map((x) => (x.id === q.id ? next : x)))}
                onRemove={() => setQuestions((qs) => qs.filter((x) => x.id !== q.id))}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* 追加＆保存 */}
        <div className="flex flex-wrap items-center gap-3">
          <AddQuestionMenu onAdd={addQuestion} disabled={!canAddMore} />
          <span className="ml-auto text-xs text-slate-500">{questions.length}/{MAX_QUESTIONS}</span>
        </div>

        <div className="pt-2">
          <motion.button
            onClick={save}
            whileTap={{ scale: 0.98 }}
            className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm hover:opacity-95 focus:outline-none focus:ring-4 focus:ring-violet-200"
          >
            保存
          </motion.button>
        </div>

        <p className="text-center text-xs text-slate-400 py-6">プレビューは閲覧ページで確認できます</p>
      </main>
    </div>
  );
}

// app/polls/page.tsx
"use client";

import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import ArcHeader from "@/src/components/ArcHeader";
import PollCard from "../../polls/PollCard";
import ScrollProgressBar from "../../polls/ScrollProgressBar";

/* ===================== 型＆ユーティリティ ===================== */

type Poll = {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  votes?: { id: string }[];
};

const fetcher = (u: string) => fetch(u, { cache: "no-store" }).then((r) => r.json());

/* ===================== ページ本体 ===================== */

export default function PollsPage() {
  const { data, isLoading, mutate } = useSWR("/api/polls", fetcher);

  // APIの戻りが [{...}] でも {items:[...]} でも吸収
  const polls: Poll[] = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];

  const [isEditing, setIsEditing] = useState(false);

  // 削除（楽観的更新）
  const handleDelete = useCallback(
    async (id: string) => {
      const previous = polls;
      mutate(polls.filter((p) => p.id !== id), false);
      try {
        const res = await fetch(`/api/polls/${encodeURIComponent(id)}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete");
        await mutate();
      } catch {
        mutate(previous, false);
      }
    },
    [polls, mutate]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 via-slate-50 to-slate-50">
        <ScrollProgressBar />
        <ArcHeader />
        <div className="h-2 w-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400" />
        <main className="mx-auto max-w-6xl p-6">
          <div className="h-6 w-36 animate-pulse rounded bg-slate-200" />
          <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-slate-50 to-slate-50 text-slate-900">
      <ScrollProgressBar />

      {/* 共通ヘッダー */}
      <div className="h-2 w-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400" />
      <ArcHeader />

      {/* メイン */}
      <main className="mx-auto max-w-6xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">アンケート一覧</h1>
            <p className="mt-1 text-sm text-slate-500">作成したアンケートは下のカードで確認できます。</p>
          </div>

          {/* 右上：編集・新規作成 */}
          <div className="flex items-center gap-2">
            <motion.button
              type="button"
              onClick={() => setIsEditing((v) => !v)}
              className={`h-10 rounded-xl px-4 text-sm font-medium border transition ${
                isEditing
                  ? "bg-slate-900 text-white border-slate-900 hover:opacity-90"
                  : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50 shadow-sm"
              }`}
              whileTap={{ scale: 0.98 }}
              aria-pressed={isEditing}
            >
              編集
            </motion.button>

            <Link href="/exec/polls/new" className="inline-block">
              <motion.span
                className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-sm font-medium text-white shadow-sm"
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                aria-label="アンケートを新規作成"
              >
                新規作成
              </motion.span>
            </Link>
          </div>
        </div>

        {/* グリッド */}
        {polls.length > 0 ? (
          <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] gap-5">
            {polls.map((p) => (
              <PollCard key={p.id} poll={p} isEditing={isEditing} onDelete={handleDelete} />
            ))}
          </div>
        ) : (
          // 空状態：作成ボタンはヘッダー右上にあるため、ここは運営ログインのみ
          <div className="mt-6 rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-slate-600">まだアンケートがありません。</p>
          </div>
        )}
      </main>
    </div>
  );
}
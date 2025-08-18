// app/polls/page.tsx
"use client";

import useSWR from "swr";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useState, useCallback } from "react";
import { Home } from "lucide-react";

import PollCard from "./PollCard";
import ScrollProgressBar from "./ScrollProgressBar";

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

  // 編集機能は使わない（常に false）
  const [isEditing] = useState(false);

  const { scrollYProgress } = useScroll();
  const headerScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.96]);

  // 削除（使わないが型合わせで残しておく）
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
        <div className="h-2 w-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400" />
        <header
          className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200 shadow-sm"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 sm:px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
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

      {/* アクセント帯 */}
      <div className="h-2 w-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400" />

      {/* ヘッダー：中央タイトルを“厳密センター”にするため 1fr / auto / 1fr の3カラム */}
      <header
        className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur shadow-sm"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            {/* 左：トップへ（サイズに関わらず中央は崩れない） */}
            <Link href="/" className="justify-self-start inline-block">
              <motion.span
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 sm:px-4 py-2 text-[13px] sm:text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200"
                whileHover={{ y: -2, scale: 1.02, boxShadow: "0 10px 24px rgba(0,0,0,0.06)" }}
                whileTap={{ scale: 0.97, y: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 24, mass: 0.7 }}
                style={{ scale: headerScale }}
                aria-label="ARCホームへ戻る"
              >
                <Home className="h-4 w-4" />
                ARCホームへ
              </motion.span>
            </Link>

            {/* 中央：ロゴ＋「ARCアンケート」（真ん中に固定） */}
            <div className="justify-self-center min-w-0">
              <Link href="/" className="flex items-center gap-2 sm:gap-3">
                <Image src="/images/ARClogo.png" alt="ARC logo" width={28} height={28} className="shrink-0" />
                <span
                  className="font-semibold tracking-tight text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis"
                  style={{ fontSize: "clamp(14px, 3.8vw, 18px)" }}
                  title="ARCアンケート"
                >
                  ARCアンケート
                </span>
              </Link>
            </div>

            {/* 右：左右バランス用のダミーカラム（空の 1fr。要素は不要） */}
            <div className="justify-self-end" />
          </div>
        </div>
      </header>

      {/* メイン */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1
              className="font-bold tracking-tight text-slate-900"
              style={{ fontSize: "clamp(18px, 4.6vw, 24px)" }}
            >
              アンケート一覧
            </h1>
            <p
              className="mt-1 text-slate-500"
              style={{ fontSize: "clamp(12px, 3.4vw, 14px)" }}
            >
              作成したアンケートは下のカードで確認できます。
            </p>
          </div>
        </div>

        {/* グリッド */}
        {polls.length > 0 ? (
          <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(17rem,1fr))] gap-5">
            {polls.map((p) => (
              <PollCard
                key={p.id}
                poll={p}
                isEditing={isEditing}
                onDelete={handleDelete}
                footer={
                  <div className={`flex items-center justify-center ${isEditing ? "pointer-events-none opacity-40" : ""}`}>
                    <Link href={`/polls/${p.id}`} className="inline-block">
                      <motion.span
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
                        whileHover={{ y: -2, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        回答はこちら
                      </motion.span>
                    </Link>
                  </div>
                }
              />
            ))}
          </div>
        ) : (
          // 空状態：運営ログインボタンは表示しない
          <div className="mt-6 rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-slate-700" style={{ fontSize: "clamp(13px, 3.4vw, 15px)" }}>
              まだアンケートがありません。
            </p>
            <p className="mt-1 text-slate-500" style={{ fontSize: "clamp(12px, 3.2vw, 14px)" }}>
              公開までしばらくお待ちください。
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

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

/* ===================== ページ本体（ヘッダーの“左右の隙間”を解消） ===================== */
/*
  ポイント
  - ヘッダー全体を scale で縮小すると左右に隙間が見えるため、ヘッダー背景は固定幅のまま。
  - アニメーションは内側の「コンテンツ行」にのみ適用（背景は100vwを維持）。
  - モバイル：h-14 ＋ items-center で縦中央／左右は px-4 のみ（safe-areaは足しても隙間に見えない程度）。
  - PC：従来の max-w-6xl センタリングのまま。
*/

export default function PollsPage() {
  const { data, isLoading, mutate } = useSWR("/api/polls", fetcher);
  const polls: Poll[] = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  const [isEditing] = useState(false);

  const { scrollYProgress } = useScroll();
  // ← 背景を縮めないため scale は内側にだけ適用する
  const rowScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.985]);
  const rowY = useTransform(scrollYProgress, [0, 0.2], [0, -1]);

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

  /* ===================== ローディング ===================== */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 via-slate-50 to-slate-50">
        <ScrollProgressBar />
        <div className="h-2 w-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400" />
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur shadow-sm">
          {/* PC（従来どおり） */}
          <div className="hidden md:block">
            <div className="mx-auto grid max-w-6xl grid-cols-3 items-center h-14 px-6">
              <div className="h-7 w-7 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
          {/* モバイル（全幅・中央寄せ） */}
          <div className="md:hidden">
            <div
              className="grid w-full grid-cols-3 items-center h-14 px-4"
              style={{
                paddingTop: "env(safe-area-inset-top)",
                paddingLeft: "calc(env(safe-area-inset-left) + 16px)",
                paddingRight: "calc(env(safe-area-inset-right) + 16px)",
              }}
            >
              <div className="h-7 w-7 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 md:px-6 py-4">
          <div className="h-6 w-36 animate-pulse rounded bg-slate-200" />
          <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] md:grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] gap-4 md:gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  /* ===================== 本文 ===================== */
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-slate-50 to-slate-50 text-slate-900">
      <ScrollProgressBar />
      <div className="h-2 w-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400" />

      {/* 背景は常に100vw。内部の行だけをわずかに縮小 → “左右の謎の隙間”が出ない */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur shadow-sm">
        {/* PC（据え置き・中央） */}
        <div className="hidden md:block">
          <div className="mx-auto grid max-w-6xl grid-cols-3 items-center h-14 px-6">
            {/* 左：ホーム */}
            <Link href="/" className="inline-block">
              <span className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
                <Home className="h-4 w-4" />
                ARCホームへ
              </span>
            </Link>
            {/* 中央：ロゴ＋タイトル */}
            <div className="justify-self-center">
              <Link href="/" className="flex items-center gap-3 leading-none">
                <Image src="/images/ARClogo.png" alt="ARC logo" width={28} height={28} className="h-7 w-7" />
                <span className="text-base font-semibold tracking-tight md:text-lg">ARCアンケート</span>
              </Link>
            </div>
            {/* 右：スペーサー */}
            <div className="justify-self-end" />
          </div>
        </div>

        {/* モバイル（全幅・中央）。←ここだけ motion で行を縮小 */}
        <motion.div className="md:hidden" style={{ scale: rowScale, y: rowY }}>
          <div
            className="grid w-full grid-cols-3 items-center h-14 px-4"
            /* safe-area のみ素直に加算（余白に見えにくい最小限の加算） */
            style={{
              paddingTop: "env(safe-area-inset-top)",
              paddingLeft: "calc(env(safe-area-inset-left) + 16px)",
              paddingRight: "calc(env(safe-area-inset-right) + 16px)",
            }}
          >
            {/* 左：ホーム（h-10で帯中央に） */}
            <Link href="/" className="inline-block">
              <span className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm">
                <Home className="h-4 w-4" />
                <span className="hidden xs:inline">ホームへ</span>
              </span>
            </Link>

            {/* 中央：ロゴ＋タイトル（leading-noneで上下ピタ） */}
            <div className="justify-self-center">
              <Link href="/" className="flex items-center gap-2 leading-none">
                <Image src="/images/ARClogo.png" alt="ARC logo" width={24} height={24} className="h-6 w-6" />
                <span className="text-[15px] font-semibold tracking-tight">ARCアンケート</span>
              </Link>
            </div>

            {/* 右：スペーサー */}
            <div className="justify-self-end" />
          </div>
        </motion.div>
      </header>

      {/* ===== メイン ===== */}
      <main className="mx-auto max-w-6xl px-4 md:px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight sm:text-xl md:text-2xl">アンケート一覧</h1>
            <p className="mt-1 text-sm text-slate-500">作成したアンケートは下のカードで確認できます。</p>
          </div>
        </div>

        {polls.length > 0 ? (
          <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] md:grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] gap-4 md:gap-5">
            {polls.map((p) => (
              <PollCard
                key={p.id}
                poll={p}
                isEditing={isEditing}
                onDelete={handleDelete}
                footer={
                  <div className="flex items-center justify-center">
                    <Link href={`/polls/${p.id}`} className="inline-block">
                      <motion.span
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
                        whileHover={{ y: -1, scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
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
          <div className="mt-5 rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-slate-700">まだアンケートがありません。</p>
            <p className="mt-1 text-sm text-slate-500">公開されるまでお待ちください。</p>
          </div>
        )}
      </main>
    </div>
  );
}

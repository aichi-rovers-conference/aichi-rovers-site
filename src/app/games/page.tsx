// app/games/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronLeft, Gamepad2 } from "lucide-react";
import ArcHeader1 from "@/src/components/ArcHeader1";

/* ====== ナビ（ヘッダーはそのまま使う） ====== */
const navItems = [
  { name: "ホーム", path: "/" },
  { name: "ARCとは", path: "/arc" },
  { name: "事業カレンダー", path: "/arc/calendar" },
  { name: "ARC定例会", path: "/arc/conference" },
  { name: "ARC運営委員会", path: "/arc/executive-committee" },
  { name: "ARCアンケート", path: "/polls" },
  { name: "ミニゲーム", path: "/games" },
  { name: "目安箱", path: "/suggestion-box"},
];

/* ====== コンテンツ（必要に応じて編集OK） ====== */
type Game = {
  key: string;
  title: string;
  description: string;
  href: string;
  imageUrl?: string;
  badge?: "New" | "人気" | string;
};

const GAMES: Game[] = [
  {
    key: "campsite",
    title: "キャンプサイトを探せ！",
    description: "地図とヒントを頼りにキャンプサイトを見つけるミニゲーム。",
    href: "/games/campsite",
    imageUrl: "/images/games/campsite.jpg",
    badge: "人気",
  },
  {
    key: "fire-start",
    title: "火起こしゲーム",
    description: "制限時間内にできるだけ早く火起こしをしよう！",
    href: "/games/fire-start",
    imageUrl: "/images/games/trivia.jpg",
  },
  {
    key: "puzzle",
    title: "スライドパズル",
    description: "連鎖で一気に稼げ！時間が尽きる前に高スコアを狙うタイムアタック。",
    href: "/games/scout-crush",
    imageUrl: "/images/games/puzzle.jpg",
    badge: "New",
  },
];

/* ====== カード ====== */
function GameCard({ game }: { game: Game }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      whileHover={{ y: -4 }}
      className="group relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <Link href={game.href} className="block h-full focus:outline-none">
        <div className="relative aspect-[16/9] w-full bg-slate-100">
          {game.imageUrl ? (
            <Image
              src={game.imageUrl}
              alt={game.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-400">
              <Gamepad2 className="h-8 w-8" />
            </div>
          )}
          {game.badge && (
            <div className="absolute left-3 top-3 rounded-full bg-rose-600/90 px-2.5 py-1 text-xs font-semibold text-white shadow">
              {game.badge}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 p-4">
          <h3 className="text-base font-bold text-slate-900 md:text-lg">{game.title}</h3>
          <p className="line-clamp-2 text-[14px] leading-relaxed text-slate-600">
            {game.description}
          </p>
          <motion.span
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-500 transition-colors"
          >
            プレイする
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path d="M13.5 4.5a.75.75 0 0 1 .75-.75h5.25a.75.75 0 0 1 .75.75v5.25a.75.75 0 0 1-1.5 0V6.31l-7.22 7.22a.75.75 0 1 1-1.06-1.06l7.22-7.22h-3.44a.75.75 0 0 1-.75-.75Z" />
              <path d="M6 5.25A2.25 2.25 0 0 0 3.75 7.5v12.75h12.75A2.25 2.25 0 0 0 18.75 18V9a.75.75 0 0 1 1.5 0v9A3.75 3.75 0 0 1 16.5 21.75H3.75a.75.75 0 0 1-.75-.75V7.5A3.75.75 0 0 1 6 3.75h9a.75.75 0 0 1 0 1.5H6Z" />
            </svg>
          </motion.span>
        </div>
      </Link>
    </motion.div>
  );
}

/* ====== ページ本体（ヒーロー画像は無し） ====== */
export default function GamesPage() {
  return (
    <div className="w-full bg-white min-h-screen">
      {/* ヘッダー（既存コンポーネント） */}
      <ArcHeader1 navItems={navItems} />

      {/* ヘッダー直下に余白を追加（スマホ>PCの順で広めに） */}
      <div
        className="h-5 sm:h-7 md:h-10"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
        aria-hidden="true"
      />

      {/* トップ行：戻るボタン＋ページ名 */}
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 md:px-16 py-6 md:py-10 text-slate-700">
        <Link
          href="/"
          className="group inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-sm text-slate-600 shadow-sm hover:bg-slate-50"
          aria-label="ホームへ戻る"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">ホームへ戻る</span>
        </Link>

        <div className="flex items-center gap-2 text-slate-900">
          <Gamepad2 className="h-5 w-5" />
          <h1
            className="font-extrabold tracking-tight"
            style={{ fontSize: "clamp(18px, 4.8vw, 24px)" }}
          >
            ミニゲーム
          </h1>
        </div>
      </div>

      {/* 見出し（赤バー付き） */}
      <section className="w-full bg-white px-6 md:px-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-gray-800 text-2xl md:text-3xl font-extrabold tracking-tight">
            ゲーム一覧
          </h2>
          <div className="mt-2 h-[2px] w-16 bg-red-600 rounded-full" />
          <p className="mt-2 text-sm text-slate-600">
            気分転換に、さくっと楽しく遊べるミニゲームを集めました。
          </p>
        </div>
      </section>

      {/* カードグリッド */}
      <section className="mx-auto max-w-6xl px-6 md:px-16 pb-16 pt-6">
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.map((game) => (
            <li key={game.key}>
              <GameCard game={game} />
            </li>
          ))}
        </ul>

        {/* 提案リンク（他ページのノート表現に合わせて） */}
        <div className="mt-10 mx-auto max-w-6xl">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-center text-sm text-slate-600">
              「こんなゲームが欲しい！」というアイデアがあれば、
              <a
                href="mailto:aichi.rovers.conference@gmail.com?subject=%E3%83%9F%E3%83%8B%E3%82%B2%E3%83%BC%E3%83%A0%E6%8F%90%E6%A1%88"
                className="ml-1 font-medium text-red-700 underline underline-offset-2 hover:no-underline"
              >
                メールで提案してください
              </a>
              。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronLeft, Gamepad2 } from "lucide-react";
import ArcHeader1 from "@/components/ArcHeader1";

const navItems = [
  { name: "ホーム", path: "/" },
  { name: "ARCとは", path: "/arc" },
  { name: "事業カレンダー", path: "/arc/calendar" },
  { name: "ARC定例会", path: "/arc/conference" },
  { name: "ARC運営委員会", path: "/arc/executive-committee" },
  { name: "ARCアンケート", path: "/polls" },
  { name: "ミニゲーム", path: "/games" },
];

const GAMES = [
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
    badge: "New",
  },
  {
    key: "puzzle",
    title: "スライドパズル",
    description: "空白を使ってピースを揃えるクラシックパズル。",
    href: "/games/puzzle",
    imageUrl: "/images/games/puzzle.jpg",
  },
];

export default function GamesPage() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="w-full bg-white min-h-screen">
      <ArcHeader1 navItems={navItems} />

      <GamesHero hideText={isOpen} />

      <div className="mx-auto max-w-6xl px-6 md:px-16 py-6 flex items-center gap-3 text-slate-700">
        <Link href="/" className="group inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">ホームへ戻る</span>
        </Link>
        <div className="flex items-center gap-2 text-slate-900">
          <Gamepad2 className="h-5 w-5" />
          <h2 className="text-base font-bold sm:text-lg">ミニゲーム</h2>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-6 md:px-16 pb-16">
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.map(({ key, ...card }) => (
            <li key={key}>
              <GameCard {...card} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function GamesHero({ hideText }: { hideText: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const yImg = useTransform(scrollYProgress, [0, 1], [0, 320]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 1], [0.5, 0.6]);

  return (
    <div ref={ref} className="select-none relative w-full h-[40vh] md:h-[52vh] overflow-hidden">
      <motion.div style={{ y: yImg }} className="absolute inset-0 will-change-transform">
        <Image src="/images/R6-3.JPG" alt="Aichi Rovers Conference" fill className="object-cover z-0 select-none" draggable={false} priority sizes="100vw" />
      </motion.div>
      <motion.div style={{ opacity: overlayOpacity }} className="absolute inset-0 bg-black z-10" />
      <motion.div className={`select-none absolute inset-0 z-20 flex flex-col items-center justify-center text-center ${hideText ? "pointer-events-none" : ""}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: hideText ? 0 : 1, y: 0 }} transition={{ duration: 1, ease: "easeOut" }} aria-hidden={hideText}>
        <h1 className="text-white text-5xl md:text-7xl font-bold mb-3 drop-shadow-lg">ミニゲーム</h1>
        <p className="text-white/90 text-lg md:text-2xl font-semibold">気分転換に、さくっとプレイ</p>
      </motion.div>
    </div>
  );
}

function GameCard({ title, description, href, imageUrl, badge }: { title: string; description: string; href: string; imageUrl?: string; badge?: string; }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} whileHover={{ y: -4 }} className="group relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <Link href={href} className="block h-full">
        <div className="relative aspect-[16/9] w-full bg-slate-100">
          {imageUrl ? (
            <Image src={imageUrl} alt={title} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-400">
              <Gamepad2 className="h-8 w-8" />
            </div>
          )}
          {badge && (
            <div className="absolute left-3 top-3 rounded-full bg-rose-600/90 px-2.5 py-1 text-xs font-semibold text-white shadow">{badge}</div>
          )}
        </div>
        <div className="flex flex-col gap-2 p-4">
          <h2 className="text-base font-bold text-slate-900 md:text-lg">{title}</h2>
          <p className="line-clamp-2 text-[14px] leading-relaxed text-slate-600">{description}</p>
          <motion.button whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }} className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-500 transition-colors">
            プレイする
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M13.5 4.5a.75.75 0 0 1 .75-.75h5.25a.75.75 0 0 1 .75.75v5.25a.75.75 0 0 1-1.5 0V6.31l-7.22 7.22a.75.75 0 1 1-1.06-1.06l7.22-7.22h-3.44a.75.75 0 0 1-.75-.75Z" />
              <path d="M6 5.25A2.25 2.25 0 0 0 3.75 7.5v12.75h12.75A2.25 2.25 0 0 0 18.75 18V9a.75.75 0 0 1 1.5 0v9A3.75 3.75 0 0 1 16.5 21.75H3.75a.75.75 0 0 1-.75-.75V7.5A3.75.75 0 0 1 6 3.75h9a.75.75 0 0 1 0 1.5H6Z" />
            </svg>
          </motion.button>
        </div>
      </Link>
    </motion.div>
  );
}

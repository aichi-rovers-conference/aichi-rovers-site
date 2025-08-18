"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { FaFacebook, FaInstagram, FaXTwitter, FaLine } from "react-icons/fa6";

/* ================= 設定（編集者向け） =================
 * 1) 定例会データは /public/meetings/index.json に置く
 * 2) フライヤー画像は /public/images/yujo-seal-flyer.jpg を推奨
 * 3) 報告ページのリンクは外部URLでもサイト内URLでもOK
 * ==================================================== */
const DATA_URL = "/meetings/index.json";

type Meeting = {
  date: string;                           // 実施日（YYYY-MM-DD）
  round: 1 | 2 | 3 | 4;                   // 第n回（3は定例会・交流会）
  fiscalYear?: number;                    // 例: 2025 = 令和7年度（未指定OK）
  reportUrl: string;                      // レポートURL
  title?: string;                         // 表示用タイトル（任意）
  youtubeId?: string;                     // YouTube動画ID（任意）
  thumb?: string;                         // サムネイル画像（任意）
};

/* === ヘルパー === */
function toFiscalYear(d: Date) {
  const y = d.getFullYear();
  const m = d.getMonth(); // 0-11
  return m <= 2 ? y - 1 : y; // 4月始まり
}
function toWarekiFiscalLabel(fy: number) {
  const reiwa = fy - 2018; // 令和元年=2019
  return reiwa >= 1 ? `令和${reiwa}年度` : `${fy}年度`;
}
function roundLabel(n: number) {
  if (n === 3) return "第３回（定例会・交流会）";
  return `第${n}回`;
}

/* === 最新ハイライト === */
function LatestHighlight({ item }: { item: Meeting & { fy: number } }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900">最新のレポート</h3>
        <div className="h-[3px] w-8 bg-red-600 rounded-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1.4fr,1fr] gap-5 items-start">
        {/* 左：動画 or サムネ */}
        <div className="w-full">
          {item.youtubeId ? (
            <div className="aspect-video w-full rounded-xl overflow-hidden border">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${item.youtubeId}`}
                title="ARC 定例会ハイライト"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          ) : item.thumb ? (
            <Image
              src={item.thumb}
              alt="定例会の様子"
              width={960}
              height={540}
              className="rounded-xl shadow object-cover"
              priority={false}
              loading="lazy"
              sizes="(max-width: 768px) 92vw, 640px"
            />
          ) : (
            <div className="aspect-video w-full rounded-xl bg-gray-100 grid place-items-center text-gray-500">
              No Video / Thumbnail
            </div>
          )}
        </div>

        {/* 右：テキスト */}
        <div className="space-y-2 sm:space-y-3">
          <div className="text-xs sm:text-sm text-gray-500">{toWarekiFiscalLabel(item.fy)}</div>
          <h4 className="text-base sm:text-lg font-semibold text-gray-900">
            {item.title ?? `${roundLabel(item.round)} 定例会`}
          </h4>
          <div className="text-sm text-gray-700">{item.date}</div>
          <motion.a
            href={item.reportUrl}
            target={item.reportUrl.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className="inline-flex min-h-11 items-center gap-2 px-4 py-2 rounded-lg border border-red-600 font-bold text-gray-900 bg-white shadow-sm text-sm"
          >
            報告ページへ <span aria-hidden>→</span>
          </motion.a>
        </div>
      </div>
    </div>
  );
}

/* === 一覧カード === */
function MeetingCard({ m }: { m: Meeting & { fy: number } }) {
  return (
    <motion.a
      href={m.reportUrl}
      target={m.reportUrl.startsWith("http") ? "_blank" : undefined}
      rel="noopener noreferrer"
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className="block rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
    >
      <div className="aspect-[16/9] w-full bg-gray-100 overflow-hidden">
        {m.thumb ? (
          <Image
            src={m.thumb}
            alt={m.title ?? "定例会の様子"}
            width={800}
            height={450}
            className="w-full h-full object-cover"
            loading="lazy"
            sizes="(max-width: 768px) 92vw, 320px"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-gray-500">No Image</div>
        )}
      </div>
      <div className="p-4">
        <div className="text-xs text-gray-500 mb-1">{toWarekiFiscalLabel(m.fy)}</div>
        <div className="text-sm sm:text-base font-semibold text-gray-900">
          {m.title ?? `${roundLabel(m.round)} 定例会`}
        </div>
        <div className="text-xs sm:text-sm text-gray-600 mt-1">{m.date}</div>
        <div className="mt-3 inline-flex items-center text-xs sm:text-sm font-bold text-red-700">
          レポートを見る <span className="ml-1" aria-hidden>→</span>
        </div>
      </div>
    </motion.a>
  );
}

export default function MeetingsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  /* === ナビ === */
  const navItems = [
    { name: "ホーム", path: "/" },
    { name: "ARCとは", path: "/arc" },
    { name: "事業カレンダー", path: "/arc/calendar" },
    { name: "ARC定例会", path: "/arc/conference" },
    { name: "ARC運営委員会", path: "/arc/executive-committee" },
    { name: "ARCアンケート", path: "/polls" },
    { name: "ミニゲーム", path: "/games" },
  ];

  /* === ヒーロー（パララックス） === */
  const heroRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const yImg = useTransform(scrollYProgress, [0, 1], [0, 280]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 1], [0.45, 0.6]);

  /* === データ読込 === */
  const [items, setItems] = useState<(Meeting & { fy: number; ts: number })[] | null>(null);

  useEffect(() => {
    fetch(DATA_URL, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Meeting[]) => {
        if (!Array.isArray(data)) return setItems([]);
        const cooked = data
          .filter((d) => d?.date && d?.reportUrl && d?.round)
          .map((d) => {
            const dt = new Date(d.date + "T00:00:00");
            const fy = d.fiscalYear ?? toFiscalYear(dt);
            return { ...d, fy, ts: dt.getTime() };
          })
          .sort((a, b) => b.ts - a.ts); // 降順
        setItems(cooked);
      })
      .catch(() => setItems([]));
  }, []);

  const latest = items?.[0];

  const grouped = useMemo(() => {
    const map = new Map<number, (Meeting & { fy: number; ts: number })[]>();
    (items ?? []).forEach((m) => {
      if (!map.has(m.fy)) map.set(m.fy, []);
      map.get(m.fy)!.push(m);
    });
    for (const [fy, arr] of map) {
      arr.sort((a, b) => a.round - b.round); // 第1→第4
      map.set(fy, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]); // 年度降順
  }, [items]);

  return (
    <div className="w-full bg-white">
      {/* ヘッダー（スマホ最適化：sticky + safe-area + absolute drawer） */}
      <header className="select-none sticky top-0 z-50 w-full bg-white shadow relative">
        <div className="flex items-center justify-between px-4 py-2 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center">
            <motion.button
              onClick={() => setIsOpen((v) => !v)}
              className="mr-2 md:hidden inline-flex h-11 w-11 items-center justify-center rounded-lg"
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              aria-label={isOpen ? "メニューを閉じる" : "メニューを開く"}
              aria-expanded={isOpen}
              aria-controls="mobile-drawer"
            >
              <AnimatePresence mode="wait" initial={false}>
                {isOpen ? (
                  <motion.span
                    key="x"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    className="block"
                  >
                    <X size={24} className="text-black" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    className="block"
                  >
                    <Menu size={24} className="text-black" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            <Image
              src="/images/ARClogo.png"
              alt="ARC Logo"
              width={34}
              height={34}
              className="object-contain select-none"
              draggable={false}
              priority={false}
            />
            <span className="ml-2 text-[15px] sm:text-base font-bold text-gray-800 select-none">
              愛知ローバース会議
            </span>
          </div>

          {/* PCナビ */}
          <nav className="hidden md:flex items-center space-x-4 lg:space-x-6 text-gray-600">
            {[
              { name: "ホーム", path: "/" },
              { name: "ARCとは", path: "/arc" },
              { name: "事業カレンダー", path: "/arc/calendar" },
              { name: "ARC定例会", path: "/arc/conference" },
              { name: "ARC運営委員会", path: "/arc/executive-committee" },
              { name: "ARCアンケート", path: "/polls" },
              { name: "ミニゲーム", path: "/games" },
            ].map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`px-3 py-2 rounded-lg transition text-sm lg:text-base ${
                    isActive ? "text-black font-bold" : "text-gray-500 hover:text-black"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* スマホドロワー（absolute + max-height。閉時は高さ0で余白ゼロ） */}
        <div
          id="mobile-drawer"
          className={[
            "md:hidden absolute left-0 right-0 top-full bg-white shadow border-t",
            "overflow-hidden transition-[max-height,opacity,transform] duration-300 ease-out origin-top",
            isOpen ? "max-h-[70vh] opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-1 pointer-events-none",
          ].join(" ")}
          aria-hidden={!isOpen}
          role="navigation"
        >
          <nav className="flex flex-col p-2 pb-[env(safe-area-inset-bottom)]">
            {[
              { name: "ホーム", path: "/" },
              { name: "ARCとは", path: "/arc" },
              { name: "事業カレンダー", path: "/arc/calendar" },
              { name: "ARC定例会", path: "/arc/conference" },
              { name: "ARC運営委員会", path: "/arc/executive-committee" },
              { name: "ARCアンケート", path: "/polls" },
              { name: "ミニゲーム", path: "/games" },
            ].map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`mx-2 my-1 rounded-lg px-4 py-3 text-base font-medium active:scale-[0.99] ${
                    isActive ? "text-black font-bold bg-gray-100" : "text-gray-700 hover:bg-gray-50"
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* ヒーロー（モバイル控えめ） */}
      <div ref={heroRef} className="select-none relative w-full h-[38vh] md:h-[48vh] overflow-hidden">
        <motion.div style={{ y: yImg }} className="absolute inset-0 will-change-transform">
          <Image
            src="/images/R6-3.JPG"
            alt="Aichi Rovers Conference"
            fill
            className="object-cover z-0 select-none"
            draggable={false}
            priority
            sizes="100vw"
          />
        </motion.div>
        <motion.div style={{ opacity: overlayOpacity }} className="absolute inset-0 bg-black/70 z-10" />
        <motion.div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className="text-white text-3xl sm:text-4xl md:text-6xl font-extrabold drop-shadow-lg">
            定例会の様子
          </h1>
          <p className="text-white/90 font-medium text-sm sm:text-base md:text-xl mt-2">
            ARC Regular Meetings Report
          </p>
        </motion.div>
      </div>

      {/* 本文：最新 & アーカイブ */}
      <section className="w-full bg-white py-8 md:py-10 px-4 sm:px-6 md:px-16">
        <div className="max-w-6xl mx-auto space-y-8">
          {latest ? (
            <LatestHighlight item={{ ...latest, fy: latest.fy }} />
          ) : (
            <p className="text-center text-sm text-gray-500">まだ定例会の記録はありません。</p>
          )}

          <div>
            <h2 className="text-gray-800 text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">
              年度別アーカイブ
            </h2>
            <div className="mt-2 h-[2px] w-16 bg-red-600 rounded-full" />
          </div>

          <div className="space-y-8">
            {grouped.map(([fy, arr]) => (
              <div key={fy} className="space-y-4">
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                  {toWarekiFiscalLabel(fy)}
                </h3>
                <div className="text-xs sm:text-sm text-gray-600 -mt-1">
                  第１回 / 第２回 / 第３回（毎年三回目は定例会・交流会になります） / 第４回
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                  {arr.map((m) => (
                    <MeetingCard key={`${m.fy}-${m.round}-${m.date}`} m={m} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 友情シールプロジェクト（軽量・中央寄せ） */}
      <section className="px-4 sm:px-6 md:px-16 pb-10 bg-gradient-to-b from-red-50/40 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">友情シールプロジェクト</h2>
            <p className="mt-2 text-base md:text-lg font-semibold text-red-700">
              Scouts of AICHI siblings together
            </p>
            <p className="mt-1 text-sm md:text-base font-bold text-gray-800">（愛知のスカウトはみな兄弟である）</p>
            <p className="mt-3 text-[15px] sm:text-base text-gray-700 leading-7 max-w-3xl mx-auto">
              この言葉をキーワードに、定例会が「愛知の兄弟たちが集う温かい場所」になり、友情の輪が広がっていくことへの願いを込めたプロジェクトです。
              まだARC定例会に参加したことの無い仲間を誘い、友情シールを貰おう！
            </p>
          </div>

          <div className="flex justify-center">
            <Image
              src="/images/yujo-seal-flyer.jpg"
              alt="友情シールプロジェクト フライヤー"
              width={920}
              height={600}
              className="rounded-xl shadow-lg object-contain bg-white"
              loading="lazy"
              sizes="(max-width: 768px) 92vw, 720px"
            />
          </div>
        </div>
      </section>

      {/* 仕切り線 */}
      <div className="max-w-6xl mx-auto mt-6 mb-9 px-4 sm:px-6 md:px-16">
        <div className="border-t border-gray-300" />
      </div>

      {/* SNSリンク */}
      <section className="bg-gray-100 py-6">
        <div className="max-w-6xl mx-auto flex justify-center gap-7">
          <motion.a
            href="https://www.facebook.com/aichirovers/?locale=ja_JP"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ y: -2, scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className="text-blue-500 hover:text-blue-400 transition-colors duration-200"
            aria-label="Facebook"
          >
            <FaFacebook size={26} />
          </motion.a>
          <span className="text-pink-500 opacity-40 cursor-not-allowed" aria-disabled="true" aria-label="Instagram（未開設）">
            <FaInstagram size={28} />
          </span>
          <span className="text-black opacity-40 cursor-not-allowed" aria-disabled="true" aria-label="X（未開設）">
            <FaXTwitter size={28} />
          </span>
          <motion.a
            href="https://lin.ee/BPXqTTv"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ y: -2, scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className="text-green-600 hover:text-green-500 transition-colors duration-200"
            aria-label="公式LINE"
          >
            <FaLine size={28} />
          </motion.a>
        </div>
      </section>

      {/* フッター */}
      <footer className="bg-gray-900 text-white py-8 mt-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-16 text-center">
          <p className="text-base sm:text-lg font-semibold mb-2">お問い合わせ</p>
          <a
            href="mailto:aichi.rovers.conference@gmail.com"
            className="text-red-400 hover:text-red-300 transition-colors duration-200 break-all"
          >
            aichi.rovers.conference@gmail.com
          </a>
          <p className="mt-4 text-xs sm:text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Aichi Rovers Conference. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { FaFacebook, FaInstagram, FaXTwitter, FaLine } from "react-icons/fa6";

/** === 設定（編集者向け） ===========================
 * 1) /public/calendar/events.json
 * 2) /public/calendar-last-updated.txt
 * ================================================ */
const EVENTS_JSON_URL = "/calendar/events.json";
const LAST_UPDATED_TXT_URL = "/calendar-last-updated.txt";

type EventItem = {
  date: string; // "YYYY-MM-DD"
  title: string;
  url?: string;
  note?: string;
  area?: string;
};

function groupByMonth(events: EventItem[]) {
  const map: Record<number, EventItem[]> = {};
  events.forEach((e) => {
    const m = new Date(e.date + "T00:00:00").getMonth();
    (map[m] ??= []).push(e);
  });
  for (const m in map) {
    map[m]!.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }
  return map;
}

/** 月カード（年間一覧） */
function MonthCard({ monthIndex, items = [] }: { monthIndex: number; items: EventItem[] }) {
  const monthName = `${monthIndex + 1}月`;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-gray-900">{monthName}</h3>
        <div className="h-[3px] w-8 bg-red-600 rounded-full" />
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">予定は未登録です。</p>
      ) : (
        <ul className="space-y-2">
          {items.map((ev, i) => (
            <li key={`${ev.date}-${i}`} className="text-sm">
              <div className="flex items-start gap-2">
                <span className="shrink-0 mt-[2px] inline-block h-2 w-2 rounded-full bg-red-600" />
                <div className="min-w-0">
                  <div className="text-gray-900 font-medium">
                    {ev.url ? (
                      <a
                        href={ev.url}
                        className="underline underline-offset-2 hover:no-underline"
                        target={ev.url.startsWith("http") ? "_blank" : undefined}
                        rel="noopener noreferrer"
                      >
                        {ev.title}
                      </a>
                    ) : (
                      ev.title
                    )}
                  </div>
                  <div className="text-gray-600">{ev.date}{ev.area ? ` / ${ev.area}` : ""}</div>
                  {ev.note && <div className="text-gray-500">{ev.note}</div>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CalendarPage() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // ===== ヒーロー（パララックス） =====
  const heroRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const yImg = useTransform(scrollYProgress, [0, 1], [0, 280]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 1], [0.45, 0.6]);

  // ===== ナビ =====
  const navItems = [
    { name: "ホーム", path: "/" },
    { name: "ARCとは", path: "/arc" },
    { name: "事業カレンダー", path: "/arc/calendar" },
    { name: "ARC定例会", path: "/arc/conference" },
    { name: "ARC運営委員会", path: "/arc/executive-committee" },
    { name: "ARCアンケート", path: "/polls" },
    { name: "ミニゲーム", path: "/games" },
  ];

  // ===== データ読込 =====
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("—");

  useEffect(() => {
    fetch(EVENTS_JSON_URL, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: EventItem[]) => {
        setEvents(Array.isArray(data) ? data.filter((d) => d?.date && d?.title) : []);
      })
      .catch(() => setEvents([]));

    fetch(LAST_UPDATED_TXT_URL, { cache: "no-store" })
      .then((r) => (r.ok ? r.text() : "—"))
      .then((t) => setLastUpdated((t || "—").trim()))
      .catch(() => setLastUpdated("—"));
  }, []);

  const byMonth = useMemo(() => groupByMonth(events ?? []), [events]);

  return (
    <div className="w-full bg-white">
      {/* ヘッダー（sticky + relative。ドロワーはabsolute＋max-heightで未展開時の余白ゼロ） */}
      <header className="select-none sticky top-0 z-50 w-full bg-white shadow relative">
        <div className="flex items-center justify-between px-4 py-2 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center">
            {/* ハンバーガー */}
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
                    <X size={26} className="text-black" />
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
                    <Menu size={26} className="text-black" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            <Image
              src="/images/ARClogo.png"
              alt="ARC Logo"
              width={36}
              height={36}
              className="object-contain select-none"
              draggable={false}
            />
            <span className="ml-2 text-base sm:text-lg font-bold text-gray-800 select-none">愛知ローバース会議</span>
          </div>

          {/* 右上ナビ（PC） */}
          <nav className="hidden md:flex items-center space-x-4 lg:space-x-6 text-gray-600">
            {navItems.map((item) => {
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

        {/* スマホドロワー（absolute配置。閉時は高さ0） */}
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
            {navItems.map((item) => {
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

      {/* ヒーロー（高さをモバイル寄りに抑制） */}
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
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        >
          <h1 className="text-white text-3xl sm:text-4xl md:text-6xl font-extrabold drop-shadow-lg">事業カレンダー</h1>
          <p className="text-white/90 font-medium text-base sm:text-lg md:text-2xl mt-2">
            ARC Annual Schedule & Recruiting
          </p>
        </motion.div>
      </div>

      {/* 現在募集中の案内 */}
      <section className="w-full bg-white py-8 md:py-10 px-4 sm:px-6 md:px-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-red-600 text-2xl sm:text-3xl md:text-4xl font-bold mb-3">現在募集中の案内</h2>
          <p className="text-xs sm:text-sm text-gray-600 mb-4">※URLをクリックすると開催要項に移動できます</p>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-gray-800 font-medium text-sm sm:text-base">現在募集している事業はありません。</p>
          </div>

          <div className="mt-6 flex justify-center">
            <Image
              src="/images/sample.png"
              alt="募集案内イメージ"
              width={720}
              height={420}
              className="rounded-xl shadow-lg object-cover select-none"
              draggable={false}
              loading="lazy"
              sizes="(max-width: 768px) 92vw, 720px"
            />
          </div>
        </div>
      </section>

      {/* 年間スケジュール */}
      <section className="w-full bg-white pb-10 px-4 sm:px-6 md:px-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-gray-800 text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">年間スケジュール</h2>
          <div className="mt-2 h-[2px] w-16 bg-red-600 rounded-full" />

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 12 }).map((_, i) => (
              <MonthCard key={i} monthIndex={i} items={byMonth[i] ?? []} />
            ))}
          </div>
        </div>

        {/* 最終更新日時 */}
        <div className="max-w-6xl mx-auto mt-6 text-xs sm:text-sm text-gray-600">
          最終更新日時：{lastUpdated}
          <div className="mt-2 text-[11px] sm:text-xs text-gray-500 space-y-1">
            <p>※愛知のRSが参加できそうな事業を記載しています。</p>
            <p>※やむを得ない理由により、日程の変更・事業の中止となる場合があります。</p>
          </div>
        </div>
      </section>

      {/* 仕切り線 */}
      <div className="max-w-6xl mx-auto mt-6 mb-10 px-4 sm:px-6 md:px-16">
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

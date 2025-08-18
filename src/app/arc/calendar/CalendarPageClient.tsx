"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { FaFacebook, FaInstagram, FaXTwitter, FaLine } from "react-icons/fa6";
import ArcHeader1 from "@/components/ArcHeader1";

/** === 設定（編集者向け） ===========================================
 * 1) イベント一覧の置き場所：/public/calendar/events.json
 *    例:
 *    [
 *      {"date":"2025-04-29","title":"愛知ローバームート","url":"https://..."},
 *      {"date":"2025-05-18","title":"地区合同ハイク"},
 *      {"date":"2025-08-10","title":"ARC定例会 #3","url":"/arc/meetings"}
 *    ]
 *
 * 2) 最終更新日時の置き場所：/public/calendar-last-updated.txt
 *    例: 2025-08-15 09:30 更新
 *
 * 3) Googleカレンダーを併用したい場合は iframe を追記してOK（編集者はカレンダーを更新するだけ）
 * ================================================================ */
const EVENTS_JSON_URL = "/calendar/events.json";
const LAST_UPDATED_TXT_URL = "/calendar-last-updated.txt";

/* 型 */
type EventItem = {
  date: string;     // ISO形式 "YYYY-MM-DD"
  title: string;
  url?: string;
  note?: string;
  area?: string;
};

function groupByMonth(events: EventItem[]) {
  const map: Record<number, EventItem[]> = {};
  events.forEach((e) => {
    const m = new Date(e.date + "T00:00:00").getMonth(); // 0-11
    if (!map[m]) map[m] = [];
    map[m].push(e);
  });
  // 月内は日付順
  for (const m in map) {
    map[m]!.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }
  return map;
}

/** 月カード（年間一覧） */
function MonthCard({
  monthIndex,
  items = [],
}: {
  monthIndex: number; // 0-11
  items: EventItem[];
}) {
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
                  <div className="text-gray-600">
                    {ev.date} {ev.area ? ` / ${ev.area}` : ""}
                  </div>
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

  // ===== ヒーロー（ホーム同様のパララックス） =====
  const heroRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const yImg = useTransform(scrollYProgress, [0, 1], [0, 320]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 1], [0.5, 0.6]);

  // ===== ナビ =====
  const navItems = [
    { name: "ホーム", path: "/" },
    { name: "ARCとは", path: "/arc" },
    { name: "事業カレンダー", path: "/arc/calendar" },
    { name: "ARC定例会", path: "/arc/conference" },
    { name: "ARC運営委員会", path: "/arc/executive-committee" },
    { name: "ARCアンケート", path: "/polls" },
    { name: "ミニゲーム", path: "/games"},
  ];

  // ===== データ読込 =====
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("—");

  useEffect(() => {
    // イベント一覧（JSON）
    fetch(EVENTS_JSON_URL, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: EventItem[]) => {
        if (Array.isArray(data)) {
          // 不正データを軽く防御
          const safe = data.filter((d) => d?.date && d?.title);
          setEvents(safe);
        } else {
          setEvents([]);
        }
      })
      .catch(() => setEvents([]));

    // 最終更新
    fetch(LAST_UPDATED_TXT_URL, { cache: "no-store" })
      .then((r) => (r.ok ? r.text() : "—"))
      .then((t) => setLastUpdated(t.trim() || "—"))
      .catch(() => setLastUpdated("—"));
  }, []);

  const byMonth = useMemo(() => groupByMonth(events ?? []), [events]);

  return (
    <div className="w-full bg-white">
      {/* ヘッダー（ホーム踏襲・最小変更） */}
      <ArcHeader1 navItems={navItems} />

      {/* ヒーロー */}
      <div ref={heroRef} className="select-none relative w-full h-[42vh] overflow-hidden">
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
        <motion.div style={{ opacity: overlayOpacity }} className="absolute inset-0 bg-black z-10" />
        <motion.div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        >
          <h1 className="text-white text-5xl md:text-6xl font-bold drop-shadow-lg">事業カレンダー</h1>
          <p className="text-white/90 font-medium text-xl md:text-2xl mt-3">
            ARC Annual Schedule & Recruiting
          </p>
        </motion.div>
      </div>

      {/* 現在募集中の案内 */}
      <section className="w-full bg-white py-10 px-6 md:px-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-red-600 text-3xl md:text-4xl font-bold mb-3">現在募集中の案内</h2>
          <p className="text-sm text-gray-600 mb-4">※URLをクリックすると開催要項にいどうできます</p>

          {/* 今は募集なし（文言固定） */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-gray-800 font-medium">現在募集している事業はありません。</p>
          </div>

          {/* 下に画像 */}
          <div className="mt-6 flex justify-center">
            <Image
              src="/images/sample.png"
              alt="募集案内イメージ"
              width={720}
              height={420}
              className="rounded-xl shadow-lg object-cover select-none"
              draggable={false}
            />
          </div>
        </div>
      </section>

      {/* 年間スケジュール */}
      <section className="w-full bg-white pb-10 px-6 md:px-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-gray-800 text-2xl md:text-3xl font-extrabold tracking-tight">年間スケジュール</h2>
          <div className="mt-2 h-[2px] w-16 bg-red-600 rounded-full" />

          {/* 12か月グリッド */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 12 }).map((_, i) => (
              <MonthCard key={i} monthIndex={i} items={byMonth[i] ?? []} />
            ))}
          </div>

          {/* ここに Google カレンダーを併用して埋め込む場合（任意）
              編集者は Google カレンダー側を更新するだけで反映されます
          <div className="mt-8 aspect-[16/9] w-full rounded-xl overflow-hidden border">
            <iframe
              src="https://calendar.google.com/calendar/embed?src=YOUR_CALENDAR_ID&ctz=Asia%2FTokyo"
              className="w-full h-full"
            />
          </div>
          */}
        </div>

        {/* 最終更新日時 */}
        <div className="max-w-6xl mx-auto mt-6 text-sm text-gray-600">
          最終更新日時：{lastUpdated}
          <div className="mt-2 text-xs text-gray-500 space-y-1">
            <p>※愛知のRSが参加できそうな事業を記載しています。</p>
            <p>※やむを得ない理由により、日程の変更・事業の中止となる場合があります。</p>
          </div>
        </div>
      </section>

      {/* 仕切り線 */}
      <div className="max-w-6xl mx-auto mt-6 mb-10 px-6 md:px-16">
        <div className="border-t border-gray-300" />
      </div>

      {/* SNSリンク（ホーム踏襲） */}
      <section className="bg-gray-100 py-6">
        <div className="max-w-6xl mx-auto flex justify-center gap-8">
          <motion.a
            href="https://www.facebook.com/aichirovers/?locale=ja_JP"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ y: -4, scale: 1.06 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className="text-blue-500 hover:text-blue-400 transition-colors duration-200"
          >
            <FaFacebook size={28} />
          </motion.a>
          <span className="text-pink-500 opacity-40 cursor-not-allowed">
            <FaInstagram size={32} />
          </span>
          <span className="text-black opacity-40 cursor-not-allowed">
            <FaXTwitter size={32} />
          </span>
          <motion.a
            href="https://lin.ee/BPXqTTv"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ y: -4, scale: 1.06 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className="text-green-600 hover:text-green-500 transition-colors duration-200"
          >
            <FaLine size={32} />
          </motion.a>
        </div>
      </section>

      {/* フッター（ホーム踏襲） */}
      <footer className="bg-gray-900 text-white py-6 mt-12">
        <div className="max-w-6xl mx-auto px-6 md:px-16 text-center">
          <p className="text-lg font-semibold mb-2">お問い合わせ</p>
          <a
            href="mailto:aichi.rovers.conference@gmail.com"
            className="text-red-400 hover:text-red-300 transition-colors duration-200"
          >
            aichi.rovers.conference@gmail.com
          </a>
          <p className="mt-4 text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Aichi Rovers Conference. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

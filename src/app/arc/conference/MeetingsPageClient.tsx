"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { FaFacebook, FaInstagram, FaXTwitter, FaLine } from "react-icons/fa6";
import ArcHeader1 from "@/src/components/ArcHeader1";

/* ===== 型（DB = MeetingReportに対応） ===== */
type MeetingReport = {
  id: number;
  title: string;
  slug: string;
  date: string;           // ISO文字列で受け取る
  round: number;          // 1..4
  fiscalYear: number;     // 例: 2025（令和7年度）
  reportUrl?: string | null;
  coverUrl?: string | null;
  youtubeId?: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

function toWarekiFiscalLabel(fy: number) {
  const reiwa = fy - 2018;
  return reiwa >= 1 ? `令和${reiwa}年度` : `${fy}年度`;
}
function roundLabel(n: number) {
  return n === 3 ? "第３回（定例会・交流会）" : `第${n}回`;
}
function fmtDate(d: string) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function NewBadge() {
  return (
    <div className="absolute left-3 top-3 z-30">
      <div className="h-9 w-9 rounded-full bg-red-600 text-white grid place-items-center shadow-lg">
        <span className="text-[10px] font-extrabold tracking-wide">NEW</span>
      </div>
    </div>
  );
}

function LatestHighlight({ item }: { item: MeetingReport }) {
  const link = item.reportUrl || `/arc/conference/reports/${encodeURIComponent(item.slug)}`;
  const isExternal = /^https?:\/\//i.test(link);
  return (
    <div className="relative rounded-2xl border border-gray-200 bg-white shadow-sm p-4 sm:p-5 overflow-hidden overflow-x-clip">
      <NewBadge />
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-gray-900 leading-tight" style={{ fontSize: "clamp(18px,3.8vw,24px)" }}>
          最新のレポート
        </h3>
        <div className="h-[3px] w-10 bg-red-600 rounded-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1.4fr,1fr] gap-5 sm:gap-6 items-start">
        {/* 左：動画 or サムネイル */}
        <div className="relative w-full">
          {item.youtubeId ? (
            <div className="aspect-video w-full rounded-xl overflow-hidden border bg-black/5">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${item.youtubeId}`}
                title={item.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                loading="lazy"
              />
            </div>
          ) : item.coverUrl ? (
            <div className="relative">
              <Image
                src={item.coverUrl}
                alt={item.title}
                width={960}
                height={540}
                sizes="(max-width:768px)92vw,(max-width:1024px)60vw,640px"
                className="rounded-xl shadow object-cover w-full max-w-full h-auto"
                priority={false}
              />
            </div>
          ) : (
            <div className="aspect-video w-full rounded-xl bg-gray-100 grid place-items-center text-gray-500">
              No Video / Image
            </div>
          )}
        </div>

        {/* 右：テキスト＋ボタン */}
        <div className="space-y-3 overflow-x-clip">
          <div className="text-gray-500" style={{ fontSize: "clamp(12px,2.8vw,14px)" }}>
            {toWarekiFiscalLabel(item.fiscalYear)}
          </div>
          <h4 className="font-semibold text-gray-900 leading-snug" style={{ fontSize: "clamp(16px,3.6vw,20px)" }}>
            {item.title || `${roundLabel(item.round)} 定例会`}
          </h4>
          <div className="text-gray-700" style={{ fontSize: "clamp(13px,3vw,16px)" }}>
            {fmtDate(item.date)}
          </div>
          <motion.a
            href={link}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-600 font-bold text-gray-900 bg-white shadow-sm"
            style={{ fontSize: "clamp(13px,3.2vw,15px)" }}
          >
            報告ページへ <span aria-hidden>→</span>
          </motion.a>
        </div>
      </div>
    </div>
  );
}

function MeetingCard({ m }: { m: MeetingReport }) {
  const link = m.reportUrl || `/arc/conference/reports/${encodeURIComponent(m.slug)}`;
  const isExternal = /^https?:\/\//i.test(link);
  return (
    <motion.a
      href={link}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className="block rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
    >
      <div className="aspect-[16/9] w-full bg-gray-100 overflow-hidden">
        {m.coverUrl ? (
          <Image
            src={m.coverUrl}
            alt={m.title}
            width={800}
            height={450}
            sizes="(max-width:640px)92vw,(max-width:1024px)44vw,300px"
            className="w-full h-full max-w-full object-cover"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-gray-500">No Image</div>
        )}
      </div>
      <div className="p-4">
        <div className="text-gray-500 mb-1" style={{ fontSize: "clamp(11px,2.8vw,12px)" }}>
          {toWarekiFiscalLabel(m.fiscalYear)}
        </div>
        <div className="font-semibold text-gray-900" style={{ fontSize: "clamp(15px,3.4vw,18px)" }}>
          {m.title || `${roundLabel(m.round)} 定例会`}
        </div>
        <div className="text-gray-600 mt-1" style={{ fontSize: "clamp(12px,3vw,14px)" }}>
          {fmtDate(m.date)}
        </div>
        <div className="mt-3 inline-flex items-center font-bold text-red-700" style={{ fontSize: "clamp(12px,3.2vw,14px)" }}>
          レポートを見る <span className="ml-1" aria-hidden>→</span>
        </div>
      </div>
    </motion.a>
  );
}

/* ====== ページ本体 ====== */
export default function MeetingsPage() {
  // ヒーロー（モバイルで動き控えめ）
  const heroRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const yImg = useTransform(scrollYProgress, [0, 1], [0, 240]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 1], [0.45, 0.6]);

  // ヘッダーのナビ
  const navItems = [
    { name: "ホーム", path: "/" },
    { name: "ARCとは", path: "/arc" },
    { name: "事業カレンダー", path: "/arc/calendar" },
    { name: "ARC定例会", path: "/arc/conference" },
    { name: "ARC運営委員会", path: "/arc/executive-committee" },
    { name: "ARCアンケート", path: "/polls" },
    { name: "ミニゲーム", path: "/games" },
  ];

  const [items, setItems] = useState<MeetingReport[] | null>(null);

  useEffect(() => {
    // 公開済みのみ返すエンドポイントを想定
    fetch("/api/meeting-reports/public", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: MeetingReport[]) => {
        if (!Array.isArray(data)) return setItems([]);
        // 「開催日」降順
        const cooked = data
          .filter((r) => r.isPublished)
          .sort((a, b) => (a.date < b.date ? 1 : -1));
        setItems(cooked);
      })
      .catch(() => setItems([]));
  }, []);

  const latest = items?.[0] ?? null;

  // 年度ごとにグループ（降順 / 同年度内は round 1→4）
  const grouped = useMemo(() => {
    const map = new Map<number, MeetingReport[]>();
    (items ?? []).forEach((m) => {
      if (!map.has(m.fiscalYear)) map.set(m.fiscalYear, []);
      map.get(m.fiscalYear)!.push(m);
    });
    for (const [fy, arr] of map) {
      arr.sort((a, b) => a.round - b.round);
    }
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [items]);

  return (
    <div className="w-full bg-white max-w-[100vw] overflow-x-clip">
      <ArcHeader1 navItems={navItems} />

      {/* ヒーロー */}
      <div
        ref={heroRef}
        className="relative w-full h-[40vh] sm:h-[46vh] overflow-hidden overflow-x-clip select-none"
      >
        <motion.div style={{ y: yImg }} className="absolute inset-0 will-change-transform">
          <Image
            src="/images/R6-3.JPG"
            alt="Aichi Rovers Conference"
            fill
            priority
            sizes="100vw"
            className="object-cover z-0 select-none"
            draggable={false}
          />
        </motion.div>
        <motion.div style={{ opacity: overlayOpacity }} className="absolute inset-0 bg-black z-10" />
        <motion.div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        >
          <h1 className="text-white font-extrabold drop-shadow-lg leading-tight" style={{ fontSize: "clamp(28px,7vw,48px)" }}>
            定例会の様子
          </h1>
          <p className="text-white/90 font-medium mt-2 sm:mt-3" style={{ fontSize: "clamp(14px,4.6vw,24px)" }}>
            ARC Regular Meetings Report
          </p>
        </motion.div>
      </div>

      {/* 本文 */}
      <section className="w-full bg-white py-10 sm:py-12 md:py-14 px-4 sm:px-6 md:px-10 lg:px-16 max-w-[100vw] overflow-x-clip">
        <div className="mx-auto max-w-6xl space-y-8">
          {latest ? (
            <LatestHighlight item={latest} />
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-gray-500 text-sm">
              まだレポートがありません。公開までお待ちください。
            </div>
          )}

          <div>
            <h2 className="text-gray-800 font-extrabold tracking-tight leading-tight" style={{ fontSize: "clamp(20px,4.4vw,30px)" }}>
              年度別アーカイブ
            </h2>
            <div className="mt-2 h-[2px] w-16 bg-red-600 rounded-full" />
          </div>

          <div className="space-y-10">
            {grouped.map(([fy, arr]) => (
              <div key={fy} className="space-y-4">
                <h3 className="font-bold text-gray-900" style={{ fontSize: "clamp(18px,3.8vw,24px)" }}>
                  {toWarekiFiscalLabel(fy)}
                </h3>
                <div className="text-gray-600 -mt-1" style={{ fontSize: "clamp(12px,3vw,14px)" }}>
                  第１回 / 第２回 / 第３回（毎年三回目は定例会・交流会になります） / 第４回
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                  {arr.map((m) => (
                    <MeetingCard key={m.id} m={m} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 友情シール（そのまま） */}
      <section className="px-4 sm:px-6 md:px-10 lg:px-16 pb-12 max-w-[100vw] overflow-x-clip">
        <div className="mx-auto max-w-6xl">
          <div className="text-center py-8 sm:py-10">
            <h2 className="font-extrabold text-gray-900" style={{ fontSize: "clamp(22px,5vw,32px)" }}>
              友情シールプロジェクト
            </h2>
            <p className="mt-2 font-semibold text-red-700" style={{ fontSize: "clamp(14px,4.2vw,20px)" }}>
              Scouts of AICHI siblings together
            </p>
            <p className="mt-1 font-bold text-gray-800" style={{ fontSize: "clamp(13px,3.8vw,18px)" }}>
              （愛知のスカウトはみな兄弟である）
            </p>
            <p className="mt-4 text-gray-700 leading-relaxed mx-auto max-w-3xl" style={{ fontSize: "clamp(13px,3.6vw,16px)" }}>
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
              sizes="(max-width:640px)92vw,(max-width:1024px)80vw,920px"
              className="rounded-xl shadow-lg object-contain bg-white w-full max-w-[920px] max-w-full h-auto"
            />
          </div>
        </div>
      </section>

      {/* 仕切り線 */}
      <div className="mx-auto max-w-6xl mt-6 mb-10 px-4 sm:px-6 md:px-10 lg:px-16 max-w-[100vw] overflow-x-clip">
        <div className="border-t border-gray-300" />
      </div>

      {/* SNS */}
      <section className="bg-gray-100 py-6 max-w-[100vw] overflow-x-clip">
        <div className="mx-auto max-w-6xl flex justify-center gap-6 sm:gap-8">
          <motion.a
            href="https://www.facebook.com/aichirovers/?locale=ja_JP"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ y: -3, scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className="text-blue-500 hover:text-blue-400"
            aria-label="Facebook"
          >
            <FaFacebook size={26} className="sm:size-[28px]" />
          </motion.a>
          <span className="text-pink-500 opacity-40 cursor-not-allowed" aria-disabled="true" aria-label="Instagram（未開設）">
            <FaInstagram size={28} className="sm:size-[32px]" />
          </span>
          <span className="text-black opacity-40 cursor-not-allowed" aria-disabled="true" aria-label="X（未開設）">
            <FaXTwitter size={28} className="sm:size-[32px]" />
          </span>
          <motion.a
            href="https://lin.ee/BPXqTTv"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ y: -3, scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className="text-green-600 hover:text-green-500"
            aria-label="LINE"
          >
            <FaLine size={28} className="sm:size-[32px]" />
          </motion.a>
        </div>
      </section>

      {/* フッター */}
      <footer className="bg-gray-900 text-white py-8 mt-10 max-w-[100vw] overflow-x-clip">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-10 lg:px-16 text-center">
          <p className="font-semibold mb-2" style={{ fontSize: "clamp(14px,3.6vw,18px)" }}>
            お問い合わせ
          </p>
          <a
            href="mailto:aichi.rovers.conference@gmail.com"
            className="text-red-400 hover:text-red-300 transition-colors break-all"
            style={{ fontSize: "clamp(13px,3.4vw,16px)" }}
          >
            aichi.rovers.conference@gmail.com
          </a>
          <p className="mt-4 text-gray-400" style={{ fontSize: "clamp(11px,3vw,14px)" }}>
            &copy; {new Date().getFullYear()} Aichi Rovers Conference. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

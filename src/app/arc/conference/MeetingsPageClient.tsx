"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { FaFacebook, FaInstagram, FaXTwitter, FaLine } from "react-icons/fa6";
import ArcHeader1 from "@/components/ArcHeader1";

/* ================= 設定（編集者向け） =================
 * 1) 定例会データは /public/meetings/index.json に置く
 *    例は本文末尾を参照。
 * 2) フライヤー画像は /public/images/yujo-seal-flyer.jpg を推奨
 * 3) 報告ページのリンクは外部URLでもサイト内URLでもOK
 * ==================================================== */
const DATA_URL = "/meetings/index.json";

type Meeting = {
  /** 実施日（YYYY-MM-DD） */
  date: string;
  /** 1|2|3|4（第n回）。3は「定例会・交流会」として特別表示されます */
  round: 1 | 2 | 3 | 4;
  /** 令和の「年度」を文字でもOKだが、date から自動計算されるので未指定でOK */
  fiscalYear?: number; // 例: 2025 = 令和7年度
  /** 報告ページへのURL（必須） */
  reportUrl: string;
  /** 表示用タイトル（任意。未指定なら自動で「第n回 定例会」） */
  title?: string;
  /** YouTube の動画ID（任意。入れるとページ内で再生できます） */
  youtubeId?: string;
  /** サムネイル画像（任意） */
  thumb?: string; // 例: "/images/meetings/r7-1.jpg"
};

function toFiscalYear(d: Date) {
  const y = d.getFullYear();
  const m = d.getMonth(); // 0-11
  // 日本の年度: 4月(3)開始。3月までは前年度扱い
  return m <= 2 ? y - 1 : y;
}
function toWarekiFiscalLabel(fy: number) {
  // 令和元年 = 2019年。令和x年 = fy - 2018
  const reiwa = fy - 2018;
  return reiwa >= 1 ? `令和${reiwa}年度` : `${fy}年度`;
}
function roundLabel(n: number) {
  if (n === 3) return "第３回（定例会・交流会）";
  return `第${n}回`;
}

function LatestHighlight({ item }: { item: Meeting & { fy: number } }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl md:text-2xl font-bold text-gray-900">最新のレポート</h3>
        <div className="h-[3px] w-10 bg-red-600 rounded-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1.4fr,1fr] gap-6 items-start">
        {/* 左：動画 or サムネイル */}
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
            />
          ) : (
            <div className="aspect-video w-full rounded-xl bg-gray-100 grid place-items-center text-gray-500">
              No Video / Thumbnail
            </div>
          )}
        </div>

        {/* 右：テキスト＋ボタン */}
        <div className="space-y-3">
          <div className="text-sm text-gray-500">{toWarekiFiscalLabel(item.fy)}</div>
          <h4 className="text-lg md:text-xl font-semibold text-gray-900">
            {item.title ?? `${roundLabel(item.round)} 定例会`}
          </h4>
          <div className="text-gray-700">{item.date}</div>
          <motion.a
            href={item.reportUrl}
            target={item.reportUrl.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-600 font-bold text-gray-900 bg-white shadow-sm"
          >
            報告ページへ
            <span aria-hidden>→</span>
          </motion.a>
        </div>
      </div>
    </div>
  );
}

function MeetingCard({ m }: { m: Meeting & { fy: number } }) {
  return (
    <motion.a
      href={m.reportUrl}
      target={m.reportUrl.startsWith("http") ? "_blank" : undefined}
      rel="noopener noreferrer"
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
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
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-gray-500">No Image</div>
        )}
      </div>
      <div className="p-4">
        <div className="text-xs text-gray-500 mb-1">{toWarekiFiscalLabel(m.fy)}</div>
        <div className="text-base md:text-lg font-semibold text-gray-900">
          {m.title ?? `${roundLabel(m.round)} 定例会`}
        </div>
        <div className="text-sm text-gray-600 mt-1">{m.date}</div>
        <div className="mt-3 inline-flex items-center text-sm font-bold text-red-700">
          レポートを見る <span className="ml-1" aria-hidden>→</span>
        </div>
      </div>
    </motion.a>
  );
}

export default function MeetingsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // ===== ヘッダーのナビ =====
  const navItems = [
    { name: "ホーム", path: "/" },
    { name: "ARCとは", path: "/arc" },
    { name: "事業カレンダー", path: "/arc/calendar" },
    { name: "ARC定例会", path: "/arc/conference" },
    { name: "ARC運営委員会", path: "/arc/executive-committee" },
    { name: "ARCアンケート", path: "/polls" },
    { name: "ミニゲーム", path: "/games"},
  ];

  // ===== ヒーロー（ホームと同じ動き） =====
  const heroRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const yImg = useTransform(scrollYProgress, [0, 1], [0, 320]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 1], [0.5, 0.6]);

  // ===== データ読込 =====
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
          });
        // 最新が先頭に来るように日付降順
        cooked.sort((a, b) => b.ts - a.ts);
        setItems(cooked);
      })
      .catch(() => setItems([]));
  }, []);

  // 最新（先頭）
  const latest = items?.[0];
  // 年度ごとにグループ（降順で並べ替え）
  const grouped = useMemo(() => {
    const map = new Map<number, (Meeting & { fy: number; ts: number })[]>();
    (items ?? []).forEach((m) => {
      if (!map.has(m.fy)) map.set(m.fy, []);
      map.get(m.fy)!.push(m);
    });
    // 各年度内は「第1→第4」の順に（round昇順）
    for (const [k, arr] of map) {
      arr.sort((a, b) => a.round - b.round);
      map.set(k, arr);
    }
    // 年度降順に並べる
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [items]);

  return (
    <div className="w-full bg-white">
      {/* ヘッダー（踏襲） */}
      <ArcHeader1 navItems={navItems} />

      {/* ヒーロー */}
      <div ref={heroRef} className="select-none relative w-full h-[42vh] overflow-hidden">
        <motion.div style={{ y: yImg }} className="absolute inset-0 will-change-transform">
          <Image src="/images/R6-3.JPG" alt="Aichi Rovers Conference" fill className="object-cover z-0 select-none" draggable={false} priority sizes="100vw"/>
        </motion.div>
        <motion.div style={{ opacity: overlayOpacity }} className="absolute inset-0 bg-black z-10" />
        <motion.div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: "easeOut" }}>
          <h1 className="text-white text-5xl md:text-6xl font-bold drop-shadow-lg">定例会の様子</h1>
          <p className="text-white/90 font-medium text-xl md:text-2xl mt-3">ARC Regular Meetings Report</p>
        </motion.div>
      </div>

      {/* 本文：最新 */}
      <section className="w-full bg-white py-10 px-6 md:px-16">
        <div className="max-w-6xl mx-auto space-y-8">
          {latest && <LatestHighlight item={{ ...latest, fy: latest.fy }} />}

          {/* 年度見出し */}
          <div>
            <h2 className="text-gray-800 text-2xl md:text-3xl font-extrabold tracking-tight">年度別アーカイブ</h2>
            <div className="mt-2 h-[2px] w-16 bg-red-600 rounded-full" />
          </div>

          {/* 年度ごと（降順） */}
          <div className="space-y-10">
            {grouped.map(([fy, arr]) => (
              <div key={fy} className="space-y-4">
                <h3 className="text-xl md:text-2xl font-bold text-gray-900">{toWarekiFiscalLabel(fy)}</h3>
                {/* 「第1回〜第4回」ヘッダー行 */}
                <div className="text-sm text-gray-600 -mt-2">第１回 / 第２回 / 第３回（毎年三回目は定例会・交流会になります） / 第４回</div>

                {/* Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {arr.map((m) => <MeetingCard key={`${m.fy}-${m.round}-${m.date}`} m={m} />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 友情シールプロジェクト */}
      <section className="px-6 md:px-16 pb-12">
  <div className="max-w-6xl mx-auto">
    <div className="text-center py-10">
      {/* 見出し（h1に） */}
      <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">
        友情シールプロジェクト
      </h1>

      {/* 英語のタグライン */}
      <p className="mt-2 text-lg md:text-xl font-semibold text-red-700">
        Scouts of AICHI siblings together
      </p>

      {/* 日本語（中央・目立たせる） */}
      <p className="mt-1 text-base md:text-lg font-bold text-gray-800">
        （愛知のスカウトはみな兄弟である）
      </p>

      <p className="mt-4 text-gray-700 leading-relaxed">
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
      />
    </div>
  </div>
</section>

      {/* 仕切り線 */}
      <div className="max-w-6xl mx-auto mt-6 mb-10 px-6 md:px-16">
        <div className="border-t border-gray-300" />
      </div>

      {/* SNS（踏襲） */}
      <section className="bg-gray-100 py-6">
        <div className="max-w-6xl mx-auto flex justify-center gap-8">
          <motion.a href="https://www.facebook.com/aichirovers/?locale=ja_JP" target="_blank" rel="noopener noreferrer"
            whileHover={{ y: -4, scale: 1.06 }} whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className="text-blue-500 hover:text-blue-400 transition-colors duration-200"><FaFacebook size={28} /></motion.a>
          <span className="text-pink-500 opacity-40 cursor-not-allowed"><FaInstagram size={32} /></span>
          <span className="text-black opacity-40 cursor-not-allowed"><FaXTwitter size={32} /></span>
          <motion.a href="https://lin.ee/BPXqTTv" target="_blank" rel="noopener noreferrer"
            whileHover={{ y: -4, scale: 1.06 }} whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className="text-green-600 hover:text-green-500 transition-colors duration-200"><FaLine size={32} /></motion.a>
        </div>
      </section>

      {/* フッター（踏襲） */}
      <footer className="bg-gray-900 text-white py-6 mt-12">
        <div className="max-w-6xl mx-auto px-6 md:px-16 text-center">
          <p className="text-lg font-semibold mb-2">お問い合わせ</p>
          <a href="mailto:aichi.rovers.conference@gmail.com" className="text-red-400 hover:text-red-300 transition-colors duration-200">
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

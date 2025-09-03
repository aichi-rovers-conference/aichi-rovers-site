// app/arc/conference/page.tsx など、このページファイルまるごと置き換え
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import ArcHeader1 from "@/src/components/ArcHeader1";
import ArcFooter from "@/src/components/ArcFooter";
import HeroImage from "@/src/components/HeroImage";

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

/* ===== スケルトン（読み込み中UI） ===== */
function LatestSkeleton() {
  return (
    <div
      className="relative rounded-2xl border border-gray-200 bg-white shadow-sm p-4 sm:p-5 overflow-hidden"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="h-5 w-36 rounded bg-gray-200 animate-pulse" />
        <div className="h-[3px] w-10 bg-gray-200 rounded-full animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[1.4fr,1fr] gap-5 sm:gap-6 items-start">
        <div className="aspect-video w-full rounded-xl bg-gray-200 animate-pulse" />
        <div className="space-y-3">
          <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
          <div className="h-5 w-64 rounded bg-gray-200 animate-pulse" />
          <div className="h-4 w-28 rounded bg-gray-200 animate-pulse" />
          <div className="h-9 w-40 rounded-lg bg-gray-200 animate-pulse" />
        </div>
      </div>
      <span className="sr-only">読み込み中…</span>
    </div>
  );
}
function CardSkeleton() {
  return (
    <div className="block rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden" role="status" aria-busy="true">
      <div className="aspect-[16/9] w-full bg-gray-200 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-3 w-28 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
        <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
      </div>
      <span className="sr-only">読み込み中…</span>
    </div>
  );
}
function GridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

/* ✅ バッジ（NEW） */
function NewBadge({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute z-30 pointer-events-none ${className}`}>
      <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-red-600 text-white grid place-items-center shadow-lg">
        <span className="text-[10px] sm:text-xs font-extrabold tracking-wide">NEW</span>
      </div>
    </div>
  );
}

function LatestHighlight({ item }: { item: MeetingReport }) {
  const link = item.reportUrl || `/arc/conference/reports/${encodeURIComponent(item.slug)}`;
  const isExternal = /^https?:\/\//i.test(link);
  return (
    <div className="relative rounded-2xl border border-gray-200 bg-white shadow-sm p-4 sm:p-5 overflow-hidden overflow-x-clip">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-gray-900 leading-tight" style={{ fontSize: "clamp(18px,3.8vw,24px)" }}>
          最新のレポート
        </h3>
        <div className="h-[3px] w-10 bg-red-600 rounded-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1.4fr,1fr] gap-5 sm:gap-6 items-start">
        {/* 左：動画 or サムネイル */}
        <div className="relative w-full">
          <NewBadge className="left-3 top-3 sm:left-4 sm:top-4" />
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
  // ヘッダーのナビ
  const navItems = [
    { name: "ホーム", path: "/" },
    { name: "ARCとは", path: "/arc" },
    { name: "事業カレンダー", path: "/arc/calendar" },
    { name: "ARC定例会", path: "/arc/conference" },
    { name: "ARC運営委員会", path: "/arc/executive-committee" },
    { name: "ARCアンケート", path: "/polls" },
    // { name: "ミニゲーム", path: "/games" },
  ];

  const [items, setItems] = useState<MeetingReport[] | null>(null);
  const isLoading = items === null;

  useEffect(() => {
    (async () => {
      try {
        // キャッシュ潰しクエリを付与（CDN/ブラウザ対策）
        const r = await fetch(`/api/meeting-reports/public?t=${Date.now()}`, { cache: "no-store" });
        if (!r.ok) {
          setItems([]);
          return;
        }
        const json = await r.json();
        // 配列 or { ok, data } の両対応
        const arr: any[] = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
        const cooked = arr
          .filter((x) => x?.isPublished)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setItems(cooked as MeetingReport[]);
      } catch {
        setItems([]);
      }
    })();
  }, []);

  const latest = items?.[0] ?? null;

  // 年度ごとにグループ（降順 / 同年度内は round 1→4）
  const grouped = useMemo(() => {
    const map = new Map<number, MeetingReport[]>();
    (items ?? []).forEach((m) => {
      if (!map.has(m.fiscalYear)) map.set(m.fiscalYear, []);
      map.get(m.fiscalYear)!.push(m);
    });
    for (const [, arr] of map) {
      arr.sort((a, b) => a.round - b.round);
    }
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [items]);

  return (
    <div className="w-full bg-white max-w-[100vw] overflow-x-clip">
      <ArcHeader1 navItems={navItems} />

      {/* ★ 共通ヒーロー適用（パララックス・自動blur・オーバーレイ） */}
      <HeroImage
        src="/images/R6-3.JPG"
        alt="Aichi Rovers Conference"
        heightClass="h-[40vh] sm:h-[46vh]"
        parallaxAmount={180}
        overlayOpacityRange={[0.45, 0.6]}
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="text-center"
        >
          <h1
            className="text-white font-extrabold drop-shadow-lg leading-tight"
            style={{ fontSize: "clamp(28px,7vw,48px)" }}
          >
            定例会の様子
          </h1>
          <p
            className="text-white/90 font-medium mt-2 sm:mt-3"
            style={{ fontSize: "clamp(14px,4.6vw,24px)" }}
          >
            ARC Regular Meetings Report
          </p>
        </motion.div>
      </HeroImage>

      {/* 本文 */}
      <section className="w-full bg-white py-10 sm:py-12 md:py-14 px-4 sm:px-6 md:px-10 lg:px-16 max-w-[100vw] overflow-x-clip">
        <div className="mx-auto max-w-6xl space-y-8">
          {/* 最新 */}
          {isLoading ? (
            <LatestSkeleton />
          ) : latest ? (
            <LatestHighlight item={latest} />
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-gray-500 text-sm">
              まだレポートがありません。公開までお待ちください。
            </div>
          )}

          {/* 年度別アーカイブ */}
          <div>
            <h2 className="text-gray-800 font-extrabold tracking-tight leading-tight" style={{ fontSize: "clamp(20px,4.4vw,30px)" }}>
              年度別アーカイブ
            </h2>
            <div className="mt-2 h-[2px] w-16 bg-red-600 rounded-full" />
          </div>

          <div className="space-y-10">
            {isLoading ? (
              <>
                {/* ローディング中はダミーのグリッド */}
                <GridSkeleton count={4} />
                <GridSkeleton count={4} />
              </>
            ) : (
              grouped.map(([fy, arr]) => (
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
              ))
            )}
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
      <ArcFooter />
    </div>
  );
}

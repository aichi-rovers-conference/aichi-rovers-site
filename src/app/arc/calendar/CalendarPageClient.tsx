// src/app/arc/calendar/CalendarPageClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import ArcHeader1 from "@/src/components/ArcHeader1";
import ArcFooter from "@/src/components/ArcFooter";
import HeroImage from "@/src/components/HeroImage";

const EVENTS_API_URL = "/api/calendar/events";
const RECRUIT_API_URL = "/api/calendar/recruitings";

type EventItem = {
  date: string; // "YYYY-MM-DD"
  title: string;
  url?: string;
  note?: string;
  area?: string;
  isPublished?: boolean; // ★ 追加
};

type RecruitingItem = {
  id: string;
  title: string;
  date: string;      // 実施日
  deadline: string;  // 参加期限
  area: string;
  url?: string;
  urlDesc?: string;
  imageUrl?: string;
  isPublished?: boolean; // ★ 追加
};

function groupByMonth(events: EventItem[]) {
  const map: Record<number, EventItem[]> = {};
  events.forEach((e) => {
    const m = new Date(e.date + "T00:00:00").getMonth(); // 0-11
    (map[m] ||= []).push(e);
  });
  for (const m in map) map[m]!.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return map;
}

function MonthCard({ monthIndex, items = [] }: { monthIndex: number; items: EventItem[] }) {
  const monthName = `${monthIndex + 1}月`;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 sm:p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base sm:text-lg font-bold text-gray-900">{monthName}</h3>
        <div className="h-[3px] w-8 bg-red-600 rounded-full" />
      </div>
      {items.length === 0 ? (
        <p className="text-[13px] sm:text-sm text-gray-500">予定は未登録です。</p>
      ) : (
        <ul className="space-y-2">
          {items.map((ev, i) => (
            <li key={`${ev.date}-${i}`} className="text-[13px] sm:text-sm">
              <div className="flex items-start gap-2">
                <span className="shrink-0 mt-[6px] inline-block h-2 w-2 rounded-full bg-red-600" />
                <div className="min-w-0">
                  <div className="text-gray-900 font-medium">
                    {ev.url ? (
                      <a
                        href={ev.url}
                        className="underline underline-offset-2 hover:no-underline"
                        target={ev.url.startsWith("http") ? "_blank" : undefined}
                        rel={ev.url.startsWith("http") ? "noopener noreferrer" : undefined}
                      >
                        {ev.title}
                      </a>
                    ) : (
                      ev.title
                    )}
                  </div>
                  <div className="text-gray-600">
                    {ev.date}
                    {ev.area ? <span className="text-gray-500"> / {ev.area}</span> : null}
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

async function safeJson(res: Response) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: text || "Unknown error" };
  }
}

/** 期限切れ判定（JSTの当日23:59:59までを有効扱い） */
function isExpiredJST(yyyy_mm_dd: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyy_mm_dd || "")) return false;
  const endOfDayJst = new Date(`${yyyy_mm_dd}T23:59:59+09:00`).getTime();
  return Date.now() > endOfDayJst;
}

export default function CalendarPageClient() {
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
  const [eventsRaw, setEventsRaw] = useState<EventItem[] | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("—");
  const [recruitsRaw, setRecruitsRaw] = useState<RecruitingItem[] | null>(null);
  const [recruitsUpdated, setRecruitsUpdated] = useState<string>("—");

  useEffect(() => {
    const y = new Date().getFullYear();

    // 年間スケジュール（公開フラグも取得）
    fetch(`${EVENTS_API_URL}?year=${y}`, { cache: "no-store" })
      .then(safeJson)
      .then((j) => {
        const data: EventItem[] = (j.items || []).map((x: any) => ({
          date: (x.date || "").slice(0, 10),
          title: x.title,
          url: x.url || undefined,
          note: x.note || undefined,
          area: x.area || undefined,
          // ★ isPublished が未定義の場合は「trueとみなす」→過去データ互換
          isPublished: x?.isPublished !== false,
        }));
        setEventsRaw(data);
        setLastUpdated(j.lastUpdated ? new Date(j.lastUpdated).toLocaleString() : "—");
      })
      .catch(() => {
        setEventsRaw([]);
        setLastUpdated("—");
      });

    // 募集（公開フラグも取得）
    fetch(RECRUIT_API_URL, { cache: "no-store" })
      .then(safeJson)
      .then((j) => {
        const data: RecruitingItem[] = (j.items || []).map((x: any) => ({
          id: String(x.id),
          title: x.title,
          date: (x.date || "").slice(0, 10),
          deadline: (x.deadline || "").slice(0, 10),
          area: x.area,
          url: x.url || undefined,
          urlDesc: x.urlDesc || undefined,
          imageUrl: x.imageUrl || undefined,
          // ★ 同じく未定義は true と扱う
          isPublished: x?.isPublished !== false,
        }));
        setRecruitsRaw(data);
        setRecruitsUpdated(j.lastUpdated ? new Date(j.lastUpdated).toLocaleString() : "—");
      })
      .catch(() => {
        setRecruitsRaw([]);
        setRecruitsUpdated("—");
      });
  }, []);

  // ===== 公開ページの表示用フィルタ =====
  // イベント：isPublished が false のものを除外
  const events = useMemo(() => {
    if (!eventsRaw) return eventsRaw;
    return eventsRaw.filter((e) => e.isPublished !== false);
  }, [eventsRaw]);

  // 募集：isPublished が false／期限切れを除外
  const recruits = useMemo(() => {
    if (!recruitsRaw) return recruitsRaw;
    return recruitsRaw
      .filter((r) => r.isPublished !== false)
      .filter((r) => !isExpiredJST(r.deadline))
      .sort((a, b) => (a.deadline < b.deadline ? -1 : a.deadline > b.deadline ? 1 : 0));
  }, [recruitsRaw]);

  const byMonth = useMemo(() => groupByMonth(events ?? []), [events]);

  return (
    <div className="w-full bg-white">
      {/* ヘッダー */}
      <ArcHeader1 navItems={navItems} />

      {/* 共通ヒーロー */}
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
            style={{ fontSize: "clamp(28px, 7vw, 48px)" }}
          >
            事業カレンダー
          </h1>
          <p
            className="text-white/90 font-medium mt-2 sm:mt-3"
            style={{ fontSize: "clamp(14px, 4.6vw, 24px)" }}
          >
            ARC Annual Schedule & Recruiting
          </p>
        </motion.div>
      </HeroImage>

      {/* 現在募集中の案内（公開のみ／期限切れ非表示） */}
      <section className="w-full bg-white py-10 sm:py-12 md:py-14 px-4 sm:px-6 md:px-10 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <h2
            className="text-red-600 font-bold mb-2 sm:mb-3 leading-tight"
            style={{ fontSize: "clamp(22px, 4.8vw, 36px)" }}
          >
            現在募集中の案内
          </h2>
          <p className="text-[13px] sm:text-sm text-gray-600 mb-4">※URLをクリックすると開催要項に移動できます</p>

          {recruits === null ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-44 rounded-2xl border border-gray-200 bg-gray-50 animate-pulse" />
              ))}
            </div>
          ) : recruits.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
              <p className="text-gray-800 font-medium text-sm sm:text-base">現在募集している事業はありません。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {recruits.map((r) => (
                <article key={r.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  {r.imageUrl ? (
                    <div className="relative h-40 sm:h-48">
                      {/* 外部画像を使う場合は next.config に remotePatterns を追加してください */}
                      <Image src={r.imageUrl} alt={r.title} fill className="object-cover" />
                    </div>
                  ) : null}
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
                        締切：{r.deadline}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700 border border-sky-200">
                        実施：{r.date}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 border border-slate-200">
                        {r.area}
                      </span>
                    </div>
                    <h3 className="mt-2 text-base sm:text-lg font-bold text-gray-900">{r.title}</h3>
                    {r.url && (
                      <div className="mt-2 text-sm">
                        <a
                          className="text-blue-700 underline underline-offset-2 hover:no-underline"
                          href={r.url}
                          target={r.url.startsWith("http") ? "_blank" : undefined}
                          rel={r.url.startsWith("http") ? "noopener noreferrer" : undefined}
                        >
                          {r.urlDesc?.trim() ? r.urlDesc : "開催要項・詳細"}
                        </a>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          {recruits && (
            <div className="mt-4 text-[12px] sm:text-xs text-gray-500">募集情報 最終更新：{recruitsUpdated}</div>
          )}
        </div>
      </section>

      {/* 年間スケジュール（公開のみ） */}
      <section className="w-full bg-white pb-10 sm:pb-12 md:pb-14 px-4 sm:px-6 md:px-10 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <h2
            className="text-gray-800 font-extrabold tracking-tight leading-tight"
            style={{ fontSize: "clamp(20px, 4.4vw, 30px)" }}
          >
            年間スケジュール
          </h2>
          <div className="mt-2 h-[2px] w-16 bg-red-600 rounded-full" />

          {events === null ? (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 rounded-2xl border border-gray-200 bg-gray-50 animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {Array.from({ length: 12 }).map((_, i) => (
                  <MonthCard key={i} monthIndex={i} items={byMonth[i] ?? []} />
                ))}
              </div>
              <div className="mt-6 text-[13px] sm:text-sm text-gray-600">
                最終更新日時：{lastUpdated}
                <div className="mt-2 text-[12px] sm:text-xs text-gray-500 space-y-1">
                  <p>※愛知のRSが参加できそうな事業を記載しています。</p>
                  <p>※やむを得ない理由により、日程の変更・事業の中止となる場合があります。</p>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* 仕切り線 */}
      <div className="mx-auto max-w-6xl mt-6 mb-10 px-4 sm:px-6 md:px-10 lg:px-16">
        <div className="border-t border-gray-300" />
      </div>

      <ArcFooter />
    </div>
  );
}

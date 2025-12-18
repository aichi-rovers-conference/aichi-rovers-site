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
  date: string;      // JST "YYYY-MM-DD"（開始）
  endDate?: string;  // JST "YYYY-MM-DD"（終了・未指定は開始と同日）
  title: string;
  url?: string;
  note?: string;
  area?: string;
  isPublished?: boolean;
};

type RecruitingItem = {
  id: string;
  title: string;
  date: string;         // 実施開始（JST）
  endDate?: string;     // 実施終了（JST）
  deadline: string;     // 参加期限（JST）= これが「消える日」
  publishFrom?: string; // ✅ 掲載開始日（JST）= 予約投稿
  area: string;
  url?: string;
  urlDesc?: string;
  imageUrl?: string;
  isPublished?: boolean;
};

/** ISO(UTC)やDateをJSTのYYYY-MM-DDへ正規化（slice事故防止） */
function isoToJstYmd(input: unknown): string | undefined {
  if (!input) return undefined;
  const s = String(input);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (isNaN(d.getTime())) return undefined;
  const t = d.getTime() + 9 * 60 * 60 * 1000; // UTC→JST補正
  return new Date(t).toISOString().slice(0, 10);
}

/** カレンダー年（YYYY）を取り出す */
function ymdToCalendarYear(ymd: string): number {
  return Number(ymd.slice(0, 4));
}

/** 現在の“年”（JST基準） */
function currentCalendarYearJST(): number {
  const t = Date.now() + 9 * 60 * 60 * 1000; // JST
  const d = new Date(t);
  return d.getUTCFullYear();
}

/** 期限切れ判定（JSTの当日23:59:59までを有効扱い） */
function isExpiredJST(yyyy_mm_dd: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyy_mm_dd || "")) return false;
  const endOfDayJst = new Date(`${yyyy_mm_dd}T23:59:59+09:00`).getTime();
  return Date.now() > endOfDayJst;
}

/** ✅ 掲載開始前か？（JSTの当日00:00:00から掲載開始） */
function isNotStartedYetJST(yyyy_mm_dd?: string) {
  if (!yyyy_mm_dd) return false; // publishFrom未設定なら「今すぐ表示」
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyy_mm_dd)) return false;
  const startOfDayJst = new Date(`${yyyy_mm_dd}T00:00:00+09:00`).getTime();
  return Date.now() < startOfDayJst;
}

/** 文字列日付の比較（YYYY-MM-DD） */
function cmp(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}
/** 文字列日付の between（含む） */
function between(d: string, from: string, to: string) {
  return cmp(from, d) <= 0 && cmp(d, to) <= 0;
}

/** 単日/期間の整形表示（JST前提） */
function formatDateRange(start: string, end?: string) {
  if (!end || end === start) return start;
  const sY = start.slice(0, 4),
    sM = start.slice(5, 7),
    sD = start.slice(8, 10);
  const eY = end.slice(0, 4),
    eM = end.slice(5, 7),
    eD = end.slice(8, 10);
  if (sY !== eY) return `${start} 〜 ${end}`;
  if (sM !== eM) return `${start} 〜 ${eM}-${eD}`;
  return `${start} 〜 ${eD}`;
}

/** 月ごとにグルーピング（開始日の“文字列月”ベース） */
function groupByMonth(events: EventItem[]) {
  const map: Record<number, EventItem[]> = {};
  events.forEach((e) => {
    const m = Number(e.date.slice(5, 7)) - 1; // 0-11
    (map[m] ||= []).push(e);
  });
  for (const m in map) map[m]!.sort((a, b) => cmp(a.date, b.date));
  return map;
}

/** 月カード（カレンダー年で色分け：今年=赤／来年=青／その他=グレー） */
function MonthCard({
  monthIndex,
  items = [],
  thisYear,
  nextYear,
}: {
  monthIndex: number;
  items: EventItem[];
  thisYear: number;
  nextYear: number;
}) {
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
        <ul className="space-y-3">
          {items.map((ev, i) => {
            const y = ymdToCalendarYear(ev.date);
            const type = y === thisYear ? "THIS" : y === nextYear ? "NEXT" : ("OTHER" as const);
            const dotClass =
              type === "THIS" ? "bg-rose-600" : type === "NEXT" ? "bg-sky-600" : "bg-slate-400";

            return (
              <li key={`${ev.date}-${i}`} className="text-[13px] sm:text-sm">
                <div className="flex items-start gap-2">
                  <span
                    className={`shrink-0 mt-[7px] inline-block h-2 w-2 rounded-full ${dotClass}`}
                    title={`${y}年`}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <div className="text-gray-900 font-semibold break-keep">
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
                    <div className="text-gray-700">
                      {formatDateRange(ev.date, ev.endDate)}
                      {ev.area ? <span className="text-gray-500"> / {ev.area}</span> : null}
                      {ev.note ? <span className="text-gray-500"> / {ev.note}</span> : null}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
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

export default function CalendarPageClient() {
  const navItems = [
    { name: "ホーム", path: "/" },
    { name: "ARCとは", path: "/arc" },
    { name: "事業カレンダー", path: "/arc/calendar" },
    { name: "ARC定例会", path: "/arc/conference" },
    { name: "ARC運営委員会", path: "/arc/executive-committee" },
    { name: "ARCアンケート", path: "/polls" },
  ];

  const [eventsRaw, setEventsRaw] = useState<EventItem[] | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("—");
  const [recruitsRaw, setRecruitsRaw] = useState<RecruitingItem[] | null>(null);
  const [recruitsUpdated, setRecruitsUpdated] = useState<string>("—");

  useEffect(() => {
    // 表示範囲は“2年度ぶん”を確保
    const thisYear = currentCalendarYearJST();
    const nextYear = thisYear + 1;
    const rangeFrom = `${thisYear}-04-01`;
    const rangeTo = `${nextYear + 1}-03-31`;

    const y0 = thisYear,
      y1 = thisYear + 1,
      y2 = thisYear + 2;

    // 年間スケジュール
    Promise.all([
      fetch(`${EVENTS_API_URL}?year=${y0}`, { cache: "no-store" }).then(safeJson),
      fetch(`${EVENTS_API_URL}?year=${y1}`, { cache: "no-store" }).then(safeJson),
      fetch(`${EVENTS_API_URL}?year=${y2}`, { cache: "no-store" }).then(safeJson),
    ])
      .then((arr) => {
        const concat = arr.flatMap((j: any) => j.items || []);
        const mapped: EventItem[] = concat.map((x: any) => {
          const start = isoToJstYmd(x.date)!;
          const end = isoToJstYmd(x.endDate) || start;
          return {
            date: start,
            endDate: end,
            title: x.title,
            url: x.url || undefined,
            note: x.note || undefined,
            area: x.area || undefined,
            isPublished: x?.isPublished !== false,
          };
        });

        const within = mapped
          .filter((e) => e.isPublished !== false)
          .filter((e) => between(e.date, rangeFrom, rangeTo));

        setEventsRaw(within);

        const times = arr
          .map((j: any) => (j.lastUpdated ? new Date(j.lastUpdated).getTime() : 0))
          .filter(Boolean);
        const max = times.length ? new Date(Math.max(...times)).toLocaleString() : "—";
        setLastUpdated(max);
      })
      .catch(() => {
        setEventsRaw([]);
        setLastUpdated("—");
      });

    // ✅ 募集（予約投稿：publishFrom が未来なら非表示 / deadlineで消える）
    fetch(RECRUIT_API_URL, { cache: "no-store" })
      .then(safeJson)
      .then((j) => {
        const data: RecruitingItem[] = (j.items || []).map((x: any) => {
          // API側のキー名が揺れても拾えるようにしておく
          const publishFrom =
            isoToJstYmd(x.publishFrom) ??
            isoToJstYmd(x.publishAt) ??
            isoToJstYmd(x.publishStart) ??
            undefined;

          return {
            id: String(x.id),
            title: x.title,
            date: isoToJstYmd(x.date)!,
            endDate: isoToJstYmd(x.endDate) || isoToJstYmd(x.date),
            deadline: isoToJstYmd(x.deadline)!,
            publishFrom,
            area: x.area,
            url: x.url || undefined,
            urlDesc: x.urlDesc || undefined,
            imageUrl: x.imageUrl || undefined,
            isPublished: x?.isPublished !== false,
          };
        });

        setRecruitsRaw(
          data
            .filter((r) => r.isPublished !== false)
            .filter((r) => !isNotStartedYetJST(r.publishFrom)) // ✅ 掲載開始日まで待つ
            .filter((r) => !isExpiredJST(r.deadline)) // ✅ 参加期限を過ぎたら消える
            .sort((a, b) => (a.deadline < b.deadline ? -1 : a.deadline > b.deadline ? 1 : 0))
        );

        setRecruitsUpdated(j.lastUpdated ? new Date(j.lastUpdated).toLocaleString() : "—");
      })
      .catch(() => {
        setRecruitsRaw([]);
        setRecruitsUpdated("—");
      });
  }, []);

  const events = eventsRaw ?? [];
  const byMonth = useMemo(() => groupByMonth(events), [events]);

  const recruits = recruitsRaw ?? [];
  const thisYear = currentCalendarYearJST();
  const nextYear = thisYear + 1;

  return (
    <div className="w-full bg-white">
      <ArcHeader1 navItems={navItems} />

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

      {/* 現在募集中 */}
      <section className="w-full bg-white py-10 sm:py-12 md:py-14 px-4 sm:px-6 md:px-10 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <h2
            className="text-red-600 font-bold mb-2 sm:mb-3 leading-tight"
            style={{ fontSize: "clamp(22px, 4.8vw, 36px)" }}
          >
            現在募集中の案内
          </h2>
          <p className="text-[13px] sm:text-sm text-gray-600 mb-4">
            ※URLをクリックすると開催要項に移動できます
          </p>

          {recruitsRaw === null ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-44 rounded-2xl border border-gray-200 bg-gray-50 animate-pulse" />
              ))}
            </div>
          ) : recruits.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
              <p className="text-gray-800 font-medium text-sm sm:text-base">
                現在募集している事業はありません。
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {recruits.map((r) => (
                <article
                  key={r.id}
                  className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
                >
                  {r.imageUrl ? (
                    <div className="relative h-40 sm:h-48">
                      <Image src={r.imageUrl} alt={r.title} fill className="object-cover" />
                    </div>
                  ) : null}

                  <div className="p-4 sm:p-5">
                    <div className="-mx-2 px-2 flex items-center gap-2 overflow-x-auto snap-x snap-mandatory">
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200 whitespace-nowrap">
                        締切：{r.deadline}
                      </span>
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700 border border-sky-200 whitespace-nowrap">
                        実施：{formatDateRange(r.date, r.endDate)}
                      </span>
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 border border-slate-200 whitespace-nowrap">
                        {r.area}
                      </span>
                    </div>

                    <h3 className="mt-2 text-base sm:text-lg font-bold text-gray-900 break-keep">
                      {r.title}
                    </h3>

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

          {recruitsRaw && (
            <div className="mt-4 text-[12px] sm:text-xs text-gray-500">
              募集情報 最終更新：{recruitsUpdated}
            </div>
          )}
        </div>
      </section>

      {/* 年間スケジュール */}
      <section className="w-full bg-white pb-10 sm:pb-12 md:pb-14 px-4 sm:px-6 md:px-10 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2
                className="text-gray-800 font-extrabold tracking-tight leading-tight"
                style={{ fontSize: "clamp(20px, 4.4vw, 30px)" }}
              >
                年間スケジュール
              </h2>
              <div className="mt-2 h-[2px] w-16 bg-red-600 rounded-full" />
            </div>

            <div className="hidden sm:flex items-center gap-4 text-[12px] text-slate-600">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-rose-600" /> {thisYear}年
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-sky-600" /> {nextYear}年
              </span>
            </div>
          </div>

          {eventsRaw === null ? (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 rounded-2xl border border-gray-200 bg-gray-50 animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {Array.from({ length: 12 }).map((_, i) => (
                  <MonthCard
                    key={i}
                    monthIndex={i}
                    items={byMonth[i] ?? []}
                    thisYear={thisYear}
                    nextYear={nextYear}
                  />
                ))}
              </div>

              <div className="mt-6 text-[13px] sm:text-sm text-gray-600">
                最終更新日時：{lastUpdated}
                <div className="mt-2 text-[12px] sm:text-xs text-gray-500 space-y-1">
                  <p>※愛知のRSが参加できそうな事業を記載しています。</p>
                  <p>※やむを得ない理由により、日程の変更・事業の中止となる場合があります。</p>
                  <p className="sm:hidden">
                    <span className="inline-flex items-center gap-1 mr-3">
                      <span className="inline-block h-2 w-2 rounded-full bg-rose-600" /> {thisYear}年
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full bg-sky-600" /> {nextYear}年
                    </span>
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-6xl mt-6 mb-10 px-4 sm:px-6 md:px-10 lg:px-16">
        <div className="border-t border-gray-300" />
      </div>

      <ArcFooter />
    </div>
  );
}

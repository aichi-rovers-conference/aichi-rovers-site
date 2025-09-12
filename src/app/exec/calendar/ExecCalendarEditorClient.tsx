// app/exec/calendar/ExecCalendarEditorClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import ArcHeader from "@/src/components/ArcHeader";
import { Plus, Pencil, Trash2 } from "lucide-react";

const EVENTS_API_URL = "/api/calendar/events";
const RECRUIT_API_URL = "/api/calendar/recruitings";

type EventItem = {
  id: string;
  date: string;       // 開始 YYYY-MM-DD (JST)
  endDate?: string;   // 終了（未指定=単日）
  title: string;
  note?: string;
  area?: string;
  url?: string;
  isPublished?: boolean;
};

type RecruitingItem = {
  id: string;
  title: string;
  date: string;       // 実施開始 (JST)
  endDate?: string;   // 実施終了（未指定=単日）
  deadline: string;   // 参加期限 (JST)
  area: string;
  url?: string;
  urlDesc?: string;
  imageUrl?: string;
  isPublished?: boolean;
};

/** ISOやDateをJSTのYYYY-MM-DDへ正規化 */
function isoToJstYmd(input: unknown): string | undefined {
  if (!input) return undefined;
  const s = String(input);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (isNaN(d.getTime())) return undefined;
  const t = d.getTime() + 9 * 60 * 60 * 1000; // UTC->JST
  return new Date(t).toISOString().slice(0, 10);
}

/** 文字列YYYY-MM-DDのみで年度(4月始まり)の開始年を返す */
function ymdToFiscalStartYear(ymd: string): number {
  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(5, 7));
  return m >= 4 ? y : y - 1;
}

/** 現在の属する年度（JST） */
function currentFiscalStartYearJST(): number {
  const t = Date.now() + 9 * 60 * 60 * 1000; // JST
  const d = new Date(t);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return m >= 4 ? y : y - 1;
}

/** 期限切れ判定（JSTの当日23:59:59までを有効扱い） */
function isExpiredJST(yyyy_mm_dd: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyy_mm_dd || "")) return false;
  const endOfDayJst = new Date(`${yyyy_mm_dd}T23:59:59+09:00`).getTime();
  return Date.now() > endOfDayJst;
}

/** 文字列日付比較 */
function cmp(a: string, b: string) { return a < b ? -1 : a > b ? 1 : 0; }
/** 文字列日付 between（含む） */
function between(d: string, from: string, to: string) {
  return cmp(from, d) <= 0 && cmp(d, to) <= 0;
}

/** 単日/期間の整形表示 */
function fmtRange(start: string, end?: string) {
  const s = start;
  const e = end && end >= start ? end : start;
  if (s === e) return s;
  if (s.slice(0, 7) === e.slice(0, 7)) return `${s} 〜 ${e.slice(8, 10)}`;
  if (s.slice(0, 4) === e.slice(0, 4)) return `${s} 〜 ${e.slice(5, 10)}`;
  return `${s} 〜 ${e}`;
}

/** 月グループ（文字列の月で安全に） */
function groupByMonth(events: EventItem[]) {
  const map: Record<number, EventItem[]> = {};
  events.forEach((e) => {
    const m = Number(e.date.slice(5, 7)) - 1; // 0-11
    (map[m] ||= []).push(e);
  });
  for (const m in map) map[m]!.sort((a, b) => cmp(a.date, b.date));
  return map;
}

/** 見出し */
function SectionHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode; }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="relative pl-4">
          <span className="absolute left-0 top-1 bottom-1 w-1 bg-red-600 rounded-full" />
          <h2 className="text-xl font-bold text-slate-900 break-keep">{title}</h2>
        </div>
        {subtitle ? <p className="text-[13px] text-slate-500 mt-1 break-keep">{subtitle}</p> : null}
      </div>
      {right}
    </div>
  );
}

/** カード枠 */
function CardShell({ children, className = "", accent = true }: { children: React.ReactNode; className?: string; accent?: boolean; }) {
  return (
    <article className={`rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden ${className}`}>
      {accent ? <div className="h-1 bg-gradient-to-r from-red-700 via-red-600 to-red-500" /> : null}
      {children}
    </article>
  );
}

/** 赤ボタン */
type MotionBtnBase = Omit<React.ComponentProps<typeof motion.button>, "children"> & { children?: React.ReactNode; };
function RedButton(props: MotionBtnBase & { icon?: React.ReactNode }) {
  const { icon, children, className = "", ...rest } = props;
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      {...rest}
      className={`inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-red-700 text-white font-semibold shadow hover:bg-red-600 disabled:opacity-50 whitespace-nowrap ${className}`}
    >
      {icon}
      {children}
    </motion.button>
  );
}

/** 公開トグル */
function PublishToggle({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer select-none">
      <input type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div className="w-10 h-6 bg-slate-200 rounded-full peer-checked:bg-red-600 transition-colors" />
      <div className="absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-all peer-checked:left-5 shadow" />
      <span className="ml-2 text-xs text-slate-600 whitespace-nowrap">公開</span>
    </label>
  );
}

export default function ExecCalendarEditorClient() {
  // ===== 状態 =====
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [eventsUpdated, setEventsUpdated] = useState<string>("—");
  const [recruits, setRecruits] = useState<RecruitingItem[] | null>(null);
  const [recruitsUpdated, setRecruitsUpdated] = useState<string>("—");
  const [showExpired, setShowExpired] = useState(false);

  const [editingRecruitId, setEditingRecruitId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // ===== 取得（年度をまたぐので当年+翌年+翌々年を取得→FY範囲で絞る） =====
  const loadEvents = async () => {
    const thisFY = currentFiscalStartYearJST();
    const nextFY = thisFY + 1;
    const rangeFrom = `${thisFY}-04-01`;
    const rangeTo   = `${nextFY + 1}-03-31`;

    const y0 = thisFY, y1 = thisFY + 1, y2 = thisFY + 2;

    const [r0, r1, r2] = await Promise.all([
      fetch(`${EVENTS_API_URL}?year=${y0}&all=1`, { cache: "no-store" }),
      fetch(`${EVENTS_API_URL}?year=${y1}&all=1`, { cache: "no-store" }),
      fetch(`${EVENTS_API_URL}?year=${y2}&all=1`, { cache: "no-store" }),
    ]);

    const j0 = r0.ok ? await r0.json() : { items: [], lastUpdated: null };
    const j1 = r1.ok ? await r1.json() : { items: [], lastUpdated: null };
    const j2 = r2.ok ? await r2.json() : { items: [], lastUpdated: null };

    const concat = [...(j0.items || []), ...(j1.items || []), ...(j2.items || [])];

    const data: EventItem[] = concat
      .map((x: any) => {
        const start = isoToJstYmd(x.date)!;
        const end = isoToJstYmd(x.endDate) || start;
        return {
          id: String(x.id),
          date: start,
          endDate: end,
          title: x.title,
          note: x.note || undefined,
          area: x.area || undefined,
          url: x.url || undefined,
          isPublished: Boolean(x.isPublished),
        };
      })
      .filter((e) => between(e.date, rangeFrom, rangeTo));

    setEvents(data);

    const times = [j0, j1, j2]
      .map((j: any) => (j.lastUpdated ? new Date(j.lastUpdated).getTime() : 0))
      .filter(Boolean);
    setEventsUpdated(times.length ? new Date(Math.max(...times)).toLocaleString() : "—");
  };

  const loadRecruits = async () => {
    const r = await fetch(`${RECRUIT_API_URL}`, { cache: "no-store" });
    const j = r.ok ? await r.json() : { items: [], lastUpdated: null };
    const data: RecruitingItem[] = (j.items || []).map((x: any) => ({
      id: String(x.id),
      title: x.title,
      date: isoToJstYmd(x.date)!,
      endDate: isoToJstYmd(x.endDate) || isoToJstYmd(x.date),
      deadline: isoToJstYmd(x.deadline)!,
      area: x.area,
      url: x.url || undefined,
      urlDesc: x.urlDesc || undefined,
      imageUrl: x.imageUrl || undefined,
      isPublished: Boolean(x.isPublished),
    }));
    setRecruits(data);
    setRecruitsUpdated(j.lastUpdated ? new Date(j.lastUpdated).toLocaleString() : "—");
  };

  useEffect(() => {
    Promise.all([loadEvents(), loadRecruits()]).catch(() => {
      setEvents([]); setRecruits([]);
    });
  }, []);

  const byMonth = useMemo(() => groupByMonth(events ?? []), [events]);

  // ===== 追加フォーム（募集） =====
  const [openRecruit, setOpenRecruit] = useState(false);
  const [rTitle, setRTitle] = useState("");
  const [rDate, setRDate] = useState("");
  const [rEndDate, setREndDate] = useState("");
  const [rMulti, setRMulti] = useState(false);
  const [rDeadline, setRDeadline] = useState("");
  const [rArea, setRArea] = useState("");
  const [rUrl, setRUrl] = useState("");
  const [rUrlDesc, setRUrlDesc] = useState("");
  const [rImageUrl, setRImageUrl] = useState("");
  const [busyR, setBusyR] = useState(false);
  const [msgR, setMsgR] = useState("");

  async function submitRecruit() {
    if (!rTitle.trim() || !rDate || !rDeadline || !rArea.trim()) {
      setMsgR("必須項目（参加期限・実施開始日・募集タイトル・地域）を入力してください。");
      return;
    }
    const end = rMulti ? (rEndDate || rDate) : rDate;
    if (end < rDate) {
      setMsgR("終了日は開始日以降を指定してください。");
      return;
    }
    setBusyR(true); setMsgR("");
    try {
      const res = await fetch(RECRUIT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: rTitle.trim(),
          date: rDate,
          endDate: end,
          deadline: rDeadline,
          area: rArea.trim(),
          url: rUrl.trim() || undefined,
          urlDesc: rUrlDesc.trim() || undefined,
          imageUrl: rImageUrl.trim() || undefined,
          isPublished: true,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "作成に失敗しました");
      setRTitle(""); setRDate(""); setREndDate(""); setRMulti(false);
      setRDeadline(""); setRArea(""); setRUrl(""); setRUrlDesc(""); setRImageUrl("");
      await loadRecruits();
      setMsgR("募集を追加しました");
    } catch (e: any) {
      setMsgR(e?.message || "作成に失敗しました");
    } finally {
      setBusyR(false);
    }
  }

  async function patchRecruit(id: string, patch: Partial<RecruitingItem>) {
    const res = await fetch(`${RECRUIT_API_URL}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j?.error || "更新に失敗しました");
    return j.item;
  }

  async function deleteRecruit(id: string) {
    if (!confirm("この募集を削除します。よろしいですか？")) return;
    try {
      const res = await fetch(`${RECRUIT_API_URL}/${id}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "削除に失敗しました");
      setRecruits((prev) => (prev ?? []).filter((r) => r.id !== id));
    } catch (e: any) {
      alert(e?.message || "削除に失敗しました");
    }
  }

  // ===== 追加フォーム（スケジュール） =====
  const [openEvent, setOpenEvent] = useState(false);
  const [eTitle, setETitle] = useState("");
  const [eDate, setEDate] = useState("");
  const [eEndDate, setEEndDate] = useState("");
  const [eMulti, setEMulti] = useState(false);
  const [eFuzzy, setEFuzzy] = useState(false);
  const [busyE, setBusyE] = useState(false);
  const [msgE, setMsgE] = useState("");

  async function submitEvent() {
    if (!eTitle.trim() || !eDate) {
      setMsgE("必須項目（開始日・事業名）を入力してください。");
      return;
    }
    const end = eMulti ? (eEndDate || eDate) : eDate;
    if (end < eDate) {
      setMsgE("終了日は開始日以降を指定してください。");
      return;
    }
    setBusyE(true); setMsgE("");
    try {
      const res = await fetch(EVENTS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: eTitle.trim(),
          date: eDate,
          endDate: end,
          note: eFuzzy ? "日程未確定" : undefined,
          isPublished: true,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "作成に失敗しました");
      setETitle(""); setEDate(""); setEEndDate(""); setEMulti(false); setEFuzzy(false);
      await loadEvents();
      setMsgE("スケジュールを追加しました");
    } catch (e: any) {
      setMsgE(e?.message || "作成に失敗しました");
    } finally {
      setBusyE(false);
    }
  }

  async function patchEvent(id: string, patch: Partial<EventItem>) {
    const res = await fetch(`${EVENTS_API_URL}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j?.error || "更新に失敗しました");
    return j.item;
  }

  async function deleteEvent(id: string) {
    if (!confirm("このスケジュールを削除します。よろしいですか？")) return;
    try {
      const res = await fetch(`${EVENTS_API_URL}/${id}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "削除に失敗しました");
      setEvents((prev) => (prev ?? []).filter((e) => e.id !== id));
    } catch (e: any) {
      alert(e?.message || "削除に失敗しました");
    }
  }

  // フィルタ済み募集（期限切れは既定で非表示）
  const activeRecruits = useMemo(() => {
    const list = (recruits ?? []).slice().sort((a, b) => (a.deadline < b.deadline ? -1 : a.deadline > b.deadline ? 1 : 0));
    return showExpired ? list : list.filter((r) => !isExpiredJST(r.deadline));
  }, [recruits, showExpired]);

  return (
    <div className="min-h-screen w-full bg-white">
      <ArcHeader />

      {/* 見出し */}
      <header className="mx-auto max-w-7xl px-4 sm:px-6 md:px-10 lg:px-16 pt-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 break-keep">事業カレンダー管理</h1>
        <p className="mt-1 text-sm text-slate-500 break-keep">ADMIN / EDITOR 専用ページ（/exec/calendar）</p>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 md:px-10 lg:px-16 py-8">
        {/* === 現在募集中の案内 === */}
        <section className="mt-2 rounded-3xl border border-slate-200 bg-slate-50/70 p-4 sm:p-6">
          <SectionHeader
            title="現在募集中の案内"
            subtitle="参加期限（赤）と実施日程（青）をグループ分け。期限切れは自動で非表示。"
            right={
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <label className="text-sm text-slate-600 inline-flex items-center gap-2">
                  <input type="checkbox" checked={showExpired} onChange={(e) => setShowExpired(e.target.checked)} />
                  <span className="whitespace-nowrap">期限切れも表示</span>
                </label>
                <RedButton onClick={() => setOpenRecruit((v) => !v)} icon={!openRecruit ? <Plus size={16} /> : undefined} className="h-10">
                  {openRecruit ? "追加フォームを閉じる" : "募集を追加"}
                </RedButton>
              </div>
            }
          />

          {/* 追加フォーム（募集） */}
          {openRecruit && (
            <CardShell className="mt-4" accent>
              <div className="p-4 sm:p-5 space-y-4">
                {/* 参加期限（赤） */}
                <fieldset className="rounded-xl border border-rose-300 bg-rose-50/60 p-3 sm:p-4">
                  <legend className="px-2 text-xs font-semibold text-rose-700">参加期限</legend>
                  <label className="block text-sm text-slate-700">
                    <span className="mb-1 inline-flex items-center gap-2 font-semibold whitespace-nowrap">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-600" />
                      締切（必須）
                    </span>
                    <input
                      type="date"
                      value={rDeadline}
                      onChange={(e) => setRDeadline(e.target.value)}
                      className="h-11 w-full rounded-xl border border-rose-300 bg-white px-3 focus:outline-none focus:ring-4 focus:ring-rose-100"
                    />
                  </label>
                </fieldset>

                {/* 実施日程（青） */}
                <fieldset className="rounded-xl border border-sky-300 bg-sky-50/60 p-3 sm:p-4">
                  <legend className="px-2 text-xs font-semibold text-sky-700">実施日程</legend>

                  <div className="mb-2">
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" checked={rMulti} onChange={(e) => setRMulti(e.target.checked)} />
                      <span className="whitespace-nowrap">複数日</span>
                      <span className="text-xs text-slate-500 break-keep">（チェック時は終了日が表示されます）</span>
                    </label>
                  </div>

                  <div className={`grid ${rMulti ? "grid-cols-2" : "grid-cols-1"} gap-3`}>
                    <label className="text-sm text-slate-700 min-w-0">
                      <span className="mb-1 inline-flex items-center gap-2 font-semibold whitespace-nowrap">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-600" />
                        開始（必須）
                      </span>
                      <input
                        type="date"
                        value={rDate}
                        onChange={(e) => setRDate(e.target.value)}
                        className="h-11 w-full rounded-xl border border-sky-300 bg-white px-3 focus:outline-none focus:ring-4 focus:ring-sky-100"
                      />
                    </label>

                    {rMulti && (
                      <label className="text-sm text-slate-700 min-w-0">
                        <span className="mb-1 inline-flex items-center gap-2 font-semibold whitespace-nowrap">
                          <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-600" />
                          終了（必須）
                        </span>
                        <input
                          type="date"
                          value={rEndDate}
                          onChange={(e) => setREndDate(e.target.value)}
                          className="h-11 w-full rounded-xl border border-sky-300 bg-white px-3 focus:outline-none focus:ring-4 focus:ring-sky-100"
                        />
                      </label>
                    )}
                  </div>
                </fieldset>

                {/* タイトル/エリア/URL系 */}
                <div className="grid grid-cols-1 gap-3">
                  <label className="text-sm text-slate-700">
                    <span className="mb-1 inline-block font-semibold break-keep">募集タイトル（必須）</span>
                    <input
                      value={rTitle}
                      onChange={(e) => setRTitle(e.target.value)}
                      placeholder="例：地区合同キャンプ 参加者募集"
                      className="h-11 w-full rounded-xl border border-slate-300 px-3 focus:outline-none focus:ring-4 focus:ring-slate-100"
                    />
                  </label>

                  <label className="text-sm text-slate-700">
                    <span className="mb-1 inline-block font-semibold break-keep">地域・エリア（必須）</span>
                    <input
                      value={rArea}
                      onChange={(e) => setRArea(e.target.value)}
                      placeholder="例：名古屋北斗地区"
                      className="h-11 w-full rounded-xl border border-slate-300 px-3 focus:outline-none focus:ring-4 focus:ring-slate-100"
                    />
                  </label>

                  <label className="text-sm text-slate-700">
                    <span className="mb-1 inline-block font-semibold break-keep">URL（任意）</span>
                    <input
                      value={rUrl}
                      onChange={(e) => setRUrl(e.target.value)}
                      placeholder="開催要項ページなど"
                      className="h-11 w-full rounded-xl border border-slate-300 px-3 focus:outline-none focus:ring-4 focus:ring-slate-100"
                    />
                  </label>

                  <label className="text-sm text-slate-700">
                    <span className="mb-1 inline-block font-semibold break-keep">URLの説明（任意）</span>
                    <input
                      value={rUrlDesc}
                      onChange={(e) => setRUrlDesc(e.target.value)}
                      placeholder="例：募集要項PDF / 申込フォーム"
                      className="h-11 w-full rounded-xl border border-slate-300 px-3 focus:outline-none focus:ring-4 focus:ring-slate-100"
                    />
                  </label>

                  <label className="text-sm text-slate-700">
                    <span className="mb-1 inline-block font-semibold break-keep">画像URL（任意）</span>
                    <input
                      value={rImageUrl}
                      onChange={(e) => setRImageUrl(e.target.value)}
                      placeholder="サムネイル画像のURL"
                      className="h-11 w-full rounded-xl border border-slate-300 px-3 focus:outline-none focus:ring-4 focus:ring-slate-100"
                    />
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                  <RedButton onClick={submitRecruit} disabled={busyR} icon={<Plus size={16} />}>
                    追加する
                  </RedButton>
                  {msgR && <div className="text-sm text-slate-600 break-keep">{msgR}</div>}
                </div>
              </div>
            </CardShell>
          )}

          {/* 募集一覧 */}
          <div className="mt-6 text-[13px] text-slate-500 break-keep">最終更新：{recruitsUpdated}（期限切れは既定で非表示）</div>
          <div className="mt-3">
            {recruits === null ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-44 rounded-2xl border border-gray-200 bg-gray-50 animate-pulse" />
                ))}
              </div>
            ) : activeRecruits.length === 0 ? (
              <CardShell className="p-4 sm:p-5" accent={false}>
                <p className="text-slate-700 text-sm break-keep">現在、表示対象の募集はありません。</p>
              </CardShell>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {activeRecruits.map((r) => {
                  const editing = editingRecruitId === r.id;
                  const expired = isExpiredJST(r.deadline);
                  return (
                    <CardShell key={r.id} accent>
                      {r.imageUrl ? (
                        <div className="relative h-40 sm:h-48">
                          <Image src={r.imageUrl} alt={r.title} fill className="object-cover" />
                        </div>
                      ) : null}
                      <div className="p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="-mx-2 px-2 flex items-center gap-2 overflow-x-auto snap-x snap-mandatory">
                            <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold border whitespace-nowrap ${
                              expired ? "bg-rose-50/50 text-rose-400 border-rose-100" : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}>
                              締切：{r.deadline}
                            </span>
                            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700 border border-sky-200 whitespace-nowrap">
                              実施：{fmtRange(r.date, r.endDate)}
                            </span>
                            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 border border-slate-200 whitespace-nowrap">
                              {r.area}
                            </span>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                            <PublishToggle
                              checked={!!r.isPublished}
                              onChange={async (next) => {
                                try {
                                  const saved = await patchRecruit(r.id, { isPublished: next });
                                  setRecruits((prev) =>
                                    (prev ?? []).map((x) => (x.id === r.id ? { ...x, isPublished: saved.isPublished } : x))
                                  );
                                } catch (err: any) {
                                  alert(err?.message || "更新に失敗しました");
                                }
                              }}
                            />
                            <button
                              onClick={() => setEditingRecruitId(editing ? null : r.id)}
                              className="inline-flex items-center justify-center gap-1 h-9 rounded border border-slate-300 px-3 text-slate-700 hover:bg-slate-50 text-xs whitespace-nowrap"
                            >
                              <Pencil size={14} />
                              {editing ? "編集を閉じる" : "編集"}
                            </button>
                            <button
                              onClick={() => deleteRecruit(r.id)}
                              className="inline-flex items-center justify-center gap-1 h-9 rounded border border-rose-300 px-3 text-rose-700 hover:bg-rose-50 text-xs whitespace-nowrap"
                              aria-label="募集を削除"
                              title="募集を削除"
                            >
                              <Trash2 size={14} />
                              削除
                            </button>
                          </div>
                        </div>

                        {!editing ? (
                          <>
                            <h3 className="mt-2 text-base sm:text-lg font-bold text-gray-900 break-keep">{r.title}</h3>
                            {r.url && (
                              <div className="mt-2 text-sm">
                                <a
                                  className="text-blue-700 underline underline-offset-2 hover:no-underline break-keep"
                                  href={r.url}
                                  target={r.url.startsWith("http") ? "_blank" : undefined}
                                  rel={r.url.startsWith("http") ? "noopener noreferrer" : undefined}
                                >
                                  {r.urlDesc?.trim() ? r.urlDesc : "開催要項・詳細"}
                                </a>
                              </div>
                            )}
                          </>
                        ) : (
                          // === インライン編集フォーム（募集） ===
                          <div className="mt-4 grid grid-cols-1 gap-4">
                            {/* 参加期限（赤） */}
                            <fieldset className="rounded-lg border border-rose-300 bg-rose-50/60 p-3">
                              <legend className="px-2 text-xs font-semibold text-rose-700">参加期限</legend>
                              <label className="block text-xs text-slate-700">
                                <span className="mb-1 inline-flex items-center gap-2 font-semibold whitespace-nowrap">
                                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-600" />
                                  締切
                                </span>
                                <input
                                  type="date"
                                  defaultValue={r.deadline}
                                  onBlur={async (e) => {
                                    const v = e.target.value;
                                    if (v && v !== r.deadline) {
                                      try {
                                        const saved = await patchRecruit(r.id, { deadline: v });
                                        setRecruits((prev) =>
                                          (prev ?? []).map((x) => (x.id === r.id ? { ...x, deadline: saved.deadline.slice(0, 10) } : x))
                                        );
                                      } catch (err: any) { alert(err?.message || "更新に失敗しました"); }
                                    }
                                  }}
                                  className="h-10 w-full rounded-lg border border-rose-300 bg-white px-3"
                                />
                              </label>
                            </fieldset>

                            {/* 実施日程（青） */}
                            <fieldset className="rounded-lg border border-sky-300 bg-sky-50/60 p-3">
                              <legend className="px-2 text-xs font-semibold text-sky-700">実施日程</legend>

                              <div className="-mx-1 flex flex-wrap items-center gap-3 px-1">
                                <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                                  <input
                                    type="checkbox"
                                    defaultChecked={(r.endDate ?? r.date) !== r.date}
                                    onChange={async (e) => {
                                      if (!e.target.checked) {
                                        try {
                                          const saved = await patchRecruit(r.id, { endDate: r.date });
                                          setRecruits((prev) =>
                                            (prev ?? []).map((x) => (x.id === r.id ? { ...x, endDate: saved.endDate.slice(0, 10) } : x))
                                          );
                                        } catch (err: any) { alert(err?.message || "更新に失敗しました"); }
                                      }
                                    }}
                                  />
                                  <span className="whitespace-nowrap">複数日</span>
                                </label>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <label className="text-xs text-slate-700 min-w-0">
                                  <span className="mb-1 inline-flex items-center gap-2 font-semibold whitespace-nowrap">
                                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-600" />
                                    開始
                                  </span>
                                  <input
                                    type="date"
                                    defaultValue={r.date}
                                    onBlur={async (e) => {
                                      const v = e.target.value;
                                      if (v && v !== r.date) {
                                        try {
                                          const saved = await patchRecruit(r.id, { date: v });
                                          setRecruits((prev) =>
                                            (prev ?? []).map((x) => (x.id === r.id ? { ...x, date: saved.date.slice(0, 10) } : x))
                                          );
                                        } catch (err: any) { alert(err?.message || "更新に失敗しました"); }
                                      }
                                    }}
                                    className="h-10 w-full rounded-lg border border-sky-300 bg-white px-3"
                                  />
                                </label>

                                <label className="text-xs text-slate-700 min-w-0">
                                  <span className="mb-1 inline-flex items-center gap-2 font-semibold whitespace-nowrap">終了</span>
                                  <input
                                    type="date"
                                    defaultValue={r.endDate ?? r.date}
                                    onBlur={async (e) => {
                                      const v = e.target.value;
                                      if (v && v !== (r.endDate ?? r.date)) {
                                        try {
                                          const saved = await patchRecruit(r.id, { endDate: v });
                                          setRecruits((prev) =>
                                            (prev ?? []).map((x) => (x.id === r.id ? { ...x, endDate: (saved.endDate || saved.date).slice(0, 10) } : x))
                                          );
                                        } catch (err: any) { alert(err?.message || "更新に失敗しました"); }
                                      }
                                    }}
                                    className="h-10 w-full rounded-lg border border-sky-300 bg-white px-3"
                                  />
                                </label>
                              </div>
                            </fieldset>

                            <input
                              defaultValue={r.title}
                              onBlur={async (e) => {
                                const v = e.target.value;
                                if (v !== r.title) {
                                  try {
                                    const saved = await patchRecruit(r.id, { title: v });
                                    setRecruits((prev) =>
                                      (prev ?? []).map((x) => (x.id === r.id ? { ...x, title: saved.title } : x))
                                    );
                                  } catch (err: any) { alert(err?.message || "更新に失敗しました"); }
                                }
                              }}
                              className="h-10 w-full rounded-lg border border-slate-300 px-3 break-keep"
                              placeholder="募集タイトル"
                            />

                            <input
                              defaultValue={r.area}
                              onBlur={async (e) => {
                                const v = e.target.value;
                                if (v !== r.area) {
                                  try {
                                    const saved = await patchRecruit(r.id, { area: v });
                                    setRecruits((prev) =>
                                      (prev ?? []).map((x) => (x.id === r.id ? { ...x, area: saved.area } : x))
                                    );
                                  } catch (err: any) { alert(err?.message || "更新に失敗しました"); }
                                }
                              }}
                              className="h-10 w-full rounded-lg border border-slate-300 px-3 break-keep"
                              placeholder="地域・エリア"
                            />

                            <input
                              defaultValue={r.url ?? ""}
                              onBlur={async (e) => {
                                const v = e.target.value || null;
                                if (v !== (r.url ?? null)) {
                                  try {
                                    const saved = await patchRecruit(r.id, { url: v || undefined });
                                    setRecruits((prev) =>
                                      (prev ?? []).map((x) => (x.id === r.id ? { ...x, url: saved.url ?? undefined } : x))
                                    );
                                  } catch (err: any) { alert(err?.message || "更新に失敗しました"); }
                                }
                              }}
                              className="h-10 w-full rounded-lg border border-slate-300 px-3 break-keep"
                              placeholder="URL（任意）"
                            />

                            <input
                              defaultValue={r.urlDesc ?? ""}
                              onBlur={async (e) => {
                                const v = e.target.value || null;
                                if (v !== (r.urlDesc ?? null)) {
                                  try {
                                    const saved = await patchRecruit(r.id, { urlDesc: v || undefined });
                                    setRecruits((prev) =>
                                      (prev ?? []).map((x) => (x.id === r.id ? { ...x, urlDesc: saved.urlDesc ?? undefined } : x))
                                    );
                                  } catch (err: any) { alert(err?.message || "更新に失敗しました"); }
                                }
                              }}
                              className="h-10 w-full rounded-lg border border-slate-300 px-3 break-keep"
                              placeholder="URLの説明（任意）"
                            />

                            <input
                              defaultValue={r.imageUrl ?? ""}
                              onBlur={async (e) => {
                                const v = e.target.value || null;
                                if (v !== (r.imageUrl ?? null)) {
                                  try {
                                    const saved = await patchRecruit(r.id, { imageUrl: v || undefined });
                                    setRecruits((prev) =>
                                      (prev ?? []).map((x) => (x.id === r.id ? { ...x, imageUrl: saved.imageUrl ?? undefined } : x))
                                    );
                                  } catch (err: any) { alert(err?.message || "更新に失敗しました"); }
                                }
                              }}
                              className="h-10 w-full rounded-lg border border-slate-300 px-3 break-keep"
                              placeholder="画像URL（任意）"
                            />

                            <div className="flex justify-end">
                              <button
                                onClick={() => setEditingRecruitId(null)}
                                className="h-9 rounded border border-slate-300 px-3 text-slate-700 hover:bg-slate-50 text-xs whitespace-nowrap"
                              >
                                完了
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardShell>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* === 年間スケジュール === */}
        <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-4 sm:p-6">
          <SectionHeader
            title="年間スケジュール"
            subtitle="日付（青）→次の行に事業名。年度またぎも一括表示。"
            right={
              <RedButton onClick={() => setOpenEvent((v) => !v)} icon={!openEvent ? <Plus size={16} /> : undefined} className="h-10">
                {openEvent ? "追加フォームを閉じる" : "スケジュールを追加"}
              </RedButton>
            }
          />

          {/* 追加フォーム（スケジュール） */}
          {openEvent && (
            <CardShell className="mt-4" accent={false}>
              <div className="p-4 sm:p-5 space-y-4">
                {/* 実施日程（青） */}
                <fieldset className="rounded-xl border border-sky-300 bg-sky-50/60 p-3 sm:p-4">
                  <legend className="px-2 text-xs font-semibold text-sky-700">実施日程</legend>

                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" checked={eMulti} onChange={(e) => setEMulti(e.target.checked)} />
                      <span className="whitespace-nowrap">複数日</span>
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" checked={eFuzzy} onChange={(e) => setEFuzzy(e.target.checked)} />
                      <span className="whitespace-nowrap">日程未確定</span>
                    </label>
                    <span className="text-xs text-slate-500 break-keep">※ 未確定は表示上「（日程未確定）」と注記</span>
                  </div>

                  <div className={`grid ${eMulti ? "grid-cols-2" : "grid-cols-1"} gap-3 mt-2`}>
                    <label className="text-sm text-slate-700 min-w-0">
                      <span className="mb-1 inline-flex items-center gap-2 font-semibold whitespace-nowrap">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-600" />
                        開始（必須）
                      </span>
                      <input
                        type="date"
                        value={eDate}
                        onChange={(e) => setEDate(e.target.value)}
                        className="h-11 w-full rounded-xl border border-sky-300 bg-white px-3 focus:outline-none focus:ring-4 focus:ring-sky-100"
                      />
                    </label>

                    {eMulti && (
                      <label className="text-sm text-slate-700 min-w-0">
                        <span className="mb-1 inline-flex items-center gap-2 font-semibold whitespace-nowrap">
                          <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-600" />
                          終了（必須）
                        </span>
                        <input
                          type="date"
                          value={eEndDate}
                          onChange={(e) => setEEndDate(e.target.value)}
                          className="h-11 w-full rounded-xl border border-sky-300 bg-white px-3 focus:outline-none focus:ring-4 focus:ring-sky-100"
                        />
                      </label>
                    )}
                  </div>
                </fieldset>

                {/* 事業名（次の行） */}
                <label className="block text-sm text-slate-700">
                  <span className="mb-1 inline-block font-semibold break-keep">事業名（必須）</span>
                  <input
                    value={eTitle}
                    onChange={(e) => setETitle(e.target.value)}
                    placeholder="例：愛知ローバーキャンプ"
                    className="h-11 w-full rounded-xl border border-slate-300 px-3 focus:outline-none focus:ring-4 focus:ring-slate-100"
                  />
                </label>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                  <RedButton onClick={submitEvent} disabled={busyE} icon={<Plus size={16} />}>
                    追加する
                  </RedButton>
                  {msgE && <div className="text-sm text-slate-600 break-keep">{msgE}</div>}
                </div>
              </div>
            </CardShell>
          )}

          <div className="mt-6 text-[13px] text-slate-500 break-keep">スケジュール最終更新：{eventsUpdated}</div>
          {events === null ? (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 rounded-2xl border border-gray-200 bg-gray-50 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 12 }).map((_, m) => {
                const monthName = `${m + 1}月`;
                const items = (byMonth as any)[m] ?? [];
                return (
                  <CardShell key={m} className="p-4" accent={false}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-bold text-slate-900 break-keep">{monthName}</h3>
                    </div>
                    {items.length === 0 ? (
                      <p className="text-[13px] text-slate-500">予定は未登録です。</p>
                    ) : (
                      <ul className="space-y-4 text-sm">
                        {items.map((ev: EventItem) => {
                          const editing = editingEventId === ev.id;
                          return (
                            <li key={ev.id} className="text-slate-800">
                              {!editing ? (
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="-mx-2 px-2 flex items-center gap-2 overflow-x-auto snap-x snap-mandatory">
                                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700 border border-sky-200 whitespace-nowrap">
                                        {fmtRange(ev.date, ev.endDate)}
                                      </span>
                                      {ev.note ? (
                                        <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 border border-slate-200 whitespace-nowrap">
                                          日程未確定
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="mt-1 font-medium break-keep">{ev.title}</div>
                                  </div>

                                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                    <PublishToggle
                                      checked={!!ev.isPublished}
                                      onChange={async (next) => {
                                        try {
                                          const saved = await patchEvent(ev.id, { isPublished: next });
                                          setEvents((prev) =>
                                            (prev ?? []).map((x) => (x.id === ev.id ? { ...x, isPublished: saved.isPublished } : x))
                                          );
                                        } catch (err: any) {
                                          alert(err?.message || "更新に失敗しました");
                                        }
                                      }}
                                    />
                                    <button
                                      onClick={() => setEditingEventId(ev.id)}
                                      className="inline-flex items-center justify-center gap-1 h-9 rounded border border-slate-300 px-3 text-slate-700 hover:bg-slate-50 text-xs whitespace-nowrap"
                                    >
                                      <Pencil size={14} />
                                      編集
                                    </button>
                                    <button
                                      onClick={() => deleteEvent(ev.id)}
                                      className="inline-flex items-center justify-center gap-1 h-9 rounded border border-rose-300 px-3 text-rose-700 hover:bg-rose-50 text-xs whitespace-nowrap"
                                    >
                                      <Trash2 size={14} />
                                      削除
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                // === インライン編集フォーム（イベント） ===
                                <div className="rounded-lg border border-slate-200 p-3 space-y-3">
                                  <fieldset className="rounded-lg border border-sky-300 bg-sky-50/60 p-3">
                                    <legend className="px-2 text-xs font-semibold text-sky-700">実施日程</legend>

                                    <div className="-mx-1 flex flex-wrap items-center gap-3 px-1">
                                      <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                                        <input
                                          type="checkbox"
                                          defaultChecked={(ev.endDate ?? ev.date) !== ev.date}
                                          onChange={async (e) => {
                                            if (!e.target.checked) {
                                              try {
                                                const saved = await patchEvent(ev.id, { endDate: ev.date });
                                                setEvents((prev) =>
                                                  (prev ?? []).map((x) => (x.id === ev.id ? { ...x, endDate: saved.endDate.slice(0, 10) } : x))
                                                );
                                              } catch (err: any) { alert(err?.message || "更新に失敗しました"); }
                                            }
                                          }}
                                        />
                                        <span className="whitespace-nowrap">複数日</span>
                                      </label>
                                      <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                                        <input
                                          type="checkbox"
                                          defaultChecked={ev.note === "日程未確定"}
                                          onChange={async (e) => {
                                            try {
                                              const saved = await patchEvent(ev.id, { note: e.target.checked ? "日程未確定" : "" });
                                              setEvents((prev) =>
                                                (prev ?? []).map((x) => (x.id === ev.id ? { ...x, note: saved.note || undefined } : x))
                                              );
                                            } catch (err: any) { alert(err?.message || "更新に失敗しました"); }
                                          }}
                                        />
                                        <span className="whitespace-nowrap">日程未確定</span>
                                      </label>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                      <input
                                        type="date"
                                        defaultValue={ev.date}
                                        onBlur={async (e) => {
                                          const v = e.target.value;
                                          if (v && v !== ev.date) {
                                            try {
                                              const saved = await patchEvent(ev.id, { date: v });
                                              setEvents((prev) =>
                                                (prev ?? []).map((x) => (x.id === ev.id ? { ...x, date: saved.date.slice(0, 10) } : x))
                                              );
                                            } catch (err: any) { alert(err?.message || "更新に失敗しました"); }
                                          }
                                        }}
                                        className="h-10 w-full rounded-lg border border-sky-300 bg-white px-3"
                                      />
                                      <input
                                        type="date"
                                        defaultValue={ev.endDate ?? ev.date}
                                        onBlur={async (e) => {
                                          const v = e.target.value;
                                          if (v && v !== (ev.endDate ?? ev.date)) {
                                            try {
                                              const saved = await patchEvent(ev.id, { endDate: v });
                                              setEvents((prev) =>
                                                (prev ?? []).map((x) => (x.id === ev.id ? { ...x, endDate: (saved.endDate || saved.date).slice(0, 10) } : x))
                                              );
                                            } catch (err: any) { alert(err?.message || "更新に失敗しました"); }
                                          }
                                        }}
                                        className="h-10 w-full rounded-lg border border-sky-300 bg-white px-3"
                                      />
                                    </div>
                                  </fieldset>

                                  <input
                                    defaultValue={ev.title}
                                    onBlur={async (e) => {
                                      const v = e.target.value;
                                      if (v !== ev.title) {
                                        try {
                                          const saved = await patchEvent(ev.id, { title: v });
                                          setEvents((prev) =>
                                            (prev ?? []).map((x) => (x.id === ev.id ? { ...x, title: saved.title } : x))
                                          );
                                        } catch (err: any) { alert(err?.message || "更新に失敗しました"); }
                                      }
                                    }}
                                    className="h-10 w-full rounded-lg border border-slate-300 px-3 break-keep"
                                    placeholder="事業名"
                                  />

                                  <div className="flex justify-end">
                                    <button
                                      onClick={() => setEditingEventId(null)}
                                      className="h-8 rounded border border-slate-300 px-3 text-slate-700 hover:bg-slate-50 text-xs whitespace-nowrap"
                                    >
                                      完了
                                    </button>
                                  </div>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </CardShell>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

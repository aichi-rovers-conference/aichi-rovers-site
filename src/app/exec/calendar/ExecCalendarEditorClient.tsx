// app/exec/calendar/ExecCalendarEditorClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import ArcHeader from "@/src/components/ArcHeader";
import { Plus, Pencil, Trash2 } from "lucide-react";

const EVENTS_API_URL = "/api/calendar/events";
const RECRUIT_API_URL = "/api/calendar/recruitings";

type EventItem = {
  id: string;
  date: string; // YYYY-MM-DD (JST)
  endDate?: string; // 未指定=単日
  title: string;
  note?: string;
  area?: string;
  url?: string;
  isPublished?: boolean;
};

type RecruitingItem = {
  id: string;
  title: string;
  date: string; // 実施開始 (JST)
  endDate?: string; // 実施終了（未指定=単日）
  deadline: string; // 参加期限 (JST)

  // ✅ 追加：掲載開始（予約投稿）
  publishFrom: string;

  area: string;
  url?: string;
  urlDesc?: string;
  imageUrl?: string;
  isPublished?: boolean;
};

function isoToJstYmd(input: unknown): string | undefined {
  if (!input) return undefined;
  const s = String(input);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (isNaN(d.getTime())) return undefined;
  const t = d.getTime() + 9 * 60 * 60 * 1000;
  return new Date(t).toISOString().slice(0, 10);
}

function todayJstYmd(): string {
  const t = Date.now() + 9 * 60 * 60 * 1000;
  return new Date(t).toISOString().slice(0, 10);
}

function isExpiredJST(yyyy_mm_dd: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyy_mm_dd || "")) return false;
  const endOfDayJst = new Date(`${yyyy_mm_dd}T23:59:59+09:00`).getTime();
  return Date.now() > endOfDayJst;
}

function isNotStartedYetJST(publishFrom?: string) {
  if (!publishFrom) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publishFrom || "")) return false;
  const start = new Date(`${publishFrom}T00:00:00+09:00`).getTime();
  return Date.now() < start;
}

// ====== 追加：年度またぎ（4月始まり）ユーティリティ ======
function currentFiscalYearJst(): number {
  // JSTとして扱うため +9h して UTCフィールドを見る
  const d = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1; // 1..12
  return m >= 4 ? y : y - 1;
}

function fiscalYearFromYmd(ymd: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd || "")) return null;
  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(5, 7));
  if (!y || !m) return null;
  return m >= 4 ? y : y - 1; // 4〜12月はその年の年度、1〜3月は前年の年度
}

function formatDatePill(start: string, end?: string) {
  if (!end || end === start) return start;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return `${start} ～ ${end}`;
  }
  const sy = start.slice(0, 4),
    sm = start.slice(5, 7);
  const ey = end.slice(0, 4),
    em = end.slice(5, 7),
    ed = end.slice(8, 10);

  // 同じ年月なら「2026-03-13 ～ 15」形式にする
  if (sy === ey && sm === em) return `${start} ～ ${ed}`;
  return `${start} ～ ${end}`;
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

function SectionHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="inline-block h-5 w-1 rounded-full bg-red-600" />
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 break-words">
            {title}
          </h2>
        </div>
        {subtitle && <p className="mt-1 text-sm text-slate-500 break-words">{subtitle}</p>}
      </div>

      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

function PrimaryButton({
  children,
  icon,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-red-700 text-white font-semibold shadow hover:bg-red-600 disabled:opacity-50 whitespace-nowrap ${className ?? ""}`}
      type="button"
    >
      {icon}
      {children}
    </motion.button>
  );
}

function PublishToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="relative inline-flex items-center cursor-pointer select-none">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="w-10 h-6 bg-slate-200 rounded-full peer-checked:bg-red-600 transition-colors" />
      <div className="absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-all peer-checked:left-5 shadow" />
      <span className="ml-2 text-xs text-slate-600 whitespace-nowrap">公開</span>
    </label>
  );
}

export default function ExecCalendarEditorClient() {
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [eventsUpdated, setEventsUpdated] = useState<string>("—");
  const [recruits, setRecruits] = useState<RecruitingItem[] | null>(null);
  const [recruitsUpdated, setRecruitsUpdated] = useState<string>("—");

  const [showExpired, setShowExpired] = useState(false);

  // ====== 年間スケジュール表示用（年度） ======
  const [fiscalYear, setFiscalYear] = useState<number>(() => currentFiscalYearJst());

  // 追加フォーム（募集）
  const [openRecruitForm, setOpenRecruitForm] = useState(false);
  const [rPublishFrom, setRPublishFrom] = useState<string>(todayJstYmd()); // ✅ 追加
  const [rDeadline, setRDeadline] = useState<string>(todayJstYmd());
  const [rDate, setRDate] = useState<string>(todayJstYmd());
  const [rEndDate, setREndDate] = useState<string>(todayJstYmd());
  const [rMulti, setRMulti] = useState(false);
  const [rTitle, setRTitle] = useState("");
  const [rArea, setRArea] = useState("");
  const [rUrl, setRUrl] = useState("");
  const [rUrlDesc, setRUrlDesc] = useState("");
  const [rImageUrl, setRImageUrl] = useState("");
  const [rIsPublished, setRIsPublished] = useState(true);

  // 編集（募集）
  const [editingRecruitId, setEditingRecruitId] = useState<string | null>(null);
  const [editRecruit, setEditRecruit] = useState<Partial<RecruitingItem> | null>(null);

  // ====== 追加：イベント（年間スケジュール）CRUD state ======
  const [openEventForm, setOpenEventForm] = useState(false);

  const [eDate, setEDate] = useState<string>(todayJstYmd());
  const [eEndDate, setEEndDate] = useState<string>(todayJstYmd());
  const [eMulti, setEMulti] = useState(false);

  const [eTitle, setETitle] = useState("");
  const [eNote, setENote] = useState("");
  const [eArea, setEArea] = useState("");
  const [eUrl, setEUrl] = useState("");
  const [eIsPublished, setEIsPublished] = useState(true);

  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editEvent, setEditEvent] = useState<Partial<EventItem> | null>(null);

  // API
  const loadRecruits = async () => {
    const res = await fetch(`${RECRUIT_API_URL}?all=1`, { cache: "no-store" });
    const j = await safeJson(res);
    const data: RecruitingItem[] = (j.items || []).map((x: any) => ({
      id: String(x.id),
      title: String(x.title ?? ""),
      date: isoToJstYmd(x.date)!,
      endDate: isoToJstYmd(x.endDate) || isoToJstYmd(x.date),
      deadline: isoToJstYmd(x.deadline)!,
      publishFrom: isoToJstYmd(x.publishFrom) || todayJstYmd(), // ✅
      area: String(x.area ?? ""),
      url: x.url || undefined,
      urlDesc: x.urlDesc || undefined,
      imageUrl: x.imageUrl || undefined,
      isPublished: x?.isPublished !== false,
    }));

    setRecruits(
      data.sort((a, b) => (a.deadline < b.deadline ? -1 : a.deadline > b.deadline ? 1 : 0))
    );
    setRecruitsUpdated(j.lastUpdated ? new Date(j.lastUpdated).toLocaleString() : "—");
  };

  async function fetchEventsYear(year: number) {
    try {
      const res = await fetch(`${EVENTS_API_URL}?year=${year}&all=1`, { cache: "no-store" });
      const j = await safeJson(res);
      if (!res.ok) return { items: [] as EventItem[], lastUpdated: null as null | string };

      const items: EventItem[] = (j.items || []).map((x: any) => ({
        id: String(x.id),
        date: isoToJstYmd(x.date)!,
        endDate: isoToJstYmd(x.endDate) || isoToJstYmd(x.date),
        title: String(x.title ?? ""),
        note: x.note || undefined,
        area: x.area || undefined,
        url: x.url || undefined,
        isPublished: x?.isPublished !== false,
      }));

      return { items, lastUpdated: j.lastUpdated ? String(j.lastUpdated) : null };
    } catch {
      return { items: [] as EventItem[], lastUpdated: null as null | string };
    }
  }

  const loadEvents = async (fy: number) => {
    // 年度またぎ：年度Y の 4〜12月 と 年度Y+1 の 1〜3月が必要なので 2年分取得
    const a = await fetchEventsYear(fy);
    const b = await fetchEventsYear(fy + 1);

    // merge by id
    const map = new Map<string, EventItem>();
    for (const it of [...a.items, ...b.items]) map.set(it.id, it);
    const merged = Array.from(map.values()).sort((x, y) =>
      x.date < y.date ? -1 : x.date > y.date ? 1 : 0
    );

    setEvents(merged);

    const candidates = [a.lastUpdated, b.lastUpdated].filter(Boolean) as string[];
    const latest = candidates.length ? candidates.sort().at(-1) : null;
    setEventsUpdated(latest ? new Date(latest).toLocaleString() : "—");
  };

  useEffect(() => {
    loadRecruits().catch(() => setRecruits([]));
  }, []);

  useEffect(() => {
    loadEvents(fiscalYear).catch(() => setEvents([]));
  }, [fiscalYear]);

  async function createRecruit() {
    const payload = {
      title: rTitle,
      area: rArea,
      publishFrom: rPublishFrom, // ✅
      deadline: rDeadline,
      date: rDate,
      endDate: rMulti ? rEndDate : rDate,
      url: rUrl || undefined,
      urlDesc: rUrlDesc || undefined,
      imageUrl: rImageUrl || undefined,
      isPublished: rIsPublished,
    };

    const res = await fetch(RECRUIT_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await safeJson(res);
    if (!res.ok) throw new Error(j?.error || "作成に失敗しました");

    setOpenRecruitForm(false);
    setRTitle("");
    setRArea("");
    setRUrl("");
    setRUrlDesc("");
    setRImageUrl("");
    await loadRecruits();
  }

  async function patchRecruit(id: string, patch: Partial<RecruitingItem>) {
    const res = await fetch(`${RECRUIT_API_URL}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const j = await safeJson(res);
    if (!res.ok) throw new Error(j?.error || "更新に失敗しました");
    await loadRecruits();
    return j.item;
  }

  async function deleteRecruit(id: string) {
    if (!confirm("この募集を削除します。よろしいですか？")) return;
    const res = await fetch(`${RECRUIT_API_URL}/${id}`, { method: "DELETE" });
    const j = await safeJson(res);
    if (!res.ok) throw new Error(j?.error || "削除に失敗しました");
    await loadRecruits();
  }

  // ====== 追加：イベントCRUD ======
  async function createEvent() {
    const payload = {
      title: eTitle,
      date: eDate,
      endDate: eMulti ? eEndDate : eDate,
      note: eNote || undefined,
      area: eArea || undefined,
      url: eUrl || undefined,
      isPublished: eIsPublished,
    };

    const res = await fetch(EVENTS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await safeJson(res);
    if (!res.ok) throw new Error(j?.error || "作成に失敗しました");

    setOpenEventForm(false);
    setETitle("");
    setENote("");
    setEArea("");
    setEUrl("");
    await loadEvents(fiscalYear);
  }

  async function patchEvent(id: string, patch: Partial<EventItem>) {
    const res = await fetch(`${EVENTS_API_URL}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const j = await safeJson(res);
    if (!res.ok) throw new Error(j?.error || "更新に失敗しました");
    await loadEvents(fiscalYear);
    return j.item;
  }

  async function deleteEvent(id: string) {
    if (!confirm("このスケジュールを削除します。よろしいですか？")) return;
    const res = await fetch(`${EVENTS_API_URL}/${id}`, { method: "DELETE" });
    const j = await safeJson(res);
    if (!res.ok) throw new Error(j?.error || "削除に失敗しました");
    await loadEvents(fiscalYear);
  }

  const activeRecruits = useMemo(() => {
    const list = (recruits ?? []).slice();
    return showExpired ? list : list.filter((r) => !isExpiredJST(r.deadline));
  }, [recruits, showExpired]);

  // ====== 年間スケジュール：年度で絞って月別に並べる ======
  const fiscalEvents = useMemo(() => {
    const list = (events ?? []).slice();
    return list
      .filter((e) => fiscalYearFromYmd(e.date) === fiscalYear)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }, [events, fiscalYear]);

  const eventsByMonth = useMemo(() => {
    const map = new Map<number, EventItem[]>();
    for (let m = 1; m <= 12; m++) map.set(m, []);
    for (const e of fiscalEvents) {
      const m = Number(e.date.slice(5, 7));
      if (!map.has(m)) map.set(m, []);
      map.get(m)!.push(e);
    }
    return map;
  }, [fiscalEvents]);

  return (
    <div className="min-h-screen w-full bg-white">
      <ArcHeader />

      <header className="mx-auto max-w-7xl px-4 sm:px-6 md:px-10 lg:px-16 pt-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 break-words">
          事業カレンダー管理
        </h1>
        <p className="mt-1 text-sm text-slate-500 break-words">
          ADMIN / EDITOR 専用ページ（/exec/calendar）
        </p>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 md:px-10 lg:px-16 py-8">
        {/* 募集 */}
        <section className="mt-2 rounded-3xl border border-slate-200 bg-slate-50/70 p-4 sm:p-6">
          <SectionHeader
            title="現在募集中の案内"
            subtitle="✅掲載開始日（予約投稿）を追加：掲載開始日までは公開ページに出ません / 締切で消えます"
            right={
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <label className="text-sm text-slate-600 inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showExpired}
                    onChange={(e) => setShowExpired(e.target.checked)}
                  />
                  期限切れも表示
                </label>
                <PrimaryButton icon={<Plus size={18} />} onClick={() => setOpenRecruitForm((v) => !v)}>
                  {openRecruitForm ? "追加フォームを閉じる" : "追加フォームを開く"}
                </PrimaryButton>
              </div>
            }
          />

          {openRecruitForm && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <fieldset className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="text-xs font-bold text-amber-700">掲載開始（予約投稿）</div>
                  <input
                    type="date"
                    value={rPublishFrom}
                    onChange={(e) => setRPublishFrom(e.target.value)}
                    className="mt-2 h-10 w-full rounded-lg border border-amber-300 bg-white px-3"
                  />
                  <div className="mt-1 text-[11px] text-amber-700">
                    この日(0:00 JST)から公開ページに表示されます
                  </div>
                </fieldset>

                <fieldset className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <div className="text-xs font-bold text-rose-700">参加期限（締切）</div>
                  <input
                    type="date"
                    value={rDeadline}
                    onChange={(e) => setRDeadline(e.target.value)}
                    className="mt-2 h-10 w-full rounded-lg border border-rose-300 bg-white px-3"
                  />
                </fieldset>

                <fieldset className="sm:col-span-2 rounded-xl border border-sky-200 bg-sky-50 p-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-xs font-bold text-sky-700">実施日程</div>
                    <label className="inline-flex items-center gap-2 text-xs text-slate-700 whitespace-nowrap">
                      <input type="checkbox" checked={rMulti} onChange={(e) => setRMulti(e.target.checked)} />
                      複数日（チェック時は終了日が表示されます）
                    </label>
                  </div>

                  <div className={`mt-2 grid ${rMulti ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"} gap-3`}>
                    <input
                      type="date"
                      value={rDate}
                      onChange={(e) => setRDate(e.target.value)}
                      className="h-10 w-full rounded-lg border border-sky-300 bg-white px-3"
                    />
                    {rMulti && (
                      <input
                        type="date"
                        value={rEndDate}
                        onChange={(e) => setREndDate(e.target.value)}
                        className="h-10 w-full rounded-lg border border-sky-300 bg-white px-3"
                      />
                    )}
                  </div>
                </fieldset>

                <input
                  value={rTitle}
                  onChange={(e) => setRTitle(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3"
                  placeholder="募集タイトル（必須）"
                />
                <input
                  value={rArea}
                  onChange={(e) => setRArea(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3"
                  placeholder="地域・エリア（必須）"
                />
                <input
                  value={rUrl}
                  onChange={(e) => setRUrl(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3"
                  placeholder="URL（任意）"
                />
                <input
                  value={rUrlDesc}
                  onChange={(e) => setRUrlDesc(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3"
                  placeholder="URL説明（任意）"
                />
                <input
                  value={rImageUrl}
                  onChange={(e) => setRImageUrl(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 sm:col-span-2"
                  placeholder="画像URL（任意）"
                />

                <div className="flex items-center justify-between sm:col-span-2 gap-3 flex-wrap">
                  <PublishToggle checked={rIsPublished} onChange={setRIsPublished} />
                  <PrimaryButton
                    onClick={async () => {
                      try {
                        if (!rTitle.trim() || !rArea.trim() || !rDate || !rDeadline || !rPublishFrom) {
                          alert("必須項目（掲載開始/締切/日程/タイトル/エリア）が未入力です");
                          return;
                        }
                        await createRecruit();
                      } catch (e: any) {
                        alert(e?.message || "作成に失敗しました");
                      }
                    }}
                  >
                    追加する
                  </PrimaryButton>
                </div>
              </div>
            </div>
          )}

          {/* 一覧 */}
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeRecruits.map((r) => {
              const isEditing = editingRecruitId === r.id;
              const future = isNotStartedYetJST(r.publishFrom);
              const expired = isExpiredJST(r.deadline);

              return (
                <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-xs font-medium px-2 py-1 rounded-lg bg-slate-100 border border-slate-200">
                          {r.area}
                        </span>
                        {future && (
                          <span className="text-xs font-bold px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
                            未掲載（予約）
                          </span>
                        )}
                        {expired && (
                          <span className="text-xs font-bold px-2 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
                            期限切れ
                          </span>
                        )}
                      </div>

                      <div className="mt-2 font-extrabold text-slate-900 break-words">{r.title}</div>

                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-2">
                          <div className="font-bold text-amber-700">掲載開始</div>
                          <div className="mt-1">{r.publishFrom}</div>
                        </div>
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-2">
                          <div className="font-bold text-rose-700">締切</div>
                          <div className="mt-1">{r.deadline}</div>
                        </div>
                        <div className="rounded-xl border border-sky-200 bg-sky-50 p-2">
                          <div className="font-bold text-sky-700">実施</div>
                          <div className="mt-1">
                            {r.date}
                            {r.endDate && r.endDate !== r.date ? `〜${r.endDate}` : ""}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2">
                      <PublishToggle
                        checked={r.isPublished !== false}
                        onChange={async (next) => {
                          try {
                            await patchRecruit(r.id, { isPublished: next });
                          } catch (e: any) {
                            alert(e?.message || "更新に失敗しました");
                          }
                        }}
                      />
                      <button
                        className="inline-flex items-center gap-1 px-3 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 whitespace-nowrap shrink-0"
                        onClick={() => {
                          setEditingRecruitId(isEditing ? null : r.id);
                          setEditRecruit(isEditing ? null : { ...r });
                        }}
                        type="button"
                      >
                        <Pencil size={16} /> 編集
                      </button>
                      <button
                        className="inline-flex items-center gap-1 px-3 h-9 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 whitespace-nowrap shrink-0"
                        onClick={async () => {
                          try {
                            await deleteRecruit(r.id);
                          } catch (e: any) {
                            alert(e?.message || "削除に失敗しました");
                          }
                        }}
                        type="button"
                      >
                        <Trash2 size={16} /> 削除
                      </button>
                    </div>
                  </div>

                  {isEditing && editRecruit && (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <fieldset className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                          <div className="text-xs font-bold text-amber-700">掲載開始（予約投稿）</div>
                          <input
                            type="date"
                            value={editRecruit.publishFrom ?? r.publishFrom}
                            onChange={(e) =>
                              setEditRecruit((p) => ({ ...(p ?? {}), publishFrom: e.target.value }))
                            }
                            className="mt-2 h-10 w-full rounded-lg border border-amber-300 bg-white px-3"
                          />
                        </fieldset>

                        <fieldset className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                          <div className="text-xs font-bold text-rose-700">参加期限（締切）</div>
                          <input
                            type="date"
                            value={editRecruit.deadline ?? r.deadline}
                            onChange={(e) =>
                              setEditRecruit((p) => ({ ...(p ?? {}), deadline: e.target.value }))
                            }
                            className="mt-2 h-10 w-full rounded-lg border border-rose-300 bg-white px-3"
                          />
                        </fieldset>

                        <fieldset className="sm:col-span-2 rounded-xl border border-sky-200 bg-sky-50 p-3">
                          <div className="text-xs font-bold text-sky-700">実施日程</div>
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                              type="date"
                              value={editRecruit.date ?? r.date}
                              onChange={(e) => setEditRecruit((p) => ({ ...(p ?? {}), date: e.target.value }))}
                              className="h-10 w-full rounded-lg border border-sky-300 bg-white px-3"
                            />
                            <input
                              type="date"
                              value={editRecruit.endDate ?? r.endDate ?? r.date}
                              onChange={(e) =>
                                setEditRecruit((p) => ({ ...(p ?? {}), endDate: e.target.value }))
                              }
                              className="h-10 w-full rounded-lg border border-sky-300 bg-white px-3"
                            />
                          </div>
                        </fieldset>

                        <input
                          value={editRecruit.title ?? r.title}
                          onChange={(e) => setEditRecruit((p) => ({ ...(p ?? {}), title: e.target.value }))}
                          className="h-10 w-full rounded-lg border border-slate-300 px-3"
                          placeholder="募集タイトル"
                        />
                        <input
                          value={editRecruit.area ?? r.area}
                          onChange={(e) => setEditRecruit((p) => ({ ...(p ?? {}), area: e.target.value }))}
                          className="h-10 w-full rounded-lg border border-slate-300 px-3"
                          placeholder="地域・エリア"
                        />
                        <input
                          value={editRecruit.url ?? r.url ?? ""}
                          onChange={(e) => setEditRecruit((p) => ({ ...(p ?? {}), url: e.target.value }))}
                          className="h-10 w-full rounded-lg border border-slate-300 px-3"
                          placeholder="URL"
                        />
                        <input
                          value={editRecruit.urlDesc ?? r.urlDesc ?? ""}
                          onChange={(e) =>
                            setEditRecruit((p) => ({ ...(p ?? {}), urlDesc: e.target.value }))
                          }
                          className="h-10 w-full rounded-lg border border-slate-300 px-3"
                          placeholder="URL説明"
                        />
                        <input
                          value={editRecruit.imageUrl ?? r.imageUrl ?? ""}
                          onChange={(e) =>
                            setEditRecruit((p) => ({ ...(p ?? {}), imageUrl: e.target.value }))
                          }
                          className="h-10 w-full rounded-lg border border-slate-300 px-3 sm:col-span-2"
                          placeholder="画像URL"
                        />

                        <div className="sm:col-span-2 flex flex-wrap justify-end gap-2">
                          <button
                            className="h-10 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 whitespace-nowrap"
                            onClick={() => {
                              setEditingRecruitId(null);
                              setEditRecruit(null);
                            }}
                            type="button"
                          >
                            キャンセル
                          </button>
                          <PrimaryButton
                            onClick={async () => {
                              try {
                                const patch = {
                                  title: editRecruit.title,
                                  area: editRecruit.area,
                                  date: editRecruit.date,
                                  endDate: editRecruit.endDate,
                                  deadline: editRecruit.deadline,
                                  publishFrom: editRecruit.publishFrom, // ✅
                                  url: editRecruit.url,
                                  urlDesc: editRecruit.urlDesc,
                                  imageUrl: editRecruit.imageUrl,
                                } as any;
                                await patchRecruit(r.id, patch);
                                setEditingRecruitId(null);
                                setEditRecruit(null);
                              } catch (e: any) {
                                alert(e?.message || "更新に失敗しました");
                              }
                            }}
                          >
                            保存
                          </PrimaryButton>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 text-[12px] text-slate-500">募集情報 最終更新：{recruitsUpdated}</div>
        </section>

        {/* 年間スケジュール（イベント） */}
        <section className="mt-8 rounded-3xl border border-slate-200 bg-slate-50/70 p-4 sm:p-6">
          <SectionHeader
            title="年間スケジュール"
            subtitle="日付（青）→次の行に事業名。年度またぎも一括表示。"
            right={
              <PrimaryButton
                className="h-12 px-6 rounded-2xl"
                icon={<Plus size={18} />}
                onClick={() => setOpenEventForm((v) => !v)}
              >
                {openEventForm ? "追加フォームを閉じる" : "スケジュールを追加"}
              </PrimaryButton>
            }
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
            <div>スケジュール最終更新：{eventsUpdated}</div>

            <div className="flex items-center gap-2">
              <button
                className="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
                onClick={() => setFiscalYear((y) => y - 1)}
                type="button"
              >
                ←
              </button>
              <div className="font-semibold text-slate-900">{fiscalYear}年度</div>
              <button
                className="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
                onClick={() => setFiscalYear((y) => y + 1)}
                type="button"
              >
                →
              </button>
            </div>
          </div>

          {openEventForm && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <fieldset className="sm:col-span-2 rounded-xl border border-sky-200 bg-sky-50 p-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-xs font-bold text-sky-700">日付（年度またぎOK）</div>
                    <label className="inline-flex items-center gap-2 text-xs text-slate-700 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={eMulti}
                        onChange={(e) => setEMulti(e.target.checked)}
                      />
                      複数日（終了日あり）
                    </label>
                  </div>

                  <div className={`mt-2 grid ${eMulti ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"} gap-3`}>
                    <input
                      type="date"
                      value={eDate}
                      onChange={(e) => setEDate(e.target.value)}
                      className="h-10 w-full rounded-lg border border-sky-300 bg-white px-3"
                    />
                    {eMulti && (
                      <input
                        type="date"
                        value={eEndDate}
                        onChange={(e) => setEEndDate(e.target.value)}
                        className="h-10 w-full rounded-lg border border-sky-300 bg-white px-3"
                      />
                    )}
                  </div>
                </fieldset>

                <input
                  value={eTitle}
                  onChange={(e) => setETitle(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 sm:col-span-2"
                  placeholder="事業名（必須）"
                />

                <input
                  value={eArea}
                  onChange={(e) => setEArea(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3"
                  placeholder="エリア（任意）"
                />
                <input
                  value={eUrl}
                  onChange={(e) => setEUrl(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3"
                  placeholder="URL（任意）"
                />

                <textarea
                  value={eNote}
                  onChange={(e) => setENote(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 sm:col-span-2"
                  rows={3}
                  placeholder="メモ（任意）"
                />

                <div className="flex items-center justify-between sm:col-span-2 gap-3 flex-wrap">
                  <PublishToggle checked={eIsPublished} onChange={setEIsPublished} />
                  <PrimaryButton
                    onClick={async () => {
                      try {
                        if (!eTitle.trim() || !eDate) {
                          alert("必須項目（日付/事業名）が未入力です");
                          return;
                        }
                        await createEvent();
                      } catch (e: any) {
                        alert(e?.message || "作成に失敗しました");
                      }
                    }}
                  >
                    追加する
                  </PrimaryButton>
                </div>
              </div>
            </div>
          )}

          {/* 月ごと表示（レスポンシブ対応：編集フォームは“下に全幅”） */}
          <div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-4">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
              const list = eventsByMonth.get(month) ?? [];
              return (
                <div
                  key={month}
                  className="h-full rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
                >
                  <div className="text-lg font-extrabold text-slate-900">{month}月</div>

                  {list.length === 0 ? (
                    <div className="mt-2 text-sm text-slate-500">予定は未登録です。</div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {list.map((ev) => {
                        const isEditing = editingEventId === ev.id;

                      return (
                        <div key={ev.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                          {/* 上段：内容 + 操作（狭い幅では縦積み） */}
                          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-3 items-start">
                            <div className="min-w-0">
                              <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700">
                                {formatDatePill(ev.date, ev.endDate)}
                              </div>
                              <div className="mt-2 text-lg font-extrabold text-slate-900 break-words">
                                {ev.title}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2">
                              <PublishToggle
                                checked={ev.isPublished !== false}
                                onChange={async (next) => {
                                  try {
                                    await patchEvent(ev.id, { isPublished: next });
                                  } catch (e: any) {
                                    alert(e?.message || "更新に失敗しました");
                                  }
                                }}
                              />
                              <button
                                className="inline-flex items-center gap-1 px-3 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 whitespace-nowrap shrink-0"
                                onClick={() => {
                                  setEditingEventId(isEditing ? null : ev.id);
                                  setEditEvent(isEditing ? null : { ...ev });
                                }}
                                type="button"
                              >
                                <Pencil size={16} /> 編集
                              </button>
                              <button
                                className="inline-flex items-center gap-1 px-3 h-10 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 whitespace-nowrap shrink-0"
                                onClick={async () => {
                                  try {
                                    await deleteEvent(ev.id);
                                  } catch (e: any) {
                                    alert(e?.message || "削除に失敗しました");
                                  }
                                }}
                                type="button"
                              >
                                <Trash2 size={16} /> 削除
                              </button>
                            </div>
                          </div>
        
                          {/* 下段：編集フォーム（必ず全幅） */}
                          {isEditing && editEvent && (
                            <div className="mt-3 w-full rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <fieldset className="sm:col-span-2 rounded-xl border border-sky-200 bg-sky-50 p-3">
                                  <div className="text-xs font-bold text-sky-700">日付</div>
                                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <input
                                      type="date"
                                      value={editEvent.date ?? ev.date}
                                      onChange={(e) =>
                                        setEditEvent((p) => ({ ...(p ?? {}), date: e.target.value }))
                                      }
                                      className="h-10 w-full rounded-lg border border-sky-300 bg-white px-3"
                                    />
                                    <input
                                      type="date"
                                      value={editEvent.endDate ?? ev.endDate ?? ev.date}
                                      onChange={(e) =>
                                        setEditEvent((p) => ({ ...(p ?? {}), endDate: e.target.value }))
                                      }
                                      className="h-10 w-full rounded-lg border border-sky-300 bg-white px-3"
                                    />
                                  </div>
                                </fieldset>
        
                                <input
                                  value={editEvent.title ?? ev.title}
                                  onChange={(e) =>
                                    setEditEvent((p) => ({ ...(p ?? {}), title: e.target.value }))
                                  }
                                  className="h-10 w-full rounded-lg border border-slate-300 px-3 sm:col-span-2"
                                  placeholder="事業名"
                                />
        
                                <input
                                  value={editEvent.area ?? ev.area ?? ""}
                                  onChange={(e) =>
                                    setEditEvent((p) => ({ ...(p ?? {}), area: e.target.value }))
                                  }
                                  className="h-10 w-full rounded-lg border border-slate-300 px-3"
                                  placeholder="エリア"
                                />
        
                                <input
                                  value={editEvent.url ?? ev.url ?? ""}
                                  onChange={(e) =>
                                    setEditEvent((p) => ({ ...(p ?? {}), url: e.target.value }))
                                  }
                                  className="h-10 w-full rounded-lg border border-slate-300 px-3"
                                  placeholder="URL"
                                />
        
                                <textarea
                                  value={editEvent.note ?? ev.note ?? ""}
                                  onChange={(e) =>
                                    setEditEvent((p) => ({ ...(p ?? {}), note: e.target.value }))
                                  }
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2 sm:col-span-2"
                                  rows={3}
                                  placeholder="メモ"
                                />
        
                                <div className="sm:col-span-2 flex flex-wrap justify-end gap-2">
                                  <button
                                    className="h-10 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 whitespace-nowrap"
                                    onClick={() => {
                                      setEditingEventId(null);
                                      setEditEvent(null);
                                    }}
                                    type="button"
                                  >
                                    キャンセル
                                  </button>
                                  <PrimaryButton
                                    onClick={async () => {
                                      try {
                                        const patch = {
                                          title: editEvent.title,
                                          date: editEvent.date,
                                          endDate: editEvent.endDate,
                                          note: editEvent.note,
                                          area: editEvent.area,
                                          url: editEvent.url,
                                        } as any;
                                        await patchEvent(ev.id, patch);
                                        setEditingEventId(null);
                                        setEditEvent(null);
                                      } catch (e: any) {
                                        alert(e?.message || "更新に失敗しました");
                                      }
                                    }}
                                  >
                                    保存
                                  </PrimaryButton>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </section>
      </main>
    </div>
  );
}

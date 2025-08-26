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
  date: string; // "YYYY-MM-DD"
  title: string;
  note?: string;
  area?: string;
  url?: string;
  isPublished?: boolean;
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
  isPublished?: boolean;
};

function groupByMonth(events: EventItem[]) {
  const map: Record<number, EventItem[]> = {};
  events.forEach((e) => {
    const m = new Date(e.date + "T00:00:00").getMonth();
    if (!map[m]) map[m] = [];
    map[m].push(e);
  });
  for (const m in map) {
    map[m]!.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }
  return map;
}

function isExpiredJST(yyyy_mm_dd: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyy_mm_dd || "")) return false;
  const endOfDayJst = new Date(`${yyyy_mm_dd}T23:59:59+09:00`).getTime();
  return Date.now() > endOfDayJst;
}

/** セクション見出し（縦に細い赤ラインだけ：控えめ） */
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
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="relative pl-4">
          <span className="absolute left-0 top-1 bottom-1 w-1 bg-red-600 rounded-full" />
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        </div>
        {subtitle ? (
          <p className="text-[13px] text-slate-500 mt-1">{subtitle}</p>
        ) : null}
      </div>
      {right}
    </div>
  );
}

/** 上辺赤帯つき/なしを切り替えできるカード */
function CardShell({
  children,
  className = "",
  accent = true, // デフォルト: 赤帯あり
}: {
  children: React.ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <article className={`rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden ${className}`}>
      {accent ? <div className="h-1 bg-gradient-to-r from-red-700 via-red-600 to-red-500" /> : null}
      {children}
    </article>
  );
}

/** Framer Motion の button 型をそのまま使う（型衝突の解消） */
type MotionBtnBase = Omit<React.ComponentProps<typeof motion.button>, "children"> & {
  children?: React.ReactNode;
};
function RedButton(props: MotionBtnBase & { icon?: React.ReactNode }) {
  const { icon, children, className = "", ...rest } = props;
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      {...rest}
      className={`inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-red-700 text-white font-semibold shadow hover:bg-red-600 disabled:opacity-50 ${className}`}
    >
      {icon}
      {children /* ← ReactNode 固定 */}
    </motion.button>
  );
}

/** トグル風チェック（公開） */
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
      <span className="ml-2 text-xs text-slate-600">公開</span>
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

  // 編集モード（ID単位）
  const [editingRecruitId, setEditingRecruitId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // ===== 取得 =====
  const loadEvents = async () => {
    const y = new Date().getFullYear();
    const r = await fetch(`${EVENTS_API_URL}?year=${y}&all=1`, { cache: "no-store" });
    const j = r.ok ? await r.json() : { items: [], lastUpdated: null };
    const data: EventItem[] = (j.items || []).map((x: any) => ({
      id: String(x.id),
      date: (x.date || "").slice(0, 10),
      title: x.title,
      note: x.note || undefined,
      area: x.area || undefined,
      url: x.url || undefined,
      isPublished: Boolean(x.isPublished),
    }));
    setEvents(data);
    setEventsUpdated(j.lastUpdated ? new Date(j.lastUpdated).toLocaleString() : "—");
  };

  const loadRecruits = async () => {
    const r = await fetch(`${RECRUIT_API_URL}`, { cache: "no-store" });
    const j = r.ok ? await r.json() : { items: [], lastUpdated: null };
    const data: RecruitingItem[] = (j.items || []).map((x: any) => ({
      id: String(x.id),
      title: x.title,
      date: (x.date || "").slice(0, 10),
      deadline: (x.deadline || "").slice(0, 10),
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
  const [rDeadline, setRDeadline] = useState("");
  const [rArea, setRArea] = useState("");
  const [rUrl, setRUrl] = useState("");
  const [rUrlDesc, setRUrlDesc] = useState("");
  const [rImageUrl, setRImageUrl] = useState("");
  const [busyR, setBusyR] = useState(false);
  const [msgR, setMsgR] = useState("");

  async function submitRecruit() {
    if (!rTitle.trim() || !rDate || !rDeadline || !rArea.trim()) {
      setMsgR("必須項目（参加期限・実施日・募集タイトル・地域）を入力してください。");
      return;
    }
    setBusyR(true); setMsgR("");
    try {
      const res = await fetch(RECRUIT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: rTitle.trim(),
          date: rDate,         // 実施日
          deadline: rDeadline, // 参加期限
          area: rArea.trim(),
          url: rUrl.trim() || undefined,
          urlDesc: rUrlDesc.trim() || undefined,
          imageUrl: rImageUrl.trim() || undefined,
          isPublished: true,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "作成に失敗しました");
      setRTitle(""); setRDate(""); setRDeadline(""); setRArea("");
      setRUrl(""); setRUrlDesc(""); setRImageUrl("");
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
  const [eFuzzy, setEFuzzy] = useState(false);
  const [busyE, setBusyE] = useState(false);
  const [msgE, setMsgE] = useState("");

  async function submitEvent() {
    if (!eTitle.trim() || !eDate) {
      setMsgE("必須項目（実施年月日・事業名）を入力してください。");
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
          note: eFuzzy ? "日程未確定" : undefined,
          isPublished: true,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "作成に失敗しました");
      setETitle(""); setEDate(""); setEFuzzy(false);
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

  // フィルタ済み募集（期限切れは既定で隠す）
  const activeRecruits = useMemo(() => {
    const list = (recruits ?? []).slice().sort((a, b) => (a.deadline < b.deadline ? -1 : a.deadline > b.deadline ? 1 : 0));
    return showExpired ? list : list.filter((r) => !isExpiredJST(r.deadline));
  }, [recruits, showExpired]);

  return (
    <div className="min-h-screen w-full bg-white">
      <ArcHeader />

      {/* 見出し（控えめに） */}
      <header className="mx-auto max-w-7xl px-4 sm:px-6 md:px-10 lg:px-16 pt-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          事業カレンダー管理
        </h1>
        <p className="mt-1 text-sm text-slate-500">ADMIN / EDITOR 専用ページ（/exec/calendar）</p>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 md:px-10 lg:px-16 py-8">
        {/* === 現在募集中の案内 === */}
        <section className="mt-2 rounded-3xl border border-slate-200 bg-slate-50/70 p-4 sm:p-6">
          <SectionHeader
            title="現在募集中の案内"
            subtitle="参加期限（ローズ）と実施日（スカイ）を明確に。期限切れは自動で非表示。"
            right={
              <div className="flex items-center gap-3">
                <label className="text-sm text-slate-600 inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showExpired}
                    onChange={(e) => setShowExpired(e.target.checked)}
                  />
                  期限切れも表示
                </label>
                <RedButton
                  onClick={() => setOpenRecruit((v) => !v)}
                  icon={!openRecruit ? <Plus size={16} /> : undefined}
                  className="h-10"
                >
                  {openRecruit ? "追加フォームを閉じる" : "募集を追加"}
                </RedButton>
              </div>
            }
          />

          {/* 追加フォーム（募集） */}
          {openRecruit && (
            <CardShell className="mt-4" accent>
              <div className="p-4 sm:p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="text-sm text-slate-700">
                    <span className="mb-1 inline-flex items-center gap-2 font-semibold">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-600" />
                      参加期限（必須）
                    </span>
                    <input
                      type="date"
                      value={rDeadline}
                      onChange={(e) => setRDeadline(e.target.value)}
                      className="h-11 w-full rounded-xl border border-rose-300 px-3 focus:outline-none focus:ring-4 focus:ring-rose-100"
                    />
                  </label>

                  <label className="text-sm text-slate-700">
                    <span className="mb-1 inline-flex items-center gap-2 font-semibold">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-600" />
                      実施日（必須）
                    </span>
                    <input
                      type="date"
                      value={rDate}
                      onChange={(e) => setRDate(e.target.value)}
                      className="h-11 w-full rounded-xl border border-sky-300 px-3 focus:outline-none focus:ring-4 focus:ring-sky-100"
                    />
                  </label>

                  <label className="text-sm text-slate-700 sm:col-span-2">
                    <span className="mb-1 inline-block font-semibold">募集タイトル（必須）</span>
                    <input
                      value={rTitle}
                      onChange={(e) => setRTitle(e.target.value)}
                      placeholder="例：地区合同ハイク 参加者募集"
                      className="h-11 w-full rounded-xl border border-slate-300 px-3 focus:outline-none focus:ring-4 focus:ring-slate-100"
                    />
                  </label>

                  <label className="text-sm text-slate-700 sm:col-span-2">
                    <span className="mb-1 inline-block font-semibold">地域・エリア（必須）</span>
                    <input
                      value={rArea}
                      onChange={(e) => setRArea(e.target.value)}
                      placeholder="例：名古屋北斗地区"
                      className="h-11 w-full rounded-xl border border-slate-300 px-3 focus:outline-none focus:ring-4 focus:ring-slate-100"
                    />
                  </label>

                  <label className="text-sm text-slate-700 sm:col-span-2">
                    <span className="mb-1 inline-block font-semibold">URL（任意）</span>
                    <input
                      value={rUrl}
                      onChange={(e) => setRUrl(e.target.value)}
                      placeholder="開催要項ページなど"
                      className="h-11 w-full rounded-xl border border-slate-300 px-3 focus:outline-none focus:ring-4 focus:ring-slate-100"
                    />
                  </label>

                  <label className="text-sm text-slate-700 sm:col-span-2">
                    <span className="mb-1 inline-block font-semibold">URLの説明（任意）</span>
                    <input
                      value={rUrlDesc}
                      onChange={(e) => setRUrlDesc(e.target.value)}
                      placeholder="例：募集要項PDF / 申込フォーム"
                      className="h-11 w-full rounded-xl border border-slate-300 px-3 focus:outline-none focus:ring-4 focus:ring-slate-100"
                    />
                  </label>

                  <label className="text-sm text-slate-700 sm:col-span-2">
                    <span className="mb-1 inline-block font-semibold">画像URL（任意）</span>
                    <input
                      value={rImageUrl}
                      onChange={(e) => setRImageUrl(e.target.value)}
                      placeholder="サムネイル画像のURL"
                      className="h-11 w-full rounded-xl border border-slate-300 px-3 focus:outline-none focus:ring-4 focus:ring-slate-100"
                    />
                  </label>
                </div>

                <div className="mt-4 flex items-center gap-4">
                  <RedButton onClick={submitRecruit} disabled={busyR} icon={<Plus size={16} />}>
                    追加する
                  </RedButton>
                  {msgR && <div className="text-sm text-slate-600">{msgR}</div>}
                </div>
              </div>
            </CardShell>
          )}

          {/* 募集一覧 */}
          <div className="mt-6 text-[13px] text-slate-500">最終更新：{recruitsUpdated}（期限切れは既定で非表示）</div>
          <div className="mt-3">
            {recruits === null ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-44 rounded-2xl border border-gray-200 bg-gray-50 animate-pulse" />
                ))}
              </div>
            ) : activeRecruits.length === 0 ? (
              <CardShell className="p-4 sm:p-5" accent={false}>
                <p className="text-slate-700 text-sm">現在、表示対象の募集はありません。</p>
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
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold border ${
                              expired ? "bg-rose-50/50 text-rose-400 border-rose-100" : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}>
                              締切：{r.deadline}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700 border border-sky-200">
                              実施：{r.date}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 border border-slate-200">
                              {r.area}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
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
                              className="inline-flex items-center gap-1 h-8 rounded border border-slate-300 px-3 text-slate-700 hover:bg-slate-50 text-xs"
                            >
                              <Pencil size={14} />
                              {editing ? "編集を閉じる" : "編集"}
                            </button>
                            <button
                              onClick={() => deleteRecruit(r.id)}
                              className="inline-flex items-center gap-1 h-8 rounded border border-rose-300 px-3 text-rose-700 hover:bg-rose-50 text-xs"
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
                          </>
                        ) : (
                          // === インライン編集フォーム（募集） ===
                          <div className="mt-4 grid grid-cols-1 gap-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <label className="text-xs text-slate-700">
                                <span className="mb-1 inline-flex items-center gap-2 font-semibold">
                                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-600" />
                                  参加期限
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
                                  className="h-10 w-full rounded-lg border border-rose-300 px-3"
                                />
                              </label>
                              <label className="text-xs text-slate-700">
                                <span className="mb-1 inline-flex items-center gap-2 font-semibold">
                                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-600" />
                                  実施日
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
                                  className="h-10 w-full rounded-lg border border-sky-300 px-3"
                                />
                              </label>
                            </div>

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
                              className="h-10 w-full rounded-lg border border-slate-300 px-3"
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
                              className="h-10 w-full rounded-lg border border-slate-300 px-3"
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
                              className="h-10 w-full rounded-lg border border-slate-300 px-3"
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
                              className="h-10 w-full rounded-lg border border-slate-300 px-3"
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
                              className="h-10 w-full rounded-lg border border-slate-300 px-3"
                              placeholder="画像URL（任意）"
                            />

                            <div className="flex justify-end">
                              <button
                                onClick={() => setEditingRecruitId(null)}
                                className="h-9 rounded border border-slate-300 px-3 text-slate-700 hover:bg-slate-50 text-xs"
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
            subtitle="実施年月日・事業名・（任意）曖昧チェック。公開トグルとインライン編集に対応。"
            right={
              <RedButton
                onClick={() => setOpenEvent((v) => !v)}
                icon={!openEvent ? <Plus size={16} /> : undefined}
                className="h-10"
              >
                {openEvent ? "追加フォームを閉じる" : "スケジュールを追加"}
              </RedButton>
            }
          />

          {/* 追加フォーム（スケジュール） */}
          {openEvent && (
            <CardShell className="mt-4" accent={false}>
              <div className="p-4 sm:p-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="text-sm text-slate-700">
                    <span className="mb-1 inline-block font-semibold">実施年月日（必須）</span>
                    <input
                      type="date"
                      value={eDate}
                      onChange={(e) => setEDate(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-300 px-3 focus:outline-none focus:ring-4 focus:ring-slate-100"
                    />
                  </label>

                  <label className="inline-flex items-center gap-2 text-sm text-slate-700 h-11 mt-7">
                    <input type="checkbox" checked={eFuzzy} onChange={(e) => setEFuzzy(e.target.checked)} />
                    日程が曖昧（未確定）
                  </label>

                  <label className="text-sm text-slate-700">
                    <span className="mb-1 inline-block font-semibold">事業名（必須）</span>
                    <input
                      value={eTitle}
                      onChange={(e) => setETitle(e.target.value)}
                      placeholder="例：愛知ローバームート"
                      className="h-11 w-full rounded-xl border border-slate-300 px-3 focus:outline-none focus:ring-4 focus:ring-slate-100"
                    />
                  </label>
                </div>

                <div className="mt-3 flex items-center gap-4">
                  <RedButton onClick={submitEvent} disabled={busyE} icon={<Plus size={16} />}>
                    追加する
                  </RedButton>
                  {msgE && <div className="text-sm text-slate-600">{msgE}</div>}
                </div>
              </div>
            </CardShell>
          )}

          <div className="mt-6 text-[13px] text-slate-500">スケジュール最終更新：{eventsUpdated}</div>
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
                const items = byMonth[m] ?? [];
                return (
                  // 月カードは赤帯ナシ（accent=false）＆余計な赤い飾りもナシ
                  <CardShell key={m} className="p-4" accent={false}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-bold text-slate-900">{monthName}</h3>
                    </div>
                    {items.length === 0 ? (
                      <p className="text-[13px] text-slate-500">予定は未登録です。</p>
                    ) : (
                      <ul className="space-y-3 text-sm">
                        {items.map((ev) => {
                          const editing = editingEventId === ev.id;
                          return (
                            <li key={ev.id} className="text-slate-800">
                              {!editing ? (
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <span className="font-medium">{ev.date}</span>{" "}
                                    {ev.title}
                                    {ev.note ? <span className="text-slate-500">（{ev.note}）</span> : null}
                                  </div>
                                  <div className="shrink-0 flex items-center gap-2">
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
                                      className="inline-flex items-center gap-1 h-8 rounded border border-slate-300 px-3 text-slate-700 hover:bg-slate-50 text-xs"
                                    >
                                      <Pencil size={14} />
                                      編集
                                    </button>
                                    <button
                                      onClick={() => deleteEvent(ev.id)}
                                      className="inline-flex items-center gap-1 h-8 rounded border border-rose-300 px-3 text-rose-700 hover:bg-rose-50 text-xs"
                                    >
                                      <Trash2 size={14} />
                                      削除
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                // === インライン編集フォーム（イベント） ===
                                <div className="rounded-lg border border-slate-200 p-3">
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                                      className="h-10 w-full rounded-lg border border-slate-300 px-3"
                                    />
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
                                      日程が曖昧（未確定）
                                    </label>
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
                                      className="h-10 w-full rounded-lg border border-slate-300 px-3"
                                      placeholder="事業名"
                                    />
                                  </div>
                                  <div className="mt-3 flex justify-end">
                                    <button
                                      onClick={() => setEditingEventId(null)}
                                      className="h-8 rounded border border-slate-300 px-3 text-slate-700 hover:bg-slate-50 text-xs"
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

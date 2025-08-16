// app/exec/meetings/sheet/SheetClient.tsx
"use client";

import React, { useMemo, useState, useEffect, useRef, type ReactElement } from "react";
import { Plus, ChevronDown, Lock, Unlock } from "lucide-react";
import dynamic from "next/dynamic";

const REGIONS = [
  "名古屋千種地区","名古屋西部地区","名古屋北斗地区","名古屋巽地区",
  "尾張西地区","尾張東地区","尾張南地区",
  "知多北部地区","知多東地区","知多西南地区",
  "豊田地区","三河葵地区","碧海地区","穂の国地区","その他地区",
] as const;

const ResponsiveContainer = dynamic(
  () => import("recharts").then(m => m.ResponsiveContainer),
  { ssr: false }
);
const LineChart = dynamic(
  () => import("recharts").then(m => m.LineChart),
  { ssr: false }
);
const Line = dynamic(
  () => import("recharts").then(m => m.Line),
  { ssr: false }
);
const XAxis = dynamic(
  () => import("recharts").then(m => m.XAxis),
  { ssr: false }
);
const YAxis = dynamic(
  () => import("recharts").then(m => m.YAxis),
  { ssr: false }
);
const CartesianGrid = dynamic(
  () => import("recharts").then(m => m.CartesianGrid),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import("recharts").then(m => m.Tooltip),
  { ssr: false }
);
const Brush = dynamic(
  () => import("recharts").then(m => m.Brush),
  { ssr: false }
);

type Region = typeof REGIONS[number];
type MeetingLabel = string;

type PersonRow = {
  id: string;
  name: string;
  rsAge: string;
  region: Region;
  troop: string;
  attendance: Record<MeetingLabel, boolean>;
};
type PeopleByRegion = Record<Region, PersonRow[]>;

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/* ---- ラベル: "R6-3" -> {year:6, seq:3} ---- */
function parseMeetingLabel(lbl: MeetingLabel) {
  const m = /^R(\d+)-(\d+)$/.exec(lbl);
  if (!m) return { year: NaN, seq: NaN };
  return { year: Number(m[1]), seq: Number(m[2]) };
}

/* ---- グラフ横幅: 会数×係数（スクロール用） ---- */
function chartWidthPx(meetingsCount: number, denseCols: boolean) {
  const per = denseCols ? 64 : 80;
  return Math.max(720, meetingsCount * per);
}

/* ---- X軸のラベル傾き ---- */
function tickAngle(meetingsCount: number) {
  if (meetingsCount >= 20) return -60;
  if (meetingsCount >= 14) return -45;
  if (meetingsCount >= 10) return -30;
  return 0;
}

/* ---- 表の colgroup を安全に生成（<colgroup> 内の空白ノード回避） ---- */
function renderColsSummary(meetingsCount: number, denseCols: boolean) {
  const cols: ReactElement[] = [];
  cols.push(<col key="label" style={{ width: "14rem" }} />);
  for (let i = 0; i < meetingsCount; i++) {
    cols.push(<col key={`m-${i}`} style={{ width: denseCols ? "5.5rem" : "7rem" }} />);
  }
  return cols;
}

function renderColsDetail(meetingsCount: number, denseCols: boolean) {
  const cols: ReactElement[] = [];
  cols.push(<col key="name" style={{ width: "16rem" }} />);
  cols.push(<col key="rs" style={{ width: "6rem" }} />);
  cols.push(<col key="region" style={{ width: "14rem" }} />);
  cols.push(<col key="troop" style={{ width: "10rem" }} />);
  for (let i = 0; i < meetingsCount; i++) {
    cols.push(<col key={`m-${i}`} style={{ width: denseCols ? "5.5rem" : "6.5rem" }} />);
  }
  return cols;
}

/* ========================= ルート ========================= */
export default function MeetingSheetClient() {
  const [meetings, setMeetings] = useState<MeetingLabel[]>([]);
  const [people, setPeople] = useState<PeopleByRegion>(() =>
    REGIONS.reduce((acc, r) => {
      acc[r] = [] as PersonRow[];
      return acc;
    }, {} as PeopleByRegion)
  );

  const [tab, setTab] = useState<"summary" | "detail">("summary");
  const [detailRegion, setDetailRegion] = useState<Region>("名古屋千種地区");

  // 表示レンジコントロール
  const [rangeMode, setRangeMode] = useState<"all" | "year" | "recent">("recent");
  const [denseCols, setDenseCols] = useState<boolean>(true);
  const years = useMemo(() => {
    const ys = new Set<number>();
    meetings.forEach(m => { const p = parseMeetingLabel(m); if (!isNaN(p.year)) ys.add(p.year); });
    return Array.from(ys).sort((a, b) => a - b);
  }, [meetings]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [recentCount, setRecentCount] = useState<number>(8);

  // 直近保存のスナップショット（エラー時ロールバック用）
  const lastSavedRef = useRef<Map<string, { name: string; rsAge: string; region: Region; troop: string }>>(new Map());

  // 初期ロード（Participants+Attendance の統合データ）
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/meetings/sheet", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();

        const meetingsArr = Array.isArray(json?.meetings) ? (json.meetings as string[]) : [];
        setMeetings(meetingsArr);

        const byRegion: PeopleByRegion = REGIONS.reduce((acc, r) => {
          acc[r] = Array.isArray(json?.peopleByRegion?.[r]) ? json.peopleByRegion[r] : [];
          return acc;
        }, {} as PeopleByRegion);
        setPeople(byRegion);

        const m = new Map<string, { name: string; rsAge: string; region: Region; troop: string }>();
        for (const r of REGIONS) for (const p of byRegion[r]) {
          m.set(p.id, { name: p.name, rsAge: p.rsAge, region: p.region, troop: p.troop });
        }
        lastSavedRef.current = m;

        // 初期年の妥当化
        if (meetingsArr.length) {
          const ys = new Set<number>();
          meetingsArr.forEach(lbl => { const p = parseMeetingLabel(lbl); if (!isNaN(p.year)) ys.add(p.year); });
          const sorted = Array.from(ys).sort((a, b) => a - b);
          setSelectedYear(sorted.length ? sorted[sorted.length - 1] : null);
        }
      } catch {
        // noop
      }
    })();
  }, []);

  // 年配列更新時に selectedYear の妥当化
  useEffect(() => {
    if (years.length === 0) { setSelectedYear(null); return; }
    if (selectedYear == null || !years.includes(selectedYear)) {
      setSelectedYear(years[years.length - 1]);
    }
  }, [years, selectedYear]);

  // 会の列を追加
  const addMeeting = async () => {
    try {
      const res = await fetch("/api/meetings/sheet", { method: "POST", cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      if (Array.isArray(json?.meetings)) {
        const next = json.meetings as string[];
        setPeople(prev => {
          const copy = clone(prev);
          for (const r of REGIONS) for (const p of copy[r]) {
            for (const m of next) if (!(m in p.attendance)) p.attendance[m] = false;
          }
          return copy;
        });
        setMeetings(next);
      }
    } catch {
      // noop
    }
  };

  // 表示対象の列（フィルタ済み）を計算
  const visibleMeetings = useMemo(() => {
    if (meetings.length === 0) return [];
    if (rangeMode === "all") return meetings;
    if (rangeMode === "recent") {
      const n = Math.max(1, Math.min(recentCount, meetings.length));
      return meetings.slice(-n);
    }
    // year
    const y = selectedYear ?? parseMeetingLabel(meetings[meetings.length - 1]).year;
    return meetings.filter(m => parseMeetingLabel(m).year === y);
  }, [meetings, rangeMode, recentCount, selectedYear]);

  return (
    <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-4 md:p-5">
      {/* タブ & 右側アクション */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setTab("summary")}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold border ${
            tab === "summary"
              ? "bg-violet-600 text-white border-violet-600"
              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
          }`}
        >
          総覧（メインシート）
        </button>
        <button
          onClick={() => setTab("detail")}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold border ${
            tab === "detail"
              ? "bg-violet-600 text-white border-violet-600"
              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
          }`}
        >
          地区詳細
        </button>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white pl-2 pr-1 py-1">
            <span className="text-xs text-slate-600">列幅</span>
            <button
              type="button"
              onClick={() => setDenseCols(false)}
              className={`px-2 py-1 text-xs rounded-md ${!denseCols ? "bg-slate-900 text-white" : "hover:bg-slate-100"}`}
              title="標準の列幅"
            >
              標準
            </button>
            <button
              type="button"
              onClick={() => setDenseCols(true)}
              className={`px-2 py-1 text-xs rounded-md ${denseCols ? "bg-slate-900 text-white" : "hover:bg-slate-100"}`}
              title="コンパクト（列幅を狭く）"
            >
              コンパクト
            </button>
          </div>

          <button
            onClick={addMeeting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:opacity-95"
            title="次の定例会列を追加（R*-*）"
          >
            <Plus className="h-4 w-4" />
            列を追加
          </button>
        </div>
      </div>

      {/* 範囲フィルタ（共通） */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <select
            value={rangeMode}
            onChange={(e) => setRangeMode(e.target.value as any)}
            className="appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-8 text-sm font-medium shadow-sm focus:outline-none focus:ring-4 focus:ring-violet-100 focus:border-violet-500"
            title="表示範囲"
          >
            <option value="recent">最近N回</option>
            <option value="year">年別</option>
            <option value="all">すべて</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        </div>

        {rangeMode === "recent" && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">N =</label>
            <input
              type="number"
              min={1}
              max={Math.max(1, meetings.length)}
              value={recentCount}
              onChange={(e) => setRecentCount(Math.max(1, Math.min(Number(e.target.value) || 1, Math.max(1, meetings.length))))}
              className="h-9 w-20 rounded-md border border-slate-300 px-2 text-sm outline-none focus:ring-4 focus:ring-violet-100 focus:border-violet-500"
              title="最近N回を表示"
            />
          </div>
        )}

        {rangeMode === "year" && (
          <div className="relative">
            <select
              value={selectedYear ?? ""}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-8 text-sm font-medium shadow-sm focus:outline-none focus:ring-4 focus:ring-violet-100 focus:border-violet-500"
              title="年を選択"
            >
              {years.map(y => <option key={y} value={y}>{`R${y}`}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>
        )}

        <span className="ml-auto text-xs text-slate-500">
          表示中の列: <b>{visibleMeetings.length}</b> / 総列数: {meetings.length}
        </span>
      </div>

      {tab === "summary" ? (
        <SummarySheet meetings={visibleMeetings} people={people} denseCols={denseCols} />
      ) : (
        <DetailSheet
          meetings={visibleMeetings}
          people={people}
          setPeople={setPeople}
          detailRegion={detailRegion}
          setDetailRegion={setDetailRegion}
          lastSavedRef={lastSavedRef}
          denseCols={denseCols}
        />
      )}
    </div>
  );
}

/* ========================= 総覧（メイン） ========================= */
function SummarySheet({
  meetings,
  people,
  denseCols,
}: {
  meetings: MeetingLabel[];
  people: PeopleByRegion;
  denseCols: boolean;
}) {
  const { regionCount, total, chartData } = useMemo(() => {
    const regionCount: Record<Region, Record<MeetingLabel, number>> = REGIONS.reduce((acc, r) => {
      acc[r] = meetings.reduce((macc, m) => { macc[m] = 0; return macc; }, {} as Record<MeetingLabel, number>);
      return acc;
    }, {} as Record<Region, Record<MeetingLabel, number>>);

    for (const r of REGIONS) for (const p of people[r] ?? []) {
      for (const m of meetings) if (p.attendance?.[m]) regionCount[r][m] += 1;
    }

    const total: Record<MeetingLabel, number> = meetings.reduce((acc, m) => {
      acc[m] = REGIONS.reduce((sum, r) => sum + (regionCount[r][m] || 0), 0);
      return acc;
    }, {} as Record<MeetingLabel, number>);

    const chartData = meetings.map(m => ({ meeting: m, value: total[m] || 0 }));
    return { regionCount, total, chartData };
  }, [people, meetings]);

  const aCol = ["", "合計", ...REGIONS];
  const width = chartWidthPx(meetings.length, denseCols);
  const angle = tickAngle(meetings.length);

  return (
    <div className="mt-4">
      {/* 折れ線グラフ：合計（横スクロール＋Brush） */}
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="mb-2 flex items-end justify-between">
          <h3 className="text-sm font-semibold text-slate-800">合計参加者数の推移</h3>
          <span className="text-xs text-slate-500">全地区合算／表示中の列のみ</span>
        </div>
        <div className="w-full overflow-x-auto">
          <div style={{ width }}>
            <div className="h-[260px] w-full">
              {meetings.length === 0 ? (
                <div className="grid h-full place-items-center text-slate-500 text-sm">データがありません</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="meeting"
                      tick={{ fontSize: 12 }}
                      angle={angle}
                      textAnchor={angle ? "end" : "middle"}
                      tickMargin={angle ? 12 : 6}
                      interval={0}
                    />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#7c3aed"
                      strokeWidth={2}
                      dot={meetings.length <= 16 ? { r: 3 } : false}
                      isAnimationActive={false}
                    />
                    <Brush dataKey="meeting" height={18} travellerWidth={8} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 表：横スクロール & 列幅可変 */}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[760px] table-fixed border-separate border-spacing-0">
          <colgroup>{renderColsSummary(meetings.length, denseCols)}</colgroup>
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 bg-slate-50 border border-slate-200 px-3 py-2 text-left"></th>
              {meetings.map(m => (
                <th key={m} className="sticky top-0 z-10 bg-slate-50 border border-slate-200 px-3 py-2 text-left font-semibold">
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {aCol.slice(1).map((label, rowIdx) => {
              const isTotal = rowIdx === 0;
              return (
                <tr key={label}>
                  <th
                    className={`sticky left-0 z-10 bg-white border border-slate-200 px-3 py-2 text-left font-medium ${
                      isTotal ? "bg-amber-50" : ""
                    }`}
                    scope="row"
                  >
                    {label}
                  </th>
                  {meetings.map((m) => {
                    const val = isTotal ? (total[m] || 0) : (regionCount[label as Region]?.[m] ?? 0);
                    return (
                      <td
                        key={m}
                        className={`border border-slate-200 px-3 py-2 text-right tabular-nums ${
                          isTotal ? "bg-amber-50 font-semibold" : "bg-white"
                        }`}
                      >
                        {val}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        <p className="mt-3 text-xs text-slate-500">
          A列：1=空白, 2=合計, 3〜=各地区。表示範囲（上のコントロール）で列数を絞り込めます。
        </p>
      </div>
    </div>
  );
}

/* ========================= 地区詳細 ========================= */
function DetailSheet({
  meetings,
  people,
  setPeople,
  detailRegion,
  setDetailRegion,
  lastSavedRef,
  denseCols,
}: {
  meetings: MeetingLabel[];
  people: PeopleByRegion;
  setPeople: React.Dispatch<React.SetStateAction<PeopleByRegion>>;
  detailRegion: Region;
  setDetailRegion: (r: Region) => void;
  lastSavedRef: React.MutableRefObject<Map<string, { name: string; rsAge: string; region: Region; troop: string }>>;
  denseCols: boolean;
}) {
  const rows = people[detailRegion];
  const [editEnabled, setEditEnabled] = useState(false);

  // ✅ ブラウザ側での setTimeout 型は NodeJS.Timeout ではなく ReturnType<typeof setTimeout> が安全
  const autoLockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const AUTO_LOCK_MS = 90_000;

  const toggleEdit = () => setEditEnabled(v => !v);
  useEffect(() => {
    if (autoLockTimer.current) { clearTimeout(autoLockTimer.current); autoLockTimer.current = null; }
    if (editEnabled) autoLockTimer.current = setTimeout(() => setEditEnabled(false), AUTO_LOCK_MS);
    return () => { if (autoLockTimer.current) clearTimeout(autoLockTimer.current); };
  }, [editEnabled]);

  const bumpAutoLock = () => {
    if (!editEnabled) return;
    if (autoLockTimer.current) {
      clearTimeout(autoLockTimer.current);
      autoLockTimer.current = setTimeout(() => setEditEnabled(false), AUTO_LOCK_MS);
    }
  };

  // グラフデータ
  const chartData = useMemo(
    () => meetings.map(m => ({ meeting: m, value: (rows ?? []).reduce((s, p) => s + (p.attendance?.[m] ? 1 : 0), 0) })),
    [meetings, rows]
  );
  const width = chartWidthPx(meetings.length, denseCols);
  const angle = tickAngle(meetings.length);

  // 出欠トグル
  const toggleAttend = async (i: number, m: MeetingLabel) => {
    if (!editEnabled) return;
    const before = rows[i].attendance[m];
    setPeople(prev => {
      const copy = clone(prev);
      copy[detailRegion][i].attendance[m] = !before;
      return copy;
    });
    bumpAutoLock();
    try {
      const res = await fetch("/api/meetings/attendance", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ participantId: rows[i].id, meetingCode: m, present: !before, via: "sheet" }),
      });
      if (!res.ok) throw new Error("save failed");
    } catch {
      setPeople(prev => {
        const copy = clone(prev);
        copy[detailRegion][i].attendance[m] = before;
        return copy;
      });
      alert("保存に失敗しました");
    }
  };

  // 参加者フィールド保存
  async function patchParticipant(
    id: string,
    patch: Partial<{ name: string; rsAge: number | null; troop: string; district: Region }>
  ) {
    const res = await fetch(`/api/participants/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error(await res.text().catch(() => "failed"));
    const { participant } = await res.json();
    lastSavedRef.current.set(id, {
      name: participant.name ?? "",
      rsAge: String(participant.rsAge ?? ""),
      region: (participant.district as Region) ?? rows.find(r => r.id === id)?.region ?? "その他地区",
      troop: participant.troop ?? "",
    });
  }

  const onTextChange = (idx: number, key: "name" | "rsAge" | "troop", val: string) => {
    if (!editEnabled) return;
    setPeople(prev => {
      const copy = clone(prev);
      (copy[detailRegion][idx] as any)[key] = val;
      return copy;
    });
  };

  const onTextBlur = async (idx: number, key: "name" | "rsAge" | "troop") => {
    if (!editEnabled) return;
    const p = rows[idx];
    const before = lastSavedRef.current.get(p.id)!;
    const currentVal = (p as any)[key] as string;
    const beforeVal = (before as any)[key] as string;
    if (currentVal === beforeVal) return;
    bumpAutoLock();
    try {
      await patchParticipant(
        p.id,
        key === "rsAge"
          ? { rsAge: Number.isFinite(Number(currentVal)) ? Number(currentVal) : null }
          : key === "name" ? { name: currentVal } : { troop: currentVal }
      );
    } catch {
      setPeople(prev => {
        const copy = clone(prev);
        (copy[detailRegion][idx] as any)[key] = beforeVal;
        return copy;
      });
      alert("保存に失敗しました");
    }
  };

  const onRegionSelect = async (idx: number, newRegion: Region) => {
    if (!editEnabled) return;
    const p = rows[idx];
    const prevRegion = p.region;
    if (newRegion === prevRegion) return;

    setPeople(prev => {
      const copy = clone(prev);
      const row = copy[prevRegion][idx];
      copy[prevRegion].splice(idx, 1);
      row.region = newRegion;
      copy[newRegion].push(row);
      return copy;
    });
    bumpAutoLock();

    try {
      await patchParticipant(p.id, { district: newRegion });
    } catch {
      setPeople(prev => {
        const copy = clone(prev);
        const fromIdx = copy[newRegion].findIndex(x => x.id === p.id);
        if (fromIdx >= 0) {
          const row = copy[newRegion][fromIdx];
          copy[newRegion].splice(fromIdx, 1);
          row.region = prevRegion;
          copy[prevRegion].push(row);
        }
        return copy;
      });
      alert("地区の保存に失敗しました");
    }
  };

  return (
    <div className="mt-4">
      {/* ツールバー：地区選択 + 編集ロック */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <select
            value={detailRegion}
            onChange={(e) => setDetailRegion(e.target.value as Region)}
            className="appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-8 text-sm font-medium shadow-sm focus:outline-none focus:ring-4 focus:ring-violet-100 focus:border-violet-500"
            title="地区を選択"
          >
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        </div>

        <button
          type="button"
          onClick={toggleEdit}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold shadow-sm border ${
            editEnabled
              ? "bg-emerald-600 text-white border-emerald-600 hover:opacity-95"
              : "bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
          }`}
          title={editEnabled ? "編集中（クリックでロック）" : "ロック中（クリックで編集を有効化）"}
          aria-pressed={editEnabled}
        >
          {editEnabled ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          {editEnabled ? "編集モード（90秒で自動ロック）" : "編集を有効化"}
        </button>
      </div>

      {/* 地区別グラフ（横スクロール＋Brush） */}
      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="mb-2 flex items-end justify-between">
          <h3 className="text-sm font-semibold text-slate-800">{detailRegion} の参加者数の推移</h3>
          <span className="text-xs text-slate-500">表示中の列のみ</span>
        </div>
        <div className="w-full overflow-x-auto">
          <div style={{ width }}>
            <div className="h-[240px] w-full">
              {meetings.length === 0 ? (
                <div className="grid h-full place-items-center text-slate-500 text-sm">データがありません</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="meeting"
                      tick={{ fontSize: 12 }}
                      angle={angle}
                      textAnchor={angle ? "end" : "middle"}
                      tickMargin={angle ? 12 : 6}
                      interval={0}
                    />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#0ea5e9"
                      strokeWidth={2}
                      dot={meetings.length <= 16 ? { r: 3 } : false}
                      isAnimationActive={false}
                    />
                    <Brush dataKey="meeting" height={18} travellerWidth={8} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* テーブル */}
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-[900px] table-fixed border-separate border-spacing-0">
          <colgroup>{renderColsDetail(meetings.length, denseCols)}</colgroup>
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 bg-slate-50 border border-slate-200 px-3 py-2 text-left">氏名</th>
              <th className="sticky top-0 z-10 bg-slate-50 border border-slate-200 px-3 py-2 text-left">RS年齢</th>
              <th className="sticky top-0 z-10 bg-slate-50 border border-slate-200 px-3 py-2 text-left">所属地区</th>
              <th className="sticky top-0 z-10 bg-slate-50 border border-slate-200 px-3 py-2 text-left">所属団</th>
              {meetings.map(m => (
                <th key={m} className="sticky top-0 z-10 bg-slate-50 border border-slate-200 px-3 py-2 text-left">{m}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className="border border-slate-200 px-3 py-3 text-slate-500 text-sm" colSpan={4 + meetings.length}>
                  この地区の参加者はいません。
                </td>
              </tr>
            )}

            {rows.map((p, i) => (
              <tr key={p.id}>
                {/* 氏名 */}
                <td className="sticky left-0 z-10 bg-white border border-slate-200 px-2 py-1.5">
                  {editEnabled ? (
                    <input
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:ring-4 focus:ring-violet-100 focus:border-violet-500"
                      value={p.name}
                      onChange={(e) => onTextChange(i, "name", e.target.value)}
                      onBlur={() => onTextBlur(i, "name")}
                      placeholder="氏名"
                    />
                  ) : (
                    <div className="px-1 py-1 text-sm">{p.name || <span className="text-slate-400">—</span>}</div>
                  )}
                </td>

                {/* RS年齢 */}
                <td className="border border-slate-200 px-2 py-1.5">
                  {editEnabled ? (
                    <input
                      inputMode="numeric"
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:ring-4 focus:ring-violet-100 focus:border-violet-500"
                      value={p.rsAge}
                      onChange={(e) => onTextChange(i, "rsAge", e.target.value)}
                      onBlur={() => onTextBlur(i, "rsAge")}
                      placeholder="例: 1"
                    />
                  ) : (
                    <div className="px-1 py-1 text-sm">{p.rsAge || <span className="text-slate-400">—</span>}</div>
                  )}
                </td>

                {/* 所属地区 */}
                <td className="border border-slate-200 px-2 py-1.5">
                  {editEnabled ? (
                    <div className="relative">
                      <select
                        value={p.region}
                        onChange={(e) => onRegionSelect(i, e.target.value as Region)}
                        className="w-full appearance-none rounded-md border border-slate-300 bg-white px-2 py-1 pr-8 text-sm outline-none focus:ring-4 focus:ring-violet-100 focus:border-violet-500"
                        title="所属地区"
                      >
                        {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                  ) : (
                    <div className="px-1 py-1 text-sm">{p.region}</div>
                  )}
                </td>

                {/* 所属団 */}
                <td className="border border-slate-200 px-2 py-1.5">
                  {editEnabled ? (
                    <input
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:ring-4 focus:ring-violet-100 focus:border-violet-500"
                      value={p.troop}
                      onChange={(e) => onTextChange(i, "troop", e.target.value)}
                      onBlur={() => onTextBlur(i, "troop")}
                      placeholder="所属団"
                    />
                  ) : (
                    <div className="px-1 py-1 text-sm">{p.troop || <span className="text-slate-400">—</span>}</div>
                  )}
                </td>

                {/* 出欠列 */}
                {meetings.map(m => {
                  const checked = !!p.attendance[m];
                  return (
                    <td key={m} className="border border-slate-200 px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => toggleAttend(i, m)}
                        disabled={!editEnabled}
                        className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full border text-sm transition ${
                          checked
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-slate-300 bg-white text-slate-400"
                        } ${!editEnabled ? "opacity-60 cursor-not-allowed" : "hover:bg-slate-50"}`}
                        aria-pressed={checked}
                        aria-label={checked ? `${m} 出席 〇` : `${m} 未出席`}
                        title={
                          !editEnabled
                            ? "ロック中です。「編集を有効化」を押すと変更できます。"
                            : checked ? "出席（クリックで解除）" : "未出席（クリックで 〇）"
                        }
                      >
                        {checked ? "〇" : ""}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-3 text-xs text-slate-500">
          表示範囲・列幅は上のコントロールで調整できます。編集モード中のみ変更可能です。
        </p>
      </div>
    </div>
  );
}

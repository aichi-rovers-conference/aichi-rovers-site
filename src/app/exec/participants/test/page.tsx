// app/participants/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Upload, Search } from "lucide-react";

const DISTRICTS = [
  "名古屋千種地区","名古屋西部地区","名古屋北斗地区","名古屋巽地区",
  "尾張西地区","尾張東地区","尾張南地区","知多北部地区","知多東地区",
  "知多西南地区","豊田地区","三河葵地区","碧海地区","穂の国地区","その他地区",
] as const;

type Participant = {
  id: string;
  name: string;
  troop: string;
  rsAge: number;
  district: string;
};

export default function ParticipantsPage() {
  // ----- UI State -----
  const [list, setList] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState("");

  // add one
  const [name, setName] = useState("");
  const [troop, setTroop] = useState("");
  const [rsAge, setRsAge] = useState<string>("");

  // bulk import
  const [bulk, setBulk] = useState("");
  const [msg, setMsg] = useState("");

  // ----- helpers -----
  async function safeJson(res: Response) {
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  }

  // ----- fetch list -----
  async function fetchList() {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (q) p.set("q", q);
      if (district) p.set("district", district);

      const res = await fetch(`/api/participants?${p.toString()}`, { cache: "no-store" });
      const data = await safeJson(res);
      if (!res.ok) {
        console.error("GET /api/participants failed", res.status, data);
        setList([]);
        return;
      }
      setList(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      console.error(e);
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchList(); }, [q, district]);

  // ----- actions -----
  async function addOne() {
    if (!name.trim() || !troop.trim() || rsAge.trim() === "" || !district) return;
    const body = { name: name.trim(), troop: troop.trim(), rsAge: Number(rsAge), district };
    const res = await fetch("/api/participants", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await safeJson(res);
      setMsg(`追加に失敗しました: ${err?.error ?? res.status}`);
      return;
    }
    setName(""); setTroop(""); setRsAge(""); setMsg("1名追加しました");
    fetchList();
  }

  async function importBulk() {
    if (!bulk.trim()) return;
    const res = await fetch("/api/participants/import", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: bulk }),
    });
    const j = await safeJson(res);
    if (!res.ok) {
      setMsg(`一括登録に失敗しました: ${j?.error ?? res.status}`);
      return;
    }
    setBulk("");
    setMsg(`追加: ${j?.created ?? 0} 名`);
    fetchList();
  }

  // ----- computed -----
  const total = list.length;
  const avgAge = useMemo(() => {
    const arr = list.map(x => x.rsAge).filter(n => Number.isFinite(n));
    return arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : "-";
  }, [list]);

  return (
    <div className="min-h-screen bg-white">
      {/* ======= Header: ロゴ＆タイトル（中央） ======= */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="h-16 md:h-20 grid grid-cols-3 items-center">
            {/* left: back/home */}
            <div className="justify-self-start">
              <Link
                href="/"
                className="text-sm md:text-base text-gray-500 hover:text-black transition"
                aria-label="ホームへ戻る"
              >
                ← ホーム
              </Link>
            </div>

            {/* center: brand */}
            <div className="justify-self-center flex items-center gap-3 md:gap-4">
              <Image
                src="/images/ARClogo.png"
                alt="ARC Logo"
                width={40}
                height={40}
                className="object-contain select-none"
                draggable={false}
                priority
              />
              <div className="text-center">
                <div className="text-xl md:text-2xl font-extrabold tracking-wide">
                  <span className="text-red-700">A</span>ichi{" "}
                  <span className="text-red-700">R</span>overs{" "}
                  <span className="text-red-700">C</span>onference
                </div>
                <div className="text-[13px] md:text-sm text-gray-600 -mt-0.5">愛知ローバース会議</div>
              </div>
            </div>

            {/* right: nav shortcut */}
            <nav className="justify-self-end hidden md:flex items-center gap-6 text-sm">
              <Link href="/arc" className="text-gray-600 hover:text-black">ARCとは</Link>
              <Link href="/arc/calendar" className="text-gray-600 hover:text-black">事業カレンダー</Link>
              <Link href="/meetings" className="text-gray-600 hover:text-black">会一覧</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* ======= Page Title ======= */}
      <section className="bg-gradient-to-b from-white to-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-10">
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-2xl md:text-3xl font-extrabold tracking-tight"
          >
            参加者管理
          </motion.h1>
          <p className="mt-1.5 text-gray-600 text-sm md:text-base">
            氏名・所属団・RS年齢・所属地区を管理し、検索・絞り込み・一括登録ができます。
          </p>
        </div>
      </section>

      {/* ======= Content ======= */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Filters & Stats */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Search */}
              <label className="relative block">
                <span className="sr-only">検索</span>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="検索（氏名/所属団）"
                  className="w-full h-11 pl-10 pr-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-4 focus:ring-red-100 focus:border-red-500 transition"
                />
              </label>
              {/* District */}
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="h-11 rounded-xl border border-gray-300 px-3 bg-white focus:outline-none focus:ring-4 focus:ring-red-100 focus:border-red-500 transition"
              >
                <option value="">全地区</option>
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="md:col-span-1">
            <div className="h-full rounded-2xl border border-gray-200 bg-white p-4 md:p-5 shadow-sm">
              <div className="text-sm text-gray-500">現在の表示</div>
              <div className="mt-1 flex items-baseline gap-3">
                <div className="text-3xl font-extrabold">{list.length}</div>
                <div className="text-sm text-gray-500">名</div>
              </div>
              <div className="mt-3 text-sm text-gray-600">平均RS年齢: <span className="font-semibold">{avgAge}</span></div>
            </div>
          </div>
        </div>

        {/* Forms */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {/* Add One */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Plus className="text-red-700" />
              <h2 className="text-lg font-bold">単体追加</h2>
            </div>
            <div className="mt-4 grid gap-3">
              <input
                placeholder="氏名"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-xl border border-gray-300 px-3 focus:outline-none focus:ring-4 focus:ring-red-100 focus:border-red-500 transition"
              />
              <input
                placeholder="所属団"
                value={troop}
                onChange={(e) => setTroop(e.target.value)}
                className="h-11 rounded-xl border border-gray-300 px-3 focus:outline-none focus:ring-4 focus:ring-red-100 focus:border-red-500 transition"
              />
              <input
                placeholder="RS年齢（数字）"
                value={rsAge}
                onChange={(e) => setRsAge(e.target.value)}
                className="h-11 rounded-xl border border-gray-300 px-3 focus:outline-none focus:ring-4 focus:ring-red-100 focus:border-red-500 transition"
              />
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="h-11 rounded-xl border border-gray-300 px-3 bg-white focus:outline-none focus:ring-4 focus:ring-red-100 focus:border-red-500 transition"
              >
                <option value="">地区を選択</option>
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={addOne}
                className="mt-1 h-11 rounded-xl bg-red-700 text-white font-semibold shadow hover:bg-red-600 transition"
              >
                追加する
              </motion.button>
            </div>
          </motion.div>

          {/* Bulk Import */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Upload className="text-red-700" />
              <h2 className="text-lg font-bold">一括登録（1行: 「氏名, 所属団, RS年齢, 地区」）</h2>
            </div>
            <textarea
              rows={8}
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
              placeholder={"例)\n山田太郎, 名古屋◯◯団, 2, 名古屋北斗地区\n佐藤花子, 尾張◯◯団, 1, 尾張西地区"}
              className="mt-4 w-full rounded-xl border border-gray-300 p-3 font-mono text-sm focus:outline-none focus:ring-4 focus:ring-red-100 focus:border-red-500 transition"
            />
            <div className="mt-3 flex items-center gap-8">
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={importBulk}
                className="h-11 px-5 rounded-xl bg-gray-900 text-white font-semibold shadow hover:bg-black transition"
              >
                取り込み
              </motion.button>
              {msg && <div className="text-sm text-gray-600">{msg}</div>}
            </div>
          </motion.div>
        </div>

        {/* List */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-base md:text-lg font-bold">参加者一覧</h3>
            <div className="text-sm text-gray-500">表示: {total} 名</div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">読み込み中…</div>
          ) : list.length === 0 ? (
            <div className="p-8 text-center text-gray-500">該当がありません</div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="text-gray-600">
                    <th className="text-left font-semibold px-5 py-3">氏名</th>
                    <th className="text-left font-semibold px-5 py-3">所属団</th>
                    <th className="text-center font-semibold px-5 py-3">RS年齢</th>
                    <th className="text-left font-semibold px-5 py-3">地区</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p, i) => (
                    <tr
                      key={p.id}
                      className={i % 2 ? "bg-white" : "bg-gray-50/60"}
                    >
                      <td className="px-5 py-3">{p.name}</td>
                      <td className="px-5 py-3">{p.troop}</td>
                      <td className="px-5 py-3 text-center">{p.rsAge}</td>
                      <td className="px-5 py-3">{p.district}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Footer hint */}
        <div className="mt-10 text-xs text-gray-500">
          ※ データはサイト内DBで管理されます。CSVエクスポートや年度別集計が必要なら追加します。
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 text-center text-sm text-gray-600">
          &copy; {new Date().getFullYear()} Aichi Rovers Conference
        </div>
      </footer>
    </div>
  );
}

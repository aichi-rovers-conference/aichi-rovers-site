"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import DeleteButton from "./DeleteButton";

export const dynamic = "force-dynamic";

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

async function safeJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

export default function ManageParticipantsPage() {
  // 一覧
  const [list, setList] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  // 絞り込み
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState("");

  async function fetchList() {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (q) p.set("q", q);
      if (district) p.set("district", district);

      const res = await fetch(`/api/participants?${p.toString()}`, { cache: "no-store" });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error ?? res.statusText);
      setList(Array.isArray(data.items) ? data.items : []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void fetchList(); }, [q, district]);

  const total = list.length;
  const avgAge = useMemo(() => {
    const arr = list.map(x => x.rsAge).filter(n => Number.isFinite(n));
    return arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : "-";
  }, [list]);

  return (
    <div className="space-y-8">
      {/* タイトル行 */}
      <section>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-2xl md:text-3xl font-extrabold tracking-tight"
        >
          参加者（閲覧・編集）
        </motion.h1>
        <p className="mt-1.5 text-gray-600 text-sm md:text-base">
          検索・絞り込み・個別編集（詳細ページ）・削除ができます。
        </p>
      </section>

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
                className="w-full h-11 pl-10 pr-3 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-4 focus:ring-red-100 focus:border-red-500 transition"
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
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="md:col-span-1">
          <div className="h-full rounded-2xl border border-gray-200 bg-white p-4 md:p-5 shadow-sm">
            <div className="text-sm text-gray-500">現在の表示</div>
            <div className="mt-1 flex items-baseline gap-3">
              <div className="text-3xl font-extrabold">{total}</div>
              <div className="text-sm text-gray-500">名</div>
            </div>
            <div className="mt-3 text-sm text-gray-600">
              平均RS年齢: <span className="font-semibold">{avgAge}</span>
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
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
                  <th className="text-left font-semibold px-5 py-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p, i) => (
                  <tr key={p.id} className={i % 2 ? "bg-white" : "bg-gray-50/60"}>
                    <td className="px-5 py-3">{p.name}</td>
                    <td className="px-5 py-3">{p.troop}</td>
                    <td className="px-5 py-3 text-center">{p.rsAge}</td>
                    <td className="px-5 py-3">{p.district}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/exec/participants/manage/${p.id}`}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs hover:bg-slate-50"
                        >
                          詳細 / 編集
                        </Link>
                        <DeleteButton
                            id={p.id}
                            onDeleted={(id) => {
                                setList((prev) => prev.filter((x) => x.id !== id));
                            }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Upload } from "lucide-react";

export const dynamic = "force-dynamic";

const DISTRICTS = [
  "名古屋千種地区","名古屋西部地区","名古屋北斗地区","名古屋巽地区",
  "尾張西地区","尾張東地区","尾張南地区","知多北部地区","知多東地区",
  "知多西南地区","豊田地区","三河葵地区","碧海地区","穂の国地区","その他地区",
] as const;

async function safeJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

export default function RegisterParticipantPage() {
  // 単体追加
  const [name, setName] = useState("");
  const [troop, setTroop] = useState("");
  const [rsAge, setRsAge] = useState("");
  const [district, setDistrict] = useState("");
  const [msg, setMsg] = useState("");

  // 一括登録
  const [bulk, setBulk] = useState("");
  const [busy, setBusy] = useState(false);

  async function addOne() {
    if (!name.trim() || !troop.trim() || rsAge.trim() === "" || !district) {
      setMsg("未入力の項目があります");
      return;
    }
    setBusy(true);
    try {
      const body = { name: name.trim(), troop: troop.trim(), rsAge: Number(rsAge), district };
      const res = await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err?.error ?? (await res.text()) ?? "登録に失敗しました");
      }
      setName(""); setTroop(""); setRsAge(""); setDistrict("");
      setMsg("1名追加しました");
    } catch (e: any) {
      setMsg(e?.message || "登録に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function importBulk() {
    if (!bulk.trim()) return;
    setBusy(true);
    try {
      // まず /api/participants/import を試し、無ければ /api/participants の {text} 方式にフォールバック
      let res = await fetch("/api/participants/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: bulk }),
      });
      if (res.status === 404) {
        res = await fetch("/api/participants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: bulk }),
        });
      }
      const j = await safeJson(res);
      if (!res.ok) throw new Error(j?.error ?? (await res.text()) ?? "一括登録に失敗しました");
      setBulk("");
      setMsg(`追加: ${j?.created ?? 0} 名`);
    } catch (e: any) {
      setMsg(e?.message || "一括登録に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* 単体追加 */}
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
            className="h-11 rounded-xl border border-gray-300 px-3 bg-white focus:outline-none focus:ring-4 focus:ring-red-100 focus:border-red-500 transition"
          />
          <input
            placeholder="所属団"
            value={troop}
            onChange={(e) => setTroop(e.target.value)}
            className="h-11 rounded-xl border border-gray-300 px-3 bg-white focus:outline-none focus:ring-4 focus:ring-red-100 focus:border-red-500 transition"
          />
          <input
            placeholder="RS年齢（数字）"
            value={rsAge}
            onChange={(e) => setRsAge(e.target.value)}
            className="h-11 rounded-xl border border-gray-300 px-3 bg-white focus:outline-none focus:ring-4 focus:ring-red-100 focus:border-red-500 transition"
          />
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="h-11 rounded-xl border border-gray-300 px-3 bg-white focus:outline-none focus:ring-4 focus:ring-red-100 focus:border-red-500 transition"
          >
            <option value="">地区を選択</option>
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={addOne}
            disabled={busy}
            className="mt-1 h-11 rounded-xl bg-red-700 text-white font-semibold shadow hover:bg-red-600 transition disabled:opacity-50"
          >
            追加する
          </motion.button>
        </div>
      </motion.div>

      {/* 一括登録 */}
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
          className="mt-4 w-full rounded-xl border border-gray-300 p-3 font-mono text-sm bg-white focus:outline-none focus:ring-4 focus:ring-red-100 focus:border-red-500 transition"
        />
        <div className="mt-3 flex items-center gap-8">
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={importBulk}
            disabled={busy}
            className="h-11 px-5 rounded-xl bg-gray-900 text-white font-semibold shadow hover:bg-black transition disabled:opacity-50"
          >
            取り込み
          </motion.button>
          {msg && <div className="text-sm text-gray-600">{msg}</div>}
        </div>
      </motion.div>
    </div>
  );
}

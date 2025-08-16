// app/games/fire-start/Leaderboard.tsx
"use client";
import { useEffect, useMemo, useState } from "react";

type ServerItem = { id: string; name: string; score: number; createdAt: string };
type LocalItem  = { name: string; score: number; at: number };

export default function Leaderboard({ refreshToken = 0 }: { refreshToken?: number }) {
  const [loading, setLoading] = useState(true);
  const [serverItems, setServerItems] = useState<ServerItem[] | null>(null);
  const [serverError, setServerError] = useState(false);

  async function fetchServer() {
    setLoading(true);
    setServerError(false);
    try {
      const res = await fetch("/api/games/fire-start/scores", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      const items: ServerItem[] = Array.isArray(json?.items) ? json.items : [];
      setServerItems(items);         // ← 空配列でも null にしない
    } catch {
      setServerItems(null);
      setServerError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchServer(); }, []);
  useEffect(() => { if (refreshToken >= 0) fetchServer(); }, [refreshToken]);

  // サーバーが落ちているときだけローカルを使う
  const usingLocal = serverError || serverItems === null;

  const localTop = useMemo(() => {
    try {
      const raw = localStorage.getItem("fireStartLocalLB");
      const arr: LocalItem[] = raw ? JSON.parse(raw) : [];
      return arr.slice().sort((a,b)=> b.score - a.score || a.at - b.at).slice(0, 20);
    } catch {
      return [] as LocalItem[];
    }
  }, [refreshToken, loading, serverItems, serverError]);

  const rows = usingLocal
    ? localTop.map((it, i) => ({ rank: i+1, name: it.name, score: it.score, key: `${it.at}-${i}` }))
    : (serverItems ?? []).map((it, i) => ({ rank: i+1, name: it.name, score: it.score, key: it.id }));

  // --- リセット操作（ローカル & サーバー） ---
  function resetLocal() {
    try {
      localStorage.removeItem("fireStartLocalLB");
    } catch {}
    // 表示更新
    fetchServer();
  }

  async function resetServer() {
    try {
      const res = await fetch("/api/games/fire-start/scores", { method: "DELETE" });
      if (!res.ok) throw new Error();
      await fetchServer();
    } catch {
      // サーバー消せなかった時も、まずローカルは空に
      resetLocal();
    }
  }

  return (
    <div className="lb-card">
      <div className="lb-header">
        <h3 className="lb-title">
          🏆 リーダーボード（Top 20）
          {usingLocal && <span style={{ marginLeft: 8, fontSize: 12, color: "#6b7280" }}>ローカル表示</span>}
        </h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={fetchServer}>更新</button>
          <button className="btn" onClick={resetLocal} title="ブラウザ内の保存だけ空にする">ローカル消去</button>
          <button className="btn" onClick={resetServer} title="サーバーとローカルを両方空にする">全リセット</button>
        </div>
      </div>

      {loading ? (
        <div className="lb-row">読み込み中…</div>
      ) : rows.length === 0 ? (
        <div className="lb-row">{usingLocal ? "まだ記録がありません" : "サーバーデータは空です"}</div>
      ) : (
        <ol className="lb-list">
          {rows.map(r => (
            <li key={r.key} className="lb-row">
              <span className="lb-rank">#{r.rank}</span>
              <span className="lb-name">{r.name}</span>
              <span className="lb-score">{r.score}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

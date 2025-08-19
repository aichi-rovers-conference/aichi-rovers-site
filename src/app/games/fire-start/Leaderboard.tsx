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
      setServerItems(items); // 空配列でも null にしない
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

  function resetLocal() {
    try { localStorage.removeItem("fireStartLocalLB"); } catch {}
    fetchServer();
  }
  async function resetServer() {
    try {
      const res = await fetch("/api/games/fire-start/scores", { method: "DELETE" });
      if (!res.ok) throw new Error();
      await fetchServer();
    } catch {
      resetLocal();
    }
  }

  return (
    <section className="lb-card">
      <div className="lb-header">
        <h3 className="lb-title">
          🏆 リーダーボード <span className="lb-sub">Top 20</span>
          {usingLocal && <span className="lb-badge">ローカル表示</span>}
        </h3>
        <div className="lb-actions">
          <button className="btn sm" onClick={fetchServer} aria-label="ランキングを更新">更新</button>
          <button className="btn sm" onClick={resetLocal} title="ブラウザ内の保存だけ空にする">ローカル消去</button>
          <button className="btn sm" onClick={resetServer} title="サーバーとローカルを両方空にする">全リセット</button>
        </div>
      </div>

      {loading ? (
        <div className="lb-row">読み込み中…</div>
      ) : rows.length === 0 ? (
        <div className="lb-row">{usingLocal ? "まだ記録がありません" : "サーバーデータは空です"}</div>
      ) : (
        <ol className="lb-list" aria-live="polite">
          {rows.map(r => {
            const rankCls = r.rank <= 3 ? ` rank-${r.rank}` : "";
            const medal = r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : "";
            return (
              <li key={r.key} className={`lb-row${rankCls}`}>
                <span className="lb-rank" aria-label={`順位 ${r.rank}`}>
                  <span className="lb-medal" aria-hidden={true}>{medal}</span>
                  #{r.rank}
                </span>
                <span className="lb-name" title={r.name}>{r.name}</span>
                <span className="lb-score" aria-label={`スコア ${r.score}`}>{r.score.toLocaleString()}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

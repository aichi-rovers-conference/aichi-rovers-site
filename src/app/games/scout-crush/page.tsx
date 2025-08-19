"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Transition } from "framer-motion";

// ====== 設定 ======
const SIZE = 8;
const TYPES = ["tent", "fire", "compass", "rope", "leaf", "badge"] as const;
type TileType = typeof TYPES[number];

type Special = "propeller" | "firework" | "bomb" | "mystic";

type Cell = {
  id: string;
  type: TileType;
  special?: Special;
  fresh?: boolean;
};

const API = "/api/games/scout-crush";

// --- タイム制 ---
const INITIAL_TIME_MS = 60_000;
const MAX_TIME_MS = 120_000;
const TIME_BONUS_PER_TILE_MS = 200;
const TIME_CHAIN_BONUS_RATE = 0.2;

// --- アニメ速度 ---
const SPRING_SLOW: Transition = { type: "spring", stiffness: 140, damping: 24 };

// --- ヒント関連 ---
const HINT_IDLE_MS = 8000;     // 最後のプレイヤー操作からこの時間でヒント
const FIRST_HINT_IDLE_MS = 12000;

// --- resolveBoard オプション ---
type ResolveOpts = { firstClearFromSpecial?: boolean };

function Icon({ type, special }: { type: TileType; special?: Special }) {
  if (special === "propeller") return <span>🪶</span>;
  if (special === "firework") return <span>🎆</span>;
  if (special === "bomb") return <span>💣</span>;
  if (special === "mystic") return <span>✨</span>;
  switch (type) {
    case "tent": return <span>⛺</span>;
    case "fire": return <span>🔥</span>;
    case "compass": return <span>🧭</span>;
    case "rope": return <span>🪢</span>;
    case "leaf": return <span>🍃</span>;
    case "badge": return <span>🎖️</span>;
  }
}

function randType(): TileType {
  return TYPES[Math.floor(Math.random() * TYPES.length)];
}
function newCell(fresh = false): Cell {
  return { id: crypto.randomUUID(), type: randType(), fresh };
}
function index(r: number, c: number) { return r * SIZE + c; }
function formatTime(ms: number) {
  const v = Math.max(0, Math.floor(ms));
  const m = Math.floor(v / 60_000);
  const s = Math.floor((v % 60_000) / 1000);
  const ds = Math.floor((v % 1000) / 100);
  return `${m}:${s.toString().padStart(2, "0")}.${ds}`;
}

// ==== ユーティリティ（詰み低減のコア）====
function shuffleArray<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.random() * (i + 1) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export default function Page() {
  // 水和不一致対策
  const [mounted, setMounted] = useState(false);
  const [grid, setGrid] = useState<Cell[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [playerName, setPlayerName] = useState<string>("");

  // タイマー
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME_MS);
  const [started, setStarted] = useState(false);

  // 視覚フィードバック
  const [chain, setChain] = useState(0);
  const [clearing, setClearing] = useState<Set<number>>(new Set());
  const [invalidSwap, setInvalidSwap] = useState<{ a: number; b: number; at: number } | null>(null);
  const [message, setMessage] = useState<string>("");
  const [hint, setHint] = useState<{ a: number; b: number } | null>(null);
  const [stuck, setStuck] = useState(false);

  // 入力制御（UI表示なし）
  const [busy, _setBusy] = useState(false);
  const busyRef = useRef(false);
  const setBusy = (v: boolean) => { busyRef.current = v; _setBusy(v); };

  // 最終操作時刻 & 操作済みフラグ
  const [lastActionAt, setLastActionAt] = useState<number>(() => Date.now());
  const [hasInteracted, setHasInteracted] = useState(false);
  const markAction = () => { setHasInteracted(true); setLastActionAt(Date.now()); setHint(null); };

  useEffect(() => {
    setMounted(true);
    // 初期盤面：できるだけ「有効手あり & 即時クリアなし」を狙う
    let g = Array.from({ length: SIZE * SIZE }, () => newCell(true));
    g = ensurePlayableBoard(g);
    setGrid(g);
  }, []);

  // 安定タイマー（100ms刻み）
  useEffect(() => {
    if (!mounted || !started) return;
    let alive = true;
    const STEP = 100;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        const next = Math.max(0, t - STEP);
        if (next <= 0) {
          if (alive) setStarted(false);
          clearInterval(id);
        }
        return next;
      });
    }, STEP);
    return () => { alive = false; clearInterval(id); };
  }, [mounted, started]);

  function neighbors(i: number) {
    const r = Math.floor(i / SIZE), c = i % SIZE;
    return {
      up: r > 0 ? index(r - 1, c) : null,
      down: r < SIZE - 1 ? index(r + 1, c) : null,
      left: c > 0 ? index(r, c - 1) : null,
      right: c < SIZE - 1 ? index(r, c + 1) : null,
    };
  }
  function clone(g = grid) { return g.map((x) => ({ ...x })); }

  // 最初に見つかった有効手（ヒント探索）
  function findFirstHint(g: Cell[]): { a: number; b: number } | null {
    const tryPair = (a: number, b: number) => {
      const tmp = g.map((x) => ({ ...x }));
      [tmp[a], tmp[b]] = [tmp[b], tmp[a]];
      return findClears(tmp).size > 0;
    };
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const i = index(r, c);
        const right = c < SIZE - 1 ? index(r, c + 1) : null;
        const down = r < SIZE - 1 ? index(r + 1, c) : null;
        if (right !== null && tryPair(i, right)) return { a: i, b: right };
        if (down !== null && tryPair(i, down)) return { a: i, b: down };
      }
    }
    return null;
  }
  const hasAnyMove = (g: Cell[]) => !!findFirstHint(g);

  // 詰み検出（値が変化する時だけ反映）
  useEffect(() => {
    if (!mounted || busyRef.current || timeLeft <= 0 || grid.length === 0) return;
    const clears = findClears(grid);
    let nextStuck = false;
    if (clears.size === 0) nextStuck = (findFirstHint(grid) === null);
    setStuck((prev) => (prev === nextStuck ? prev : nextStuck));
  }, [grid, mounted, timeLeft]);

  // 入れ替え
  async function trySwap(a: number, b: number) {
    if (busyRef.current || timeLeft <= 0 || stuck) return;
    markAction();
    setBusy(true);
    if (!started) setStarted(true);

    const original = clone();
    const g = clone();
    [g[a], g[b]] = [g[b], g[a]];

    setSelected(null);
    setGrid(g);
    await wait(140);

    const clears = findClears(g);
    if (clears.size === 0) {
      setInvalidSwap({ a, b, at: Date.now() });
      setMessage("入れ替え不可：4個以上が揃いません");
      setGrid(original);
      setTimeout(() => setMessage(""), 1200);
      await wait(380);
      setInvalidSwap(null);
      setBusy(false);
      return;
    }

    await resolveBoard(g, clears, { firstClearFromSpecial: false });
    setBusy(false);
  }

  // アイテム（スペシャル）ワンタップ発動
  async function activateSpecial(i: number) {
    if (busyRef.current || timeLeft <= 0 || stuck) return;
    const cell = grid[i];
    if (!cell?.special) return;
    markAction();
    setBusy(true);
    setSelected(null);
    if (!started) setStarted(true);

    const targets = new Set<number>();
    const r = Math.floor(i / SIZE);
    const c = i % SIZE;
    const add = (ri: number, ci: number) => {
      if (ri >= 0 && ri < SIZE && ci >= 0 && ci < SIZE) targets.add(index(ri, ci));
    };

    switch (cell.special) {
      case "bomb":
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) add(r + dr, c + dc);
        break;
      case "firework":
        for (let x = 0; x < SIZE; x++) add(r, x);
        break;
      case "propeller":
        for (let x = 0; x < SIZE; x++) { add(r, x); add(x, c); }
        break;
      case "mystic": {
        const t = cell.type;
        grid.forEach((cc, idx) => { if (cc.type === t) targets.add(idx); });
        break;
      }
    }
    targets.add(i);

    setClearing(new Set(targets));
    await wait(100);
    await resolveBoard(clone(), targets, { firstClearFromSpecial: true });
    setBusy(false);
  }

  // 4個以上の塊を探索
  function findClears(g: Cell[]) {
    const rm = new Set<number>();
    // 横
    for (let r = 0; r < SIZE; r++) {
      let run: number[] = [];
      let prev: Cell | null = null;
      for (let c = 0; c < SIZE; c++) {
        const i = index(r, c), cur = g[i];
        if (prev && cur.type === prev.type) run.push(i);
        else {
          if (run.length >= 3) { const all = [index(r, c - run.length - 1), ...run]; if (all.length >= 4) all.forEach(k => rm.add(k)); }
          run = [];
        }
        prev = cur;
      }
      if (run.length >= 3) { const all = [index(r, SIZE - run.length - 1), ...run]; if (all.length >= 4) all.forEach(k => rm.add(k)); }
    }
    // 縦
    for (let c = 0; c < SIZE; c++) {
      let run: number[] = [];
      let prev: Cell | null = null;
      for (let r = 0; r < SIZE; r++) {
        const i = index(r, c), cur = g[i];
        if (prev && cur.type === prev.type) run.push(i);
        else {
          if (run.length >= 3) { const all = [index(r - run.length - 1, c), ...run]; if (all.length >= 4) all.forEach(k => rm.add(k)); }
          run = [];
        }
        prev = cur;
      }
      if (run.length >= 3) { const all = [index(SIZE - run.length - 1, c), ...run]; if (all.length >= 4) all.forEach(k => rm.add(k)); }
    }
    return rm;
  }

  // ===== 詰み低減：安定後に「遊べる盤面」へソフト調整 =====
  function ensurePlayableBoard(g0: Cell[]): Cell[] {
    let g = g0.map(x => ({ ...x }));

    const noClears = () => findClears(g).size === 0;
    const moveOk = () => hasAnyMove(g);

    // まず「freshセルだけ」のタイプ入れ替えで作る（最大12回）
    const freshIdx = g.map((c, i) => c.fresh ? i : -1).filter(i => i >= 0);
    for (let t = 0; t < 12; t++) {
      if (noClears() && moveOk()) return g;
      if (freshIdx.length === 0) break;
      const types = freshIdx.map(i => g[i].type);
      shuffleArray(types);
      freshIdx.forEach((i, k) => { g[i] = { ...g[i], type: types[k] }; });
    }

    // まだ詰み気味なら「全体のタイプだけ」入れ替え（最大6回）
    const allIdx = g.map((_, i) => i);
    for (let t = 0; t < 6; t++) {
      if (noClears() && moveOk()) return g;
      const types = allIdx.map(i => g[i].type);
      shuffleArray(types);
      allIdx.forEach((i, k) => { g[i] = { ...g[i], type: types[k] }; });
    }

    // ここまでで作れなければ元のまま返す（オーバーレイで手動シャッフル）
    return g0;
  }

  // ★ スペシャル由来の最初のパスではスペシャル生成を抑制
  async function resolveBoard(startGrid: Cell[], firstClears: Set<number>, opts: ResolveOpts = {}) {
    let g = startGrid.map((x) => ({ ...x }));
    let combo = 0;
    let clears = new Set(firstClears);

    while (clears.size > 0) {
      combo++;
      setChain(combo);
      setClearing(new Set(clears));

      // スコア & 時間
      const gainedScore = Math.round(clears.size * 10 * (1 + (combo - 1) * 0.2));
      setScore((s) => s + gainedScore);
      const bonus = Math.round(clears.size * TIME_BONUS_PER_TILE_MS * (1 + (combo - 1) * TIME_CHAIN_BONUS_RATE));
      setTimeLeft((t) => Math.min(MAX_TIME_MS, t + bonus));

      await wait(160);

      const suppressSpecialThisPass = opts.firstClearFromSpecial === true && combo === 1;

      // 特殊生成（5個以上）。 suppress 中は生成しない
      if (!suppressSpecialThisPass && clears.size >= 5) {
        const pick = [...clears][Math.floor(Math.random() * clears.size)];
        g[pick] = { ...g[pick], special: clears.size >= 6 ? "bomb" : "firework", id: crypto.randomUUID(), fresh: false };
        clears.delete(pick);
      }

      // 消去→重力→補充
      const holes: (Cell | null)[] = g.map((cell, i) => (clears.has(i) ? null : { ...cell, fresh: false }));
      for (let c = 0; c < SIZE; c++) {
        const col: (Cell | null)[] = [];
        for (let r = 0; r < SIZE; r++) col.push(holes[index(r, c)]);
        const filtered = col.filter((x): x is Cell => !!x);
        const need = SIZE - filtered.length;

        const nextCol: Cell[] = [];
        for (let r = 0; r < need; r++) nextCol.push(newCell(true));
        nextCol.push(...filtered);

        for (let r = 0; r < SIZE; r++) holes[index(r, c)] = nextCol[r];
      }

      g = holes as Cell[];
      setClearing(new Set());
      setGrid(g.map((x) => ({ ...x })));
      await wait(280);
      clears = findClears(g);
    }
    setChain(0);

    // ★ 安定後：できるだけ「詰みにくい」盤面へソフト調整
    const tuned = ensurePlayableBoard(g);
    if (tuned !== g) {
      g = tuned;
      setGrid(g.map(x => ({ ...x })));
    }

    // 連鎖終了後に詰み判定
    const nextStuck = (findClears(g).size === 0) && (findFirstHint(g) === null);
    setStuck((prev) => (prev === nextStuck ? prev : nextStuck));
  }

  function wait(ms: number) { return new Promise(res => setTimeout(res, ms)); }

  function onClickCell(i: number) {
    if (timeLeft <= 0 || busyRef.current) return;

    // クリック＝操作（ヒントタイマーリセット）
    markAction();

    // スペシャルはワンタップ発動
    if (grid[i]?.special) { activateSpecial(i); return; }

    // 通常は2タップ入れ替え
    setHint(null);
    if (selected === null) { setSelected(i); return; }
    const n = neighbors(selected);
    if (i === n.up || i === n.down || i === n.left || i === n.right) {
      trySwap(selected, i);
    }
    setSelected(null);
  }

  function shuffleGrid() {
    markAction();
    const parts = grid.map(({ type, special }) => ({ type, special }));
    shuffleArray(parts);
    const ng = parts.map(p => ({ id: crypto.randomUUID(), type: p.type, special: p.special, fresh: true }));
    setGrid(ensurePlayableBoard(ng));
    setStuck(false);
    setSelected(null);
  }

  async function submitScore() {
    const body = { name: playerName || "Scout", score, movesUsed: null };
    try {
      await fetch(`${API}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      alert("送信しました！ / Topに反映までリロードしてください");
    } catch {
      alert("送信に失敗しました");
    }
  }

  const [tops, setTops] = useState<{ name: string; score: number; createdAt: string; }[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/top`, { cache: "no-store" });
        if (!r.ok) { setTops([]); return; }
        const data = await r.json().catch(() => []);
        setTops(Array.isArray(data) ? data : []);
      } catch { setTops([]); }
    })();
  }, []);

  // ===== ヒント表示：プレイヤーの操作がしばらく無い時だけ =====
  useEffect(() => {
    if (timeLeft <= 0 || stuck) { setHint(null); return; }

    const CHECK_MS = 250; // 4回/秒で軽くチェック
    const id = setInterval(() => {
      if (busyRef.current) return; // アニメ/連鎖中は出さない

      // 初回操作前は FIRST_HINT_IDLE_MS、操作後は HINT_IDLE_MS
      const threshold = hasInteracted ? HINT_IDLE_MS : FIRST_HINT_IDLE_MS;
      const idleFor = Date.now() - lastActionAt;

      if (idleFor >= threshold) {
        const h = findFirstHint(grid); // 有効手がないなら null
        setHint(prev => {
          const same = (prev?.a === h?.a && prev?.b === h?.b) || (!prev && !h);
          return same ? prev : h;
        });
      }
    }, CHECK_MS);

    return () => clearInterval(id);
  }, [lastActionAt, grid, timeLeft, stuck, hasInteracted]);

  if (!mounted || grid.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
        <div className="mx-auto max-w-5xl p-4 md:p-8">
          <h1 className="text-3xl md:text-4xl font-extrabold">Scout Crush</h1>
          <p className="mt-2 text-slate-600">読み込み中…</p>
        </div>
      </div>
    );
  }

  const timePct = Math.max(0, Math.min(100, (timeLeft / MAX_TIME_MS) * 100));

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      {/* 右側固定タイムバー */}
      <div className="fixed right-4 top-24 bottom-24 z-40 w-3 rounded-full bg-slate-200/70 border border-slate-300 overflow-hidden shadow-inner">
        <div
          className={`absolute left-0 right-0 bottom-0 ${timePct < 25 ? "bg-rose-500" : timePct < 50 ? "bg-amber-500" : "bg-emerald-500"}`}
          style={{ height: `${timePct}%` }}
        />
      </div>

      {/* 連鎖/トースト（盤面に影響しない） */}
      <div className="fixed top-24 right-16 z-40 pointer-events-none">
        <AnimatePresence>
          {chain > 0 && (
            <motion.div
              key={chain}
              initial={{ scale: 0.7, opacity: 0, y: -8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1 text-sm font-bold shadow"
            >
              {chain} 連鎖！
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
        <AnimatePresence>
          {message && (
            <motion.div
              key={message}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 8, opacity: 0 }}
              className="rounded-xl bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 text-sm shadow"
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mx-auto max-w-5xl p-4 md:p-8">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold">Scout Crush</h1>
            <p className="text-slate-600">4個以上で消えるタイムアタック。時間が増えるうちにスコアを伸ばせ！</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={playerName}
              onChange={e => { setPlayerName(e.target.value); /* 入力は操作とみなさない */ }}
              placeholder="名前(任意)"
              className="rounded-xl border px-3 py-2"
            />
            <div className="relative rounded-xl bg-white border px-3 py-2 shadow-sm">
              残り時間: <b>{formatTime(timeLeft)}</b> / スコア: <b>{score}</b>
            </div>
            <button
              onClick={() => {
                markAction();
                const fresh = Array.from({ length: SIZE * SIZE }, () => newCell(true));
                setGrid(ensurePlayableBoard(fresh));
                setScore(0); setChain(0); setHint(null); setStuck(false);
                setTimeLeft(INITIAL_TIME_MS); setStarted(false);
              }}
              className="rounded-xl bg-indigo-600 text-white px-4 py-2 shadow"
            >
              リセット
            </button>
            <button onClick={submitScore} disabled={timeLeft > 0} className="rounded-xl bg-emerald-600 text-white px-4 py-2 shadow disabled:opacity-50">
              スコア送信
            </button>
          </div>
        </header>

        <main className="mt-6 grid md:grid-cols-[1fr_320px] gap-6">
          {/* Board */}
          <div className="flex items-center justify-center">
            <div className="relative overflow-hidden">
              <div className="grid grid-cols-8 gap-1 p-2 rounded-2xl bg-white border shadow select-none">
                {grid.map((cell, i) => {
                  const isSel = selected === i;
                  const n = selected !== null ? neighbors(selected) : { up: null, down: null, left: null, right: null };
                  const isNeighbor = selected !== null && (i === n.up || i === n.down || i === n.left || i === n.right);
                  const isHint = hint && (i === hint.a || i === hint.b);
                  const isInvalid = !!invalidSwap && (i === invalidSwap.a || i === invalidSwap.b);

                  const ring =
                    isInvalid ? "ring-2 ring-rose-500" :
                      isSel ? "ring-2 ring-indigo-500" :
                        isHint ? "ring-2 ring-amber-400 animate-pulse" :
                          isNeighbor ? "ring-1 ring-indigo-300" : "";

                  const initialY = cell.fresh ? -88 : 0;

                  return (
                    <motion.button
                      key={cell.id}
                      onClick={() => onClickCell(i)}
                      className={`h-12 w-12 md:h-14 md:w-14 grid place-items-center rounded-xl border text-2xl ${ring} ${clearing.has(i) ? "opacity-75" : ""}`}
                      layout
                      initial={{ y: initialY, opacity: cell.fresh ? 0 : 1 }}
                      animate={{ y: 0, opacity: 1, scale: clearing.has(i) ? 0.92 : 1 }}
                      transition={SPRING_SLOW}
                      whileTap={{ scale: 0.92 }}
                      disabled={timeLeft <= 0 || busy || stuck}
                    >
                      <Icon type={cell.type} special={cell.special} />
                    </motion.button>
                  );
                })}
              </div>

              {/* 詰みオーバーレイ */}
              <AnimatePresence>
                {stuck && timeLeft > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 grid place-items-center rounded-2xl bg-black/40 text-white"
                  >
                    <div className="rounded-2xl bg-white text-slate-900 px-6 py-5 shadow max-w-sm w-[90%] text-center">
                      <h3 className="text-xl font-bold">詰み状態</h3>
                      <p className="mt-1 text-slate-700">この盤面では動かせる手がありません。</p>
                      <div className="mt-3 flex gap-2 justify-center">
                        <button onClick={shuffleGrid} className="rounded-xl bg-indigo-600 text-white px-4 py-2 shadow">
                          シャッフルして続行
                        </button>
                        <button onClick={() => { setTimeLeft(0); setStuck(false); }} className="rounded-xl bg-slate-200 text-slate-800 px-4 py-2 shadow">
                          終了する
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Time Up オーバーレイ */}
              <AnimatePresence>
                {timeLeft <= 0 && !busy && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 grid place-items-center rounded-2xl bg-black/40 text-white"
                  >
                    <div className="rounded-2xl bg-white text-slate-900 px-6 py-5 shadow max-w-sm w-[90%] text-center">
                      <h3 className="text-xl font-bold">Time Up</h3>
                      <p className="mt-1">スコア：<b>{score}</b></p>
                      <p className="text-sm text-slate-600">「スコア送信」でランキングに登録！</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Leaderboard */}
          <aside className="rounded-2xl bg-white border shadow p-4">
            <h2 className="font-bold text-lg">Leaderboard (Top10)</h2>
            <ol className="mt-3 space-y-1">
              {tops.slice(0, 10).map((t, idx) => (
                <li key={idx} className="flex items-center justify-between border-b last:border-0 py-1">
                  <span className="text-slate-700">{idx + 1}. {t.name}</span>
                  <span className="font-semibold">{t.score}</span>
                </li>
              ))}
            </ol>
          </aside>
        </main>

        <p className="mt-6 text-slate-500 text-sm">
          ※ 初回操作まではヒント非表示。最後の操作から {HINT_IDLE_MS / 1000} 秒放置でヒントが点滅します。<br />
          ※ 連鎖終了後に盤面を“遊びやすい”配置へ軽く調整して、詰みを起きにくくしています。
        </p>
      </div>
    </div>
  );
}

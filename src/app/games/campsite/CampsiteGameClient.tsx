"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ========= 基本設定 ========= */
const SIZE = 8;                 // グリッド 8x8
const MIN_DIST = 2;             // 水・道から最低距離（マス）
const INIT_LIVES = 3;

type Cell = { r: number; c: number };
type Tile = "empty" | "water" | "trail" | "meadow" | "cliff";
type MapState = { grid: Tile[][]; valid: Cell[] };

/* 便利 */
const inBounds = (r: number, c: number) => r >= 0 && c >= 0 && r < SIZE && c < SIZE;
const keyOf = (r: number, c: number) => `${r}-${c}`;
const manhattan = (a: Cell, b: Cell) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c);

/* ========= 盤面生成 ========= */
function generateMap(round: number): MapState {
  const meadowCount = 5 + Math.min(4, Math.floor((round - 1) / 2));
  const cliffCount  = 2 + Math.min(3, Math.floor((round - 1) / 3));

  const grid: Tile[][] = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => "empty" as Tile));

  // 川
  const vertical = Math.random() < 0.5;
  const start = Math.floor(Math.random() * SIZE);
  for (let i = 0; i < SIZE; i++) {
    const r = vertical ? i : start;
    const c = vertical ? start : i;
    if (inBounds(r, c)) grid[r][c] = "water";
    if (Math.random() < 0.5) {
      const rr = vertical ? r : r + (Math.random() < 0.5 ? -1 : 1);
      const cc = vertical ? c + (Math.random() < 0.5 ? -1 : 1) : c;
      if (inBounds(rr, cc)) grid[rr][cc] = "water";
    }
  }

  // 道（横断ランダムウォーク）
  let r = Math.floor(Math.random() * SIZE);
  for (let c = 0; c < SIZE; c++) {
    grid[r][c] = "trail";
    if (Math.random() < 0.5) {
      const nr = r + (Math.random() < 0.5 ? -1 : 1);
      if (inBounds(nr, c)) r = nr;
      grid[r][c] = "trail";
    }
  }

  // 草地・崖
  placeRandomTiles(grid, "meadow", meadowCount, (t) => t === "empty");
  placeRandomTiles(grid, "cliff",  cliffCount,  (t) => t === "empty");

  // 有効セル
  const waterCells: Cell[] = [];
  const trailCells: Cell[] = [];
  for (let rr = 0; rr < SIZE; rr++) for (let cc = 0; cc < SIZE; cc++) {
    if (grid[rr][cc] === "water") waterCells.push({ r: rr, c: cc });
    if (grid[rr][cc] === "trail") trailCells.push({ r: rr, c: cc });
  }

  const valid: Cell[] = [];
  for (let rr = 0; rr < SIZE; rr++) for (let cc = 0; cc < SIZE; cc++) {
    if (grid[rr][cc] !== "empty") continue;
    const here = { r: rr, c: cc };
    const dWater = minDist(here, waterCells);
    const dTrail = minDist(here, trailCells);
    if (dWater >= MIN_DIST && dTrail >= MIN_DIST) valid.push(here);
  }

  if (valid.length === 0) return generateMap(round);
  return { grid, valid };
}

function placeRandomTiles(
  grid: Tile[][],
  type: Tile,
  count: number,
  canPlace: (t: Tile) => boolean
) {
  let placed = 0, guard = 0;
  while (placed < count && guard < 1000) {
    guard++;
    const r = Math.floor(Math.random() * SIZE);
    const c = Math.floor(Math.random() * SIZE);
    if (canPlace(grid[r][c])) { grid[r][c] = type; placed++; }
  }
}
function minDist(here: Cell, list: Cell[]) {
  let d = Infinity;
  for (const p of list) d = Math.min(d, manhattan(here, p));
  return d === Infinity ? 99 : d;
}
function nearTo(grid: Tile[][], here: Cell, target: Tile) {
  let d = Infinity;
  for (let rr = 0; rr < SIZE; rr++) for (let cc = 0; cc < SIZE; cc++) {
    if (grid[rr][cc] === target) d = Math.min(d, Math.abs(rr - here.r) + Math.abs(cc - here.c));
  }
  return d === Infinity ? 99 : d;
}
function reasonText(grid: Tile[][], r: number, c: number) {
  const t = grid[r][c];
  if (t === "meadow") return "🌿 草地の上は避けましょう（植生保護）";
  if (t === "cliff")  return "⛰️ 崖や不安定な場所は危険です";
  if (t === "water")  return "💧 水辺からは離れましょう（最低2マス）";
  if (t === "trail")  return "🥾 道からは離れましょう（最低2マス）";
  const nearW = nearTo(grid, { r, c }, "water");
  const nearT = nearTo(grid, { r, c }, "trail");
  if (nearW < MIN_DIST && nearT < MIN_DIST) return "💧🥾 水辺と道の両方に近すぎます";
  if (nearW < MIN_DIST) return "💧 水辺に近すぎます（最低2マス）";
  if (nearT < MIN_DIST) return "🥾 道に近すぎます（最低2マス）";
  return "そのマスは条件を満たしていません";
}

/* ========= コンポーネント ========= */
export default function CampsiteGame() {
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(INIT_LIVES);
  const [seed, setSeed]   = useState(0);           // 盤面再生成トリガー
  const [map, setMap]     = useState<MapState | null>(null); // 初回はnull→スケルトン

  const [msg, setMsg] = useState<{ type: "ok" | "ng"; text: string } | null>(null);

  // ★ ランダムはクライアント側でのみ実行
  useEffect(() => { setMap(generateMap(round + seed)); }, [round, seed]);

  const resetAll = () => {
    setRound(1); setScore(0); setLives(INIT_LIVES);
    setSeed((s) => s + 1); setMsg(null);
  };

  const onPick = (r: number, c: number) => {
    if (lives <= 0 || !map) return;
    const isValid = map.valid.some((v) => v.r === r && v.c === c);
    if (isValid) {
      setScore((s) => s + 100);
      setRound((n) => n + 1);
      setSeed((s) => s + 1);
      setMsg({ type: "ok", text: "ナイス！自然に配慮した良いサイトです。" });
    } else {
      setLives((hp) => hp - 1);
      setMsg({ type: "ng", text: reasonText(map.grid, r, c) });
    }
  };

  const gameOver = lives <= 0;

  return (
    <div className="w-full bg-white">
      {/* タイトル帯（ヒーロー画像なし） */}
      <div className="w-full border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 md:px-16 py-6">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">キャンプサイトを探せ！</h1>
          <p className="mt-1 text-gray-900 font-medium text-[18px] md:text-[19px] leading-[1.9]">
            水辺💧や道🥾から十分に離れた場所を選ぼう（Leave No Trace）
          </p>
        </div>
      </div>

      {/* 本文 */}
      <main className="w-full py-8 px-6 md:px-16">
        <div className="max-w-6xl mx-auto">
          {/* HUD */}
          <div className="flex flex-wrap items-center gap-4 justify-between mb-5">
            <div className="flex items-center gap-6 text-gray-900 font-medium text-base md:text-lg">
              <span>ラウンド：<b className="font-bold">{round}</b></span>
              <span>スコア：<b className="font-bold">{score}</b></span>
              <span>ライフ：<b className="font-bold">{("❤️".repeat(Math.max(lives, 0)) || "💔")}</b></span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setSeed((s) => s + 1)}
                className="px-3 py-2 rounded-lg border border-gray-400 bg-white hover:-translate-y-[1px] transition text-gray-900 font-medium">
                盤面リロード
              </button>
              <button onClick={resetAll}
                className="px-3 py-2 rounded-lg border border-red-600 bg-white font-bold hover:-translate-y-[1px] transition text-gray-900">
                リセット
              </button>
            </div>
          </div>

          {/* ルール */}
          <div className="mb-4 space-y-2 text-gray-900 font-medium text-[18px] md:text-[19px] leading-[1.9]">
            <p>安全で自然に優しいキャンプサイトを選びましょう：</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>💧水辺（<b>water</b>）と🥾道（<b>trail</b>）から<strong>{MIN_DIST}マス以上</strong> 離れる</li>
              <li>🌿草地（<b>meadow</b>）や⛰️崖（<b>cliff</b>）の上は避ける</li>
            </ul>
          </div>

          {/* 凡例 */}
          <Legend />

          {/* 盤面（初回はスケルトン） */}
          {map ? (
            <Board grid={map.grid} onPick={onPick} gameOver={gameOver} />
          ) : (
            <SkeletonBoard />
          )}

          {/* メッセージ */}
          <AnimatePresence>
            {msg && (
              <motion.div
                key={msg.text + msg.type}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -12, opacity: 0 }}
                className={`mt-5 rounded-xl border p-4 ${
                  msg.type === "ok" ? "border-green-500/60 bg-green-50" : "border-rose-500/60 bg-rose-50"
                }`}
              >
                <div className="text-gray-900 font-medium text-[18px] md:text-[19px] leading-[1.9]">
                  {msg.text}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ゲームオーバー */}
          {gameOver && (
            <div className="mt-6 text-center">
              <div className="text-2xl font-extrabold mb-2 text-gray-900">ゲームオーバー</div>
              <div className="mb-4 text-gray-900 font-medium text-[18px] md:text-[19px] leading-[1.9]">スコア：{score}</div>
              <button
                onClick={resetAll}
                className="px-4 py-2 rounded-lg border border-red-600 bg-white font-bold hover:-translate-y-[1px] transition text-gray-900"
              >
                もう一度
              </button>
            </div>
          )}

          {/* 学び */}
          <section className="mt-10">
            <h2 className="text-gray-900 text-2xl md:text-3xl font-extrabold tracking-tight">自然を大切に（Leave No Trace）</h2>
            <div className="mt-2 h-[2px] w-16 bg-red-600 rounded-full" />
            <div className="mt-3 space-y-2 text-gray-900 font-medium text-[18px] md:text-[19px] leading-[1.9]">
              <p>実際のキャンプでは、水辺やトレイルから離れた場所を選び、踏みやすい地面を使いましょう。敏感な植生を避け、痕跡を残さない工夫が大切です。</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

/* ========= スケルトン盤面 ========= */
function SkeletonBoard() {
  return (
    <div
      className="grid"
      style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))`, gap: "6px" }}
      aria-hidden="true"
    >
      {Array.from({ length: SIZE * SIZE }).map((_, i) => (
        <div key={i} className="aspect-square rounded-lg border bg-gray-50 border-gray-300 animate-pulse" />
      ))}
    </div>
  );
}

/* ========= 盤面 ========= */
function Board({
  grid,
  onPick,
  gameOver,
}: {
  grid: Tile[][];
  onPick: (r: number, c: number) => void;
  gameOver: boolean;
}) {
  return (
    <div
      className="grid"
      style={{ gridTemplateColumns: `repeat(${grid.length}, minmax(0, 1fr))`, gap: "6px" }}
    >
      {grid.map((row, r) =>
        row.map((t, c) => (
          <TileView key={keyOf(r, c)} type={t} onClick={() => !gameOver && onPick(r, c)} />
        ))
      )}
    </div>
  );
}

function TileView({ type, onClick }: { type: Tile; onClick: () => void }) {
  const base =
    "relative aspect-square rounded-lg border text-lg md:text-xl grid place-items-center select-none focus:outline-none focus:ring-2 focus:ring-red-600";
  const styles: Record<Tile, string> = {
    empty:  "bg-white border-gray-300 hover:border-gray-400 hover:shadow-md transition cursor-pointer",
    water:  "bg-blue-50 border-blue-400 text-blue-800",
    trail:  "bg-amber-50 border-amber-500 text-amber-800",
    meadow: "bg-green-50 border-green-500 text-green-800",
    cliff:  "bg-gray-100 border-gray-500 text-gray-800",
  };
  const emoji: Record<Tile, string> = { empty: "", water: "💧", trail: "🥾", meadow: "🌿", cliff: "⛰️" };

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={`${base} ${styles[type]}`}
      onClick={onClick}
      aria-label={type === "empty" ? "選択する" : emoji[type]}
    >
      <span className="pointer-events-none">{emoji[type]}</span>
    </motion.button>
  );
}

/* ========= 凡例 ========= */
function Legend() {
  const item = (emoji: string, label: string, cls = "") => (
    <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 ${cls}`}>
      <span className="text-lg">{emoji}</span>
      <span className="text-gray-900 text-[16px] md:text-[17px] leading-[1.8]">{label}</span>
    </div>
  );
  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      {item("💧", "water（川・湖）", "bg-blue-50 border-blue-400")}
      {item("🥾", "trail（道）", "bg-amber-50 border-amber-500")}
      {item("🌿", "meadow（草地）", "bg-green-50 border-green-500")}
      {item("⛰️", "cliff（崖）", "bg-gray-100 border-gray-500")}
      <div className="ml-auto text-gray-900/90 text-sm">※ 水・道から2マス以上離す</div>
    </div>
  );
}

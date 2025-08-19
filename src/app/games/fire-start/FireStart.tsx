// app/games/fire-start/FireStart.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import "./styles.css";
import Leaderboard from "./Leaderboard";

type Result = { score: number; success: boolean };

/* ======================= Canvas Flame ======================= */
function CanvasFlame({ power, width, height }: { power: number; width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const tRef = useRef(0);

  const resize = () => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    if (c.width !== Math.round(width * dpr) || c.height !== Math.round(height * dpr)) {
      c.width = Math.round(width * dpr);
      c.height = Math.round(height * dpr);
    }
  };

  useEffect(() => {
    resize();
    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [width, height]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d", { alpha: true })!;
    if (!ctx) return;

    const n1 = (x: number, t: number) =>
      Math.sin(x * 1.3 + t * 1.2) * 0.6 +
      Math.sin(x * 2.7 - t * 0.9) * 0.3 +
      Math.sin(x * 5.1 + t * 0.7) * 0.1;

    const drawLayer = (opts: {
      color: string; alpha: number; height: number; width: number; blur: number;
      wobble: number; tightness: number; lift: number;
    }) => {
      const { color, alpha, height, width, blur, wobble, tightness, lift } = opts;
      const w = c.width, h = c.height, cx = w / 2, baseY = h * 0.82 - lift;

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.shadowColor = color;
      ctx.shadowBlur = blur;

      ctx.beginPath();
      const steps = 48;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const y = baseY - height * t;
        const taper = Math.pow(1 - t, tightness);
        const wob = wobble * n1(i * 0.15, tRef.current + i * 0.02);
        const x = cx + (width * taper + wob);
        if (i === 0) ctx.moveTo(x, baseY); else ctx.lineTo(x, y);
      }
      for (let i = steps; i >= 0; i--) {
        const t = i / steps;
        const y = baseY - height * t;
        const taper = Math.pow(1 - t, tightness);
        const wob = wobble * n1(i * 0.15 + 3.1, tRef.current * 1.05 - i * 0.02);
        const x = cx - (width * taper + wob);
        ctx.lineTo(x, y);
      }
      ctx.closePath();

      const rgba = (rgb: string, a: number) => rgb.replace("rgb", "rgba").replace(")", `, ${a})`);
      const grd = ctx.createLinearGradient(cx, baseY - height, cx, baseY);
      grd.addColorStop(0.0, rgba(color, Math.min(1, alpha)));
      grd.addColorStop(0.6, rgba(color, alpha * 0.7));
      grd.addColorStop(1.0, rgba(color, alpha * 0.35));
      ctx.fillStyle = grd;
      ctx.fill();
      ctx.restore();
    };

    const drawGlow = () => {
      const w = c.width, h = c.height, cx = w / 2, cy = h * 0.82;
      const r = Math.min(w, h) * 0.35;
      const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
      g.addColorStop(0, "rgba(255,160,60,0.35)");
      g.addColorStop(1, "rgba(255,160,60,0)");
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    };

    const drawLogs = () => {
      const w = c.width, h = c.height, y1 = h * 0.86, y2 = h * 0.82;
      ctx.save();
      ctx.fillStyle = "rgb(110,70,40)";
      ctx.fillRect(w * 0.28, y1 - (y1 - y2), w * 0.44, (y1 - y2));
      ctx.fillStyle = "rgb(90,50,20)";
      ctx.fillRect(w * 0.38, y2 - (y1 - y2), w * 0.24, (y1 - y2));
      ctx.restore();
    };

    const tick = () => {
      const w = c.width, h = c.height;
      tRef.current += 0.016;
      ctx.clearRect(0, 0, w, h);

      const p = Math.max(0, Math.min(100, power));
      const baseH = h * (0.18 + 0.0036 * p);
      const baseW = w * (0.10 + 0.0025 * p);
      const wobble = Math.max(2, 2 + p * 0.06);

      drawLayer({ color: "rgb(220,40,0)", alpha: 0.9,  height: baseH * 1.15, width: baseW * 1.25, blur: 24, wobble: wobble * 1.0, tightness: 1.4, lift: 0  });
      drawLayer({ color: "rgb(255,90,0)", alpha: 0.85, height: baseH * 1.05, width: baseW * 1.05, blur: 18, wobble: wobble * 0.9,  tightness: 1.55, lift: 4  });
      drawLayer({ color: "rgb(255,150,0)",alpha: 0.8,  height: baseH * 0.95, width: baseW * 0.9,  blur: 14, wobble: wobble * 0.75, tightness: 1.75,  lift: 8  });
      drawLayer({ color: "rgb(255,210,60)",alpha: 0.85, height: baseH * 0.82, width: baseW * 0.75, blur: 10, wobble: wobble * 0.6,  tightness: 2.0,  lift: 12 });
      drawLayer({ color: "rgb(255,255,255)",alpha: 0.9,  height: baseH * 0.68, width: baseW * 0.6,  blur: 8,  wobble: wobble * 0.45, tightness: 2.3,  lift: 16 });

      drawGlow();
      drawLogs();

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [power, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="fire-canvas"
      style={{ width, height }}
      aria-label="animated flame"
    />
  );
}
/* ===================== /Canvas Flame ===================== */

export default function FireStart() {
  const DURATION = 25;

  const finishedRef = useRef(false);
  const runningRef  = useRef(false);
  const startAtRef  = useRef<number | null>(null);

  const [playerName, setPlayerName] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("firePlayerName") || "";
  });
  const [lbRefresh, setLbRefresh] = useState(0);

  const [hasStarted, setHasStarted] = useState(false);
  const [showHelp, setShowHelp]     = useState(false);
  const [running, setRunning]       = useState(false);

  const [time, setTime]     = useState(DURATION);
  const [power, setPower]   = useState(0);
  const [heat, setHeat]     = useState(0);
  const [combo, setCombo]   = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [wind, setWind]     = useState(0);
  const [message, setMessage] = useState<string>("");
  const [result, setResult]   = useState<Result | null>(null);
  const [best, setBest]       = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const v = Number(localStorage.getItem("fireStartBest") || "0");
    return Number.isFinite(v) ? v : 0;
  });

  // ---- スコアの正確化：常に最新値を ref に保持（finish で使用） ----
  const powerRef = useRef(0);
  const timeRef  = useRef(DURATION);
  const maxComboRef = useRef(0);
  useEffect(() => { powerRef.current = power; }, [power]);
  useEffect(() => { timeRef.current  = time;  }, [time]);
  useEffect(() => { maxComboRef.current = maxCombo; }, [maxCombo]);

  // モバイル判定（レイアウト最適化）
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.matchMedia("(max-width: 640px)").matches);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const meterPhaseRef = useRef(0);
  const meterDirRef   = useRef<1 | -1>(1);
  const lastTsRef     = useRef<number | null>(null);

  useEffect(() => { runningRef.current = running; }, [running]);

  /* ===== メインループ ===== */
  useEffect(() => {
    if (!running) return;

    const onFrame = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = Math.min(0.05, (ts - lastTsRef.current) / 1000);
      lastTsRef.current = ts;

      // メーター往復
      const speed = 0.85;
      const next = meterPhaseRef.current + meterDirRef.current * speed * dt;
      if (next > 1) { meterPhaseRef.current = 1 - (next - 1); meterDirRef.current = -1; }
      else if (next < 0) { meterPhaseRef.current = -next;  meterDirRef.current = 1; }
      else { meterPhaseRef.current = next; }

      // Heat 自然減衰
      setHeat((h) => Math.max(0, h - 5 * dt));

      // 風で Power 微減
      const windDrag = Math.max(0, Math.abs(wind) - 0.8) * 0.18;
      if (windDrag > 0) setPower((p) => Math.max(0, p - windDrag * dt * 60));

      // 残り時間（絶対時刻）— まず ref を更新
      const startedAt = startAtRef.current ?? ts;
      const elapsed = Math.max(0, (ts - startedAt) / 1000);
      const remain  = Math.max(0, DURATION - elapsed);
      timeRef.current = remain;
      setTime(remain);

      // クリア判定（成功）
      setPower((p) => {
        if (!finishedRef.current && p >= 100) {
          finish(true, { power: p, time: timeRef.current });
          return 100;
        }
        return p;
      });

      // タイムアップ（失敗）
      if (!finishedRef.current && remain <= 0) {
        finish(false, { power: powerRef.current, time: 0 });
        return;
      }

      if (runningRef.current && !finishedRef.current) requestAnimationFrame(onFrame);
    };

    const id = requestAnimationFrame(onFrame);
    return () => cancelAnimationFrame(id);
  }, [running, wind]);

  // 風の変化
  useEffect(() => {
    if (!running) return;
    const update = () => {
      const next = Math.max(-2, Math.min(2, Math.random() * 4 - 2));
      setWind(Number(next.toFixed(1)));
    };
    update();
    const id = setInterval(update, 3500);
    return () => clearInterval(id);
  }, [running]);

  // キーボード
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!hasStarted || showHelp) return;
      if (e.code === "Space") { e.preventDefault(); spin(); }
      else if (e.code === "Enter") { e.preventDefault(); blow(); }
      else if (e.key.toLowerCase() === "r") { e.preventDefault(); retry(); }
      else if (e.key === "?") { e.preventDefault(); setShowHelp(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasStarted, running, combo, showHelp]);

  const flash = (text: string, ms = 600) => {
    setMessage(text);
    const id = setTimeout(() => setMessage(""), ms);
    return () => clearTimeout(id);
  };

  const spin = () => {
    if (!running) return;
    const pos = meterPhaseRef.current;
    const dist = Math.abs(pos - 0.5);
    let gain = 0;
    if (dist <= 0.06) { gain = 12; const nc = combo + 1; setCombo(nc); setMaxCombo((m) => Math.max(m, nc)); flash("PERFECT! 🔥"); }
    else if (dist <= 0.14) { gain = 8;  const nc = combo + 1; setCombo(nc); setMaxCombo((m) => Math.max(m, nc)); flash("Great! 💪"); }
    else if (dist <= 0.23) { gain = 5;  const nc = combo + 1; setCombo(nc); setMaxCombo((m) => Math.max(m, nc)); flash("Good"); }
    else { gain = 2; setCombo(0); flash("Miss…"); }

    setHeat((h) => {
      let nh = Math.min(100, h + gain);
      if (nh > 90 && Math.random() < 0.12) {
        setPower((p) => Math.min(100, p + 2 + combo * 0.6));
        nh = Math.max(60, nh - 20);
        flash("スパーク！✨ +Bonus");
      }
      return nh;
    });
  };

  const blow = () => {
    if (!running) return;
    setHeat((h) => {
      if (h < 5) { setPower((p) => Math.max(0, p - 1)); setCombo(0); flash("冷たい空気… 👎"); return h; }
      const take = Math.min(22, h);
      const efficiency = 0.16 + Math.min(combo, 20) * 0.02;
      const add = take * efficiency;
      setPower((p) => Math.min(100, p + add));
      flash(`送風 +${add.toFixed(1)}%`);
      return Math.max(0, h - take * 0.75);
    });
  };

  // スコア送信
  async function submitScore(name: string, score: number) {
    const payload = { name: name.trim() || "Anonymous", score: Math.max(0, Math.round(score)) };
    try {
      const res = await fetch("/api/games/fire-start/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(String(res.status));
      setLbRefresh((v) => v + 1);
    } catch {
      try {
        const raw = localStorage.getItem("fireStartLocalLB");
        const arr: { name: string; score: number; at: number }[] = raw ? JSON.parse(raw) : [];
        arr.push({ name: payload.name, score: payload.score, at: Date.now() });
        localStorage.setItem("fireStartLocalLB", JSON.stringify(arr));
        setLbRefresh((v) => v + 1);
      } catch {}
    }
  }

  // スナップショットで正確採点
  const finish = (success: boolean, snap?: { power?: number; time?: number }) => {
    if (finishedRef.current) return;
    finishedRef.current = true;

    setRunning(false);

    const p  = snap?.power ?? powerRef.current;
    const t  = snap?.time  ?? timeRef.current;
    const mc = maxComboRef.current;

    const finalScore = Math.round(p * 10 + mc * 25 + t * 20 + (success ? 500 : 0));
    setResult({ score: finalScore, success });

    setBest((b) => {
      const nb = Math.max(b, finalScore);
      try { localStorage.setItem("fireStartBest", String(nb)); } catch {}
      return nb;
    });

    try { localStorage.setItem("firePlayerName", playerName.trim()); } catch {}
    submitScore(playerName || "Anonymous", finalScore);

    setMessage(success ? "🔥 火がついた！" : "💨 火がつかなかった…");
  };

  const startGame = () => {
    finishedRef.current = false;
    startAtRef.current = performance.now();
    setTime(DURATION); setPower(0); setHeat(0); setCombo(0); setMaxCombo(0);
    setResult(null); setMessage("スタート！");
    setHasStarted(true); setShowHelp(false); setRunning(true); lastTsRef.current = null;
  };

  const retry = () => {
    finishedRef.current = false;
    startAtRef.current = performance.now();
    setHasStarted(true); setShowHelp(false); setRunning(true);
    setTime(DURATION); setPower(0); setHeat(0); setCombo(0); setMaxCombo(0);
    setResult(null); setMessage("再挑戦！"); lastTsRef.current = null;
  };

  const canvasW = isMobile ? 260 : 360;
  const canvasH = isMobile ? 300 : 360;

  return (
    <div className={`page-root ${isMobile ? "is-mobile" : ""}`}>
      <header className="site-header">
        <div className="site-header__inner">
          <Link href="/games" className="back-link" aria-label="ゲーム一覧に戻る">← ゲーム一覧へ</Link>
          <h1 className="page-title">🔥 火起こしチャレンジ</h1>
          <div className="spacer" />
          <button
            className="btn help"
            onClick={() => setShowHelp(true)}
            aria-label="ルールを開く"
            title="ルール"
          >
            ?
          </button>
        </div>
      </header>

      <main className="game-container" style={{ paddingBottom: isMobile ? 92 : 24 }}>
        {/* HUD */}
        <div className="hud" style={{ gap: isMobile ? 8 : 16 }}>
          <div>⏱ 残り: <strong>{Math.ceil(time)}</strong>s</div>
          <div>🔗 コンボ: <strong>{combo}</strong>（Max {maxCombo}）</div>
          <div className="wind-badge">🍃 風: {wind.toFixed(1)}</div>
        </div>

        <div className="fire-area" style={{ display: "grid", placeItems: "center" }}>
          <CanvasFlame power={power} width={canvasW} height={canvasH} />
        </div>

        {/* バー＆メーター */}
        <div style={{ maxWidth: isMobile ? 320 : 560, width: "100%", margin: "12px auto 0" }}>
          <Bars power={power} heat={heat} />
          <TimingMeter value={meterPhaseRef.current} />
        </div>

        {/* PC操作 */}
        {!isMobile && (
          <div className="controls">
            <button className="btn spin" onClick={spin} aria-label="回す（Space）">回す（Space）</button>
            <button className="btn blow" onClick={blow} aria-label="送風（Enter）">送風（Enter）</button>
            <button className="btn retry" onClick={retry} aria-label="リトライ（R）">リトライ（R）</button>
          </div>
        )}

        <p className="hint" style={{ maxWidth: 560, marginInline: "auto" }}>
          中央で「回す」を決めてコンボを伸ばし、Heat を貯めてから「送風」で Power に変換！ 風が強いと減衰するのでテンポ良く。
        </p>

        <div className="message" aria-live="polite">{message}</div>

        {result && (
          <div className="result-card">
            <div className="result-line">
              {result.success ? "🔥 成功！" : "💨 失敗…"} スコア: <strong>{result.score}</strong>
            </div>
            <div className="result-line">ベスト: <strong>{best}</strong></div>
          </div>
        )}

        <Leaderboard refreshToken={lbRefresh} />
      </main>

      {/* モバイル下部固定バー */}
      {isMobile && hasStarted && !showHelp && (
        <div
          className="mobile-controls"
          style={{
            position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 40,
            padding: "10px 12px calc(env(safe-area-inset-bottom, 0) + 10px)",
            background: "rgba(255,255,255,.9)", backdropFilter: "saturate(1.2) blur(8px)",
            borderTop: "1px solid #e5e7eb"
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, maxWidth: 560, margin: "0 auto" }}>
            <button className="btn spin" onClick={spin} style={{ fontSize: 18, padding: "12px 10px" }}>回す</button>
            <button className="btn blow" onClick={blow} style={{ fontSize: 18, padding: "12px 10px" }}>送風</button>
            <button className="btn retry" onClick={retry} aria-label="リトライ" style={{ padding: "12px 10px" }}>R</button>
          </div>
        </div>
      )}

      {/* ルール・スタート オーバーレイ（初回＋ヘルプ） */}
      {(!hasStarted || showHelp) && (
        <div className="overlay" style={{ overflowY: "auto" }}>
          <div className="overlay-card" style={{ maxWidth: 720 }}>
            <h2 className="overlay-title">🔥 火起こしチャレンジ</h2>
            <p className="overlay-sub">制限時間 {DURATION} 秒以内に <b>Power 100%</b> を目指そう！</p>

            <div
              className="rules"
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: 14,
                textAlign: "left",
                marginTop: 10
              }}
            >
              <div className="rule-box" style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fff" }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>🎯 ルール</div>
                <ul className="overlay-list" style={{ margin: 0 }}>
                  <li><b>目標：</b>時間内に Power を 100% に到達させる</li>
                  <li><b>減衰：</b>🍃風が強いと Power が少しずつ下がる</li>
                  <li><b>スコア：</b>Power・残り時間・最大コンボ・成功ボーナス</li>
                </ul>
              </div>
              <div className="rule-box" style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fff" }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>🕹 操作</div>
                <ul className="overlay-list" style={{ margin: 0 }}>
                  <li><b>回す（SPIN）：</b>動くカーソルがメーター中央に来た時に押すと <b>Heat↑</b>＋<b>コンボ加算</b></li>
                  <li><b>送風（BLOW）：</b>貯めた Heat を <b>Power</b> に変換（コンボが高いほど効率UP）</li>
                  <li className="muted">キーボード: <b>Space=回す</b> / <b>Enter=送風</b> / <b>R=リトライ</b> / <b>？=ヘルプ</b></li>
                </ul>
              </div>
            </div>

            {/* メーター凡例（視覚補助） */}
            <div style={{ marginTop: 10 }}>
              <div className="meter" style={{ maxWidth: 480, margin: "6px auto 0" }}>
                <div className="meter-track" />
                <div className="meter-band band-perfect" title="PERFECTゾーン" />
                <div className="meter-band band-great" title="GREATゾーン" />
                <div className="meter-band band-good" title="GOODゾーン" />
                <div className="meter-cursor" style={{ left: "50%" }} />
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4, textAlign: "center" }}>
                中央（PERFECT）ほど Heat が大きく、コンボも続きやすい！
              </div>
            </div>

            {/* 名前入力 */}
            <label className="name-label" style={{ marginTop: 12 }}>
              プレイヤー名
              <input
                className="name-input"
                placeholder="例: Shiro"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value.slice(0, 40))}
                inputMode="text"
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr auto", gap: 10, alignItems: "center", marginTop: 10 }}>
              <button
                className="btn primary"
                onClick={startGame}
                disabled={!playerName.trim()}
                title={!playerName.trim() ? "プレイヤー名を入力してください" : "開始"}
                style={{ padding: "12px 16px", fontSize: 18 }}
              >
                ゲーム開始
              </button>
              {!isMobile && <div className="overlay-hint">※ Space/Enter/R でも操作できます</div>}
            </div>

            <div style={{ marginTop: 14 }}>
              <Leaderboard refreshToken={lbRefresh} />
            </div>

            {hasStarted && (
              <button
                className="btn"
                onClick={() => setShowHelp(false)}
                style={{ marginTop: 10 }}
              >
                閉じてゲームに戻る
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== サブUI ===== */
function Bars({ power, heat }: { power: number; heat: number }) {
  return (
    <div className="bars">
      <div className="bar">
        <div className="bar-label">Power</div>
        <div className="gauge">
          <div className="gauge-fill" style={{ width: `${Math.min(100, power)}%` }} />
        </div>
        <div className="bar-value">{power.toFixed(1)}%</div>
      </div>
      <div className="bar">
        <div className="bar-label">Heat</div>
        <div className="gauge heat">
          <div className="gauge-fill" style={{ width: `${Math.min(100, heat)}%` }} />
        </div>
        <div className="bar-value">{heat.toFixed(1)}%</div>
      </div>
    </div>
  );
}

function TimingMeter({ value }: { value: number }) {
  const pos = Math.max(0, Math.min(1, value));
  return (
    <div className="meter">
      <div className="meter-track" />
      <div className="meter-band band-perfect" />
      <div className="meter-band band-great" />
      <div className="meter-band band-good" />
      <div className="meter-cursor" style={{ left: `${pos * 100}%` }} />
    </div>
  );
}

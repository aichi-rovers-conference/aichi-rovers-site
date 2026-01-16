"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import styles from "./ArcSuggestionBox.module.css";

type SendStatus = "idle" | "sending" | "sent" | "error";
type Layout = { scale: number; offsetX: number; offsetY: number; mode: "landscape" | "portrait" };

type OverlayRect = { x: number; y: number; w: number; h: number };
type StreamRect = { x: number; y: number; w: number; h: number };

// 旧データが混ざっても落ちないように IN_PROGRESS も許容（表示は REVIEWED 相当）
type SuggestionStatus = "NEW" | "REVIEWED" | "RESOLVED" | "SPAM" | "IN_PROGRESS";

type PublicItem = {
  id: string;
  subject: string;
  category: string | null;
  status: SuggestionStatus;
  publicNote: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

const SHOW_PUBLIC_STREAM = false;

// =========================
// 背景画像に合わせた座標（画像座標系）
// =========================
const LANDSCAPE = {
  src: "/images/arc-board.png",
  w: 2048,
  h: 1117,

  title: { x: 1024, y: 0.18 * 1117, w: 0.46 * 2048 },
  meta: { x: 1024, y: 0.73 * 1117, w: 0.56 * 2048 },

  subject: { x: 0.359 * 2048, y: 0.384 * 1117, w: 0.285 * 2048, h: 0.069 * 1117 } satisfies OverlayRect,
  body: { x: 0.356 * 2048, y: 0.517 * 1117, w: 0.289 * 2048, h: 0.234 * 1117 } satisfies OverlayRect,
  button: { x: 1024, y: 0.805 * 1117 },

  stream: { x: 0.015 * 2048, y: 0.11 * 1117, w: 0.27 * 2048, h: 0.86 * 1117 } satisfies StreamRect,
} as const;

const PORTRAIT = {
  src: "/images/arc-board-portrait.png",
  w: 1373,
  h: 2048,

  // 木の看板中央あたり
  title: { x: 1373 / 2, y: 0.215 * 2048, w: 0.82 * 1373 },

  // 看板〜件名の間（画像の雰囲気に合わせやすい）
  meta: { x: 1373 / 2, y: 0.325 * 2048, w: 0.80 * 1373 },

  subject: { x: 0.255 * 1373, y: 0.372 * 2048, w: 0.49 * 1373, h: 0.046 * 2048 } satisfies OverlayRect,
  body: { x: 0.257 * 1373, y: 0.505 * 2048, w: 0.486 * 1373, h: 0.200 * 2048 } satisfies OverlayRect,
  button: { x: 1373 / 2, y: 0.685 * 2048 },

  // 縦は邪魔になりやすいので小さめ（ただし今回は縦では流さない設定）
  stream: { x: 0.06 * 1373, y: 0.06 * 2048, w: 0.40 * 1373, h: 0.28 * 2048 } satisfies StreamRect,
} as const;

const CATEGORIES = ["", "改善要望", "不具合", "質問", "その他"] as const;
type Category = (typeof CATEGORIES)[number];

function looksLikeEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function normalizeStatus(s: unknown): SuggestionStatus {
  const v = String(s ?? "NEW");
  if (v === "NEW" || v === "REVIEWED" || v === "RESOLVED" || v === "SPAM" || v === "IN_PROGRESS") return v;
  return "NEW";
}

function statusLabel(s: SuggestionStatus) {
  if (s === "RESOLVED") return "解決";
  if (s === "REVIEWED" || s === "IN_PROGRESS") return "確認済";
  if (s === "SPAM") return "SPAM";
  return "未対応";
}

function toIso(v: unknown): string {
  const d = v instanceof Date ? v : new Date(typeof v === "string" || typeof v === "number" ? v : Date.now());
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}
function toNullableIso(v: unknown): string | null {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(typeof v === "string" || typeof v === "number" ? v : Date.now());
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
function toNullableString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

function usePublicStream(enabled: boolean) {
  const [items, setItems] = useState<PublicItem[]>([]);

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      return;
    }

    let alive = true;

    const load = async () => {
      try {
        const res = await fetch("/api/suggestions/public", { cache: "no-store" });
        if (!res.ok) return;

        const json: unknown = await res.json();
        if (!alive) return;

        const root = json as { items?: unknown };
        const arr = Array.isArray(root.items) ? (root.items as unknown[]) : [];

        const mapped: PublicItem[] = arr
          .map((r: unknown): PublicItem => {
            const o = r as Record<string, unknown>;
            return {
              id: String(o.id ?? ""),
              subject: String(o.subject ?? ""),
              category: toNullableString(o.category),
              status: normalizeStatus(o.status),
              publicNote: toNullableString(o.publicNote ?? o.resolutionNote),
              createdAt: toIso(o.createdAt),
              updatedAt: toIso(o.updatedAt),
              resolvedAt: toNullableIso(o.resolvedAt),
            };
          })
          .filter((x: PublicItem) => x.id.length > 0 && x.subject.length > 0);

        setItems(mapped);
      } catch {
        // UIを止めない
      }
    };

    load();
    const t = window.setInterval(load, 10000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);

    return () => {
      alive = false;
      window.clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [enabled]);

  return items;
}

/**
 * ★途切れない上→下ストリーム（無限マルキー）
 * - 同じリストを2回並べる
 * - translateY(-50%) → 0 を無限ループ
 */
function LeftStream({
  rectPx,
  items,
  enabled,
}: {
  rectPx: { left: number; top: number; width: number; height: number };
  items: PublicItem[];
  enabled: boolean;
}) {
  const list = useMemo<PublicItem[]>(() => {
    const now = new Date().toISOString();

    const placeholder: PublicItem[] = Array.from({ length: 80 }, (_, i) => ({
      id: `_placeholder_${i}`,
      subject: "公開された投稿がここに流れます",
      category: null,
      status: "NEW",
      publicNote: null,
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
    }));

    const base: PublicItem[] = items.length > 0 ? items : placeholder;

    const MIN = 80;
    const count = Math.max(MIN, base.length);
    return Array.from({ length: count }, (_, i) => base[i % base.length]);
  }, [items]);

  if (!enabled) return null;

  const durSec = 70;

  const Card = ({ it }: { it: PublicItem }) => {
    const showPublicNote = it.status === "RESOLVED" && (it.publicNote ?? "").trim().length > 0;

    return (
      <div className={styles.streamCard}>
        <div className={styles.streamCardTop}>
          <span className={styles.streamChip}>{statusLabel(it.status)}</span>
          {it.category && <span className={styles.streamCat}>{it.category}</span>}
        </div>

        <div className={styles.streamTitle}>{it.subject}</div>

        {showPublicNote && (
          <div className={styles.streamNote}>
            <span className={styles.streamNoteLabel}>解決:</span> {it.publicNote}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={styles.streamRegion}
      style={{ left: rectPx.left, top: rectPx.top, width: rectPx.width, height: rectPx.height }}
      aria-hidden
    >
      <div
        className={styles.marqueeInner}
        style={{ ["--marqueeDur" as any]: `${durSec}s` } as React.CSSProperties}
      >
        <div className={styles.marqueeGroup}>
          {list.map((it: PublicItem, idx: number) => (
            <Card key={`a_${it.id}_${idx}`} it={it} />
          ))}
        </div>

        <div className={styles.marqueeGroup} aria-hidden="true">
          {list.map((it: PublicItem, idx: number) => (
            <Card key={`b_${it.id}_${idx}`} it={it} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ArcSuggestionBox() {
  const stageRef = useRef<HTMLDivElement>(null);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [isAnonymous, setIsAnonymous] = useState(true);
  const [contactEmail, setContactEmail] = useState("");
  const [category, setCategory] = useState<Category>("");
  const origin = "web";

  const [sendStatus, setSendStatus] = useState<SendStatus>("idle");
  const [message, setMessage] = useState("");

  // 背景は cover で拡大縮小、フォームは “縮めない” ため座標変換だけ持つ
  const [layout, setLayout] = useState<Layout>({ scale: 1, offsetX: 0, offsetY: 0, mode: "landscape" });

  const [showMeta, setShowMeta] = useState(false);

  const HINT_KEY = "arc_sbox_meta_hint_seen";
  const [showMetaHint, setShowMetaHint] = useState(false);

  const PORTRAIT_MAX_WIDTH = 900;

  const cfg = useMemo(() => (layout.mode === "portrait" ? PORTRAIT : LANDSCAPE), [layout.mode]);

  const streamEnabled = SHOW_PUBLIC_STREAM && layout.mode === "landscape";
  const streamItems = usePublicStream(streamEnabled);

  // cover と同じ計算で “画像座標 → 画面px” の変換係数を作る
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      const usePortrait = w <= PORTRAIT_MAX_WIDTH || w / h < 1;
      const mode: Layout["mode"] = usePortrait ? "portrait" : "landscape";
      const c = usePortrait ? PORTRAIT : LANDSCAPE;

      const scale = Math.max(w / c.w, h / c.h); // object-fit: cover と同じ
      const renderedW = c.w * scale;
      const renderedH = c.h * scale;

      const offsetX = (w - renderedW) / 2;
      const offsetY = (h - renderedH) / 2;

      setLayout({ scale, offsetX, offsetY, mode });
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 初回だけヒント
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(HINT_KEY) === "1") return;

    setShowMetaHint(true);
    const t = window.setTimeout(() => setShowMetaHint(false), 8000);
    return () => window.clearTimeout(t);
  }, []);

  const openMeta = () => {
    setShowMeta(true);
    setShowMetaHint(false);
    if (typeof window !== "undefined") localStorage.setItem(HINT_KEY, "1");
  };
  const closeMeta = () => setShowMeta(false);

  useEffect(() => {
    if (!showMeta) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMeta();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showMeta]);

  // =========================
  // 画像座標 → 画面(px) 変換
  // =========================
  const sx = (x: number) => layout.offsetX + x * layout.scale;
  const sy = (y: number) => layout.offsetY + y * layout.scale;

  function rectPx(r: OverlayRect, opts?: { minH?: number; minW?: number }) {
    const baseW = r.w * layout.scale;
    const baseH = r.h * layout.scale;

    const w = Math.max(baseW, opts?.minW ?? 0);
    const h = Math.max(baseH, opts?.minH ?? 0);

    const left = sx(r.x) - (w - baseW) / 2;
    const top = sy(r.y) - (h - baseH) / 2;

    return { left, top, width: w, height: h };
  }

  function pointPx(p: { x: number; y: number }) {
    return { left: sx(p.x), top: sy(p.y) };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const s = subject.trim();
    const b = body.trim();
    if (!s || !b) {
      setSendStatus("error");
      setMessage("件名と本文は必須です。");
      return;
    }

    const email = contactEmail.trim();
    if (!isAnonymous) {
      if (!email) {
        setSendStatus("error");
        setMessage("匿名でない場合は、連絡先メールを入力してください。");
        return;
      }
      if (!looksLikeEmail(email)) {
        setSendStatus("error");
        setMessage("メールアドレスの形式が正しくありません。");
        return;
      }
    }

    setSendStatus("sending");
    setMessage("");

    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: s,
          body: b,
          isAnonymous,
          contactEmail: isAnonymous ? null : email,
          category: category || null,
          origin,
        }),
      });

      if (!res.ok) throw new Error(await res.text().catch(() => ""));

      setSubject("");
      setBody("");
      setCategory("");
      setIsAnonymous(true);
      setContactEmail("");

      setSendStatus("sent");
      setMessage("送信しました！");
      setTimeout(() => {
        setSendStatus("idle");
        setMessage("");
      }, 2000);
    } catch (err) {
      console.error(err);
      setSendStatus("error");
      setMessage("送信に失敗しました。");
      setTimeout(() => {
        setSendStatus("idle");
        setMessage("");
      }, 2500);
    }
  }

  const streamRectPx = {
    left: sx(cfg.stream.x),
    top: sy(cfg.stream.y),
    width: cfg.stream.w * layout.scale,
    height: cfg.stream.h * layout.scale,
  };

  

  return (
    <div className={styles.page}>
      <div ref={stageRef} className={styles.stage}>
        {/* 背景 */}
        <Image src={cfg.src} alt="" fill priority sizes="100vw" className={styles.bg} />

        {/* 左上：ホーム */}
        <div
          style={{
            position: "absolute",
            left: "calc(env(safe-area-inset-left) + 12px)",
            top: "calc(env(safe-area-inset-top) + 12px)",
            zIndex: 30,
          }}
        >
          <Link href="/" className={styles.topPill} aria-label="ホームに戻る">
            ← ホーム
          </Link>
        </div>

        {/* 右上：投稿設定 */}
        <div
          style={{
            position: "absolute",
            right: "calc(env(safe-area-inset-right) + 12px)",
            top: "calc(env(safe-area-inset-top) + 12px)",
            zIndex: 30,
          }}
        >
          <button type="button" onClick={openMeta} className={styles.topPillBtn} aria-label="投稿設定を開く">
            ⚙ 投稿設定
          </button>

          {showMetaHint && (
            <div
              style={{
                position: "absolute",
                top: 52,
                right: 0,
                width: "min(310px, 76vw)",
                background: "rgba(255,255,255,0.95)",
                border: "1px solid rgba(0,0,0,0.12)",
                borderRadius: 16,
                padding: 12,
                boxShadow: "0 18px 50px rgba(0,0,0,0.22)",
                zIndex: 40,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -8,
                  right: 22,
                  width: 14,
                  height: 14,
                  background: "rgba(255,255,255,0.95)",
                  borderLeft: "1px solid rgba(0,0,0,0.12)",
                  borderTop: "1px solid rgba(0,0,0,0.12)",
                  transform: "rotate(45deg)",
                }}
              />
              <div style={{ fontWeight: 1000, fontSize: 14 }}>匿名で送れます</div>
              <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.4, color: "rgba(0,0,0,0.72)" }}>
                必要なら「カテゴリ」や「連絡先メール」も設定できます。
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowMetaHint(false);
                    if (typeof window !== "undefined") localStorage.setItem(HINT_KEY, "1");
                  }}
                  style={{
                    borderRadius: 12,
                    padding: "10px 12px",
                    border: "1px solid rgba(0,0,0,0.12)",
                    background: "white",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={openMeta}
                  style={{
                    borderRadius: 12,
                    padding: "10px 12px",
                    border: "1px solid rgba(0,0,0,0.12)",
                    background: "rgba(99,102,241,0.10)",
                    fontWeight: 1000,
                    cursor: "pointer",
                  }}
                >
                  設定する
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ストリーム（フォームより下） */}
        {streamEnabled && <LeftStream rectPx={streamRectPx} items={streamItems} enabled={true} />}

        {/* フォーム（縮めない。位置だけ背景に追従） */}
        <form className={styles.overlay} onSubmit={onSubmit}>
          {/* タイトル */}
          <h1
            className={styles.signTitle}
            style={{
              left: sx(cfg.title.x),
              top: sy(cfg.title.y),
              width: cfg.title.w * layout.scale,
            }}
          >
            ARC目安箱
          </h1>

          

          {/* 件名 */}
          <label className={styles.srOnly} htmlFor="subject">
            件名
          </label>
          <input
            id="subject"
            className={styles.subjectInput}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="件名を入力…"
            maxLength={80}
            style={rectPx(cfg.subject, { minH: 52, minW: 280 })}
          />

          {/* 本文 */}
          <label className={styles.srOnly} htmlFor="body">
            本文
          </label>
          <textarea
            id="body"
            className={styles.bodyInput}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="本文を入力…"
            maxLength={2000}
            style={rectPx(cfg.body, { minH: 240, minW: 280 })}
          />

          {/* 送信 */}
          <button
            className={styles.submitBtn}
            type="submit"
            disabled={sendStatus === "sending"}
            style={{
              ...pointPx({ x: cfg.button.x, y: cfg.button.y }),
              minHeight: 52,
              minWidth: 170,
            }}
          >
            {sendStatus === "sending" ? "送信中…" : "送信"}
          </button>

          {message && <div className={styles.toast}>{message}</div>}
        </form>

        {/* 投稿設定モーダル（既存のまま） */}
        {showMeta && (
          <div
            onClick={closeMeta}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 50,
              background: "rgba(0,0,0,0.35)",
              display: "grid",
              placeItems: "center",
              padding: 16,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "min(560px, 100%)",
                borderRadius: 18,
                background: "rgba(255,255,255,0.94)",
                border: "1px solid rgba(0,0,0,0.12)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
                backdropFilter: "blur(10px)",
                padding: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div style={{ fontWeight: 1000, fontSize: 18 }}>投稿設定</div>
                <button
                  type="button"
                  onClick={closeMeta}
                  style={{
                    border: "1px solid rgba(0,0,0,0.14)",
                    background: "white",
                    borderRadius: 999,
                    padding: "8px 10px",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  閉じる
                </button>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: "rgba(0,0,0,0.65)" }}>
                匿名で投稿できます。連絡先メールは <b>返信が必要な場合のみ</b> 入力してください。
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 900 }}>
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => {
                      const v = e.target.checked;
                      setIsAnonymous(v);
                      if (v) setContactEmail("");
                    }}
                  />
                  匿名で投稿する
                </label>

                <div style={{ display: "grid", gap: 6, opacity: isAnonymous ? 0.55 : 1 }}>
                  <div style={{ fontWeight: 900, fontSize: 13, color: "rgba(0,0,0,0.7)" }}>連絡先メール（匿名OFF時）</div>
                  <input
                    type="email"
                    value={contactEmail}
                    disabled={isAnonymous}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="example@example.com"
                    maxLength={254}
                    style={{
                      width: "100%",
                      padding: "12px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.15)",
                      background: "rgba(255,255,255,0.96)",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontWeight: 900, fontSize: 13, color: "rgba(0,0,0,0.7)" }}>カテゴリ（任意）</div>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    style={{
                      width: "100%",
                      padding: "12px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.15)",
                      background: "rgba(255,255,255,0.96)",
                      fontWeight: 900,
                    }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c === "" ? "未指定" : c}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ fontSize: 12, color: "rgba(0,0,0,0.65)" }}>
                  送信元（origin）は自動で <b>{origin}</b> を設定します。
                </div>

                <button
                  type="button"
                  onClick={closeMeta}
                  style={{
                    marginTop: 2,
                    borderRadius: 14,
                    padding: "12px 14px",
                    border: "1px solid rgba(0,0,0,0.12)",
                    background: "rgba(99,102,241,0.10)",
                    fontWeight: 1000,
                    cursor: "pointer",
                  }}
                >
                  設定を保存して閉じる
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

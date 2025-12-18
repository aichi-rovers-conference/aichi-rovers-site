"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./AdminSuggestionBox.module.css";

const STATUSES = ["NEW", "REVIEWED", "RESOLVED", "SPAM"] as const;
type Status = (typeof STATUSES)[number];
type Tab = "ALL" | Status;

/** ★滝ストリーム機能：メンテナンス中フラグ（falseにしたら解放） */
const WATERFALL_MAINTENANCE = true;

type Item = {
  id: string;
  subject: string;
  body: string;
  status: Status;
  category: string | null;
  isAnonymous: boolean;
  contactEmail: string | null;
  origin: string | null;
  createdAt: string;
  reviewedAt: string | null;
  resolvedAt: string | null;
  adminNote: string | null;

  // 滝ストリーム用
  isPublic: boolean;
  publicNote: string | null;
};

function fmt(iso: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function AdminSuggestionBoxClient({
  counts,
  itemsAll,
  itemsByStatus,
  updateStatusAction,
  updateNoteAction,
  updatePublicAction,
}: {
  counts: Record<Status, number>;
  itemsAll: Item[];
  itemsByStatus: Record<Status, Item[]>;
  updateStatusAction: (formData: FormData) => Promise<void>;
  updateNoteAction: (formData: FormData) => Promise<void>;
  updatePublicAction: (formData: FormData) => Promise<void>;
}) {
  const [tab, setTab] = useState<Tab>("ALL");

  useEffect(() => {
    const saved = localStorage.getItem("arc_sbox_tab");
    if (saved && (saved === "ALL" || STATUSES.includes(saved as Status))) setTab(saved as Tab);
  }, []);
  useEffect(() => {
    localStorage.setItem("arc_sbox_tab", tab);
  }, [tab]);

  const allCount = useMemo(() => STATUSES.reduce((a, s) => a + counts[s], 0), [counts]);

  const items = tab === "ALL" ? itemsAll : itemsByStatus[tab];
  const total = tab === "ALL" ? allCount : counts[tab];

  const cls = (key: string) => (styles as Record<string, string>)[key] ?? "";

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon} aria-hidden>
            💬
          </div>
          <div>
            <h1 className={styles.title}>ARC目安箱（運営）</h1>
            <p className={styles.sub}>
              表示: <b>{tab}</b> / 件数: <b>{total}</b>
            </p>
          </div>
        </div>

        <nav className={styles.filters} aria-label="ステータス絞り込み">
          <button
            type="button"
            className={`${styles.filterLink} ${tab === "ALL" ? styles.filterActive : ""}`}
            onClick={() => setTab("ALL")}
          >
            ALL <span className={styles.badge}>{allCount}</span>
          </button>

          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              className={`${styles.filterLink} ${tab === s ? styles.filterActive : ""} ${cls(
                `filter${s}`
              )}`}
              onClick={() => setTab(s)}
            >
              {s} <span className={styles.badge}>{counts[s]}</span>
            </button>
          ))}
        </nav>
      </header>

      <section className={styles.list}>
        {items.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon} aria-hidden>
              📨
            </div>
            <div>
              <div className={styles.emptyTitle}>該当する投稿がありません</div>
              <div className={styles.emptySub}>別のステータスを選んでください。</div>
            </div>
          </div>
        ) : (
          items.map((it) => (
            <article key={it.id} className={`${styles.card} ${cls(`card${it.status}`)}`}>
              <div className={styles.cardTop}>
                <div className={styles.meta}>
                  <div className={styles.subjectRow} style={{ gap: 10, alignItems: "center" }}>
                    <div className={styles.subject}>{it.subject}</div>

                    {/* 公開中バッジ（メンテでも表示はOK） */}
                    {it.isPublic && it.status !== "SPAM" && (
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 900,
                          padding: "4px 10px",
                          borderRadius: 999,
                          border: "1px solid rgba(0,0,0,0.18)",
                          background: "rgba(46, 204, 113, 0.14)",
                        }}
                      >
                        滝に表示中
                      </span>
                    )}

                    <span className={`${styles.statusChip} ${cls(`chip${it.status}`)}`}>{it.status}</span>
                  </div>

                  <div className={styles.small}>
                    {fmt(it.createdAt)}
                    {it.category ? ` ・ category: ${it.category}` : ""}
                    {it.reviewedAt ? ` ・ reviewedAt: ${fmt(it.reviewedAt)}` : ""}
                    {it.resolvedAt ? ` ・ resolvedAt: ${fmt(it.resolvedAt)}` : ""}
                  </div>
                </div>

                <form action={updateStatusAction} className={styles.inlineForm}>
                  <input type="hidden" name="id" value={it.id} />
                  <select name="status" defaultValue={it.status} className={styles.select}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button className={styles.button} type="submit">
                    更新
                  </button>
                </form>
              </div>

              <details className={styles.details}>
                <summary className={styles.summary}>本文・詳細</summary>

                <div className={styles.detailGrid}>
                  <div>
                    <div className={styles.label}>本文</div>
                    <pre className={styles.body}>{it.body}</pre>
                  </div>

                  <div>
                    <div className={styles.label}>投稿情報</div>
                    <div className={styles.small}>
                      anonymous: {String(it.isAnonymous)}
                      <br />
                      contactEmail: {it.contactEmail ?? "-"}
                      <br />
                      origin: {it.origin ?? "-"}
                    </div>

                    {/* ★公開（滝）設定 */}
                    <div className={styles.label} style={{ marginTop: 12 }}>
                      公開（滝ストリーム）
                      {WATERFALL_MAINTENANCE && (
                        <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.75 }}>
                          （メンテナンス中）
                        </span>
                      )}
                    </div>

                    <form action={updatePublicAction} className={styles.noteForm}>
                      <input type="hidden" name="id" value={it.id} />

                      {/* ★ここで一括 disable（fieldset） */}
                      <fieldset
                        disabled={WATERFALL_MAINTENANCE || it.status === "SPAM"}
                        style={{
                          border: "none",
                          padding: 0,
                          margin: 0,
                          opacity: WATERFALL_MAINTENANCE ? 0.55 : 1,
                        }}
                      >
                        <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 900 }}>
                          <input
                            type="checkbox"
                            name="isPublic"
                            value="1"
                            defaultChecked={it.isPublic && it.status !== "SPAM"}
                          />
                          滝に流す（公開）
                          {it.status === "SPAM" && (
                            <span style={{ fontSize: 12, opacity: 0.7 }}>※SPAMは公開できません</span>
                          )}
                        </label>

                        <textarea
                          name="publicNote"
                          defaultValue={it.publicNote ?? ""}
                          className={styles.textarea}
                          maxLength={1000}
                          placeholder="公開OKな内容だけ書く（例：対応済み、原因、解決策、反映時期など）"
                        />

                        <button className={styles.button} type="submit">
                          公開設定を保存
                        </button>
                      </fieldset>

                      {/* メンテ中の説明（押せない理由を明示） */}
                      {WATERFALL_MAINTENANCE && (
                        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75, fontWeight: 800 }}>
                          現在メンテナンス中のため、公開設定の変更はできません。
                        </div>
                      )}
                    </form>

                    {/* 既存の運営メモ */}
                    <div className={styles.label} style={{ marginTop: 12 }}>
                      運営メモ（内部）
                    </div>
                    <form action={updateNoteAction} className={styles.noteForm}>
                      <input type="hidden" name="id" value={it.id} />
                      <textarea
                        name="adminNote"
                        defaultValue={it.adminNote ?? ""}
                        className={styles.textarea}
                        maxLength={1000}
                        placeholder="対応内容・所感・次アクションなど（公開されません）"
                      />
                      <button className={styles.button} type="submit">
                        メモ保存
                      </button>
                    </form>
                  </div>
                </div>
              </details>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

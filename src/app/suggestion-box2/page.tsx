"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import styles from "./ArcSuggestionBox.module.css";

type SendStatus = "idle" | "sending" | "sent" | "error";

const NAV_ITEMS = [
  { name: "ホーム", path: "/" },
  { name: "ARCとは", path: "/arc" },
  { name: "事業カレンダー", path: "/arc/calendar" },
  { name: "ARC定例会", path: "/arc/conference" },
  { name: "ARC運営委員会", path: "/arc/executive-committee" },
  // { name: "ARCアンケート", path: "/polls" },
  { name: "目安箱", path: "/suggestion-box" },
] as const;

function looksLikeEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function SuggestionBoxPage() {
  const [navOpen, setNavOpen] = useState(false);
  const [showMeta, setShowMeta] = useState(false);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // 設定（右上モーダルで変更）
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [contactEmail, setContactEmail] = useState("");

  const [sendStatus, setSendStatus] = useState<SendStatus>("idle");
  const [toast, setToast] = useState<string>("");

  const origin = "web";

  const openMeta = () => setShowMeta(true);
  const closeMeta = () => setShowMeta(false);

  // ESCで閉じる（メニュー/投稿設定）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setNavOpen(false);
        setShowMeta(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // トースト自動消し
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 2500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const canSend = useMemo(() => {
    const s = subject.trim();
    const b = body.trim();
    if (!s || !b) return false;

    if (!isAnonymous) {
      const em = contactEmail.trim();
      if (!em || !looksLikeEmail(em)) return false;
    }
    return true;
  }, [subject, body, isAnonymous, contactEmail]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const s = subject.trim();
    const b = body.trim();

    if (!s || !b) {
      setSendStatus("error");
      setToast("件名と本文は必須です。");
      return;
    }

    const email = contactEmail.trim();
    if (!isAnonymous) {
      if (!email) {
        setSendStatus("error");
        setToast("非匿名の場合は連絡先メールが必要です。");
        return;
      }
      if (!looksLikeEmail(email)) {
        setSendStatus("error");
        setToast("メールアドレスの形式が正しくありません。");
        return;
      }
    }

    setSendStatus("sending");
    setToast("");

    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: s,
          body: b,
          isAnonymous,
          contactEmail: isAnonymous ? null : email,
          origin,
        }),
      });

      if (!res.ok) throw new Error(await res.text().catch(() => ""));

      setSubject("");
      setBody("");

      // 入力はクリア、設定は保持でもOKだが、匿名に戻したいなら下を有効化
      // setIsAnonymous(true);
      // setContactEmail("");

      setSendStatus("sent");
      setToast("送信しました！");
      window.setTimeout(() => setSendStatus("idle"), 1200);
    } catch (err) {
      console.error(err);
      setSendStatus("error");
      setToast("送信に失敗しました。");
      window.setTimeout(() => setSendStatus("idle"), 1500);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.stage}>
        {/* 背景（PC/スマホ切替はCSSで） */}
        <Image
          src="/images/arc-forest-desktop.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className={`${styles.bg} ${styles.bgDesktop}`}
        />
        <Image
          src="/images/arc-forest-mobile.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className={`${styles.bg} ${styles.bgMobile}`}
        />

        {/* 左上：メニュー */}
        <div className={styles.topLeft}>
          <button
            type="button"
            className={styles.forestMenuBtn}
            onClick={() => setNavOpen(true)}
            aria-label="メニューを開く"
          >
            ☰ 案内
          </button>
        </div>

        {/* 右上：投稿設定 */}
        <div className={styles.topRight}>
          <button
            type="button"
            className={styles.forestSettingBtn}
            onClick={openMeta}
            aria-label="投稿設定を開く"
          >
            ⚙ 投稿設定
          </button>
        </div>

        {/* ナビドロワー */}
        {navOpen && (
          <div className={styles.drawerOverlay} onClick={() => setNavOpen(false)} role="dialog" aria-modal="true">
            <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
              <div className={styles.drawerHeader}>
                <div className={styles.drawerTitle}>ページ一覧</div>
                <button type="button" className={styles.drawerClose} onClick={() => setNavOpen(false)}>
                  ✕
                </button>
              </div>

              <div className={styles.drawerList}>
                {NAV_ITEMS.map((it) => (
                  <Link key={it.path} href={it.path} className={styles.drawerItem} onClick={() => setNavOpen(false)}>
                    {it.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 中央フォーム */}
        <div className={styles.center}>
          <form className={styles.form} onSubmit={onSubmit}>
            {/* 件名（巻物） */}
            <div className={styles.scrollField}>
              <Image
                src="/images/scroll-subject.png"
                alt=""
                width={1400}
                height={260}
                className={styles.scrollImg}
                priority
              />
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
              />
            </div>

            {/* ※匿名/非匿名のUIはここには置かない（スペース確保） */}

            {/* 本文（巻物） */}
            <div className={styles.scrollFieldBody}>
              <Image
                src="/images/scroll-body.png"
                alt=""
                width={1600}
                height={900}
                className={styles.scrollImgBody}
                priority
              />
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
              />
            </div>

            <div className={styles.actions}>
              <button className={styles.submitBtn} type="submit" disabled={sendStatus === "sending" || !canSend}>
                {sendStatus === "sending" ? "送信中…" : "送信"}
              </button>
              
            </div>
          </form>
        </div>

        {/* 投稿設定モーダル */}
        {showMeta && (
          <div className={styles.metaOverlay} onClick={closeMeta} role="dialog" aria-modal="true">
            <div className={styles.metaPanel} onClick={(e) => e.stopPropagation()}>
              <div className={styles.metaHeader}>
                <div className={styles.metaTitle}>投稿設定</div>
                <button type="button" className={styles.metaClose} onClick={closeMeta}>
                  閉じる
                </button>
              </div>

              <div className={styles.metaDesc}>
                匿名で投稿できます。返信が必要な場合のみ「非匿名」にしてメールを入力してください。
              </div>

              <div className={styles.metaBody}>
                <div className={styles.segment} role="tablist" aria-label="匿名設定">
                  <button
                    type="button"
                    className={`${styles.segBtn} ${isAnonymous ? styles.segActive : ""}`}
                    onClick={() => {
                      setIsAnonymous(true);
                      setContactEmail("");
                    }}
                    aria-pressed={isAnonymous}
                  >
                    匿名
                  </button>

                  <button
                    type="button"
                    className={`${styles.segBtn} ${!isAnonymous ? styles.segActive : ""}`}
                    onClick={() => setIsAnonymous(false)}
                    aria-pressed={!isAnonymous}
                  >
                    非匿名
                  </button>
                </div>

                <div className={styles.metaHint}>
                  {isAnonymous ? "匿名で送信されます" : "返信が必要な場合のメールを入力してください"}
                </div>

                <div className={styles.emailRow} aria-disabled={isAnonymous ? "true" : "false"}>
                  <div className={styles.emailLabel}>連絡先メール（非匿名時）</div>
                  <input
                    type="email"
                    className={styles.emailInput}
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="example@example.com"
                    disabled={isAnonymous}
                    maxLength={254}
                  />
                </div>

                <div className={styles.metaFooter}>
                  <button type="button" className={styles.metaSave} onClick={closeMeta}>
                    設定を保存して閉じる
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {toast && <div className={styles.toast}>{toast}</div>}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ArcHeader1 from "@/components/ArcHeader1";

/* 令和FYの最新Rを計算（FYは4月開始） */
function latestReiwaFY(): number {
  const now = new Date();
  const fyYear = now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear(); // 0=Jan
  const r = fyYear - 2018; // FY2019 => R1
  return Math.max(1, r);
}
function reiwaOptions(): string[] {
  const latest = latestReiwaFY();
  return Array.from({ length: latest }, (_, i) => `R${i + 1}`);
}
/* ルーティングは小文字でもOKにするため、パスは小文字で生成。
   DB保存は大文字Rで正規化（R6など） */
const toPathFy = (label: string) => label.trim().toLowerCase();   // "R6" -> "r6"
const toCanonicalFy = (label: string) => {
  const m = String(label).trim().match(/^r\s*(\d+)$/i);
  if (m) return `R${Number(m[1])}`;
  return label.toUpperCase();
};

type SectionText = { id: string; type: "text"; title?: string; body?: string };
type SectionTimelineItem = { id: string; date?: string; title: string; description?: string };
type SectionTimeline = { id: string; type: "timeline"; title?: string; items: SectionTimelineItem[] };
type Section = SectionText | SectionTimeline;
type GalleryItem = { id: string; url: string; caption?: string };
const uid = () => Math.random().toString(36).slice(2, 10);

type SaveModalInfo = {
  url: string;
  fy: string;
  round: string;
  published: boolean;
  title: string;
};

export default function ArchiveBuilderClient() {
  const fyOpts = reiwaOptions();                // ["R1", ..., "R*"]
  const [fy, setFy] = useState<string>(fyOpts[fyOpts.length - 1] ?? "R1"); // 既定: 最新R
  const [round, setRound] = useState<string>("1"); // 1〜4の中から選択

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [heroUrl, setHeroUrl] = useState("");
  const [intro, setIntro] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [published, setPublished] = useState(false);
  const [status, setStatus] = useState<null | { ok: boolean; msg: string }>(null);
  const [loading, setLoading] = useState(false);

  // 完了モーダル
  const [saveModal, setSaveModal] = useState<SaveModalInfo | null>(null);
  const [copied, setCopied] = useState(false);

  // アップロード状態
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  /* API/プレビューURLはパス表記を小文字に寄せる（/arc/conference/r6/3） */
  const base = useMemo(() => {
    return `/api/arc/conference/${encodeURIComponent(toPathFy(fy))}/${encodeURIComponent(round)}`;
  }, [fy, round]);
  const previewUrl = useMemo(() => {
    return `/arc/conference/${encodeURIComponent(toPathFy(fy))}/${encodeURIComponent(round)}`;
  }, [fy, round]);

  /* 読み込み */
  useEffect(() => {
    let abort = false;
    (async () => {
      setLoading(true);
      setStatus(null);
      try {
        const res = await fetch(base, { cache: "no-store" });
        if (!res.ok) {
          setTitle("");
          setSubtitle("");
          setHeroUrl("");
          setIntro("");
          setSections([]);
          setGallery([]);
          setPublished(false);
        } else {
          const { data } = await res.json();
          setTitle(data.title ?? "");
          setSubtitle(data.subtitle ?? "");
          setHeroUrl(data.heroUrl ?? "");
          setIntro(data.intro ?? "");
          setSections(Array.isArray(data.sections) ? data.sections : []);
          setGallery(Array.isArray(data.gallery) ? data.gallery : []);
          setPublished(Boolean(data.published));
          setStatus({ ok: true, msg: "読み込みました" });
        }
      } catch (e: any) {
        setStatus({ ok: false, msg: e?.message ?? "読み込みに失敗しました" });
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [base]);

  // セクション操作
  const addTextSection = () => setSections((prev) => [...prev, { id: uid(), type: "text", title: "", body: "" }]);
  const addTimelineSection = () => setSections((prev) => [...prev, { id: uid(), type: "timeline", title: "", items: [] }]);
  const updateSection = (id: string, patch: Partial<Section>) => setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } as Section : s)));
  const removeSection = (id: string) => setSections((prev) => prev.filter((s) => s.id !== id));

  const addTimelineItem = (sid: string) =>
    setSections((prev) =>
      prev.map((s) =>
        s.id === sid && s.type === "timeline"
          ? { ...s, items: [...s.items, { id: uid(), title: "", description: "", date: "" }] }
          : s
      )
    );

  const updateTimelineItem = (sid: string, iid: string, patch: Partial<SectionTimelineItem>) =>
    setSections((prev) =>
      prev.map((s) =>
        s.id === sid && s.type === "timeline"
          ? { ...s, items: s.items.map((it) => (it.id === iid ? { ...it, ...patch } : it)) }
          : s
      )
    );

  const removeTimelineItem = (sid: string, iid: string) =>
    setSections((prev) =>
      prev.map((s) =>
        s.id === sid && s.type === "timeline"
          ? { ...s, items: s.items.filter((it) => it.id !== iid) }
          : s
      )
    );

  // ギャラリー
  const addGallery = () => setGallery((prev) => [...prev, { id: uid(), url: "", caption: "" }]);
  const updateGallery = (id: string, patch: Partial<GalleryItem>) =>
    setGallery((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  const removeGallery = (id: string) => setGallery((prev) => prev.filter((g) => g.id !== id));

  // 画像アップロード（共通）
  async function uploadImage(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok || !json?.ok) throw new Error(json?.message ?? "アップロードに失敗しました");
    return json.url as string; // 例: /uploads/XXXX.jpg
  }

  // input の value クリアは await の前に行う
  const onHeroFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    input.value = ""; // 先にクリア

    try {
      setUploadingHero(true);
      const url = await uploadImage(file);
      setHeroUrl(url);
      setStatus({ ok: true, msg: "ヒーロー画像をアップロードしました" });
    } catch (err: any) {
      setStatus({ ok: false, msg: err?.message ?? "アップロードに失敗しました" });
    } finally {
      setUploadingHero(false);
    }
  };

  function handleFileInput(id: string, e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    input.value = ""; // 先にクリア
    uploadImageFor(id, file);
  }
  async function uploadImageFor(id: string, file: File) {
    try {
      setUploading((m) => ({ ...m, [id]: true }));
      const url = await uploadImage(file);
      updateGallery(id, { url });
      setStatus({ ok: true, msg: "画像をアップロードしました" });
    } catch (e: any) {
      setStatus({ ok: false, msg: e?.message ?? "アップロードに失敗しました" });
    } finally {
      setUploading((m) => ({ ...m, [id]: false }));
    }
  }

  /* 保存（DBには大文字 R6 の正規化で送る。round は "1"〜"4"） */
  const save = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const payload = {
        fy: toCanonicalFy(fy),
        round: String(Number(round)), // "01"などが来ても"1"に
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        heroUrl: heroUrl.trim() || undefined,
        intro: intro.trim() || undefined,
        sections,
        gallery,
        published,
      };
      if (!payload.title) throw new Error("タイトルを入力してください");

      const res = await fetch(base, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.message ?? "保存に失敗しました");

      // 成功 → 前面モーダル
      setStatus(null);
      setSaveModal({
        url: previewUrl,
        fy: payload.fy,
        round: payload.round,
        published: payload.published ?? false,
        title: payload.title,
      });
      setCopied(false);
    } catch (e: any) {
      setStatus({ ok: false, msg: e?.message ?? "保存に失敗しました" });
    } finally {
      setLoading(false);
    }
  };

  // URLコピー
  const copyLink = async () => {
    if (!saveModal?.url) return;
    try {
      await navigator.clipboard.writeText(location.origin + saveModal.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <div className="mx-auto max-w-5xl px-4 md:px-8 py-8">
        <header className="mb-6 flex flex-wrap items-end gap-4">
          <div>
            <h1 className="text-2xl font-bold">定例会アーカイブ作成</h1>
            <p className="text-slate-600 text-sm">
              公開ページ：<a className="underline" href={previewUrl} target="_blank">{previewUrl}</a>
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
              公開
            </label>
            <motion.button
              whileHover={{ y: -1, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={save}
              disabled={loading || !title.trim()}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-white shadow disabled:opacity-50"
            >
              {loading ? "保存中…" : "保存"}
            </motion.button>
          </div>
        </header>

        {/* ▼▼ FY と round 選択 ▼▼ */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium">年度 (FY)</label>
            <select
              value={fy}
              onChange={(e) => setFy(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 bg-white"
            >
              {fyOpts.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500">R1〜最新の令和年度が選べます</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">回（round）</label>
            <select
              value={round}
              onChange={(e) => setRound(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 bg-white"
            >
              {[1,2,3,4].map((n) => (
                <option key={n} value={String(n)}>{n}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500">1〜4から選択</p>
          </div>

          {/* ヒーロー画像（ファイルアップロード） */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">ヒーロー画像</label>
            {heroUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroUrl} alt="" className="w-full h-32 object-cover rounded-lg border" />
            ) : (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-slate-500">
                まだ画像がありません
              </div>
            )}
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="file" accept="image/*" onChange={onHeroFile} disabled={uploadingHero} />
              {uploadingHero ? "アップロード中…" : "画像ファイルを選択"}
            </label>
          </div>

          <div className="md:col-span-3 space-y-2">
            <label className="block text-sm font-medium">タイトル</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border px-3 py-2" placeholder="例: 第3回 定例会（○月）" />
          </div>
          <div className="md:col-span-3 space-y-2">
            <label className="block text-sm font-medium">サブタイトル</label>
            <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="w-full rounded-lg border px-3 py-2" placeholder="任意" />
          </div>
          <div className="md:colspan-3 space-y-2 md:col-span-3">
            <label className="block text-sm font-medium">導入文 / リード</label>
            <textarea value={intro} onChange={(e) => setIntro(e.target.value)} className="w-full rounded-lg border px-3 py-2 min-h-[88px]" placeholder="概要など" />
          </div>
        </section>

        {/* セクション */}
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <h2 className="text-lg font-semibold">本文セクション</h2>
            <div className="ml-auto flex gap-2">
              <button onClick={addTextSection} className="rounded-lg border px-3 py-1.5">テキスト追加</button>
              <button onClick={addTimelineSection} className="rounded-lg border px-3 py-1.5">タイムライン追加</button>
            </div>
          </div>

          <div className="space-y-4">
            {sections.map((s) => (
              <motion.div key={s.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs rounded-full bg-slate-100 px-2 py-1">{s.type === "text" ? "テキスト" : "タイムライン"}</span>
                  <button onClick={() => removeSection(s.id)} className="ml-auto text-red-600 text-sm">削除</button>
                </div>
                <div className="mb-3">
                  <label className="block text-sm font-medium">セクション見出し</label>
                  <input value={s.title ?? ""} onChange={(e) => updateSection(s.id, { title: e.target.value })} className="w-full rounded-lg border px-3 py-2" placeholder="例: 当日の流れ" />
                </div>

                {s.type === "text" ? (
                  <div>
                    <label className="block text-sm font-medium">本文</label>
                    <textarea value={(s as SectionText).body ?? ""} onChange={(e) => updateSection(s.id, { body: e.target.value })} className="w-full rounded-lg border px-3 py-2 min-h-[120px]" placeholder="本文" />
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-sm font-medium">タイムライン項目</h3>
                      <button onClick={() => addTimelineItem(s.id)} className="ml-auto rounded-lg border px-3 py-1.5">追加</button>
                    </div>
                    <div className="space-y-3">
                      {(s as SectionTimeline).items.map((it) => (
                        <div key={it.id} className="grid grid-cols-1 md:grid-cols-5 gap-2 rounded-lg border p-3">
                          <input className="md:col-span-1 rounded-lg border px-2 py-1.5" placeholder="日付 YYYY-MM-DD" value={it.date ?? ""} onChange={(e) => updateTimelineItem(s.id, it.id, { date: e.target.value })} />
                          <input className="md:col-span-2 rounded-lg border px-2 py-1.5" placeholder="見出し" value={it.title} onChange={(e) => updateTimelineItem(s.id, it.id, { title: e.target.value })} />
                          <input className="md:col-span-2 rounded-lg border px-2 py-1.5" placeholder="説明" value={it.description ?? ""} onChange={(e) => updateTimelineItem(s.id, it.id, { description: e.target.value })} />
                          <div className="md:col-span-5 text-right">
                            <button onClick={() => removeTimelineItem(s.id, it.id)} className="text-sm text-red-600">削除</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
            {sections.length === 0 && <p className="text-sm text-slate-500">※ セクションがありません。「テキスト追加」か「タイムライン追加」から作成してください。</p>}
          </div>
        </section>

        {/* ギャラリー（ファイルアップロード） */}
        <section className="mb-12">
          <div className="mb-3 flex items-center gap-3">
            <h2 className="text-lg font-semibold">ギャラリー</h2>
            <button onClick={addGallery} className="ml-auto rounded-lg border px-3 py-1.5">画像枠を追加</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {gallery.map((g) => (
              <div key={g.id} className="rounded-xl border bg-white p-3">
                <div className="space-y-3">
                  {g.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.url} alt={g.caption ?? ""} className="w-full h-48 object-cover rounded-lg border" />
                  ) : (
                    <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-slate-500">
                      まだ画像がありません
                    </div>
                  )}

                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileInput(g.id, e)}
                      disabled={!!uploading[g.id]}
                    />
                    {uploading[g.id] ? "アップロード中…" : "画像ファイルを選択"}
                  </label>

                  <input
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder="キャプション（任意）"
                    value={g.caption ?? ""}
                    onChange={(e) => updateGallery(g.id, { caption: e.target.value })}
                  />

                  <div className="text-right">
                    <button onClick={() => removeGallery(g.id)} className="text-sm text-red-600">削除</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {gallery.length === 0 && <p className="text-sm text-slate-500 mt-2">※ 「画像枠を追加」→ファイルを選択してください。</p>}
        </section>

        {/* エラー時のみ下部の帯を表示 */}
        {status && !status.ok && (
          <div className="rounded-xl px-4 py-3 text-sm bg-rose-50 text-rose-800">{status.msg}</div>
        )}
      </div>

      {/* ====== 保存完了モーダル ====== */}
      <AnimatePresence>
        {saveModal && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* 背景 */}
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSaveModal(null)}
            />
            {/* 本体 */}
            <motion.div
              className="relative z-[71] w-[min(92vw,560px)] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
              initial={{ y: 24, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 24, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 h-10 w-10 rounded-full bg-emerald-100 grid place-items-center border border-emerald-200">
                  <span className="text-emerald-700 text-lg">✓</span>
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg md:text-xl font-bold text-slate-900">
                    保存が完了しました 🎉
                  </h3>
                  <p className="mt-1 text-slate-700">
                    お疲れさまでした！{saveModal.published ? "公開ページに反映されています。" : "内容は下書きとして保存されています（公開チェックを入れると一般公開されます）。"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    対象：{saveModal.fy} / 第{saveModal.round}回　—　{saveModal.title}
                  </p>
                  <div className="mt-3 text-xs text-slate-500 break-all">
                    URL：<a href={saveModal.url} target="_blank" className="underline">{typeof window !== "undefined" ? location.origin + saveModal.url : saveModal.url}</a>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                <button
                  onClick={() => setSaveModal(null)}
                  className="rounded-lg border px-4 py-2 text-slate-800 bg-white hover:bg-slate-50"
                >
                  編集を続ける
                </button>
                <button
                  onClick={copyLink}
                  className="rounded-lg border px-4 py-2 text-slate-800 bg-white hover:bg-slate-50"
                >
                  {copied ? "コピーしました" : "リンクをコピー"}
                </button>
                <a
                  href={saveModal.url}
                  target="_blank"
                  className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white shadow hover:bg-indigo-500"
                >
                  該当ページを見る
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

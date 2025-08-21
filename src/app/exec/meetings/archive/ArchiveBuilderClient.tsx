// app/exec/meetings/archive/ArchiveBuilderClient.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import TopMediaPicker from "./components/TopMediaPicker";
import PageGalleryEditor, { type GalleryLayout } from "./components/PageGalleryEditor";
import SectionsEditor from "./components/SectionsEditor";
import { useReportForm } from "./hooks/useReportForm";

function SectionCard({
  id,
  title,
  children,
  right,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-8">
      <header className="relative mb-3 flex items-center gap-3">
        <div className="h-7 w-1.5 rounded bg-indigo-600" />
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <div className="ml-auto">{right}</div>
      </header>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1 w-full rounded-t-2xl bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-sky-500" />
        <div className="p-4 md:p-6">{children}</div>
      </div>
    </section>
  );
}

export default function ArchiveBuilderClient() {
  const {
    form, change,
    fyOptsDesc,
    topMediaType, setTopMediaType, onYouTubeChange, onCoverFile,
    status,
    loading, loadingExisting, uploadingCover, uploadingMap,
    addPagePhoto, updatePagePhoto, rmPagePhoto, onPagePhotoFile,
    addGroup, updateGroup, rmGroup,
    addChildToGroup, rmChild, setChildText,
    addTimelineRow, setTimelineRow, rmTimelineRow,
    addChildImage, setChildImage, rmChildImage, onChildImageFile,
    /** 子ギャラリーのレイアウト保存用（useReportForm で実装済み想定） */
    setChildGalleryLayout,
    save, previewUrl, saveModal, setSaveModal, copyLink, copied,
  } = useReportForm();

  // ← フォームに保存されているページ全体ギャラリーのレイアウト
  const galleryLayout: GalleryLayout = form.pageGalleryLayout ?? "grid";

  // ← setPageGalleryLayout を使わず、フォームを直接更新（型エラー回避・機能維持）
  const handleSetPageGalleryLayout = (v: GalleryLayout) => change("pageGalleryLayout", v);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 max-w-[100vw] overflow-x-clip">
      <div className="mx-auto max-w-5xl px-4 md:px-8 py-8">
        {/* ヘッダー */}
        <header className="mb-6 flex flex-wrap items-end gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">定例会レポート編集（制作）</h1>
            <p className="text-slate-600 text-sm break-all">
              公開ページ：{" "}
              <a className="underline" href={previewUrl} target="_blank" rel="noreferrer">
                {previewUrl}
              </a>
            </p>
            {loadingExisting && <p className="text-xs text-slate-500 mt-1">既存データを読み込み中…</p>}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => change("isPublished", e.target.checked)}
              />
              公開
            </label>
            <motion.button
              whileHover={{ y: -1, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={save}
              disabled={loading || !form.title.trim()}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-white shadow disabled:opacity-50"
            >
              {loading ? "保存中…" : "保存"}
            </motion.button>
          </div>
        </header>

        {/* ステータス */}
        {status && (
          <div
            className={`mb-4 rounded-lg px-4 py-2 text-sm ${
              status.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}
          >
            {status.msg}
          </div>
        )}

        {/* 基本情報 */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium">タイトル</span>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={form.title}
              onChange={(e) => change("title", e.target.value)}
              placeholder="例: 第3回 定例会（○月）"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium">開催日</span>
            <input
              type="date"
              className="w-full rounded-lg border px-3 py-2"
              value={form.date}
              onChange={(e) => change("date", e.target.value)}
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium">年度</span>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={form.fiscalYear}
              onChange={(e) => change("fiscalYear", Number(e.target.value))}
            >
              {fyOptsDesc.map((fy) => (
                <option key={fy} value={fy}>
                  令和{Math.max(1, fy - 2018)}年度（{fy}）
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">4月起点。最新年度が上に表示されます。</p>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium">回</span>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={form.round}
              onChange={(e) => change("round", Number(e.target.value) as 1 | 2 | 3 | 4)}
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium">報告ページURL（任意・外部/内部）</span>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={form.reportUrl ?? ""}
              onChange={(e) => change("reportUrl", e.target.value)}
              placeholder="未入力時は /arc/conference/reports/[年度&回] が使われます"
            />
          </label>
        </section>

        {/* トップ（画像/YouTube） */}
        <SectionCard id="top" title="トップメディア">
          <TopMediaPicker
            topMediaType={topMediaType}
            setTopMediaType={setTopMediaType}
            coverUrl={form.coverUrl}
            onCoverFile={onCoverFile}
            uploadingCover={uploadingCover}
            youtubeId={form.youtubeId}
            onYouTubeChange={onYouTubeChange}
          />
        </SectionCard>

        {/* ページギャラリー */}
        <SectionCard
          id="gallery"
          title="ページギャラリー"
          right={
            <div className="text-sm text-slate-600">
              表示: {galleryLayout === "grid" ? "グリッド" : "スライドショー"}
            </div>
          }
        >
          <PageGalleryEditor
            items={form.pageGallery ?? []}
            add={addPagePhoto}
            update={updatePagePhoto}
            remove={rmPagePhoto}
            onFile={onPagePhotoFile}
            uploadingMap={uploadingMap}
            layout={galleryLayout}
            setLayout={handleSetPageGalleryLayout} // ← フォームへ保存
          />
        </SectionCard>

        {/* 本文セクション（ドラッグ入替対応） */}
        <SectionCard id="sections" title="本文セクション">
          <SectionsEditor
            sections={form.sections ?? []}
            addGroup={addGroup}
            updateGroup={updateGroup}
            rmGroup={rmGroup}
            addChildToGroup={addChildToGroup}
            rmChild={rmChild}
            setChildText={setChildText}
            addTimelineRow={addTimelineRow}
            setTimelineRow={setTimelineRow}
            rmTimelineRow={rmTimelineRow}
            addChildImage={addChildImage}
            setChildImage={setChildImage}
            rmChildImage={rmChildImage}
            onChildImageFile={onChildImageFile}
            uploadingMap={uploadingMap}
            /** 子ギャラリーのレイアウトも保存（useReportForm 実装が必要） */
            setChildGalleryLayout={setChildGalleryLayout}
          />
        </SectionCard>

        {/* フッター操作 */}
        <div className="mt-2">
          <motion.button
            whileHover={{ y: -1, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={save}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-white shadow"
          >
            保存
          </motion.button>
        </div>
      </div>

      {/* 保存完了モーダル（お疲れさまでした 画面） */}
      <AnimatePresence>
        {saveModal && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSaveModal(null)}
            />
            <motion.div
              className="relative z-[71] w-[min(92vw,560px)] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
              initial={{ y: 24, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 24, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              role="dialog"
              aria-modal="true"
            >
              <h3 className="text-lg md:text-xl font-bold text-slate-900">保存が完了しました 🎉</h3>
              <p className="mt-1 text-slate-700">
                {saveModal.isPublished
                  ? "公開ページに反映されています。"
                  : "下書きとして保存されています（公開にすると表示されます）。"}
              </p>
              <p className="mt-1 text-slate-700">お疲れさまでした！</p>

              <div className="mt-3 text-xs text-slate-500 break-all">
                URL：{" "}
                <a href={previewUrl} target="_blank" className="underline" rel="noreferrer">
                  {previewUrl}
                </a>
              </div>

              <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                <button onClick={() => setSaveModal(null)} className="rounded-lg border px-4 py-2 bg-white">
                  編集を続ける
                </button>
                <button onClick={copyLink} className="rounded-lg border px-4 py-2 bg-white">
                  {copied ? "コピーしました" : "リンクをコピー"}
                </button>
                <a
                  href={previewUrl}
                  target="_blank"
                  className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white shadow hover:bg-indigo-500"
                  rel="noreferrer"
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

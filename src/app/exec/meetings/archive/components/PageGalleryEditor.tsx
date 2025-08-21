"use client";
import React, { useEffect, useRef, useState } from "react";
import type { GalleryItem } from "../types";

export type GalleryLayout = "grid" | "slideshow";

/* スライドショー（編集プレビュー用） */
function GallerySlideshow({
  items,
  intervalMs = 4000,
}: {
  items: GalleryItem[];
  intervalMs?: number;
}) {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasAny = items.length > 0;
  const safeIdx = hasAny ? ((idx % items.length) + items.length) % items.length : 0;

  useEffect(() => {
    if (!hasAny) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setIdx((v) => v + 1), intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hasAny, intervalMs, items.length]);

  if (!hasAny) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed text-slate-500">
        画像がありません
      </div>
    );
  }

  const current = items[safeIdx];

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current.url || ""}
        alt={current.caption ?? ""}
        className="h-64 w-full select-none object-cover"
        draggable={false}
      />

      {(current.caption ?? "").trim() !== "" && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 text-sm text-white">
          {current.caption}
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 flex items-center justify-between p-2">
        <button
          type="button"
          className="pointer-events-auto rounded-full bg-white/80 p-2 shadow hover:bg-white"
          onClick={() => setIdx((v) => v - 1)}
          aria-label="前へ"
        >
          ‹
        </button>
        <button
          type="button"
          className="pointer-events-auto rounded-full bg-white/80 p-2 shadow hover:bg-white"
          onClick={() => setIdx((v) => v + 1)}
          aria-label="次へ"
        >
          ›
        </button>
      </div>

      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
        {items.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-4 rounded-full ${i === safeIdx ? "bg-white" : "bg-white/50"}`}
          />
        ))}
      </div>
    </div>
  );
}

type Props = {
  items: GalleryItem[];
  add: () => void;
  update: (id: string, patch: Partial<GalleryItem>) => void;
  remove: (id: string) => void;
  onFile: (id: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadingMap: Record<string, boolean>;

  layout: GalleryLayout; // "grid" | "slideshow"
  setLayout: (v: GalleryLayout) => void;
};

export default function PageGalleryEditor({
  items,
  add,
  update,
  remove,
  onFile,
  uploadingMap,
  layout,
  setLayout,
}: Props) {
  const urlCount = items.filter((g) => !!g.url).length;

  return (
    <section className="mb-8 border-t-4 border-slate-300 pt-6">
      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-lg font-semibold">ページギャラリー（任意）</h2>

        {/* レイアウト切替 */}
        <fieldset className="ml-auto flex items-center gap-3 text-sm">
          <legend className="sr-only">表示モード</legend>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="galleryLayout"
              value="grid"
              checked={layout === "grid"}
              onChange={() => setLayout("grid")}
            />
            グリッド
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="galleryLayout"
              value="slideshow"
              checked={layout === "slideshow"}
              onChange={() => setLayout("slideshow")}
            />
            スライドショー
          </label>
        </fieldset>

        <button onClick={add} className="rounded-lg border px-3 py-1.5">
          画像を追加
        </button>
      </div>

      {/* プレビュー（選択によって切替） */}
      {layout === "slideshow" ? (
        <div className="space-y-4">
          <GallerySlideshow items={items.filter((g) => !!g.url)} />

          {urlCount === 0 && (
            <div className="rounded-lg border border-dashed p-3 text-sm text-slate-600">
              まずは下のリストで「画像ファイルを選択」からアップロードしてください（追加ボタン→ファイル選択）。
            </div>
          )}

          {/* 編集UI（淡色カードで“枠×枠”を軽減） */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {items.map((g) => (
              <div key={g.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="space-y-3">
                  {g.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={g.url}
                      alt={g.caption ?? ""}
                      className="h-32 w-full rounded-lg border object-cover"
                    />
                  ) : (
                    <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-slate-500">
                      画像がありません
                    </div>
                  )}
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => onFile(g.id, e)}
                      disabled={!!uploadingMap[g.id]}
                    />
                    {uploadingMap[g.id] ? "アップロード中…" : "画像ファイルを選択"}
                  </label>
                  <input
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder="キャプション（任意）"
                    value={g.caption ?? ""}
                    onChange={(e) => update(g.id, { caption: e.target.value })}
                  />
                  <div className="text-right">
                    <button onClick={() => remove(g.id)} className="text-sm text-red-600">
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {items.map((g) => (
            <div key={g.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="space-y-3">
                {g.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={g.url}
                    alt={g.caption ?? ""}
                    className="h-40 w-full rounded-lg border object-cover"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-slate-500">
                    画像がありません
                  </div>
                )}
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => onFile(g.id, e)}
                    disabled={!!uploadingMap[g.id]}
                  />
                </label>
                {uploadingMap[g.id] ? (
                  <div className="text-xs text-slate-500">アップロード中…</div>
                ) : (
                  <div className="text-xs text-slate-500">画像ファイルを選択</div>
                )}
                <input
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="キャプション（任意）"
                  value={g.caption ?? ""}
                  onChange={(e) => update(g.id, { caption: e.target.value })}
                />
                <div className="text-right">
                  <button onClick={() => remove(g.id)} className="text-sm text-red-600">
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length === 0 && (
        <p className="mt-2 text-sm text-slate-500">※ 「画像を追加」からファイルを選択してください。</p>
      )}

      {/* 下部にも追加ボタン */}
      <div className="mt-4 flex justify-end">
        <button onClick={add} className="rounded-lg border px-3 py-1.5">
          画像を追加
        </button>
      </div>
    </section>
  );
}

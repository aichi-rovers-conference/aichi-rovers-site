"use client";
import React from "react";
import Image from "next/image";

type Props = {
  topMediaType: "image" | "youtube";
  setTopMediaType: (v: "image" | "youtube") => void;
  coverUrl?: string | null;
  onCoverFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadingCover: boolean;
  youtubeId?: string | null;
  onYouTubeChange: (v: string) => void;
};

export default function TopMediaPicker({
  topMediaType, setTopMediaType,
  coverUrl, onCoverFile, uploadingCover,
  youtubeId, onYouTubeChange,
}: Props) {
  return (
    <section className="mb-6">
      <label className="space-y-1 block">
        <span className="text-sm font-medium">トップ表示</span>
        <select
          className="w-full max-w-xs rounded-lg border px-3 py-2"
          value={topMediaType}
          onChange={(e) => setTopMediaType(e.target.value as "image" | "youtube")}
        >
          <option value="image">トップ画像</option>
          <option value="youtube">YouTube</option>
        </select>
      </label>

      {topMediaType === "image" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
          <div className="space-y-2 md:col-span-3">
            <span className="block text-sm font-medium">トップ画像</span>

            {coverUrl ? (
              // next/image を使い、実表示幅に合った sizes と高めの quality を指定
              <div className="relative w-full aspect-[16/9] overflow-hidden rounded-lg border">
                <Image
                  src={coverUrl}
                  alt=""
                  fill
                  // ページが max-w-5xl(~1024px) なので実表示は ~960px を想定
                  sizes="(min-width:1024px) 960px, 100vw"
                  quality={90}
                  priority
                  style={{ objectFit: "cover" }}
                  // ↓検証用: もしこれで劇的にシャープになるなら最適化の再圧縮が原因
                  // unoptimized
                />
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-slate-500">
                画像がありません
              </div>
            )}

            <label className="inline-flex items-center gap-2 text-sm">
              <input type="file" accept="image/*" onChange={onCoverFile} disabled={uploadingCover} />
              {uploadingCover ? "アップロード中…" : "画像ファイルを選択"}
            </label>
          </div>
        </div>
      )}

      {topMediaType === "youtube" && (
        <div className="mt-3 space-y-3">
          {youtubeId?.trim() && (
            <div className="w-full rounded-xl overflow-hidden border bg-black/5">
              <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${youtubeId}`}
                  title="YouTube preview"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <span className="block text-sm font-medium">YouTube（URL / ID）</span>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={youtubeId ?? ""}
              onChange={(e) => onYouTubeChange(e.target.value)}
              placeholder="https://youtu.be/xxxx または ID"
            />
            <p className="text-xs text-slate-500">入力すると上にプレビューが表示されます（IDに正規化して保存）。</p>
          </div>
        </div>
      )}
    </section>
  );
}

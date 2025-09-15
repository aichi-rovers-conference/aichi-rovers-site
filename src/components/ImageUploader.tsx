// src/components/ImageUploader.tsx
"use client";

import { useRef, useState, DragEvent } from "react";

/* eslint-disable @next/next/no-img-element */

type Props = {
  label?: string;
  value?: string | null;
  onUploaded: (url: string) => void;
  onClear?: () => void;
  maxSizeMB?: number; // 表示用。実際の制限は API 側で 10MB
};

export default function ImageUploader({
  label = "顔写真",
  value,
  onUploaded,
  onClear,
  maxSizeMB = 10,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const chooseFile = () => fileRef.current?.click();
  const openCamera = () => cameraRef.current?.click();

  const handleFiles = async (files: FileList | null) => {
    if (!files?.[0]) return;
    const file = files[0];
    setErr(null);

    // クライアント側の軽いバリデーション（本番は API 側で実施）
    if (file.size > maxSizeMB * 1024 * 1024) {
      setErr(`ファイルサイズは最大 ${maxSizeMB}MB までです。`);
      return;
    }

    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file, file.name || "upload");
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) throw new Error(j?.message || `Upload failed (${res.status})`);
      const url = j.url as string;
      onUploaded(url);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "アップロードに失敗しました。");
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    handleFiles(e.dataTransfer?.files || null);
  };
  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-4">
      <p className="mb-2 text-sm font-medium text-gray-700">{label}</p>

      {value ? (
        <div className="flex items-start gap-4">
          <img
            src={value}
            alt="preview"
            className="h-28 w-28 rounded-xl object-cover border border-gray-200"
          />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={chooseFile}
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
              disabled={busy}
            >
              画像を差し替える
            </button>
            <button
              type="button"
              onClick={openCamera}
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
              disabled={busy}
            >
              カメラで撮影（スマホ）
            </button>
            {onClear && (
              <button
                type="button"
                onClick={onClear}
                className="rounded-lg border px-3 py-1.5 text-sm text-red-600 hover:bg-gray-50"
                disabled={busy}
              >
                画像を削除
              </button>
            )}
            {busy && <span className="text-xs text-gray-500">アップロード中…</span>}
            {err && <span className="text-xs text-red-600">{err}</span>}
          </div>
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-xl border border-gray-200 bg-gray-50 py-8 text-center"
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          <div className="text-sm text-gray-600">
            ここに画像をドラッグ＆ドロップ
            <br />
            または
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={chooseFile}
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-white"
              disabled={busy}
            >
              写真を選ぶ
            </button>
            <button
              type="button"
              onClick={openCamera}
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-white"
              disabled={busy}
            >
              カメラで撮影（スマホ）
            </button>
          </div>
          {busy && <span className="text-xs text-gray-500">アップロード中…</span>}
          {err && <span className="text-xs text-red-600">{err}</span>}
          <span className="mt-2 text-[11px] text-gray-500">* {maxSizeMB}MBまで</span>
        </div>
      )}

      {/* hidden inputs */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

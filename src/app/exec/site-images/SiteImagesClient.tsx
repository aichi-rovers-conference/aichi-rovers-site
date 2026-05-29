"use client";

import { useState } from "react";
import Image from "next/image";
import ImageUploader from "@/src/components/ImageUploader";
import { SITE_IMAGE_SLOTS } from "@/lib/site-image-keys";
import { useSiteImages } from "@/src/hooks/useSiteImages";

export default function SiteImagesClient() {
  const { images, mutate } = useSiteImages();
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ key: string; text: string; ok: boolean } | null>(null);

  const save = async (key: string, url: string) => {
    setSaving(key);
    try {
      const r = await fetch("/api/site-images", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, url }),
      });
      if (!r.ok) throw new Error("保存失敗");
      await mutate();
      setMsg({ key, text: "保存しました", ok: true });
    } catch {
      setMsg({ key, text: "保存に失敗しました", ok: false });
    } finally {
      setSaving(null);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  const reset = async (key: string) => {
    if (!confirm("この写真をデフォルトに戻しますか？")) return;
    setSaving(key);
    try {
      const r = await fetch(`/api/site-images?key=${encodeURIComponent(key)}`, { method: "DELETE" });
      if (!r.ok) throw new Error("失敗");
      await mutate();
      setMsg({ key, text: "デフォルトに戻しました", ok: true });
    } catch {
      setMsg({ key, text: "失敗しました", ok: false });
    } finally {
      setSaving(null);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  return (
    <div className="mt-6 space-y-6">
      {SITE_IMAGE_SLOTS.map((slot) => {
        const currentUrl = images[slot.key];
        const displayUrl = currentUrl ?? slot.fallback;
        const isCustom = !!currentUrl;

        return (
          <div key={slot.key} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900">{slot.label}</span>
              {isCustom ? (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 font-medium">
                  カスタム設定中
                </span>
              ) : (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                  デフォルト
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-5 items-start">
              {/* 現在の写真プレビュー */}
              <div className="shrink-0">
                <p className="mb-1 text-xs text-gray-500">現在の写真</p>
                <Image
                  src={displayUrl}
                  alt={slot.label}
                  width={200}
                  height={140}
                  className="rounded-lg object-cover border border-gray-200"
                  unoptimized={displayUrl.startsWith("/uploads/")}
                />
              </div>

              {/* アップローダー */}
              <div className="flex-1 min-w-0">
                <p className="mb-1 text-xs text-gray-500">新しい写真をアップロード</p>
                <ImageUploader
                  label=""
                  value={null}
                  onUploaded={(url) => save(slot.key, url)}
                  onClear={undefined}
                />
                {saving === slot.key && (
                  <p className="mt-2 text-xs text-gray-500">保存中…</p>
                )}
                {msg?.key === slot.key && (
                  <p className={`mt-2 text-xs font-medium ${msg.ok ? "text-green-600" : "text-red-600"}`}>
                    {msg.text}
                  </p>
                )}
                {isCustom && (
                  <button
                    onClick={() => reset(slot.key)}
                    disabled={saving === slot.key}
                    className="mt-3 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    デフォルトに戻す
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function GalleryClient({
  images = [],
  autoplayMs = 5000, // 自動切替（ミリ秒）。0 or 負ならオート再生なし
  className = "",
}: {
  images: string[];
  autoplayMs?: number;
  className?: string;
}) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  if (!Array.isArray(images) || images.length === 0) return null;

  const go = (n: number) => setIdx((p) => (p + n + images.length) % images.length);
  const to = (n: number) => setIdx(((n % images.length) + images.length) % images.length);

  // オート再生
  useEffect(() => {
    if (autoplayMs > 0 && images.length > 1 && !paused) {
      const t = setInterval(() => go(1), autoplayMs);
      return () => clearInterval(t);
    }
  }, [autoplayMs, images.length, paused]);

  // キーボード操作
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") go(-1);
    if (e.key === "ArrowRight") go(1);
  };

  return (
    <div
      className={`relative aspect-[16/9] w-full rounded-xl overflow-hidden border bg-black/5 ${className}`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        const start = touchStartX.current;
        const end = e.changedTouches[0].clientX;
        if (start !== null) {
          const dx = end - start;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); // スワイプ
        }
        touchStartX.current = null;
      }}
      aria-roledescription="carousel"
      aria-label="写真ギャラリー"
    >
      {/* スライド */}
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={idx}
          className="absolute inset-0"
          initial={{ opacity: 0.0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0.0, scale: 0.995 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <Image
            src={images[idx]}
            alt={`ギャラリー画像 ${idx + 1} / ${images.length}`}
            fill
            sizes="100vw"
            className="object-cover"
            priority={idx === 0}
          />
        </motion.div>
      </AnimatePresence>

      {/* 左右矢印（浮き上がり・シャドウ） */}
      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="前の画像へ"
            onClick={() => go(-1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-2 md:p-3
                       bg-white/85 backdrop-blur border border-gray-200 shadow-xl
                       hover:bg-white active:scale-95 transition"
          >
            <ChevronLeft className="h-5 w-5 md:h-6 md:w-6 text-gray-800" />
          </button>
          <button
            type="button"
            aria-label="次の画像へ"
            onClick={() => go(1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 md:p-3
                       bg-white/85 backdrop-blur border border-gray-200 shadow-xl
                       hover:bg-white active:scale-95 transition"
          >
            <ChevronRight className="h-5 w-5 md:h-6 md:w-6 text-gray-800" />
          </button>
        </>
      )}

      {/* ドットインジケータ */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              aria-label={`画像 ${i + 1} に移動`}
              onClick={() => to(i)}
              className={`h-2.5 w-2.5 rounded-full border transition
                ${i === idx ? "bg-red-600 border-red-600 scale-110" : "bg-white/80 border-gray-300 hover:scale-110"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

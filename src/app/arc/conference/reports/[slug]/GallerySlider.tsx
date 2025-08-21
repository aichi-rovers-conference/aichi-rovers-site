// app/arc/conference/reports/[slug]/GallerySlider.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type GalleryItem = { id: string; url: string; caption?: string };

export default function GallerySlider({
  items,
  intervalMs = 5000,
}: {
  items: GalleryItem[];
  intervalMs?: number;
}) {
  const slides = useMemo(() => items.filter((i) => i?.url), [items]);
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<number | null>(null);

  // ====== hover 管理（デスクトップのみ） ======
  const [isHovering, setIsHovering] = useState(false);

  // タッチ端末判定：hover なし かつ maxTouchPoints > 0 のとき
  const [isTouchLike, setIsTouchLike] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasNoHover = window.matchMedia?.("(hover: none)")?.matches ?? false;
      const touchPoints = navigator.maxTouchPoints ?? 0;
      setIsTouchLike(Boolean(hasNoHover && touchPoints > 0));
    }
  }, []);

  const go = (n: number) => {
    if (slides.length === 0) return;
    setIdx((p) => (n + slides.length) % slides.length);
  };
  const next = () => go(idx + 1);
  const prev = () => go(idx - 1);

  // autoplay
  useEffect(() => {
    if (slides.length <= 1) return;
    timerRef.current && window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setIdx((p) => (p + 1) % slides.length);
    }, intervalMs);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [slides.length, intervalMs]);

  // swipe (簡易)
  const startX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
    startX.current = null;
  };

  if (slides.length === 0) return null;

  // デスクトップ：isHovering のときのみ表示 / タッチ：常時表示
  const showArrows = isTouchLike || isHovering;
  const arrowVisibility = showArrows ? "opacity-100" : "opacity-0 pointer-events-none";

  return (
    <div
      className="relative w-full rounded-xl border overflow-hidden bg-white"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* スライド領域 */}
      <div className="relative w-full overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${idx * 100}%)` }}
        >
          {slides.map((s) => (
            <figure key={s.id} className="shrink-0 w-full relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.url}
                alt={s.caption ?? ""}
                className="w-full h-[48vw] max-h-[520px] object-cover select-none"
                draggable={false}
              />
              {s.caption && (
                <figcaption className="absolute bottom-0 left-0 right-0 bg-black/45 text-white text-sm px-3 py-2">
                  {s.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      </div>

      {/* 左右ナビ（デスクトップは hover 時のみ表示） */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="前へ"
            className={`absolute left-3 md:left-4 top-1/2 -translate-y-1/2 
                        transition-opacity duration-200 ${arrowVisibility}
                        rounded-full bg-black/55 text-white 
                        p-3 md:p-4 text-3xl md:text-4xl shadow
                        hover:bg-black/70 active:scale-95`}
          >
            ‹
          </button>
          <button
            onClick={next}
            aria-label="次へ"
            className={`absolute right-3 md:right-4 top-1/2 -translate-y-1/2 
                        transition-opacity duration-200 ${arrowVisibility}
                        rounded-full bg-black/55 text-white 
                        p-3 md:p-4 text-3xl md:text-4xl shadow
                        hover:bg-black/70 active:scale-95`}
          >
            ›
          </button>
        </>
      )}

      {/* ドットナビ */}
      {slides.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              aria-label={`スライド ${i + 1}`}
              className={`h-2.5 w-2.5 rounded-full transition
                         ${i === idx ? "bg-red-600 scale-110" : "bg-white/80 hover:bg-white"}`}
              onClick={() => go(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

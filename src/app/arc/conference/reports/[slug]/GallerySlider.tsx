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
    if (timerRef.current) window.clearInterval(timerRef.current);
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

  // デスクトップ：isHovering のときのみ表示 / タッチ：常時表示（仕様は現状維持）
  const showArrows = isTouchLike || isHovering;
  const arrowVisibility = showArrows ? "opacity-100" : "opacity-0 pointer-events-none";

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* 外枠：薄い枠＋柔らかい影 */}
      <div className="rounded-2xl border border-neutral-200/70 bg-white shadow-lg overflow-hidden">
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
                  loading="lazy"
                  decoding="async"
                  className="w-full h-[48vw] max-h-[520px] object-cover select-none bg-neutral-100"
                  draggable={false}
                />
                {/* 下部キャプション：最小限の読みやすさ確保 */}
                {s.caption && (
                  <figcaption
                    className="
                      absolute inset-x-0 bottom-0 px-3 py-2
                      text-sm text-white
                      bg-gradient-to-t from-black/65 via-black/25 to-transparent
                      backdrop-blur-[1px]
                    "
                  >
                    {s.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>

          {/* 左右ナビ（丸ボタン・中央に＜ ＞） */}
          {slides.length > 1 && (
            <>
              <button
                onClick={prev}
                aria-label="前へ"
                className={`
                  ${arrowVisibility}
                  absolute left-3 md:left-4 top-1/2 -translate-y-1/2
                  h-11 w-11 md:h-12 md:w-12
                  rounded-full
                  bg-white/90 text-neutral-900
                  shadow-md ring-1 ring-black/10 backdrop-blur
                  flex items-center justify-center
                  transition duration-200
                  hover:bg-white active:scale-95
                `}
              >
                <span className="text-2xl md:text-3xl leading-none">＜</span>
              </button>

              <button
                onClick={next}
                aria-label="次へ"
                className={`
                  ${arrowVisibility}
                  absolute right-3 md:right-4 top-1/2 -translate-y-1/2
                  h-11 w-11 md:h-12 md:w-12
                  rounded-full
                  bg-white/90 text-neutral-900
                  shadow-md ring-1 ring-black/10 backdrop-blur
                  flex items-center justify-center
                  transition duration-200
                  hover:bg-white active:scale-95
                `}
              >
                <span className="text-2xl md:text-3xl leading-none">＞</span>
              </button>
            </>
          )}

          {/* ドットナビ：ニュートラル */}
          {slides.length > 1 && (
            <div className="absolute bottom-3 md:bottom-4 left-0 right-0 flex items-center justify-center gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  aria-label={`スライド ${i + 1}`}
                  onClick={() => go(i)}
                  className={`
                    h-2.5 w-2.5 rounded-full transition
                    ${i === idx
                      ? "bg-neutral-900"
                      : "bg-white/90 ring-1 ring-neutral-300 hover:bg-white"}
                    shadow-sm
                  `}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

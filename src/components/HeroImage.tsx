// src/components/HeroImage.tsx
"use client";

import React, { useRef } from "react";
import Image, { type StaticImageData } from "next/image";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

type HeroImageProps = {
  /** 画像。静的インポート推奨（blur自動付与）。文字列でも可。 */
  src: StaticImageData | string;
  alt: string;

  /** 高さクラス（Tailwind）。例: "h-[56vh] sm:h-[60vh]" */
  heightClass?: string;

  /** 画質（0-100） */
  quality?: number;

  /** 主要画像なら true（LCP対策） */
  priority?: boolean;

  /** fetchPriority: 'high' を付けるとさらにLCP改善 */
  fetchPriority?: "high" | "low" | "auto";

  /** ぼかしの有無。静的インポート時は自動でblurDataURL付与 */
  placeholder?: "blur" | "empty";

  /** 文字列パス時にぼかしを使う場合の明示用（未指定でも自動シマー付与） */
  blurDataURL?: string;

  /** オーバーレイ色（例: "bg-black/60" でも可）。デフォルトは黒+アニメで可変 */
  overlayClassName?: string;

  /** スクロール時のパララックス量(px)。0で無効。ユーザーの簡易設定でreduce時は自動0 */
  parallaxAmount?: number;

  /** オーバーレイの不透明度（スクロールに応じて [min,max] ） */
  overlayOpacityRange?: [number, number];

  /** 画像上に重ねるコンテンツ（タイトル・ボタン等） */
  children?: React.ReactNode;

  /** 外側divに追加するクラス */
  className?: string;
};

function shimmer(w: number, h: number) {
  return `
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#eee" offset="20%"/>
      <stop stop-color="#ddd" offset="50%"/>
      <stop stop-color="#eee" offset="70%"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#eee"/>
  <rect id="r" width="${w}" height="${h}" fill="url(#g)"/>
  <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"/>
</svg>`;
}
const toBase64 = (s: string) =>
  typeof window === "undefined" ? Buffer.from(s).toString("base64") : window.btoa(s);

export default function HeroImage({
  src,
  alt,
  heightClass = "h-[56vh] sm:h-[60vh]",
  quality = 62,
  priority = true,
  fetchPriority = "high",
  placeholder = "blur",
  blurDataURL,
  overlayClassName,
  parallaxAmount = 180,
  overlayOpacityRange = [0.45, 0.6],
  children,
  className = "",
}: HeroImageProps) {
  const prefersReduce = useReducedMotion();
  const enableParallax = !prefersReduce && parallaxAmount > 0;

  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const yImg = useTransform(scrollYProgress, [0, 1], [0, enableParallax ? parallaxAmount : 0]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 1], overlayOpacityRange);

  // 文字列srcで blur を使いたい場合は自動でシマーSVGを付与
  const needAutoBlur = typeof src === "string" && placeholder === "blur" && !blurDataURL;
  const actualBlurDataURL = needAutoBlur
    ? `data:image/svg+xml;base64,${toBase64(shimmer(1200, 675))}`
    : blurDataURL;

  return (
    <div ref={ref} className={`relative w-full ${heightClass} overflow-hidden select-none ${className}`}>
      <motion.div style={{ y: yImg }} className="absolute inset-0 will-change-transform">
        <Image
          src={src as any} // StaticImageData | string OK
          alt={alt}
          fill
          priority={priority}
          fetchPriority={fetchPriority}
          placeholder={placeholder}
          blurDataURL={actualBlurDataURL}
          quality={quality}
          sizes="100vw"
          className="object-cover z-0 select-none"
          draggable={false}
        />
      </motion.div>

      {/* オーバーレイ（デフォルトは黒、スクロールに応じて濃く） */}
      <motion.div
        style={{ opacity: overlayOpacity }}
        className={`absolute inset-0 z-10 ${overlayClassName ?? "bg-black"}`}
        aria-hidden
      />

      {/* 中央の子要素（タイトルなど） */}
      {children && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center">
          {children}
        </div>
      )}
    </div>
  );
}

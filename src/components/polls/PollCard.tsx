"use client";

import Link from "next/link";
import Image from "next/image";
import { Pencil, MessageSquare, BarChart3, X } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import React, { useRef, memo } from "react";

export type PollCardData = {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  votes?: { id: string }[];
};

export type PollCardProps = {
  poll: PollCardData;
  isEditing?: boolean;
  onDelete?: (id: string) => void;
  /** カード下部のフッターを差し替え（未指定ならデフォの3ボタン） */
  footer?: React.ReactNode;
};

function IconButton({
  href,
  title,
  children,
}: {
  href: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} title={title} aria-label={title} className="inline-block">
      <motion.span
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border bg-white"
        whileHover={{ y: -2, scale: 1.06, boxShadow: "0 6px 16px rgba(0,0,0,0.12)" }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: "spring", stiffness: 420, damping: 22, mass: 0.6 }}
      >
        {children}
      </motion.span>
    </Link>
  );
}

function PollCardImpl({ poll, isEditing = false, onDelete, footer }: PollCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 1], [0.28, 0.36]);

  const voteCount = poll.votes?.length ?? 0;

  return (
    <motion.article
      ref={ref}
      className="group relative flex w-full flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ type: "spring", stiffness: 300, damping: 26, mass: 0.6 }}
    >
      {/* Top image */}
      <div className="relative h-48">
        {/* 削除（編集モードのみ） */}
        {isEditing && (
          <motion.button
            type="button"
            aria-label="アンケートを削除"
            onClick={() => onDelete?.(poll.id)}
            className="absolute right-2 top-2 z-30 inline-flex h-9 w-9 items-center justify-center rounded-full bg-rose-600 text-white shadow-md ring-1 ring-rose-500"
            whileHover={{ scale: 1.06, rotate: 3 }}
            whileTap={{ scale: 0.92 }}
          >
            <X className="h-5 w-5" />
          </motion.button>
        )}

        <motion.div className="absolute inset-0 z-0" style={{ y }}>
          {poll.imageUrl ? (
            <Image
              src={poll.imageUrl}
              alt={poll.title || "アンケート画像"}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
              priority={false}
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-gray-100 to-gray-200" />
          )}
        </motion.div>

        {/* クリック透過の黒オーバーレイ */}
        <motion.div className="pointer-events-none absolute inset-0 z-10 bg-black" style={{ opacity: overlayOpacity }} />

        {/* タイトル/説明 */}
        <div className="relative z-20 flex h-full flex-col items-center justify-center px-3 text-center text-white">
          <motion.h2
            className="line-clamp-1 text-lg font-semibold tracking-tight md:text-xl"
            initial={{ y: 8, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.7 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
          >
            {poll.title}
          </motion.h2>
          {poll.description && (
            <motion.p
              className="mt-1 line-clamp-2 text-xs opacity-90"
              initial={{ y: 8, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, amount: 0.7 }}
              transition={{ type: "spring", stiffness: 320, damping: 22, delay: 0.02 }}
            >
              {poll.description}
            </motion.p>
          )}
        </div>
      </div>

      {/* Vote count */}
      <div className="px-4 pt-3">
        <p className="text-xs text-gray-500">合計 {voteCount} 票</p>
      </div>

      {/* Footer（差し替え可能） */}
      <div className="mt-auto px-4 pb-4 pt-3">
        {footer ?? (
          <div className={`flex items-center justify-center gap-3 ${isEditing ? "pointer-events-none opacity-40" : ""}`}>
            {/* ★ 編集は exec 側へ */}
            <IconButton href={`/exec/polls/${poll.id}/edit`} title="編集">
              <Pencil className="h-5 w-5" />
            </IconButton>
            <IconButton href={`/polls/${poll.id}`} title="回答">
              <MessageSquare className="h-5 w-5" />
            </IconButton>
            <IconButton href={`/exec/polls/${poll.id}/results`} title="結果">
              <BarChart3 className="h-5 w-5" />
            </IconButton>
          </div>
        )}
      </div>
    </motion.article>
  );
}

/** Props を保持したまま memo 化（TS が props を見失わないよう明示） */
const PollCard = memo(PollCardImpl) as React.NamedExoticComponent<PollCardProps>;
export default PollCard;

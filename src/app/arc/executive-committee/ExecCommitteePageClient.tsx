// app/arc/executive-committee/page.tsx など、このページファイルをまるっと置き換え
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { FaFacebook, FaInstagram, FaXTwitter, FaLine } from "react-icons/fa6";
import ArcHeader1 from "@/components/ArcHeader1";

/* ===== 初心者でも編集しやすい外部JSON =====
   /public/excom/members.json に配列で置くだけ
   例:
   [
     {"name":"山田 太郎","unit":"千種第66団","age":22,"role":"議長","photo":"/images/excom/yamada.jpg"},
     {"name":"佐藤 花子","unit":"豊田第12団","age":21,"role":"副議長"}
   ]
*/
const DATA_URL = "/excom/members.json";

type Member = {
  name: string;
  unit: string;   // 所属団
  age?: number;
  role?: string;  // 役職
  photo?: string; // 省略可（/public 配下推奨）
};

/* ===== 見出し（赤棒付き） ===== */
function SectionHeading({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-6xl">
      <h2
        className="font-extrabold tracking-tight text-gray-800 leading-tight"
        style={{ fontSize: "clamp(20px, 4.6vw, 30px)" }}
      >
        {title}
      </h2>
      <div className="mt-2 h-[2px] w-16 rounded-full bg-red-600" />
    </div>
  );
}

/* ===== カード：運営委員 ===== */
function MemberCard({ m }: { m: Member }) {
  const initials =
    m.name?.split(/\s+/).map((s) => s[0]).join("").slice(0, 2) || "ARC";

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
    >
      <div className="flex items-center gap-4 p-4">
        {/* 画像 or イニシャル */}
        {m.photo ? (
          <Image
            src={m.photo}
            alt={`${m.name} の写真`}
            width={72}
            height={72}
            sizes="72px"
            className="h-[72px] w-[72px] rounded-full border object-cover"
          />
        ) : (
          <div className="grid h-[72px] w-[72px] place-items-center rounded-full border bg-gray-50 font-bold text-gray-700">
            <span style={{ fontSize: "clamp(14px, 3.8vw, 18px)" }}>{initials}</span>
          </div>
        )}

        <div className="min-w-0">
          <div
            className="truncate font-bold text-gray-900"
            style={{ fontSize: "clamp(16px, 3.6vw, 20px)" }}
          >
            {m.name}
          </div>
          <div
            className="mt-0.5 truncate text-gray-700"
            style={{ fontSize: "clamp(12px, 3.2vw, 14px)" }}
          >
            {m.unit}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-gray-600" style={{ fontSize: "clamp(12px, 3.2vw, 14px)" }}>
            {typeof m.age === "number" && <span>年齢：{m.age}</span>}
            {m.role && <span>役職：{m.role}</span>}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ===== Coming Soon（ウェーブアニメ） ===== */
function ComingSoonWave({ text = "▼Coming soon　ARC年次総会にて承認されます" }: { text?: string }) {
  const chars = Array.from(text);
  return (
    <div className="py-8 text-center sm:py-10">
      <div className="inline-flex flex-wrap items-end justify-center gap-[2px]">
        {chars.map((ch, i) => (
          <motion.span
            key={`${ch}-${i}`}
            className="inline-block font-extrabold text-gray-800"
            style={{ fontSize: "clamp(16px, 4vw, 22px)" }}
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.06 }}
          >
            {ch === " " ? "\u00A0" : ch}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

/* ===== ページ本体 ===== */
export default function ExecCommitteePage() {
  // ヒーロー（モバイルで動き控えめ）
  const heroRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const yImg = useTransform(scrollYProgress, [0, 1], [0, 240]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 1], [0.45, 0.6]);

  // ヘッダーナビ
  const navItems = [
    { name: "ホーム", path: "/" },
    { name: "ARCとは", path: "/arc" },
    { name: "事業カレンダー", path: "/arc/calendar" },
    { name: "ARC定例会", path: "/arc/conference" },
    { name: "ARC運営委員会", path: "/arc/executive-committee" },
    { name: "ARCアンケート", path: "/polls" },
    { name: "ミニゲーム", path: "/games" },
  ];

  // データ読込
  const [members, setMembers] = useState<Member[] | null>(null);
  useEffect(() => {
    fetch(DATA_URL, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((arr: Member[]) => {
        if (!Array.isArray(arr)) return setMembers([]);
        // 名前と所属団は必須
        const safe = arr.filter((m) => m?.name && m?.unit);
        setMembers(safe);
      })
      .catch(() => setMembers([]));
  }, []);
  const list = useMemo(() => members ?? [], [members]);

  return (
    <div className="w-full bg-white">
      {/* ヘッダー */}
      <ArcHeader1 navItems={navItems} />

      {/* ヒーロー */}
      <div ref={heroRef} className="relative h-[40vh] w-full select-none overflow-hidden sm:h-[46vh]">
        <motion.div style={{ y: yImg }} className="absolute inset-0 will-change-transform">
          <Image
            src="/images/R6-3.JPG"
            alt="Aichi Rovers Conference"
            fill
            priority
            sizes="100vw"
            className="z-0 object-cover select-none"
            draggable={false}
          />
        </motion.div>
        <motion.div style={{ opacity: overlayOpacity }} className="absolute inset-0 z-10 bg-black" />
        <motion.div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        >
          <h1
            className="font-extrabold text-white drop-shadow-lg leading-tight"
            style={{ fontSize: "clamp(28px, 7vw, 48px)" }}
          >
            ARC運営委員会
          </h1>
          <p
            className="mt-2 font-medium text-white/90"
            style={{ fontSize: "clamp(14px, 4.6vw, 24px)" }}
          >
            Executive Committee
          </p>
        </motion.div>
      </div>

      {/* 本文：紹介テキスト（モバイル最適化） */}
      <section className="w-full bg-white py-10 sm:py-12 md:py-14 px-4 sm:px-6 md:px-10 lg:px-16">
        <div
          className="mx-auto max-w-6xl space-y-5 text-gray-800"
          style={{ fontSize: "clamp(14px, 3.6vw, 18px)", lineHeight: "1.8" }}
        >
          <p>
            愛知ローバース会議では、年次総会で任命された「運営委員」が中心となり、組織の持続的な運営を目指しています。
          </p>
          <p>
            議長と副議長は総会の決議にて選任、運営委員は議長の推薦した候補者を全体会にて承認されることで任命されます。
          </p>
          <p>
            運営委員は月に一度の運営委員会に出席し、愛知のローバースカウトがより良い活動に取り組めるよう、定例会の運営や情報共有に日々励んでいます。
          </p>
        </div>
      </section>

      {/* 運営委員の紹介（レスポンシブカード） */}
      <section className="w-full bg-white pb-10 sm:pb-12 md:pb-14 px-4 sm:px-6 md:px-10 lg:px-16">
        <SectionHeading title="運営委員の紹介" />
        <div className="mx-auto mt-6 max-w-6xl">
          {list.length === 0 ? (
            <ComingSoonWave />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
              {list.map((m, i) => (
                <MemberCard key={`${m.name}-${i}`} m={m} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 仕切り線 */}
      <div className="mx-auto mb-10 mt-6 max-w-6xl px-4 sm:px-6 md:px-10 lg:px-16">
        <div className="border-t border-gray-300" />
      </div>

      {/* SNS（モバイルで押しやすく） */}
      <section className="bg-gray-100 py-6">
        <div className="mx-auto flex max-w-6xl justify-center gap-6 sm:gap-8">
          <motion.a
            href="https://www.facebook.com/aichirovers/?locale=ja_JP"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ y: -3, scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className="text-blue-500 hover:text-blue-400"
            aria-label="Facebook"
          >
            <FaFacebook size={26} className="sm:size-[28px]" />
          </motion.a>
          <span className="cursor-not-allowed text-pink-500 opacity-40" aria-disabled="true" aria-label="Instagram（未開設）">
            <FaInstagram size={28} className="sm:size-[32px]" />
          </span>
          <span className="cursor-not-allowed text-black opacity-40" aria-disabled="true" aria-label="X（未開設）">
            <FaXTwitter size={28} className="sm:size-[32px]" />
          </span>
          <motion.a
            href="https://lin.ee/BPXqTTv"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ y: -3, scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className="text-green-600 hover:text-green-500"
            aria-label="LINE"
          >
            <FaLine size={28} className="sm:size-[32px]" />
          </motion.a>
        </div>
      </section>

      {/* フッター */}
      <footer className="mt-10 bg-gray-900 py-8 text-white">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6 md:px-10 lg:px-16">
          <p className="mb-2 font-semibold" style={{ fontSize: "clamp(14px, 3.6vw, 18px)" }}>
            お問い合わせ
          </p>
          <a
            href="mailto:aichi.rovers.conference@gmail.com"
            className="text-red-400 transition-colors hover:text-red-300"
            style={{ fontSize: "clamp(13px, 3.4vw, 16px)" }}
          >
            aichi.rovers.conference@gmail.com
          </a>
          <p className="mt-4 text-gray-400" style={{ fontSize: "clamp(11px, 3vw, 14px)" }}>
            &copy; {new Date().getFullYear()} Aichi Rovers Conference. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

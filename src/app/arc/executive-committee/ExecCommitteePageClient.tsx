"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Menu, X } from "lucide-react";
import { FaFacebook, FaInstagram, FaXTwitter, FaLine } from "react-icons/fa6";

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
  photo?: string; // 省略可
};

/* ====== 見出し下の赤棒 ====== */
function SectionHeading({ title }: { title: string }) {
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-0">
      <h2 className="text-gray-800 text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">{title}</h2>
      <div className="mt-2 h-[2px] w-16 bg-red-600 rounded-full" />
    </div>
  );
}

/* ====== カード：運営委員 ====== */
function MemberCard({ m }: { m: Member }) {
  const initials =
    m.name
      ?.split(/\s+/)
      .map((s) => s[0])
      .join("")
      .slice(0, 2) || "ARC";

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
    >
      <div className="flex items-center gap-4 p-4">
        {/* 画像 or イニシャル */}
        {m.photo ? (
          <Image
            src={m.photo}
            alt={`${m.name} の写真`}
            width={72}
            height={72}
            className="h-16 w-16 rounded-full object-cover border"
            loading="lazy"
            sizes="64px"
          />
        ) : (
          <div className="h-16 w-16 rounded-full border bg-gray-50 grid place-items-center text-gray-700 font-bold text-lg">
            {initials}
          </div>
        )}

        <div className="min-w-0">
          <div className="text-base sm:text-lg font-bold text-gray-900">{m.name}</div>
          <div className="text-sm text-gray-700 mt-0.5">{m.unit}</div>
          <div className="text-xs sm:text-sm text-gray-600 mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {typeof m.age === "number" && <span>年齢：{m.age}</span>}
            {m.role && <span>役職：{m.role}</span>}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ====== Coming Soon（ウェーブ） ====== */
function ComingSoonWave({
  text = "▼Coming soon　ARC年次総会にて承認されます",
}: {
  text?: string;
}) {
  const chars = Array.from(text);
  return (
    <div className="text-center py-8">
      <div className="inline-flex flex-wrap items-end justify-center gap-[2px]">
        {chars.map((ch, i) => (
          <motion.span
            key={i}
            className="text-lg sm:text-xl md:text-2xl font-extrabold text-gray-800 inline-block"
            animate={{ y: [0, -6, 0] }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.06,
            }}
          >
            {ch === " " ? "\u00A0" : ch}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

export default function ExecCommitteePage() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // ナビ
  const navItems = [
    { name: "ホーム", path: "/" },
    { name: "ARCとは", path: "/arc" },
    { name: "事業カレンダー", path: "/arc/calendar" },
    { name: "ARC定例会", path: "/arc/conference" },
    { name: "ARC運営委員会", path: "/arc/executive-committee" },
    { name: "ARCアンケート", path: "/polls" },
    { name: "ミニゲーム", path: "/games"},
  ];

  // ヒーロー（他ページと同じ動き）
  const heroRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const yImg = useTransform(scrollYProgress, [0, 1], [0, 280]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 1], [0.45, 0.6]);

  // データ読込
  const [members, setMembers] = useState<Member[] | null>(null);
  useEffect(() => {
    fetch(DATA_URL, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((arr: Member[]) => {
        if (!Array.isArray(arr)) return setMembers([]);
        const safe = arr.filter((m) => m?.name && m?.unit); // 名前と所属団は必須
        setMembers(safe);
      })
      .catch(() => setMembers([]));
  }, []);
  const list = useMemo(() => members ?? [], [members]);

  return (
    <div className="w-full bg-white">
      {/* ヘッダー（スマホ最適化：sticky + safe-area + absolute drawer。閉時は余白ゼロ） */}
      <header className="select-none sticky top-0 z-50 w-full bg-white shadow relative">
        <div className="flex items-center justify-between px-4 py-2 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center">
            <motion.button
              onClick={() => setIsOpen((v) => !v)}
              className="mr-2 md:hidden inline-flex h-11 w-11 items-center justify-center rounded-lg"
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              aria-label={isOpen ? "メニューを閉じる" : "メニューを開く"}
              aria-expanded={isOpen}
              aria-controls="mobile-drawer"
            >
              <AnimatePresence mode="wait" initial={false}>
                {isOpen ? (
                  <motion.span
                    key="x"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    className="block"
                  >
                    <X size={24} className="text-black" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    className="block"
                  >
                    <Menu size={24} className="text-black" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            <Image
              src="/images/ARClogo.png"
              alt="ARC Logo"
              width={34}
              height={34}
              className="object-contain select-none"
              draggable={false}
              priority={false}
            />
            <span className="ml-2 text-[15px] sm:text-base font-bold text-gray-800 select-none">
              愛知ローバース会議
            </span>
          </div>

          {/* 右上ナビ（PC） */}
          <nav className="hidden md:flex items-center space-x-4 lg:space-x-6 text-gray-600">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`px-3 py-2 rounded-lg transition text-sm lg:text-base ${
                    isActive ? "text-black font-bold" : "text-gray-500 hover:text-black"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* スマホドロワー（absolute + max-height） */}
        <div
          id="mobile-drawer"
          className={[
            "md:hidden absolute left-0 right-0 top-full bg-white shadow border-t",
            "overflow-hidden transition-[max-height,opacity,transform] duration-300 ease-out origin-top",
            isOpen ? "max-h-[70vh] opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-1 pointer-events-none",
          ].join(" ")}
          aria-hidden={!isOpen}
          role="navigation"
        >
          <nav className="flex flex-col p-2 pb-[env(safe-area-inset-bottom)]">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`mx-2 my-1 rounded-lg px-4 py-3 text-base font-medium active:scale-[0.99] ${
                    isActive ? "text-black font-bold bg-gray-100" : "text-gray-700 hover:bg-gray-50"
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* ヒーロー（モバイルは控えめな高さ） */}
      <div ref={heroRef} className="select-none relative w-full h-[36vh] md:h-[48vh] overflow-hidden">
        <motion.div style={{ y: yImg }} className="absolute inset-0 will-change-transform">
          <Image
            src="/images/R6-3.JPG"
            alt="Aichi Rovers Conference"
            fill
            className="object-cover z-0 select-none"
            draggable={false}
            priority
            sizes="100vw"
          />
        </motion.div>
        <motion.div style={{ opacity: overlayOpacity }} className="absolute inset-0 bg-black/70 z-10" />
        <motion.div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className="text-white text-3xl sm:text-4xl md:text-6xl font-extrabold drop-shadow-lg">
            ARC運営委員会
          </h1>
          <p className="text-white/90 font-medium text-sm sm:text-base md:text-xl mt-2">
            Executive Committee
          </p>
        </motion.div>
      </div>

      {/* 本文：紹介テキスト */}
      <section className="w-full bg-white py-8 md:py-10 px-4 sm:px-6 md:px-16">
        <div className="max-w-6xl mx-auto space-y-5 text-[15px] sm:text-base leading-7 sm:leading-8 text-gray-800">
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

      {/* 運営委員の紹介 */}
      <section className="w-full bg-white pb-9 px-4 sm:px-6 md:px-16">
        <SectionHeading title="運営委員の紹介" />
        <div className="max-w-6xl mx-auto mt-5">
          {list.length === 0 ? (
            <ComingSoonWave />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {list.map((m, i) => (
                <MemberCard key={`${m.name}-${i}`} m={m} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 仕切り線 */}
      <div className="max-w-6xl mx-auto mt-4 mb-9 px-4 sm:px-6 md:px-16">
        <div className="border-t border-gray-300" />
      </div>

      {/* SNS（踏襲・アクセシブル） */}
      <section className="bg-gray-100 py-6">
        <div className="max-w-6xl mx-auto flex justify-center gap-7">
          <motion.a
            href="https://www.facebook.com/aichirovers/?locale=ja_JP"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ y: -2, scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className="text-blue-500 hover:text-blue-400 transition-colors duration-200"
            aria-label="Facebook"
          >
            <FaFacebook size={26} />
          </motion.a>
          <span className="text-pink-500 opacity-40 cursor-not-allowed" aria-disabled="true" aria-label="Instagram（未開設）">
            <FaInstagram size={28} />
          </span>
          <span className="text-black opacity-40 cursor-not-allowed" aria-disabled="true" aria-label="X（未開設）">
            <FaXTwitter size={28} />
          </span>
          <motion.a
            href="https://lin.ee/BPXqTTv"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ y: -2, scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className="text-green-600 hover:text-green-500 transition-colors duration-200"
            aria-label="公式LINE"
          >
            <FaLine size={28} />
          </motion.a>
        </div>
      </section>

      {/* フッター */}
      <footer className="bg-gray-900 text-white py-8 mt-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-16 text-center">
          <p className="text-base sm:text-lg font-semibold mb-2">お問い合わせ</p>
          <a
            href="mailto:aichi.rovers.conference@gmail.com"
            className="text-red-400 hover:text-red-300 transition-colors duration-200 break-all"
          >
            aichi.rovers.conference@gmail.com
          </a>
          <p className="mt-4 text-xs sm:text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Aichi Rovers Conference. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

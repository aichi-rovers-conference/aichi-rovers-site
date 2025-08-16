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
    <div className="max-w-6xl mx-auto">
      <h2 className="text-gray-800 text-2xl md:text-3xl font-extrabold tracking-tight">{title}</h2>
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
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
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
            className="h-18 w-18 rounded-full object-cover border"
          />
        ) : (
          <div className="h-18 w-18 rounded-full border bg-gray-50 grid place-items-center text-gray-700 font-bold text-lg">
            {initials}
          </div>
        )}

        <div className="min-w-0">
          <div className="text-lg md:text-xl font-bold text-gray-900">{m.name}</div>
          <div className="text-sm text-gray-700 mt-0.5">{m.unit}</div>
          <div className="text-sm text-gray-600 mt-1 flex flex-wrap gap-x-3 gap-y-1">
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
    <div className="text-center py-10">
      <div className="inline-flex flex-wrap items-end justify-center gap-[2px]">
        {chars.map((ch, i) => (
          <motion.span
            key={i}
            className="text-xl md:text-2xl font-extrabold text-gray-800 inline-block"
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
  const yImg = useTransform(scrollYProgress, [0, 1], [0, 320]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 1], [0.5, 0.6]);

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
      {/* ヘッダー（踏襲） */}
      <header className="select-none w-full flex items-center justify-between p-4 bg-white shadow z-50 relative">
        <div className="flex items-center">
          <motion.button
            onClick={() => setIsOpen(!isOpen)}
            className="mr-4 md:hidden cursor-pointer"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            aria-label={isOpen ? "メニューを閉じる" : "メニューを開く"}
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
                  <X size={28} className="text-black" />
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
                  <Menu size={28} className="text-black" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          <Image src="/images/ARClogo.png" alt="ARC Logo" width={40} height={40} className="object-contain select-none" draggable={false}/>
          <span className="text-lg font-bold text-gray-800 ml-2 select-none">愛知ローバース会議</span>
        </div>

        <nav className="hidden md:flex space-x-6 text-gray-600">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link key={item.path} href={item.path}
                className={`px-4 py-2 rounded-lg transition ${isActive ? "text-black font-bold" : "text-gray-500 hover:text-black"}`}>
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className={`absolute top-16 left-0 w-full bg-white shadow-md flex flex-col space-y-2 p-4 md:hidden transform transition-all duration-300 ease-in-out z-50 ${isOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"}`}>
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link key={item.path} href={item.path}
                className={`px-4 py-2 rounded-lg transition ${isActive ? "text-black font-bold" : "text-gray-500 hover:text-black"}`}
                onClick={() => setIsOpen(false)}>
                {item.name}
              </Link>
            );
          })}
        </div>
      </header>

      {/* ヒーロー */}
      <div ref={heroRef} className="select-none relative w-full h-[42vh] overflow-hidden">
        <motion.div style={{ y: yImg }} className="absolute inset-0 will-change-transform">
          <Image src="/images/R6-3.JPG" alt="Aichi Rovers Conference" fill className="object-cover z-0 select-none" draggable={false} priority sizes="100vw"/>
        </motion.div>
        <motion.div style={{ opacity: overlayOpacity }} className="absolute inset-0 bg-black z-10" />
        <motion.div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: "easeOut" }}>
          <h1 className="text-white text-5xl md:text-6xl font-bold drop-shadow-lg">ARC運営委員会</h1>
          <p className="text-white/90 font-medium text-xl md:text-2xl mt-3">Executive Committee</p>
        </motion.div>
      </div>

      {/* 本文：紹介テキスト */}
      <section className="w-full bg-white py-10 px-6 md:px-16">
        <div className="max-w-6xl mx-auto space-y-6 text-[17px] md:text-[18px] leading-relaxed text-gray-800">
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
      <section className="w-full bg-white pb-10 px-6 md:px-16">
        <SectionHeading title="運営委員の紹介" />
        <div className="max-w-6xl mx-auto mt-6">
          {list.length === 0 ? (
            <ComingSoonWave />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {list.map((m, i) => (
                <MemberCard key={`${m.name}-${i}`} m={m} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 仕切り線 */}
      <div className="max-w-6xl mx-auto mt-6 mb-10 px-6 md:px-16">
        <div className="border-t border-gray-300" />
      </div>

      {/* SNS（踏襲） */}
      <section className="bg-gray-100 py-6">
        <div className="max-w-6xl mx-auto flex justify-center gap-8">
          <motion.a href="https://www.facebook.com/aichirovers/?locale=ja_JP" target="_blank" rel="noopener noreferrer"
            whileHover={{ y: -4, scale: 1.06 }} whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className="text-blue-500 hover:text-blue-400 transition-colors duration-200"><FaFacebook size={28} /></motion.a>
          <span className="text-pink-500 opacity-40 cursor-not-allowed"><FaInstagram size={32} /></span>
          <span className="text-black opacity-40 cursor-not-allowed"><FaXTwitter size={32} /></span>
          <motion.a href="https://lin.ee/BPXqTTv" target="_blank" rel="noopener noreferrer"
            whileHover={{ y: -4, scale: 1.06 }} whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className="text-green-600 hover:text-green-500 transition-colors duration-200"><FaLine size={32} /></motion.a>
        </div>
      </section>

      {/* フッター（踏襲） */}
      <footer className="bg-gray-900 text-white py-6 mt-12">
        <div className="max-w-6xl mx-auto px-6 md:px-16 text-center">
          <p className="text-lg font-semibold mb-2">お問い合わせ</p>
          <a href="mailto:aichi.rovers.conference@gmail.com" className="text-red-400 hover:text-red-300 transition-colors duration-200">
            aichi.rovers.conference@gmail.com
          </a>
          <p className="mt-4 text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Aichi Rovers Conference. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

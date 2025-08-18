"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { FaFacebook, FaInstagram, FaXTwitter, FaLine } from "react-icons/fa6";
import ExecAccessButton from "@/components/ExecAccessButton";

export default function Home() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { name: "ホーム", path: "/" },
    { name: "ARCとは", path: "/arc" },
    { name: "事業カレンダー", path: "/arc/calendar" },
    { name: "ARC定例会", path: "/arc/conference" },
    { name: "ARC運営委員会", path: "/arc/executive-committee" },
    { name: "ARCアンケート", path: "/polls" },
    { name: "ミニゲーム", path: "/games" },
  ];

  const Hero: React.FC<{ hideText: boolean }> = ({ hideText }) => {
    const ref = useRef<HTMLDivElement | null>(null);
    const { scrollYProgress } = useScroll({
      target: ref,
      offset: ["start start", "end start"],
    });
    const yImg = useTransform(scrollYProgress, [0, 1], [0, 320]);
    const overlayOpacity = useTransform(scrollYProgress, [0, 1], [0.45, 0.6]);

    return (
      <div ref={ref} className="select-none relative w-full h-[52vh] md:h-[70vh] overflow-hidden">
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
          className={`select-none absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-4 ${
            hideText ? "pointer-events-none" : ""
          }`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: hideText ? 0 : 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          aria-hidden={hideText}
        >
          <h1 className="text-white font-extrabold tracking-tight drop-shadow-lg text-3xl sm:text-4xl md:text-6xl">
            <span className="text-red-700">A</span>ichi{" "}
            <span className="text-red-700">R</span>overs{" "}
            <span className="text-red-700">C</span>onference
          </h1>
          <p className="text-white font-bold mt-2 text-xl sm:text-2xl md:text-3xl">愛知ローバース会議</p>

          <div className="mt-6">
            <ExecAccessButton mode="inline" label="運営委員専用ページへ" className="px-5 py-3 text-sm md:text-base" />
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="w-full bg-white">
      {/* ヘッダー（ノッチ安全域） */}
      <header className="select-none sticky top-0 z-50 w-full bg-white shadow relative">
        <div className="flex items-center justify-between px-4 py-2 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center">
            {/* ハンバーガー */}
            <motion.button
              onClick={() => setIsOpen(!isOpen)}
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
                    <X size={26} className="text-black" />
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
                    <Menu size={26} className="text-black" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            <Image
              src="/images/ARClogo.png"
              alt="ARC Logo"
              width={36}
              height={36}
              className="object-contain select-none"
              draggable={false}
            />
            <span className="ml-2 text-base sm:text-lg font-bold text-gray-800 select-none">愛知ローバース会議</span>
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

        {/* スマホドロワー（absolute配置。閉時は高さ0で余白ゼロ） */}
        <div
          id="mobile-drawer"
          className={[
            "md:hidden absolute left-0 right-0 top-full bg-white shadow border-t z-50",
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

      {/* ヒーロー */}
      <Hero hideText={isOpen} />

      {/* 紹介セクション */}
      <section className="w-full bg-white py-12 px-4 sm:px-6 md:px-16">
        <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 items-center">
          {/* 左：文章 */}
          <div>
            <h2 className="pt-2 text-red-600 text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-gray-800">
              輝かしい愛知の仲間と
            </h2>
            <p className="text-black text-base sm:text-[17px] leading-7 sm:leading-8 font-medium mb-3">
              愛知ローバース会議（Aichi Rovers Conference）は、ボーイスカウト愛知連盟に所属する
              ローバースカウトおよび同年代指導者約700名により構成された組織です。
            </p>
            <p className="text-black text-base sm:text-[17px] leading-7 sm:leading-8 font-medium">
              スローガン “ミライで輝く仲間とともに、夢とロマンで世界を満たす。” を実現すべく、
              日々仲間と様々な活動に取り組んでいます。
            </p>
          </div>

          {/* 右：写真 */}
          <div className="flex justify-center">
            <Image
              src="/images/sample.png"
              alt="ARC活動写真"
              width={560}
              height={400}
              className="rounded-lg shadow-lg object-cover select-none"
              draggable={false}
              sizes="(max-width: 768px) 92vw, 560px"
              loading="lazy"
            />
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 items-center">
          <div>
            <h2 className="pt-2 text-red-600 text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-gray-800">
              年4回の定例会
            </h2>
            <p className="text-black text-base sm:text-[17px] leading-7 sm:leading-8 font-medium mb-4">
              愛知ローバース会議では年に1回の年次総会と年に4回の定例会を開催しています。平均60名以上が参加し、スカウトが情報交換や交流を行うための場として活用されています。ローバー活動の報告や募集、積極的な意見交換が繰り広げられています。
            </p>
            <Link href="/###" className="relative z-10 inline-block">
              <motion.span
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 320, damping: 22 }}
                className="inline-flex min-h-11 items-center gap-2 px-3 py-2 rounded-md border border-red-700 font-semibold bg-white shadow-sm text-sm"
              >
                詳しくは「定例会」のページをご覧ください。
              </motion.span>
            </Link>
          </div>

        <div className="flex justify-center">
            <Image
              src="/images/sample.png"
              alt="ARC活動写真"
              width={560}
              height={400}
              className="rounded-lg shadow-lg object-cover select-none"
              draggable={false}
              sizes="(max-width: 768px) 92vw, 560px"
              loading="lazy"
            />
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 items-center">
          <div>
            <h2 className="pt-2 text-red-600 text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-gray-800">
              自分たちによる意思決定
            </h2>
            <p className="text-black text-base sm:text-[17px] leading-7 sm:leading-8 font-medium mb-2">
              愛知ローバース会議では年次総会を毎年行っており、ローバースカウト自身による意思決定を大切にしています。年次総会で選任された運営委員が定例会の運営を担うことで、愛知のローバースカウト全員の団結と活躍を目指しています。
            </p>
          </div>

          <div className="flex justify-center">
            <Image
              src="/images/sample.png"
              alt="ARC活動写真"
              width={560}
              height={400}
              className="rounded-lg shadow-lg object-cover select-none"
              draggable={false}
              sizes="(max-width: 768px) 92vw, 560px"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* 区切り線 */}
      <div className="mx-auto mt-10 mb-8 px-4 sm:px-6 md:px-16 max-w-6xl">
        <div className="border-t border-gray-300" />
      </div>

      {/* 資料ダウンロード */}
      <section className="px-4 sm:px-6 md:px-16 pb-10 bg-white">
        <div className="flex justify-center">
          <div className="relative overflow-hidden">
            <Image
              src="/images/コノハズクグレー.png"
              alt="ARC コノハズク"
              className="object-contain select-none [-webkit-user-drag:none]"
              draggable={false}
              width={220}
              height={220}
              loading="lazy"
              sizes="220px"
              onDragStart={(e) => e.preventDefault()}
            />
          </div>
        </div>

        <div className="pt-8 mx-auto max-w-6xl">
          <h3 className="text-red-600 text-2xl sm:text-3xl font-bold mb-4">資料ダウンロード</h3>

          <ul className="space-y-3">
            {[
              { href: "/files/ARC憲章R3年度版.pdf", label: "愛知ローバース会議 憲章" },
              { href: "/files/令和7年度愛知ローバース会議年次総会資料.pdf", label: "R7年度ARC総会資料" },
              { href: "/files/友情シールプロジェクト_フライヤー.pdf", label: "友情シールプロジェクト" },
            ].map((f) => (
              <li key={f.href}>
                <motion.a
                  href={f.href}
                  download
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 320, damping: 22 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 text-gray-800 font-semibold min-h-11"
                >
                  <span className="text-red-600 text-xl leading-none">▶</span>
                  <span className="text-sm sm:text-base">{f.label}</span>
                </motion.a>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs sm:text-sm text-gray-600">
            ※編集・加工をしなければ常識の範囲内でご自由にお使いください。
          </p>
        </div>
      </section>

      {/* SNSリンク */}
      <section className="bg-gray-100 py-6">
        <div className="mx-auto max-w-6xl flex justify-center gap-7">
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
        <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-16 text-center">
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

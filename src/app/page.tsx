// app/page.tsx （またはこのホームページのファイル）
"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { FaFacebook, FaInstagram, FaXTwitter, FaLine } from "react-icons/fa6";
import ExecAccessButton from "@/components/ExecAccessButton";
import ArcHeader1 from "@/components/ArcHeader1";

export default function Home() {
  // ※ ヘッダーでの open 状態を使わないなら削ってOK
  const [isOpen] = useState(false);

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
    // モバイルで過剰に動きすぎないよう移動量を控えめに
    const yImg = useTransform(scrollYProgress, [0, 1], [0, 240]);
    const overlayOpacity = useTransform(scrollYProgress, [0, 1], [0.45, 0.6]);

    return (
      <div ref={ref} className="relative w-full h-[56vh] sm:h-[60vh] overflow-hidden select-none">
        <motion.div style={{ y: yImg }} className="absolute inset-0 will-change-transform">
          <Image
            src="/images/R6-3.JPG"
            alt="Aichi Rovers Conference"
            fill
            priority
            sizes="100vw"
            className="object-cover z-0 select-none"
            draggable={false}
          />
        </motion.div>

        <motion.div style={{ opacity: overlayOpacity }} className="absolute inset-0 bg-black z-10" />

        {/* タイトル群：モバイルで読みやすいclamp */}
        <motion.div
          className={`absolute inset-0 z-20 flex flex-col items-center justify-center text-center ${
            hideText ? "pointer-events-none" : ""
          }`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: hideText ? 0 : 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          aria-hidden={hideText}
        >
          <h1
            className="font-bold mb-3 drop-shadow-lg text-white leading-tight"
            style={{
              // 22px〜56pxで可変（英字タイトル）
              fontSize: "clamp(22px, 7vw, 56px)",
            }}
          >
            <span className="text-red-700">A</span>ichi{" "}
            <span className="text-red-700">R</span>overs <span className="text-red-700">C</span>onference
          </h1>

          <p
            className="text-white font-bold mt-1 leading-tight"
            style={{
              // 16px〜40pxで可変（日本語タイトル）
              fontSize: "clamp(16px, 6vw, 40px)",
            }}
          >
            愛知ローバース会議
          </p>

          <div className="mt-6 sm:mt-8">
            <ExecAccessButton mode="inline" label="運営委員専用ページへ" className="px-5 sm:px-6 py-2" />
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="w-full bg-white">
      {/* ヘッダー（ArcHeader1/2どちらでもOK。スマホでの名前収まりは別途対応版を推奨） */}
      <ArcHeader1 navItems={navItems} />

      {/* ヒーロー */}
      <Hero hideText={isOpen} />

      {/* --- 紹介セクション（モバイル最適化：余白/文字サイズを調整） --- */}
      <section className="w-full bg-white py-10 sm:py-12 md:py-16 px-4 sm:px-6 md:px-10 lg:px-16">
        <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 items-center">
          {/* 左：文章 */}
          <div>
            <h2 className="text-red-600 font-bold mb-4 sm:mb-6 text-3xl sm:text-4xl md:text-5xl">
              輝かしい愛知の仲間と
            </h2>
            <p className="text-black font-medium sm:font-semibold text-base sm:text-lg md:text-[19px] leading-relaxed mb-4">
              愛知ローバース会議（Aichi Rovers Conference）は、ボーイスカウト愛知連盟に所属する
              ローバースカウトおよび同年代指導者約700名により構成された組織です。
            </p>
            <p className="text-black font-medium sm:font-semibold text-base sm:text-lg md:text-[19px] leading-relaxed">
              スローガン “ミライで輝く仲間とともに、夢とロマンで世界を満たす。” を実現すべく、
              日々仲間と様々な活動に取り組んでいます。
            </p>
          </div>

          {/* 右：写真 */}
          <div className="flex justify-center">
            <Image
              src="/images/sample.png"
              alt="ARC活動写真"
              width={520}
              height={420}
              sizes="(max-width: 768px) 86vw, 520px"
              className="rounded-lg shadow-lg object-cover select-none w-full max-w-[520px] h-auto"
              draggable={false}
            />
          </div>
        </div>

        {/* 2つ目のブロック */}
        <div className="mx-auto max-w-6xl mt-14 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 items-center">
          <div>
            <h2 className="text-red-600 font-bold mb-4 sm:mb-6 text-3xl sm:text-4xl md:text-5xl">
              年4回の定例会
            </h2>
            <p className="text-black font-medium sm:font-semibold text-base sm:text-lg md:text-[19px] leading-relaxed mb-4">
              愛知ローバース会議では年に1回の年次総会と年に4回の定例会を開催しています。平均60名以上が参加し、
              スカウトが情報交換や交流を行うための場として活用されています。ローバー活動の報告や募集、積極的な意見交換が繰り広げられています。
            </p>
            <Link href="/arc/conference" className="relative z-10">
              <motion.span
                whileHover={{ y: -3, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 320, damping: 22 }}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-red-700 font-semibold text-black bg-white shadow-sm"
              >
                詳しくは「定例会」のページをご覧ください。
              </motion.span>
            </Link>
          </div>

          <div className="flex justify-center">
            <Image
              src="/images/sample.png"
              alt="ARC活動写真"
              width={520}
              height={420}
              sizes="(max-width: 768px) 86vw, 520px"
              className="rounded-lg shadow-lg object-cover select-none w-full max-w-[520px] h-auto"
              draggable={false}
            />
          </div>
        </div>

        {/* 3つ目のブロック */}
        <div className="mx-auto max-w-6xl mt-14 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 items-center">
          <div>
            <h2 className="text-red-600 font-bold mb-4 sm:mb-6 text-3xl sm:text-4xl md:text-5xl">
              自分たちによる意思決定
            </h2>
            <p className="text-black font-medium sm:font-semibold text-base sm:text-lg md:text-[19px] leading-relaxed mb-2">
              愛知ローバース会議では年次総会を毎年行っており、ローバースカウト自身による意思決定を大切にしています。
              年次総会で選任された運営委員が定例会の運営を担うことで、愛知のローバースカウト全員の団結と活躍を目指しています。
            </p>
          </div>

          <div className="flex justify-center">
            <Image
              src="/images/sample.png"
              alt="ARC活動写真"
              width={520}
              height={420}
              sizes="(max-width: 768px) 86vw, 520px"
              className="rounded-lg shadow-lg object-cover select-none w-full max-w-[520px] h-auto"
              draggable={false}
            />
          </div>
        </div>
      </section>

      {/* セクション区切り */}
      <div className="mx-auto max-w-6xl mt-12 mb-8 px-4 sm:px-6 md:px-10 lg:px-16">
        <div className="border-t border-gray-300" />
      </div>

      {/* 資料ダウンロード：モバイルで押しやすく */}
      <section className="bg-white pb-10 px-4 sm:px-6 md:px-10 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <div className="flex justify-center">
            <div className="relative overflow-hidden">
              <Image
                src="/images/コノハズクグレー.png"
                alt="ARC コノハズク"
                width={260}
                height={260}
                sizes="(max-width: 640px) 160px, 260px"
                className="object-contain select-none w-[160px] sm:w-[200px] md:w-[260px] h-auto [-webkit-user-drag:none]"
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
              />
            </div>
          </div>

          <div className="pt-8 sm:pt-10 px-0 sm:px-2 md:px-6">
            <h3 className="text-red-600 font-bold mb-5 text-2xl sm:text-3xl md:text-4xl">資料ダウンロード</h3>

            <ul className="space-y-3">
              {[
                { href: "/files/ARC憲章R3年度版.pdf", label: "愛知ローバース会議 憲章" },
                { href: "/files/令和7年度愛知ローバース会議年次総会資料.pdf", label: "R7年度ARC総会資料" },
                { href: "/files/友情シールプロジェクト_フライヤー.pdf", label: "友情シールプロジェクト" },
              ].map((item) => (
                <li key={item.href}>
                  <motion.a
                    href={item.href}
                    download
                    whileHover={{ y: -3, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 320, damping: 22 }}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 text-gray-800 font-semibold text-sm sm:text-base"
                  >
                    <span className="text-red-600 text-lg sm:text-xl leading-none">▶</span>
                    <span className="truncate">{item.label}</span>
                  </motion.a>
                </li>
              ))}
            </ul>

            <p className="mt-4 text-xs sm:text-sm text-gray-600">
              ※編集・加工をしなければ常識の範囲内でご自由にお使いください。
            </p>
          </div>
        </div>
      </section>

      {/* SNSリンク：アイコンサイズをモバイル抑えめ */}
      <section className="bg-gray-100 py-6">
        <div className="mx-auto max-w-6xl flex justify-center gap-6 sm:gap-8">
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

          <span className="text-pink-500 opacity-40 cursor-not-allowed" aria-disabled="true" aria-label="Instagram（未開設）">
            <FaInstagram size={28} className="sm:size-[32px]" />
          </span>

          <span className="text-black opacity-40 cursor-not-allowed" aria-disabled="true" aria-label="X（未開設）">
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

      {/* フッター：文字サイズを段階調整 */}
      <footer className="bg-gray-900 text-white py-8 mt-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-10 lg:px-16 text-center">
          <p className="text-base sm:text-lg font-semibold mb-2">お問い合わせ</p>
          <a
            href="mailto:aichi.rovers.conference@gmail.com"
            className="text-red-400 hover:text-red-300 transition-colors"
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

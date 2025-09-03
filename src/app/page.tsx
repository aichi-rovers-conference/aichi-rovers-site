// app/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

import ExecAccessButton from "../components/ExecAccessButton";
import ArcHeader1 from "../components/ArcHeader1";
import ArcFooter from "../components/ArcFooter";
import HeroImage from "../components/HeroImage"; // ★ 先ほど作った共通ヒーロー

// 必要なら AVIF/WebP を静的インポートして使ってもOK
// import heroImg from "@/public/images/R6-3.avif";
import sampleImg from "@/public/images/sample.png";

export default function Home() {
  const [isOpen] = useState(false);

  const navItems = [
    { name: "ホーム", path: "/" },
    { name: "ARCとは", path: "/arc" },
    { name: "事業カレンダー", path: "/arc/calendar" },
    { name: "ARC定例会", path: "/arc/conference" },
    { name: "ARC運営委員会", path: "/arc/executive-committee" },
    { name: "ARCアンケート", path: "/polls" },
    // { name: "ミニゲーム", path: "/games" },
  ];

  return (
    <div className="w-full bg-white">
      <ArcHeader1 navItems={navItems} />

      {/* ★ 共通ヒーロー（パララックス + オーバーレイ + blur 対応） */}
      <HeroImage
        // src={heroImg}                       // ← 静的インポートに切替える場合はこちら
        src="/images/R6-3.JPG"                 // ← public配下のパスでもOK（自動シマーblur付与）
        alt="Aichi Rovers Conference"
        parallaxAmount={180}
        overlayOpacityRange={[0.45, 0.6]}
        // overlayClassName="bg-black/90"      // 濃くしたい場合に
      >
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            aria-hidden={isOpen}
            className="text-center"
          >
            <h1
              className="font-bold mb-3 drop-shadow-lg text-white leading-tight"
              style={{ fontSize: "clamp(22px, 7vw, 56px)" }}
            >
              <span className="text-red-700">A</span>ichi{" "}
              <span className="text-red-700">R</span>overs <span className="text-red-700">C</span>onference
            </h1>
            <p
              className="text-white font-bold mt-1 leading-tight"
              style={{ fontSize: "clamp(16px, 6vw, 40px)" }}
            >
              愛知ローバース会議
            </p>
          </motion.div>
        )}
      </HeroImage>

      {/* --- 紹介セクション --- */}
      <section className="w-full bg-white py-10 sm:py-12 md:py-16 px-4 sm:px-6 md:px-10 lg:px-16">
        <div
          className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 items-center"
          style={{ contentVisibility: "auto", containIntrinsicSize: "800px" }}
        >
          {/* 左：文章 */}
          <div>
            <h2 className="text-red-600 font-bold mb-4 sm:mb-6 text-3xl sm:text-4xl md:text-5xl">輝かしい愛知の仲間と</h2>
            <p className="text-black font-medium sm:font-semibold text-base sm:text-lg md:text-[19px] leading-relaxed mb-4">
              愛知ローバース会議（Aichi Rovers Conference）は、ボーイスカウト愛知連盟に所属する
              ローバースカウトおよび同年代指導者約700名により構成された組織です。
            </p>
            <p className="text-black font-medium sm:font-semibold text-base sm:text-lg md:text-[19px] leading-relaxed">
              スローガン “ミライで輝く仲間とともに、夢とロマンで世界を満たす。” を実現すべく、
              日々仲間と様々な活動に取り組んでいます。
            </p>
          </div>

          {/* 右：写真（静的インポートでLQIP有効） */}
          <div className="flex justify-center">
            <Image
              src={sampleImg}
              alt="ARC活動写真"
              width={520}
              height={420}
              placeholder="blur"
              loading="lazy"
              sizes="(max-width: 768px) 86vw, 520px"
              className="rounded-lg shadow-lg object-cover select-none w-full max-w-[520px] h-auto"
              draggable={false}
            />
          </div>
        </div>

        {/* 2つ目のブロック */}
        <div
          className="mx-auto max-w-6xl mt-14 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 items-center"
          style={{ contentVisibility: "auto", containIntrinsicSize: "800px" }}
        >
          <div>
            <h2 className="text-red-600 font-bold mb-4 sm:mb-6 text-3xl sm:text-4xl md:text-5xl">年4回の定例会</h2>
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
              src={sampleImg}
              alt="ARC活動写真"
              width={520}
              height={420}
              placeholder="blur"
              loading="lazy"
              sizes="(max-width: 768px) 86vw, 520px"
              className="rounded-lg shadow-lg object-cover select-none w-full max-w-[520px] h-auto"
              draggable={false}
            />
          </div>
        </div>

        {/* 3つ目のブロック */}
        <div
          className="mx-auto max-w-6xl mt-14 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 items-center"
          style={{ contentVisibility: "auto", containIntrinsicSize: "800px" }}
        >
          <div>
            <h2 className="text-red-600 font-bold mb-4 sm:mb-6 text-3xl sm:text-4xl md:text-5xl">自分たちによる意思決定</h2>
            <p className="text-black font-medium sm:font-semibold text-base sm:text-lg md:text-[19px] leading-relaxed mb-2">
              愛知ローバース会議では年次総会を毎年行っており、ローバースカウト自身による意思決定を大切にしています。
              年次総会で選任された運営委員が定例会の運営を担うことで、愛知のローバースカウト全員の団結と活躍を目指しています。
            </p>
          </div>

          <div className="flex justify-center">
            <Image
              src={sampleImg}
              alt="ARC活動写真"
              width={520}
              height={420}
              placeholder="blur"
              loading="lazy"
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

      {/* 資料ダウンロード */}
      <section className="bg-white pb-10 px-4 sm:px-6 md:px-10 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <div className="flex justify-center">
            <div className="relative overflow-hidden">
              <Image
                src="/images/コノハズクグレー.png"
                alt="ARC コノハズク"
                width={260}
                height={260}
                loading="lazy"
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
                { href: "/files/FriendshipStickerProject_Flyer.pdf", label: "友情シールプロジェクト" },
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

      <ArcFooter />
    </div>
  );
}

// app/arc/page.tsx など、このページファイルまるごと置き換え
"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { FaFacebook, FaInstagram, FaXTwitter, FaLine } from "react-icons/fa6";
import ArcHeader1 from "@/src/components/ArcHeader1";
import ArcFooter from "@/src/components/ArcFooter";

/** セクション（左テキスト／右画像） */
function TextRightImage({
  title,
  children,
  imgSrc = "/images/sample.png",
  imgAlt,
}: {
  title: string;
  children: React.ReactNode;
  imgSrc?: string;
  imgAlt: string;
}) {
  return (
    <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 items-center py-10 sm:py-12">
      <div>
        <h2
          className="text-red-600 font-bold mb-4 sm:mb-5 leading-tight"
          style={{ fontSize: "clamp(22px, 4.8vw, 36px)" }} // 22〜36px 可変
        >
          {title}
        </h2>
        <div className="space-y-4 text-[15px] sm:text-base md:text-[19px] leading-relaxed text-black/90">
          {children}
        </div>
      </div>
      <div className="flex justify-center">
        <Image
          src={imgSrc}
          alt={imgAlt}
          width={520}
          height={380}
          sizes="(max-width: 768px) 86vw, 520px"
          className="w-full max-w-[520px] h-auto rounded-lg shadow-lg object-cover select-none"
          draggable={false}
        />
      </div>
    </div>
  );
}

export default function AboutArcPage() {
  const [isOpen] = useState(false); // ドロワー等で使う場合は状態を受け渡し
  const navItems = [
    { name: "ホーム", path: "/" },
    { name: "ARCとは", path: "/arc" },
    { name: "事業カレンダー", path: "/arc/calendar" },
    { name: "ARC定例会", path: "/arc/conference" },
    { name: "ARC運営委員会", path: "/arc/executive-committee" },
    { name: "ARCアンケート", path: "/polls" },
    { name: "ミニゲーム", path: "/games" },
  ];

  // ====== ヒーロー（モバイルで動き控えめ） ======
  const heroRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const yImg = useTransform(scrollYProgress, [0, 1], [0, 240]); // 画像の移動量を控えめに
  const overlayOpacity = useTransform(scrollYProgress, [0, 1], [0.45, 0.6]); // 暗幕

  return (
    <div className="w-full bg-white">
      {/* ヘッダー */}
      <ArcHeader1 navItems={navItems} />

      {/* ヒーロー：ページ専用タイトル */}
      <div ref={heroRef} className="relative w-full h-[42vh] sm:h-[46vh] overflow-hidden select-none">
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
        <motion.div
          className={`absolute inset-0 z-20 flex flex-col items-center justify-center text-center ${
            isOpen ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        >
          <h1
            className="text-white font-extrabold drop-shadow-lg leading-tight"
            style={{ fontSize: "clamp(28px, 7vw, 48px)" }} // 28〜48px 可変
          >
            ARCとは
          </h1>
          <p
            className="text-white/90 font-medium mt-2 sm:mt-3"
            style={{ fontSize: "clamp(14px, 4.6vw, 24px)" }} // 14〜24px 可変
          >
            Aichi Rovers Conference Overview
          </p>
        </motion.div>
      </div>

      {/* 本文 */}
      <section className="w-full bg-white py-10 sm:py-12 md:py-16 px-4 sm:px-6 md:px-10 lg:px-16">
        {/* 導入：ARCとは */}
        <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 items-center py-8 sm:py-10">
          <div>
            <h2
              className="text-red-600 font-bold mb-4 sm:mb-5 leading-tight"
              style={{ fontSize: "clamp(22px, 4.8vw, 36px)" }}
            >
              ARCとは
            </h2>
            <div className="space-y-4 text-[15px] sm:text-base md:text-[19px] leading-relaxed text-black/90">
              <p>
                愛知ローバース会議（AICHI ROVERS CONFERENCE：通称ARC）は、
                愛知連盟に所属するRS（18歳から26歳の3月まで）と同年代指導者によって構成されています。
              </p>
            </div>
          </div>
          <div className="flex justify-center">
            <Image
              src="/images/sample.png"
              alt="ARCの紹介イメージ"
              width={520}
              height={380}
              sizes="(max-width: 768px) 86vw, 520px"
              className="w-full max-w-[520px] h-auto rounded-lg shadow-lg object-cover select-none"
              draggable={false}
            />
          </div>
        </div>

        {/* 見出し：ARCの活動 */}
        <div className="mx-auto max-w-6xl py-4">
          <h2
            className="text-gray-800 font-extrabold tracking-tight"
            style={{ fontSize: "clamp(20px, 4.4vw, 30px)" }} // 20〜30px 可変
          >
            ARCの活動
          </h2>
          <div className="mt-2 h-[2px] w-16 bg-red-600 rounded-full" />
        </div>

        {/* 各セクション */}
        <TextRightImage title="ARC総会・定例会" imgSrc="/images/sample.png" imgAlt="総会・定例会の様子">
          <p>
            愛知ローバース会議では年に1回の年次総会と年に4回の定例会を行っています。平均60名以上が参加し、
            スカウトが情報交換や交流を行うための場として活用されています。ローバー活動に必要な情報の提供や
            活動報告・募集、交流ゲームなどを行い、活動の知識や情報交換や仲間づくりを行っています。
          </p>
          <p>また、必要に応じて愛知のローバースカウトの意思決定を行っています。</p>
        </TextRightImage>

        <TextRightImage title="ARC交流会" imgSrc="/images/sample.png" imgAlt="交流会の様子">
          <p>
            年に1回、野外での1泊2日の交流会を開催しています。今後一緒に活動する仲間を見つけるため、
            縦の繋がり・横のつながりを深められる交流会です。生活班を構成し、食事をとったり、
            交流を深められるプログラムを実施しています。毎年、泊まりならではの濃い交流が行われています。
          </p>
        </TextRightImage>

        <TextRightImage
          title="ARCローバーオリエンテーション"
          imgSrc="/images/sample.png"
          imgAlt="ローバーオリエンテーションの様子"
        >
          <p>
            ベンチャースカウトへローバースカウトの魅力を伝える事業です。「VSとRSの違い」や「ARCの紹介」
            「RSでの活躍機会の紹介」などを伝えるセミナーを行っています。
          </p>
          <p>また、ベンチャースカウトとローバースカウトの交流会を通じて、両者がつながりを築くことを目的としています。</p>
        </TextRightImage>

        <TextRightImage title="ARC運営委員セミナー" imgSrc="/images/sample.png" imgAlt="運営委員セミナーの様子">
          <p>
            年度始まりにARC運営委員と他コミュニティ運営委員を対象としたセミナーを開催しています。
            組織を運営していく上で必要な知識と心構えを学び、運営主体としての価値を共有し更なる活躍を目指しています。
          </p>
          <p>このセミナーは議長をはじめ、先輩委員が準備しセッションを展開しています。</p>
        </TextRightImage>

        <TextRightImage title="その他事業の運営" imgSrc="/images/sample.png" imgAlt="各種事業の様子">
          <p>
            県連盟事業や委託事業をARC構成員が実行委員となり、運営しています。
            「愛知ローバームート」や「愛知スカウトフォーラム」、「愛知連盟ハイアドベンチャープログラム」などなど。
          </p>
        </TextRightImage>
      </section>

      {/* 仕切り線 */}
      <div className="mx-auto max-w-6xl mt-10 mb-8 px-4 sm:px-6 md:px-10 lg:px-16">
        <div className="border-t border-gray-300" />
      </div>
      <ArcFooter />
    </div>
  );
}

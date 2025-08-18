"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { FaFacebook, FaInstagram, FaXTwitter, FaLine } from "react-icons/fa6";

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
    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-10 px-4 md:px-0">
      <div>
        <h2 className="text-red-600 text-2xl sm:text-3xl md:text-4xl font-bold mb-4">{title}</h2>
        <div className="arc-body space-y-4 text-[15px] sm:text-base leading-7 sm:leading-8">
          {children}
        </div>
      </div>
      <div className="flex justify-center">
        <Image
          src={imgSrc}
          alt={imgAlt}
          width={520}
          height={380}
          className="rounded-lg shadow-lg object-cover select-none"
          draggable={false}
          sizes="(max-width: 768px) 92vw, 520px"
          loading="lazy"
        />
      </div>
    </div>
  );
}

export default function AboutArcPage() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // ====== ヒーロー ======
  const heroRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const yImg = useTransform(scrollYProgress, [0, 1], [0, 280]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 1], [0.45, 0.6]);

  // ====== ナビ ======
  const navItems = [
    { name: "ホーム", path: "/" },
    { name: "ARCとは", path: "/arc" },
    { name: "事業カレンダー", path: "/arc/calendar" },
    { name: "ARC定例会", path: "/arc/conference" },
    { name: "ARC運営委員会", path: "/arc/executive-committee" },
    { name: "ARCアンケート", path: "/polls" },
    { name: "ミニゲーム", path: "/games" },
  ];

  return (
    <div className="w-full bg-white">
      {/* ヘッダー（sticky + relative。ドロワーはabsoluteで高さ0制御） */}
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
            <span className="ml-2 text-base sm:text-lg font-bold text-gray-800 select-none">
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

        {/* スマホドロワー（absolute配置。閉時は高さ0で余白ゼロ） */}
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

      {/* ヒーロー：ページ専用タイトル（高さをやや低めに） */}
      <div ref={heroRef} className="select-none relative w-full h-[40vh] md:h-[52vh] overflow-hidden">
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
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        >
          <h1 className="text-white text-3xl sm:text-4xl md:text-6xl font-extrabold drop-shadow-lg">ARCとは</h1>
          <p className="text-white/90 font-medium text-base sm:text-lg md:text-2xl mt-2">
            Aichi Rovers Conference Overview
          </p>
        </motion.div>
      </div>

      {/* 本文 */}
      <section className="w-full bg-white py-10 md:py-12 px-4 md:px-16">
        {/* 導入：ARCとは */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-8">
          <div>
            <h2 className="text-red-600 text-2xl sm:text-3xl md:text-4xl font-bold mb-4">ARCとは</h2>
            <div className="arc-body space-y-4 text-[15px] sm:text-base leading-7 sm:leading-8">
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
              className="rounded-lg shadow-lg object-cover select-none"
              draggable={false}
              sizes="(max-width: 768px) 92vw, 520px"
              loading="lazy"
            />
          </div>
        </div>

        {/* 見出し：ARCの活動 */}
        <div className="max-w-6xl mx-auto py-2 md:py-4 px-1 md:px-0">
          <h2 className="text-gray-800 text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">
            ARCの活動
          </h2>
          <div className="mt-2 h-[2px] w-16 bg-red-600 rounded-full" />
        </div>

        {/* ARC総会・定例会 */}
        <TextRightImage title="ARC総会・定例会" imgSrc="/images/sample.png" imgAlt="総会・定例会の様子">
          <p>
            愛知ローバース会議では年に1回の年次総会と年に4回の定例会を行っています。平均60名以上が参加し、
            スカウトが情報交換や交流を行うための場として活用されています。ローバー活動に必要な情報の提供や
            活動報告・募集、交流ゲームなどを行い、活動の知識や情報交換や仲間づくりを行っています。
          </p>
          <p>また、必要に応じて愛知のローバースカウトの意思決定を行っています。</p>
        </TextRightImage>

        {/* ARC交流会 */}
        <TextRightImage title="ARC交流会" imgSrc="/images/sample.png" imgAlt="交流会の様子">
          <p>
            年に1回、野外での1泊2日の交流会を開催しています。今後一緒に活動する仲間を見つけるため、
            縦の繋がり・横のつながりを深められる交流会です。生活班を構成し、食事をとったり、
            交流を深められるプログラムを実施しています。毎年、泊まりならではの濃い交流が行われています。
          </p>
        </TextRightImage>

        {/* ARCローバーオリエンテーション */}
        <TextRightImage
          title="ARCローバーオリエンテーション"
          imgSrc="/images/sample.png"
          imgAlt="ローバーオリエンテーションの様子"
        >
          <p>
            ベンチャースカウトへローバースカウトの魅力を伝える事業です。「VSとRSの違い」や「ARCの紹介」
            「RSでの活躍機会の紹介」などを伝えるセミナーを行っています。
          </p>
          <p>
            また、ベンチャースカウトとローバースカウトの交流会を通じて、両者がつながりを築くことを目的としています。
          </p>
        </TextRightImage>

        {/* ARC運営委員セミナー */}
        <TextRightImage title="ARC運営委員セミナー" imgSrc="/images/sample.png" imgAlt="運営委員セミナーの様子">
          <p>
            年度始まりにARC運営委員と他コミュニティ運営委員を対象としたセミナーを開催しています。
            組織を運営していく上で必要な知識と心構えを学び、運営主体としての価値を共有し更なる活躍を目指しています。
          </p>
          <p>このセミナーは議長をはじめ、先輩委員が準備しセッションを展開しています。</p>
        </TextRightImage>

        {/* その他事業の運営 */}
        <TextRightImage title="その他事業の運営" imgSrc="/images/sample.png" imgAlt="各種事業の様子">
          <p>
            県連盟事業や委託事業をARC構成員が実行委員となり、運営しています。
            「愛知ローバームート」や「愛知スカウトフォーラム」、「愛知連盟ハイアドベンチャープログラム」などなど。
          </p>
        </TextRightImage>
      </section>

      {/* 仕切り線 */}
      <div className="max-w-6xl mx-auto mt-6 mb-8 px-4 md:px-16">
        <div className="border-t border-gray-300" />
      </div>

      {/* SNSリンク */}
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
        <div className="max-w-6xl mx-auto px-4 md:px-16 text-center">
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

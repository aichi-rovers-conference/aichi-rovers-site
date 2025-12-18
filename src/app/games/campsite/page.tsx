"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

// ミニゲーム本体はクライアント専用
const CampsiteGame = dynamic(() => import("./CampsiteGameClient"), {
  ssr: false,
  loading: () => (
    <div className="w-full border-b border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-6 md:px-16 py-6">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">キャンプサイトを探せ！</h1>
        <p className="mt-1 text-gray-900 font-medium text-[18px] md:text-[19px] leading-[1.9]">読み込み中…</p>
      </div>
    </div>
  ),
});

export default function Page() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { name: "ホーム", path: "/" },
    { name: "ARCとは", path: "/arc" },
    { name: "事業カレンダー", path: "/arc/calendar" },
    { name: "ARC定例会", path: "/arc/conference" }, // あなたの現在のナビに合わせています
    { name: "ARC運営委員会", path: "/arc/executive-committee" },
    { name: "ARCアンケート", path: "/polls" },
    { name: "ミニゲーム", path: "/games"},
    { name: "目安箱", path: "/suggestion-box"},
  ];

  return (
    <div className="w-full bg-white">
      {/* 共通ヘッダー（ホームと同じ構成） */}
      <header className="select-none w-full flex items-center justify-between p-4 bg-white shadow z-50 relative">
        <div className="flex items-center">
          {/* ハンバーガー（SP） */}
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

          <Image
            src="/images/ARClogo.png"
            alt="ARC Logo"
            width={40}
            height={40}
            className="object-contain select-none"
            draggable={false}
          />
          <span className="text-lg font-bold text-gray-800 ml-2 select-none">愛知ローバース会議</span>
        </div>

        {/* 右上ナビ（PC） */}
        <nav className="hidden md:flex space-x-6 text-gray-600">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`px-4 py-2 rounded-lg transition ${
                  isActive ? "text-black font-bold" : "text-gray-500 hover:text-black"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* スマホドロワー */}
        <div
          className={`absolute top-16 left-0 w-full bg-white shadow-md flex flex-col space-y-2 p-4 md:hidden transform transition-all duration-300 ease-in-out z-50 ${
            isOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
          }`}
        >
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`px-4 py-2 rounded-lg transition ${
                  isActive ? "text-black font-bold" : "text-gray-600 hover:text-black"
                }`}
                onClick={() => setIsOpen(false)}
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      </header>

      {/* ミニゲーム本体（タイトル帯はCampsiteGameClient内のものを使用してOK） */}
      <CampsiteGame />
    </div>
  );
}

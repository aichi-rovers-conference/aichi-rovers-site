// components/ArcHeader2.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

export type ArcHeaderNavItem = { name: string; path: string };

export default function ArcHeader1({
  navItems,
  logoSrc = "/images/ARClogo.png",
  siteName = "愛知ローバース会議",
  className = "",
}: {
  navItems: ArcHeaderNavItem[];
  logoSrc?: string;
  siteName?: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* PC: 既存デザイン（md以上で表示） */}
      <header
        className={`hidden md:flex select-none w-full items-center justify-between p-4 bg-white shadow z-50 relative ${className}`}
      >
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <Image
              src={logoSrc}
              alt="ARC Logo"
              width={40}
              height={40}
              className="object-contain select-none"
              draggable={false}
            />
            <span className="text-lg font-bold text-gray-800 ml-2 select-none">{siteName}</span>
          </Link>
        </div>

        <nav className="flex space-x-6 text-gray-600">
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
      </header>

      {/* Mobile: タイトル1行省略＋ドロワー */}
      <header className={`md:hidden sticky top-0 z-50 bg-white shadow ${className}`}>
        <div
          className="grid w-full grid-cols-3 items-center h-14"
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingLeft: "calc(env(safe-area-inset-left) + 16px)",
            paddingRight: "calc(env(safe-area-inset-right) + 16px)",
          }}
        >
          {/* 左：ハンバーガー */}
          <div className="flex items-center">
            <motion.button
              onClick={() => setIsOpen((v) => !v)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
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
                  >
                    <Menu size={26} className="text-black" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          {/* 中央：ロゴ＋サイト名（必ず1行で省略） */}
          <div className="justify-self-center">
            <Link href="/" className="flex items-center gap-2 leading-none" onClick={() => setIsOpen(false)}>
              <Image
                src={logoSrc}
                alt="ARC Logo"
                width={28}
                height={28}
                className="h-7 w-7 object-contain select-none"
                draggable={false}
              />
              <span
                className="
                  text-[14px] font-bold text-gray-800 select-none
                  whitespace-nowrap overflow-hidden text-ellipsis
                  max-w-[58vw]
                "
                title={siteName}
              >
                {siteName}
              </span>
            </Link>
          </div>

          {/* 右：スペーサー */}
          <div className="justify-self-end" />
        </div>

        {/* ドロワー */}
        <div
          id="mobile-drawer"
          className={`absolute top-14 left-0 w-screen bg-white shadow-md flex flex-col space-y-1 p-3 transform transition-all duration-300 ease-out ${
            isOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3 pointer-events-none"
          }`}
          aria-hidden={!isOpen}
          role="navigation"
        >
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`rounded-lg px-4 py-3 text-sm font-medium transition ${
                  isActive ? "text-black font-bold bg-gray-100" : "text-gray-700 hover:bg-gray-50"
                }`}
                onClick={() => setIsOpen(false)}
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      </header>
    </>
  );
}

// components/ArcHeader1.tsx
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
      {/* PC: xl以上で表示（md～lg は常にハンバーガー） */}
      <header
        className={`hidden xl:flex select-none w-full items-center justify-between p-4 bg-white shadow z-50 relative ${className}`}
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

        <nav className="flex flex-nowrap whitespace-nowrap gap-4 text-gray-600">
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

      {/* Mobile/Tablet: xl未満は常にハンバーガー */}
      <header className={`xl:hidden sticky top-0 z-50 bg-white shadow ${className}`}>
        <div
          className="grid w-full items-center h-14"
          style={{
            // 左右の安全領域 + 16pxパディングを確保
            paddingTop: "env(safe-area-inset-top)",
            paddingLeft: "calc(env(safe-area-inset-left) + 16px)",
            paddingRight: "calc(env(safe-area-inset-right) + 16px)",
            // 左 44px（ボタン） / 中央 1fr / 右 44px（スペーサ）
            gridTemplateColumns: "44px 1fr 44px",
          }}
        >
          {/* 左：ハンバーガー */}
          <div className="flex items-center">
            <motion.button
              onClick={() => setIsOpen((v) => !v)}
              className="inline-flex h-11 w-11 -ml-1 items-center justify-center rounded-md"
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
                    <X size={22} className="text-black" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  >
                    <Menu size={22} className="text-black" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          {/* 中央：ロゴ＋サイト名（可変フォント＋実幅ベースで最大化） */}
          <div className="justify-self-center min-w-0">
            <Link
              href="/"
              className="flex items-center gap-1.5 leading-none min-w-0"
              onClick={() => setIsOpen(false)}
            >
              <Image
                src={logoSrc}
                alt="ARC Logo"
                width={24}
                height={24}
                className="h-6 w-6 object-contain select-none flex-shrink-0"
                draggable={false}
              />
              <span
                className="
                  font-bold text-gray-800 select-none tracking-tight
                  whitespace-nowrap overflow-hidden text-ellipsis block
                "
                // 幅は端末幅から左右の安全領域・パディング・ボタン幅を厳密に差し引く
                style={{
                  // iPhone 12 (390px) 前提でも入りやすいようフォントをより小さく可変
                  fontSize: "clamp(10px, 3.2vw, 15px)",
                  maxWidth:
                    "calc(100vw - (env(safe-area-inset-left) + env(safe-area-inset-right) + 112px))",
                }}
                title={siteName}
              >
                {siteName}
              </span>
            </Link>
          </div>

          {/* 右：スペーサー（将来ボタンを置きたい時の受け皿） */}
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

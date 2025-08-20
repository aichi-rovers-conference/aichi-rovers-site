// components/ArcHeader.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function ArcHeader() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isExecRoot = pathname === "/exec" || pathname === "/exec/";

  const goBack = () => {
    if (isExecRoot) {
      router.push("/");
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* relative 化して中央要素を absolute センター固定 */}
        <div className="relative h-16 md:h-20 flex items-center">
          {/* Left: 戻るボタン（通常フロー） */}
          <button
            type="button"
            onClick={goBack}
            aria-label={isExecRoot ? "ホームへ戻る" : "前のページに戻る"}
            className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-2 text-sm md:text-base text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-400 transition"
          >
            <ArrowLeft className="size-4 md:size-5" />
            <span className="font-medium hidden sm:inline">
              {isExecRoot ? "ホームへ戻る" : "戻る"}
            </span>
          </button>

          {/* Center: ブランド（画面中央に absolute 固定） */}
          <Link
            href="/exec/"
            aria-label="ARC運営委員会トップへ"
            className="
              absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
              flex items-center gap-2 sm:gap-3 select-none
              rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-red-700/50
              min-w-0
              /* モバイル時は左右に140pxぶんの安全余白を確保して重なり回避 */
              max-w-[calc(100vw-140px)] sm:max-w-none
            "
          >
            <Image
              src="/images/ARClogo.png"
              alt="ARC Logo"
              width={32}
              height={32}
              className="object-contain shrink-0 md:w-11 md:h-11"
              priority
              draggable={false}
            />
            <span
              className="leading-tight font-extrabold tracking-wide text-[13px] sm:text-base md:text-2xl truncate text-center"
              title="Aichi Rovers Conference"
            >
              <span className="text-red-700">A</span>ichi{" "}
              <span className="text-red-700">R</span>overs{" "}
              <span className="text-red-700">C</span>onference
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}

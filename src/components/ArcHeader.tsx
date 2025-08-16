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
        {/* ← layout 改善：absolute center + 左右フレックス */}
        <div className="relative h-16 md:h-20 flex items-center">
          {/* Left: 戻る */}
          <div className="flex-1 min-w-0">
            <button
              type="button"
              onClick={goBack}
              aria-label={isExecRoot ? "ホームへ戻る" : "前のページに戻る"}
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-2 text-sm md:text-base text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-400 transition"
            >
              <ArrowLeft className="size-4 md:size-5" />
              <span className="font-medium">{isExecRoot ? "ホームへ戻る" : "戻る"}</span>
            </button>
          </div>

          {/* Center: ブランド（常に画面中央に固定） */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <Link
              href="/exec/"
              aria-label="ARC運営委員会トップへ"
              className="pointer-events-auto flex items-center gap-3 md:gap-4 select-none min-w-0 max-w-[70%] md:max-w-[60%] rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-red-700/50"
            >
              <Image
                src="/images/ARClogo.png"
                alt="ARC Logo"
                width={44}
                height={44}
                className="object-contain shrink-0 transition-transform hover:scale-[1.03]"
                priority
                draggable={false}
              />
              <div
                className="leading-tight text-center font-extrabold tracking-wide text-[15px] sm:text-lg md:text-2xl truncate"
                title="Aichi Rovers Conference"
              >
                <span className="text-red-700">A</span>ichi{" "}
                <span className="text-red-700">R</span>overs{" "}
                <span className="text-red-700">C</span>onference
              </div>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

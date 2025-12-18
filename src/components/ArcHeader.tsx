"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function ArcHeader() {
  const pathname = usePathname() || "/";
  const router = useRouter();

  const isExecRoot = pathname === "/exec" || pathname === "/exec/";

  const goBack = () => {
    // /exec 配下なら「親パスへ」
    if (pathname.startsWith("/exec")) {
      const parts = pathname.split("/").filter(Boolean); // e.g. ["exec","meetings","qr"]

      // parts[0] === "exec" 前提
      if (parts.length >= 2) {
        const parent = "/" + parts.slice(0, -1).join("/"); // 1階層上
        router.push(parent); // /exec/meetings/qr -> /exec/meetings
        return;
      }

      // /exec 自身
      router.push("/?home=1");
      return;
    }

    // /exec 以外は通常の戻る
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/?home=1");
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="relative h-16 md:h-20 flex items-center">
          <button
            type="button"
            onClick={goBack}
            aria-label={isExecRoot ? "ホームへ戻る" : "ひとつ上の階層へ戻る"}
            className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-2 text-sm md:text-base text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-400 transition"
          >
            <ArrowLeft className="size-4 md:size-5" />
            <span className="font-medium hidden sm:inline">
              {isExecRoot ? "ホームへ戻る" : "戻る"}
            </span>
          </button>

          <Link
            href="/exec/"
            aria-label="Aichi Rovers Conference（ARC）"
            className="
              absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
              flex items-center gap-2 sm:gap-3 select-none
              rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-red-700/50
              min-w-0
              max-w-[calc(100vw-120px)] sm:max-w-none
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
            <span className="font-extrabold tracking-wide text-[15px] sm:hidden">ARC</span>
            <span
              className="hidden sm:inline leading-tight font-extrabold tracking-wide text-base md:text-2xl truncate text-center"
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

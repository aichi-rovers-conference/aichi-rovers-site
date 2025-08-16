// app/games/fire-start/page.tsx
"use client";

import dynamic from "next/dynamic";

// クライアント専用（SSRしない）
const FireStart = dynamic(() => import("./FireStart"), {
  ssr: false,
  loading: () => (
    <div className="w-full border-b border-gray-200 bg-white">
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-6">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">
          火起こしチャレンジ
        </h1>
        <p className="mt-1 text-gray-900 font-medium text-[18px] leading-[1.9]">
          読み込み中…
        </p>
      </div>
    </div>
  ),
});

export default function Page() {
  return <FireStart />;
}

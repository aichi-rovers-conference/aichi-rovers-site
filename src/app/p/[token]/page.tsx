// src/app/p/[token]/page.tsx
import type { Metadata } from "next";

// Next.js 15: route params は Promise 経由で受け取ります
type Params = { params: Promise<{ token: string }> };

// （任意）このページのメタデータが必要な場合は Promise 版で定義
export async function generateMetadata(
  _context: unknown,
  { params }: Params
): Promise<Metadata> {
  const { token } = await params;
  return {
    title: `Preview - ${token}`,
    description: "リンクプレビュー",
  };
}

export default async function Page({ params }: Params) {
  const { token } = await params;

  // 必要ならここで token を使ってデータ取得
  // const res = await fetch(`${process.env.NEXT_PUBLIC_API}/p/${encodeURIComponent(token)}`, { cache: "no-store" });
  // const data = await res.json();

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-3">Preview</h1>
      <p className="text-slate-700">
        token: <code>{token}</code>
      </p>
    </main>
  );
}

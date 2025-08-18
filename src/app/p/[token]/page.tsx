// src/app/p/[token]/page.tsx
import type { ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

// ✅ Next.js 15: params は Promise なので await が必要
type Props = {
  params: Promise<{ token: string }>;
};

export default async function Page({ params }: Props) {
  const { token } = await params;

  if (!token) notFound();

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-xl font-bold">Token: {token}</h1>
      <p className="mt-2 text-slate-600">トークンに基づくページ内容を表示します。</p>
      <div className="mt-6">
        <Link
          href="/"
          className="inline-flex items-center rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"
        >
          ホームへ戻る
        </Link>
      </div>
    </main>
  );
}

// ✅ メタデータも同様に params を Promise として扱う
export async function generateMetadata(
  { params }: Props,
  _parent: ResolvingMetadata
) {
  const { token } = await params;
  return {
    title: `ページ: ${token}`,
    description: `トークン ${token} の詳細ページ`,
  };
}

// src/app/p/[token]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";

// ✅ Next.js 15: params は Promise になったので await が必要
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!token || typeof token !== "string") {
    notFound();
  }

  // ここで token を使ってデータ取得など
  // const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/p/${token}`, { cache: "no-store" });
  // const data = res.ok ? await res.json() : null;

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-xl font-bold">Token: {token}</h1>
      <p className="mt-2 text-slate-600">
        ここにトークンに基づくページ内容を表示します。
      </p>
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

// ✅ generateMetadata を使っている場合は同様に Promise を await
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return {
    title: `ページ: ${token}`,
    description: `トークン ${token} の詳細ページ`,
  };
}

// ※ generateStaticParams はそのままで OK（Promise ではない）
/*
export async function generateStaticParams() {
  return [{ token: "example" }];
}
*/

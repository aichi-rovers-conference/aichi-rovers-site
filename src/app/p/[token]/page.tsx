// src/app/p/[token]/page.tsx
import type { Metadata, ResolvingMetadata } from "next";

type AsyncPageProps = {
  // Next.js 15: params は Promise 経由
  params: Promise<{ token: string }>;
  // 必要なら:
  // searchParams?: Record<string, string | string[] | undefined>;
};

export async function generateMetadata(
  { params }: AsyncPageProps,
  _parent: ResolvingMetadata
): Promise<Metadata> {
  const { token } = await params;
  return {
    title: `Preview - ${token}`,
    description: "リンクプレビュー",
  };
}

export default async function Page({ params }: AsyncPageProps) {
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

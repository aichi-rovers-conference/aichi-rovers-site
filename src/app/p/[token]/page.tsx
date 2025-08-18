// src/app/p/[token]/page.tsx
import type { Metadata, ResolvingMetadata } from "next";

type PageProps = {
  params: { token: string };
  // searchParams?: Record<string, string | string[] | undefined>;
};

// ✅ 正しいシグネチャ（第1引数に { params }、第2引数は親メタ）
export async function generateMetadata(
  { params }: PageProps,
  _parent: ResolvingMetadata
): Promise<Metadata> {
  const { token } = params;
  return {
    title: `Preview - ${token}`,
    description: "リンクプレビュー",
  };
}

// ✅ ページ本体
export default async function Page({ params }: PageProps) {
  const { token } = params;

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

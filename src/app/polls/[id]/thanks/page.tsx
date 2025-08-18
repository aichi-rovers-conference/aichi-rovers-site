// src/app/polls/[id]/thanks/page.tsx
import Link from "next/link";
import type { ResolvingMetadata } from "next";

// ✅ Next.js 15 では params は Promise を想定
type Props = {
  params: Promise<{ id: string }>;
};

export default async function ThanksPage({ params }: Props) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">ご回答ありがとうございました</h1>
        <p className="mt-2 text-sm text-slate-600">
          アンケート（ID: <span className="font-mono">{id}</span>）へのご協力に感謝します。
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/polls/${encodeURIComponent(id)}`}
            className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            回答内容に戻る
          </Link>
          <Link
            href="/polls"
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            アンケート一覧へ
          </Link>
          <Link
            href="/"
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ARCホームへ
          </Link>
        </div>
      </div>
    </main>
  );
}

// ✅ メタデータも Promise params を待ってから生成
export async function generateMetadata(
  { params }: Props,
  _parent: ResolvingMetadata
) {
  const { id } = await params;
  return {
    title: `回答完了 | アンケート ${id}`,
    description: `アンケート（ID: ${id}）の回答が完了しました。`,
  };
}

// app/polls/[id]/thanks/page.tsx
import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

export const metadata: Metadata = {
  title: "ご回答ありがとうございました",
  description: "アンケート送信完了ページ",
};

export default async function ThanksPage({ params }: { params: { id: string } }) {
  const { id } = params;

  // セッション確認（ADMIN のみ運営ダッシュボードへ）
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value || "";
  const session = token ? await verifyToken(token) : null;
  const backHref = session && String((session as any).role) === "ADMIN" ? "/exec/polls" : "/polls";

  return (
    <main className="min-h-screen bg-slate-50">
      {/* ヘッダー（Googleフォーム風） */}
      <div className="h-44 w-full bg-gradient-to-r from-purple-600 to-indigo-600" />

      {/* カード（ヘッダーに重ねる） */}
      <div className="-mt-16 px-4 pb-24">
        <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white shadow-md">
          {/* タイトル行：左アクセントバー */}
          <header className="flex items-start gap-3 p-6">
            <div className="mt-1 h-6 w-1.5 rounded bg-purple-600" />
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-slate-800">送信を受け付けました</h1>
              <p className="mt-1 text-sm text-slate-500">
                アンケートID <span className="font-mono text-slate-700">{id}</span> の回答が正常に送信されました。
              </p>
            </div>
          </header>

          <div className="h-px w-full bg-slate-100" />

          {/* 本文 */}
          <section className="p-6">
            <div className="mx-auto grid place-items-center gap-3 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-purple-50">
                <span className="text-3xl">🎉</span>
              </div>
              <p className="text-slate-600">
                ご協力ありがとうございました。ブラウザを閉じても構いません。
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* 下側中央のリンク（Filled ボタン） */}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 flex justify-center">
        <Link
          href={backHref}
          prefetch
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-purple-600 px-6 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-purple-700"
          aria-label="アンケート一覧へ戻る"
        >
          アンケート一覧へ
        </Link>
      </div>
    </main>
  );
}

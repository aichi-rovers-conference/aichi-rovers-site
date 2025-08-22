// app/login/page.tsx  — サーバーコンポーネント（"use client" は不要）
import Link from "next/link";

export default async function ExecLoginPage({
  searchParams,
}: {
  // Next.js 15+ では searchParams は Promise
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  // 値を文字列に丸めるヘルパ
  const takeFirst = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  // /login?next=/exec のような相対パスのみ許可（オープンリダイレクト防止）
  const candidateNext = takeFirst(sp.next) || "/exec";
  const next =
    typeof candidateNext === "string" &&
    candidateNext.startsWith("/") &&
    !candidateNext.startsWith("//")
      ? candidateNext
      : "/exec";

  const err = takeFirst(sp.error) || null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <div className="h-2 w-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400" />
      <section className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="px-6 pt-6">
            <h1 className="text-2xl font-bold text-slate-900">運営委員ログイン</h1>
            <p className="mt-1 text-sm text-slate-600">
              ARC運営委員用アカウントでサインインしてください。
            </p>
          </header>

          {/* 通常のフォーム投稿。成功時は /api/auth/login が 303 で遷移 */}
          <form
            action={`/api/auth/login?next=${encodeURIComponent(next)}`}
            method="post"
            className="px-6 pb-6 pt-4 space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700">
                ユーザーID
              </label>
              <input
                name="username"
                type="text"
                autoComplete="username"
                required
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                placeholder="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                パスワード
              </label>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700 select-none">
              <input
                name="remember"
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-slate-300"
                value="on"
              />
              ログイン状態を保持（30日）
            </label>

            {err && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {err === "missing" && "入力に不足があります。"}
                {err === "invalid" && "ユーザーIDまたはパスワードが正しくありません。"}
                {err !== "missing" && err !== "invalid" && "ログインに失敗しました。"}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                キャンセル
              </Link>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                ログイン
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

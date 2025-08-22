// src/app/login/page.tsx
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ExecLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const take = (v: string | string[] | undefined) => Array.isArray(v) ? v[0] : v;

  const candidateNext = take(sp.next) || "/exec";
  const next = typeof candidateNext === "string" && candidateNext.startsWith("/") && !candidateNext.startsWith("//")
    ? candidateNext : "/exec";

  const err = take(sp.error);
  const auth = take(sp.auth);

  let errorText: string | null = null;
  if (err === "missing") errorText = "入力に不足があります。";
  else if (err === "invalid") errorText = "ユーザーIDまたはパスワードが正しくありません。";
  else if (err && !errorText) errorText = "ログインに失敗しました。";
  if (!errorText && auth === "expired") errorText = "ログインの有効期限が切れました。もう一度サインインしてください。";
  if (!errorText && auth === "required") errorText = "サインインが必要です。アカウントでログインしてください。";

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <div className="h-2 w-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400" />
      <section className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="px-6 pt-6">
            <h1 className="text-2xl font-bold text-slate-900">運営委員ログイン</h1>
            <p className="mt-1 text-sm text-slate-600">ARC運営委員用アカウントでサインインしてください。</p>
          </header>

          {/* 成功時：/api/auth/login が 200 HTML を返して JS で遷移 */}
          <form
            action={`/api/auth/login?next=${encodeURIComponent(next)}`}
            method="post"
            encType="application/x-www-form-urlencoded"
            className="px-6 pb-6 pt-4 space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700">ユーザーID</label>
              <input
                name="username"
                type="text"
                autoComplete="username"
                required
                autoCapitalize="none"
                autoCorrect="off"
                inputMode="text"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                placeholder="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">パスワード</label>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                autoCapitalize="none"
                autoCorrect="off"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700 select-none">
              <input name="remember" type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300" value="on" />
              ログイン状態を保持（30日）
            </label>

            {errorText && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorText}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Link href="/" className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">キャンセル</Link>
              <button type="submit" className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">ログイン</button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

// app/login/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function ExecLoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/exec"; // 認証成功後の遷移先（デフォルト /exec）

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true); // 30日保持
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ username, password, remember }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErr(data?.message || "ログインに失敗しました。");
        setLoading(false);
        return;
      }
      router.replace(next); // 成功 → /exec（または ?next=...）
    } catch (e) {
      setErr("ネットワークエラーが発生しました。");
      setLoading(false);
    }
  }

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

          <form onSubmit={onSubmit} className="px-6 pb-6 pt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                ユーザーID
              </label>
              <input
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                placeholder="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                パスワード
              </label>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700 select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              ログイン状態を保持（30日）
            </label>

            {err && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {err}
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
                disabled={loading}
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
              >
                {loading ? "ログイン中…" : "ログイン"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

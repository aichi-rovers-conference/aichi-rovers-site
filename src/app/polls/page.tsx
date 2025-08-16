// app/polls/page.tsx
"use client";

import useSWR from "swr";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useState, useCallback } from "react";
import { Home } from "lucide-react";
import { useRouter } from "next/navigation";

import PollCard from "./PollCard";
import ScrollProgressBar from "./ScrollProgressBar";

/* ===================== 型＆ユーティリティ ===================== */

type Poll = {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  votes?: { id: string }[];
};

const fetcher = (u: string) => fetch(u, { cache: "no-store" }).then((r) => r.json());

/* ===================== ページ本体 ===================== */

export default function PollsPage() {
  const { data, isLoading, mutate } = useSWR("/api/polls", fetcher);

  // APIの戻りが [{...}] でも {items:[...]} でも吸収
  const polls: Poll[] = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];

  const [isEditing, setIsEditing] = useState(false);

  const { scrollYProgress } = useScroll();
  const createScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.96]);

  // 削除（楽観的更新）
  const handleDelete = useCallback(
    async (id: string) => {
      const previous = polls;
      // 一旦UIから消す
      mutate(polls.filter((p) => p.id !== id), false);
      try {
        const res = await fetch(`/api/polls/${encodeURIComponent(id)}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete");
        await mutate(); // 最新を再取得
      } catch {
        // 失敗したら元に戻す
        mutate(previous, false);
      }
    },
    [polls, mutate]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 via-slate-50 to-slate-50">
        <ScrollProgressBar />
        <div className="h-2 w-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400" />
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200 shadow-sm">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl p-6">
          <div className="h-6 w-36 animate-pulse rounded bg-slate-200" />
          <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-slate-50 to-slate-50 text-slate-900">
      <ScrollProgressBar />

      {/* アクセント帯 */}
      <div className="h-2 w-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400" />

      {/* ヘッダー */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur shadow-sm">
        <div className="mx-auto grid max-w-6xl grid-cols-3 items-center px-6 py-3">
          {/* 左：トップへ */}
          <Link href="/" className="inline-block">
            <motion.span
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200"
              whileHover={{ y: -2, scale: 1.02, boxShadow: "0 10px 24px rgba(0,0,0,0.06)" }}
              whileTap={{ scale: 0.97, y: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 24, mass: 0.7 }}
              aria-label="ARCホームへ戻る"
            >
              <Home className="h-4 w-4" />
              ARCホームへ
            </motion.span>
          </Link>

          {/* 中央：ロゴ＋タイトル */}
          <div className="justify-self-center">
            <Link href="/" className="flex items-center gap-3">
              <Image src="/images/ARClogo.png" alt="ARC logo" width={28} height={28} />
              <span className="text-base font-semibold tracking-tight md:text-lg">ARCアンケート</span>
            </Link>
          </div>

          {/* 右：操作 */}
          <div className="justify-self-end flex items-center gap-2">
            {/* 運営ログイン（ID/パスモーダル → /polls/admin へ） */}
            <AdminLoginButton />
          </div>
        </div>
      </header>

      {/* メイン */}
      <main className="mx-auto max-w-6xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">アンケート一覧</h1>
            <p className="mt-1 text-sm text-slate-500">作成したアンケートは下のカードで確認できます。</p>
          </div>

          {/* スマホ用に運営ログインをここにも（必要なら） */}
          <div className="flex items-center gap-2 sm:hidden">
            <AdminLoginButton size="sm" />
          </div>
        </div>

        {/* グリッド */}
        {polls.length > 0 ? (
          <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] gap-5">
            {polls.map((p) => (
              <PollCard
                key={p.id}
                poll={p}
                isEditing={isEditing}
                onDelete={handleDelete}
                footer={
                  <div className={`flex items-center justify-center ${isEditing ? "pointer-events-none opacity-40" : ""}`}>
                    <Link href={`/polls/${p.id}`} className="inline-block">
                      <motion.span
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
                        whileHover={{ y: -2, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        回答はこちら
                      </motion.span>
                    </Link>
                  </div>
                }
              />
            ))}
          </div>
        ) : (
          // ★ ここを変更：作成ボタンを削除し、運営ログインのみ残す
          <div className="mt-6 rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-slate-600">まだアンケートがありません。</p>
            <p className="mt-1 text-sm text-slate-500">（運営委員の方は管理画面から作成できます）</p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <AdminLoginButton variant="ghost" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ===================== 運営ログインボタン（モーダルでID/パス入力 → /polls/admin） ===================== */

function AdminLoginButton({
  size = "md",
  variant = "solid",
}: {
  size?: "sm" | "md";
  variant?: "solid" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  const [id, setId] = useState("");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const base =
    "inline-flex items-center justify-center rounded-xl text-sm transition border border-slate-200";
  const solid = "bg-white px-4 py-2 hover:bg-slate-50 shadow-sm";
  const ghost = "bg-transparent px-3 py-2 hover:bg-slate-100";
  const smpad = size === "sm" ? "px-3 py-1.5" : "";
  const cls =
    variant === "ghost" ? `${base} ${ghost}` : `${base} ${solid} ${smpad}`;

  const submit = async () => {
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, password: pwd }),
      });
      if (res.ok) {
        setOpen(false);
        router.push("/polls/admin");
      } else {
        setErr("IDまたはパスワードが違います");
      }
    } catch {
      setErr("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="w-full max-w-sm rounded-xl bg-white p-5 shadow-lg"
              initial={{ scale: 0.98, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.98, y: 10, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="運営ログイン"
            >
              <h2 className="text-lg font-medium text-slate-800">運営ログイン</h2>
              <p className="mt-1 text-sm text-slate-500">IDとパスワードを入力してください。</p>

              <div className="mt-4 space-y-3">
                <input
                  className="w-full bg-transparent px-2 py-2 border-0 border-b border-slate-300 outline-none focus:border-violet-400"
                  placeholder="ID"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  autoFocus
                />
                <input
                  type="password"
                  className="w-full bg-transparent px-2 py-2 border-0 border-b border-slate-300 outline-none focus:border-violet-400"
                  placeholder="パスワード"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
                {err && <p className="text-sm text-rose-600">{err}</p>}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    className="text-sm text-slate-500 hover:underline"
                    onClick={() => setOpen(false)}
                    disabled={loading}
                  >
                    キャンセル
                  </button>
                  <button
                    className="rounded-md bg-slate-800 text-white px-3 py-2 text-sm hover:opacity-90 disabled:opacity-50"
                    onClick={submit}
                    disabled={loading}
                  >
                    {loading ? "送信中…" : "ログイン"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

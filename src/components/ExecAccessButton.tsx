// components/ExecAccessButton.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, X } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  mode?: "fab" | "inline";
  label?: string;
  className?: string;
};

export default function ExecAccessButton({
  mode = "fab",
  label = "運営委員専用",
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<{ username: string } | null>(null);
  const router = useRouter();

  // 起動時にセッション確認（機能は変更なし）
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        if (res.ok) {
          const j = await res.json();
          if (alive && j?.ok) setSession({ username: j.user?.username });
        }
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, []);

  const baseBtn =
    "inline-flex items-center gap-2 font-semibold transition focus:outline-none focus:ring-4 focus:ring-red-100";
  const inlineBtn =
    "rounded-full bg-red-700 text-white px-5 h-12 shadow hover:bg-red-600";
  const fabBtn =
    "fixed right-4 bottom-4 z-40 rounded-full bg-red-700 text-white px-4 h-12 shadow-md hover:bg-red-600";

  const onClick = () => {
    if (session) router.push("/exec"); // ログイン済 → 即ダッシュボードへ
    else setOpen(true); // 未ログイン → モーダル表示
  };

  return (
    <>
      {mode === "inline" ? (
        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={onClick}
          className={`${baseBtn} ${inlineBtn} ${className}`}
          aria-label="運営委員専用"
        >
          <Shield className="size-5" />
          <span>{session ? "運営委員ダッシュボードへ" : label}</span>
        </motion.button>
      ) : (
        <button
          onClick={onClick}
          className={`${baseBtn} ${fabBtn} ${className}`}
          aria-label="運営委員専用"
        >
          <Shield className="size-5" />
          <span>{session ? "ダッシュボード" : label}</span>
        </button>
      )}

      {/* デザインのみ刷新（機能は維持） */}
      <AnimatePresence>
        {!session && open && (
          <LoginModal
            onClose={() => setOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ----------------------- Modal（デザイン刷新） ----------------------- */
function LoginModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // Enter で送信（機能追加ではなくUX改善）
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" && username && password && !loading) {
        void submit();
      }
    },
    [username, password, loading]
  );

  async function submit() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 既存仕様を維持（username と id を同値で送る）
        body: JSON.stringify({ username, id: username, password, remember }),
      });
      if (!res.ok) {
        setErr("IDまたはパスワードが違います");
      } else {
        onClose();
        router.push("/exec");
      }
    } catch {
      setErr("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    // 画面全体を覆う・中央寄せ（小画面でも必ず中央）
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      aria-modal="true"
      role="dialog"
      aria-labelledby="exec-login-title"
      onKeyDown={handleKeyDown}
    >
      {/* オーバーレイ：半透明＋軽いぼかし */}
      <motion.div
        className="absolute inset-0 bg-black/40 backdrop-blur-[1.5px]"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* モーダル本体：幅/高さともにモバイル対応、はみ出し回避 */}
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="
          relative z-[101] w-full max-w-md
          rounded-2xl bg-white shadow-xl
          ring-1 ring-slate-200
          p-5 sm:p-6
          max-h-[85vh] overflow-auto
        "
      >
        {/* 閉じるボタン（右上固定） */}
        <button
          onClick={onClose}
          aria-label="閉じる"
          className="absolute right-3.5 top-3.5 inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/90 p-1.5 text-slate-600 hover:bg-slate-50 shadow-sm focus:outline-none focus:ring-4 focus:ring-red-100"
        >
          <X className="h-4 w-4" />
        </button>

        {/* ヘッダー */}
        <div className="mb-4">
          <h2
            id="exec-login-title"
            className="text-lg sm:text-xl font-bold text-slate-900"
          >
            運営委員ログイン
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            ARC運営委員用アカウントでサインインしてください。
          </p>
        </div>

        {/* フォーム */}
        <div className="grid gap-3">
          <label className="text-sm font-medium text-slate-700" htmlFor="exec-username">
            ユーザーID
          </label>
          <input
            id="exec-username"
            placeholder="ID（アンケートと同じ）"
            className="h-11 rounded-xl border border-gray-300 px-3 outline-none shadow-sm focus:ring-4 focus:ring-red-100 focus:border-red-600 transition"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            inputMode="text"
          />

          <label className="mt-2 text-sm font-medium text-slate-700" htmlFor="exec-password">
            パスワード
          </label>
          <input
            id="exec-password"
            placeholder="パスワード"
            type="password"
            className="h-11 rounded-xl border border-gray-300 px-3 outline-none shadow-sm focus:ring-4 focus:ring-red-100 focus:border-red-600 transition"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          <label className="mt-2 inline-flex items-center gap-2 text-sm text-gray-700 select-none">
            <input
              type="checkbox"
              className="size-4 rounded border-slate-300"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            ログイン状態を保持（30日）
          </label>

          {err && (
            <div className="mt-1 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {err}
            </div>
          )}

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              onClick={onClose}
              type="button"
              className="h-11 rounded-xl border border-slate-300 bg-white text-slate-800 font-semibold shadow-sm hover:bg-slate-50 transition"
            >
              キャンセル
            </button>
            <button
              onClick={submit}
              disabled={loading || !username || !password}
              className="h-11 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold shadow hover:opacity-95 transition disabled:opacity-50"
            >
              {loading ? "認証中…" : "ログイン"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

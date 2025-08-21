// components/ExecAccessButton.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield } from "lucide-react";

type Props = {
  mode?: "fab" | "inline";
  label?: string;       // 未ログイン時の表示
  className?: string;
};

export default function ExecAccessButton({
  mode = "fab",
  label = "運営委員ログイン",
  className = "",
}: Props) {
  const [session, setSession] = useState<{ username: string } | null>(null);

  // ざっくりログイン状態チェック
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        if (res.ok) {
          const j = await res.json();
          if (alive && j?.ok) setSession({ username: j.user?.username });
        }
      } catch { /* no-op */ }
    })();
    return () => { alive = false; };
  }, []);

  const baseBtn =
    "inline-flex items-center gap-2 font-semibold transition focus:outline-none focus:ring-4 focus:ring-indigo-100";
  const inlineBtn =
    "rounded-full bg-indigo-600 text-white px-5 h-12 shadow hover:bg-indigo-700";
  const fabBtn =
    "fixed right-4 bottom-4 z-40 rounded-full bg-indigo-600 text-white px-4 h-12 shadow-md hover:bg-indigo-700";

  const href = session ? "/exec" : "/login";
  const text = session ? "運営委員ダッシュボードへ" : label;

  return (
    <Link
      href={href}
      className={`${baseBtn} ${mode === "inline" ? inlineBtn : fabBtn} ${className}`}
      aria-label="運営委員専用"
    >
      <Shield className="size-5" />
      <span>{text}</span>
    </Link>
  );
}

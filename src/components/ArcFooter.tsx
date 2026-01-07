"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FaFacebook, FaInstagram, FaXTwitter, FaLine } from "react-icons/fa6";

type Social = {
  name: "Facebook" | "Instagram" | "X" | "LINE";
  href?: string; // 未開設は undefined
  color: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
};

const SOCIALS: Social[] = [
  {
    name: "Facebook",
    href: "https://www.facebook.com/aichirovers/?locale=ja_JP",
    color: "text-sky-600 hover:text-sky-500",
    Icon: FaFacebook,
  },
  { name: "Instagram", href: undefined, color: "text-pink-500", Icon: FaInstagram },
  { name: "X", href: undefined, color: "text-neutral-800", Icon: FaXTwitter },
  {
    name: "LINE",
    href: "https://lin.ee/BPXqTTv",
    color: "text-green-600 hover:text-green-500",
    Icon: FaLine,
  },
];

function SocialIcon({ s }: { s: Social }) {
  if (!s.href) {
    return (
      <span
        className={`${s.color} opacity-40 cursor-not-allowed transition-colors`}
        aria-disabled="true"
        title={`${s.name}（未開設）`}
      >
        <s.Icon size={26} className="sm:size-[28px]" />
      </span>
    );
  }
  return (
    <motion.a
      href={s.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={s.name}
      whileHover={{ y: -2, scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className={`${s.color} transition-transform`}
      title={s.name}
    >
      <s.Icon size={24} className="sm:size-[26px]" />
    </motion.a>
  );
}

/** 🔒 共通：運営委員リンク */
function ExecLink({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/exec"
      className={[
        "inline-flex items-center gap-1.5 text-slate-600 underline underline-offset-4 decoration-slate-200 hover:text-slate-900 hover:decoration-slate-700",
        "md:no-underline md:px-2.5 md:py-1 md:rounded-full md:border md:border-slate-200 md:hover:border-slate-300",
        "xl:border-0 xl:px-0 xl:py-0 xl:underline xl:decoration-slate-200 xl:hover:decoration-slate-700",
        className,
      ].join(" ")}
      aria-label="運営委員専用ページ"
    >
      <span aria-hidden className="text-[12px] md:text-[11px]">🔒</span>
      <span>運営委員専用ページ</span>
    </Link>
  );
}

export default function ArcFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-10 text-slate-700 border-t border-gray-200 bg-gradient-to-b from-white to-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        {/* PC（md以上）：3カラム */}
        <div className="hidden md:grid grid-cols-12 gap-8 py-10">
          {/* 左：ブランド/説明 */}
          <div className="col-span-5 self-center">
            <div className="text-xl font-bold tracking-tight text-slate-900">
              Aichi Rovers Conference
            </div>
            <p className="mt-2 text-sm text-slate-500">
              愛知ローバース会議の公式サイト。行事の参加管理、QR受付、アーカイブ等を提供しています。
            </p>
          </div>

          {/* 中央：SNS */}
          <div className="col-span-4 flex flex-col items-center justify-center">
            <p className="text-sm text-slate-500 mb-3">Follow us</p>
            <div className="flex items-center justify-center gap-6 sm:gap-7">
              {SOCIALS.map((s) => (
                <SocialIcon key={s.name} s={s} />
              ))}
            </div>
          </div>

          {/* 右：リンク */}
          <nav className="col-span-3">
            <p className="text-sm font-semibold text-slate-900">リンク</p>
            <ul className="mt-3 space-y-3 text-sm">
              <li>
                <Link
                  href="/privacy"
                  className="text-slate-700 hover:text-slate-900 underline underline-offset-4 decoration-slate-300 hover:decoration-slate-700"
                >
                  プライバシーポリシー
                </Link>
              </li>
              <li>
                {/* ✅ 強調ボタン風 */}
                <Link
                  href="/arc/register"
                  className="inline-block w-full rounded-full bg-indigo-600 px-4 py-2 text-center font-semibold text-white shadow hover:bg-indigo-500 hover:shadow-md transition"
                >
                  参加者登録はこちら
                </Link>
              </li>
              <li>
                <ExecLink />
              </li>
            </ul>
          </nav>
        </div>

        {/* モバイル（~md未満） */}
        <div className="md:hidden py-8">
          <div className="text-center">
            <div className="text-lg font-bold tracking-tight text-slate-900">
              Aichi Rovers Conference
            </div>
            <p className="mt-2 text-xs text-slate-500">
              行事の参加管理、QR受付、アーカイブ等を提供しています。
            </p>
          </div>

          {/* SNS */}
          <section className="mt-6">
            <div className="mx-auto max-w-sm flex justify-center gap-6">
              {SOCIALS.map((s) => (
                <SocialIcon key={s.name} s={s} />
              ))}
            </div>
          </section>

          {/* リンク（スマホ） */}
          <nav className="mt-6 text-center">
            <ul className="mt-3 space-y-3 text-sm">
              <li>
                <Link
                  href="/privacy"
                  className="text-slate-700 hover:text-slate-900 underline underline-offset-4 decoration-slate-300 hover:decoration-slate-700"
                >
                  プライバシーポリシー
                </Link>
              </li>
              <li>
                {/* ✅ スマホでもボタン風で強調 */}
                <Link
                  href="/arc/register"
                  className="inline-block w-full rounded-full bg-indigo-600 px-4 py-2 font-semibold text-white shadow hover:bg-indigo-500 hover:shadow-md transition"
                >
                  参加者登録はこちら
                </Link>
              </li>
              <li>
                <ExecLink />
              </li>
            </ul>
          </nav>
        </div>

        {/* コピーライト */}
        <div className="border-t border-gray-200 py-4 text-center">
          <p className="text-xs sm:text-sm text-slate-500">
            &copy; {year} Aichi Rovers Conference. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

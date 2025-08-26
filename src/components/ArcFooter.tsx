"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FaFacebook, FaInstagram, FaXTwitter, FaLine } from "react-icons/fa6";

type Social = {
  name: "Facebook" | "Instagram" | "X" | "LINE";
  href?: string;            // 未開設は undefined
  color: string;            // 色クラス（白基調に合う控えめトーン）
  Icon: React.ComponentType<{ size?: number; className?: string }>;
};

const SOCIALS: Social[] = [
  {
    name: "Facebook",
    href: "https://www.facebook.com/aichirovers/?locale=ja_JP",
    color: "text-sky-600 hover:text-sky-500",
    Icon: FaFacebook,
  },
  {
    name: "Instagram",
    href: undefined, // 未開設
    color: "text-pink-500",
    Icon: FaInstagram,
  },
  {
    name: "X",
    href: undefined, // 未開設
    color: "text-neutral-800",
    Icon: FaXTwitter,
  },
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

export default function ArcFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-10 text-slate-700 border-t border-gray-200 bg-gradient-to-b from-white to-slate-50">
      {/* NOTE: ミドルウェアのサインとして使っている虹色ラインはここには出しません */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        {/* PC（md以上）：3カラム */}
        <div className="hidden md:grid grid-cols-12 gap-8 py-10">
          {/* 左：ブランド/説明 */}
          <div className="col-span-5 self-center">
            <div className="text-xl font-bold tracking-tight text-slate-900">Aichi Rovers Conference</div>
            <p className="mt-2 text-sm text-slate-500">
              愛知連盟ローバース会議の公式サイト。行事の参加管理、QR受付、アーカイブ等を提供しています。
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
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link
                  href="/privacy"
                  className="text-slate-700 hover:text-slate-900 underline underline-offset-4 decoration-slate-300 hover:decoration-slate-700"
                >
                  プライバシーポリシー
                </Link>
              </li>
              {/* 利用規約を追加する場合は以下を有効化
              <li>
                <Link href="/terms" className="text-slate-700 hover:text-slate-900 underline underline-offset-4">
                  利用規約
                </Link>
              </li> */}
            </ul>
          </nav>
        </div>

        {/* モバイル（~md未満）：スタック */}
        <div className="md:hidden py-8">
          <div className="text-center">
            <div className="text-lg font-bold tracking-tight text-slate-900">Aichi Rovers Conference</div>
            <p className="mt-2 text-xs text-slate-500">行事の参加管理、QR受付、アーカイブ等を提供しています。</p>
          </div>

          {/* SNS */}
          <section className="mt-6">
            <div className="mx-auto max-w-sm flex justify-center gap-6">
              {SOCIALS.map((s) => (
                <SocialIcon key={s.name} s={s} />
              ))}
            </div>
          </section>

          {/* リンク */}
          <nav className="mt-6 text-center">
            <Link
              href="/privacy"
              className="text-sm text-slate-700 hover:text-slate-900 underline underline-offset-4 decoration-slate-300 hover:decoration-slate-700"
            >
              プライバシーポリシー
            </Link>
          </nav>
        </div>

        {/* コピーライト */}
        <div className="border-t border-gray-200 py-4 text-center">
          <p className="text-xs sm:text-sm text-slate-500">&copy; {year} Aichi Rovers Conference. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

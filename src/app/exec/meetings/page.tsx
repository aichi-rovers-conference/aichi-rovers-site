// app/exec/meeting/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, verifyToken } from "@/lib/auth";
import ArcHeader from "@/src/components/ArcHeader";
import Link from "next/link";
import React, { type ReactNode } from "react";
import {
  QrCode,
  Table,
  Images,
  ChevronRight,
  ArrowLeft,
  Mail, // ← 追加
} from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MeetingPage() {
  // 認証チェック
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value ?? "";
  const session = token ? await verifyToken(token) : null;
  if (!session) redirect("/?auth=required");

  const cards: {
    href: string;
    icon: ReactNode;
    title: string;
    desc?: string;
    accent?: "violet" | "amber" | "blue";
  }[] = [
    {
      href: "/exec/meetings/qr",
      icon: <QrCode className="size-7 md:size-8" />,
      title: "QR出席管理",
      desc: "各定例会ごとのQRチェックイン/チェックアウト、受付用画面の発行・管理",
      accent: "violet",
    },
    {
      href: "/exec/meetings/sheet",
      icon: <Table className="size-7 md:size-8" />,
      title: "出席管理シート",
      desc: "Excelライクな表で出席を編集・検索・フィルタ。CSV/Excelエクスポート対応",
      accent: "amber",
    },
    // ★ 追加：QRコードを載せたメール一斉送信用ページ
    {
      href: "/exec/meetings/qr/email",
      icon: <Mail className="size-7 md:size-8" />,
      title: "QRメール一斉送信",
      desc: "参加者へ各自のQRコードを一括送信。テンプレ編集・送信状況の確認",
      accent: "blue",
    },
    {
      href: "/exec/meetings/archive",
      icon: <Images className="size-7 md:size-8" />,
      title: "定例会アーカイブ作成",
      desc: "/arc/conference に表示する年度別アーカイブ（写真・概要・資料リンク）を作成・編集",
      accent: "blue",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      {/* アクセント帯＋共通ヘッダー */}
      <div className="h-2 w-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400" />
      <ArcHeader />

      <main className="mx-auto max-w-7xl px-4 md:px-8 py-10">
        {/* 見出し */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Meetings ダッシュボード
            </h1>
            <p className="mt-2 text-sm md:text-base text-slate-600">
              定例会に関する「QR出席管理」「出席管理シート」「QRメール一斉送信」「アーカイブ作成」へ素早くアクセスします。
            </p>
          </div>
        </div>

        {/* クイックリンク */}
        <section className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {cards.map((c) => (
            <QuickCard
              key={c.href}
              href={c.href}
              icon={c.icon}
              title={c.title}
              desc={c.desc}
              accent={c.accent}
            />
          ))}
        </section>
      </main>
    </div>
  );
}

/* ---------------- QuickCard ---------------- */
function QuickCard({
  href,
  icon,
  title,
  desc,
  accent = "violet",
}: {
  href: string;
  icon: ReactNode;
  title: string;
  desc?: string;
  accent?: "violet" | "amber" | "blue";
}) {
  const accentMap: Record<string, string> = {
    violet:
      "bg-violet-50 group-hover:bg-violet-100 text-violet-700 border-violet-100",
    amber:
      "bg-amber-50 group-hover:bg-amber-100 text-amber-700 border-amber-100",
    blue: "bg-blue-50 group-hover:bg-blue-100 text-blue-700 border-blue-100",
  };

  return (
    <Link
      href={href}
      className="
        group block h-full rounded-3xl border border-slate-200/70 bg-white/90 backdrop-blur
        p-5 sm:p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition transform
        min-h-[9rem]
      "
    >
      <div className="grid grid-cols-[auto,1fr,auto] items-start gap-4">
        <div
          className={`shrink-0 rounded-xl p-3 border ${accentMap[accent]}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-lg md:text-xl font-bold text-slate-900 leading-tight">
            {title}
          </h3>
          {desc && (
            <p className="mt-1 text-sm md:text-[0.95rem] text-slate-600 line-clamp-2">
              {desc}
            </p>
          )}
        </div>
        <ChevronRight className="size-5 text-slate-400 group-hover:text-slate-700 transition mt-1" />
      </div>
      <span className="sr-only">Link to {title}</span>
    </Link>
  );
}

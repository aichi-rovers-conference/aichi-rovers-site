// app/exec/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import ArcHeader from "@/src/components/ArcHeader";
import Link from "next/link";
import React, { type ReactNode } from "react";
import styles from "./exec.module.css";
import ClientRole from "@/src/components/ClientRole";
import {
  ShieldCheck,
  Users,
  CalendarDays,
  ClipboardList,
  ChevronRight,
  LogOut,
  UserCog,
  CalendarCheck,
} from "lucide-react";

// 追加：必ずSSRで再評価（ログアウト後の見え残り防止）
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ExecPage() {
  // ← ここは await が必要
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value ?? "";
  const session = token ? await verifyToken(token) : null;
  

  if (!session) {
    redirect("/?auth=required");
  }

  const isAdmin = session.role === "ADMIN";
  const isSuper = 
    session.isSuper === true;

  const links: {
    href: string;
    icon: ReactNode;
    title: string;
    desc?: string;
    accent?: "red" | "amber" | "blue" | "green";
  }[] = [
    {
      href: "/exec/participants",
      icon: <Users className="size-6 md:size-7 xl:size-8" />,
      title: "参加者管理",
      desc: "名簿の追加・検索・所属やRS年齢の編集",
      accent: "red",
    },
    {
      href: "/exec/meetings",
      icon: <CalendarDays className="size-6 md:size-7 xl:size-8" />,
      title: "定例会の管理",
      desc: "定例会の作成・出席管理・集計ダウンロード",
      accent: "amber",
    },
    {
      href: "/exec/polls",
      icon: <ClipboardList className="size-6 md:size-7 xl:size-8" />,
      title: "アンケート管理",
      desc: "アンケートの作成・公開・回答状況の確認",
      accent: "blue",
    },
  ];

  const canEditCalendar = session.role === "ADMIN" || session.role === "EDITOR" || isSuper;

  if(canEditCalendar) {
    links.push({
      href: "/exec/calendar",
      icon: <CalendarCheck className="size-6 md:size-7 xl:size-8" />,
      title: "事業カレンダー管理",
      desc: "募集と年間スケジュールの追加・編集・公開設定",
      accent: "red",
    });
  }

  if (isSuper) {
    links.push({
      href: "/exec/CommitteeManage",
      icon: <UserCog className="size-6 md:size-7 xl:size-8" />,
      title: "運営委員管理",
      desc: "ユーザーの登録・権限の管理",
      accent: "green",
    });
  }

  const gridClass = isAdmin
    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-4 gap-5 lg:gap-6 2xl:gap-8"
    : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6 2xl:gap-8";

  return (
    // ✨ 横はみ出しをクリップ
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 overflow-x-clip">
      <div className="h-2 w-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400" />
      <ArcHeader />
      <main className="mx-auto px-4 md:px-8 py-10 max-w-7xl xl:max-w-[88rem] 2xl:max-w-[96rem]">
        {/* ヒーロー */}
        {/* ✨ 相対配置 + 横はみ出しクリップ */}
        <section className={`${styles.hero} relative overflow-x-clip`}>
          {/* ✨ 右端内に収める（-right をやめる）。blur のはみ出しも clip で消える */}
          <div className="absolute -top-24 right-0 translate-x-1/4 w-72 h-72 rounded-full bg-red-100 blur-3xl opacity-60 pointer-events-none" />

          <div className="relative z-10 flex items-start gap-5">
            <div className="shrink-0 rounded-2xl bg-red-600/90 text-white p-3 md:p-3.5 xl:p-4 shadow">
              <ShieldCheck className="size-7 md:size-8 xl:size-9" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl xl:text-4xl 2xl:text-5xl font-extrabold tracking-tight">
                運営委員ダッシュボード
              </h1>
              <p className="mt-2 text-gray-700 text-base md:text-lg">
                ようこそ、<span className="font-semibold">{String(session.username)}</span> さん（
                <ClientRole fallbackRole={String(session.role)} fallbackSuper={isSuper} />
                ）
              </p>
              <p className="mt-2 text-sm md:text-base text-gray-500 max-w-prose">
                参加者・会・アンケートの管理にすばやくアクセスできます。
              </p>
            </div>
          </div>
        </section>

        {/* クイックリンク（列数をロールで切替） */}
        <section className={`mt-10 ${gridClass}`}>
          {links.map((it) => (
            <QuickLink
              key={it.title}
              href={it.href}
              icon={it.icon}
              title={it.title}
              desc={it.desc}
              accent={it.accent}
            />
          ))}
        </section>

        {/* ログアウト */}
        <section className="mt-12">
          <form method="post" action="/api/auth/logout?next=/">
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-gray-900 text-white px-5 h-12 text-base md:text-lg shadow hover:bg-black transition"
              title="ログアウト"
            >
              <LogOut className="size-5 md:size-6" />
              ログアウト
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

/* --------------- サブ：クイックリンクカード --------------- */
function QuickLink({
  href,
  icon,
  title,
  desc,
  accent = "red",
}: {
  href: string;
  icon: ReactNode;
  title: string;
  desc?: string;
  accent?: "red" | "amber" | "blue" | "green";
}) {
  const accentMap: Record<string, string> = {
    red: "bg-red-50 group-hover:bg-red-100 text-red-700",
    amber: "bg-amber-50 group-hover:bg-amber-100 text-amber-700",
    blue: "bg-blue-50 group-hover:bg-blue-100 text-blue-700",
    green: "bg-green-50 group-hover:bg-green-100 text-green-700",
  };

  return (
    <Link
      href={href}
      className="
        group block h-full rounded-3xl border border-gray-200/70 bg-white/90 backdrop-blur
        p-5 sm:p-6 lg:p-7 2xl:p-8 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition transform
        min-h-[9rem] lg:min-h-[10.5rem] 2xl:min-h-[12rem]
      "
    >
      <div className="grid grid-cols-[auto,1fr,auto] items-start gap-4 lg:gap-5">
        <div className={`shrink-0 rounded-xl p-3 sm:p-3.5 lg:p-4 ${accentMap[accent]}`}>
          {icon}
        </div>

        <div className="min-w-0">
          <h3 className="text-lg sm:text-xl lg:text-2xl 2xl:text-[1.6rem] font-bold text-gray-900 leading-tight">
            {title}
          </h3>
          {desc && (
            <p className="mt-1 text-sm sm:text-[0.95rem] lg:text-base 2xl:text-[1.05rem] text-gray-600 line-clamp-2">
              {desc}
            </p>
          )}
        </div>

        <ChevronRight className="size-5 sm:size-6 text-gray-400 group-hover:text-gray-700 transition mt-1" />
      </div>
      <span className="sr-only">Link to {title}</span>
    </Link>
  );
}

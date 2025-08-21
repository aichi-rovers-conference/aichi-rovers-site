// app/exec/meetings/sheet/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, verifyToken } from "@/lib/auth";
import ArcHeader from "@/components/ArcHeader";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Suspense } from "react";
import MeetingSheetClient from "./SheetClient"; // ← "use client" な子

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MeetingSheetPage() {
  // 認証チェック（サーバー）
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value ?? "";
  const session = token ? await verifyToken(token) : null;
  if (!session) redirect("/?auth=required");

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      {/* ヘッダー（クライアント） */}
      <div className="h-2 w-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400" />
      <ArcHeader />

      <main className="mx-auto max-w-7xl px-4 md:px-8 py-8">
        {/* タイトル & 戻る */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">出席管理シート</h1>
            <p className="mt-2 text-sm md:text-base text-slate-600">
              メイン（集計）シートと、各地区の詳細シートをExcelライクに編集できます。
            </p>
          </div>
        </div>

        {/* 本体（完全クライアント）。グラフは SheetClient 側で dynamic import */}
        <section className="mt-6">
          <Suspense
            fallback={
              <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
                読み込み中…
              </div>
            }
          >
            <MeetingSheetClient />
          </Suspense>
        </section>
      </main>
    </div>
  );
}

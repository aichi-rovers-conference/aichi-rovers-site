// app/exec/meetings/qr/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ArcHeader from "@/src/components/ArcHeader";
import Link from "next/link";
import QRListClient from "./qr-list-client";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

export default async function QRPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value ?? "";
  const session = token ? await verifyToken(token) : null;
  if (!session) redirect("/?auth=required");

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <div className="h-2 w-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400" />
      <ArcHeader />
      <main className="mx-auto max-w-7xl px-4 md:px-8 py-8">
        {/* ヘッダー行：PCではタイトル左・ボタン右、スマホではタイトルのみ */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight">QR リスト（配布用）</h1>

          {/* PC/タブレット用ボタン（md以上で表示） */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/exec/meetings/qr/email"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold hover:bg-slate-50"
              title="QRコードをメールで一斉配信"
            >
              メール一斉送信へ
            </Link>
            <Link
              href="/exec/meetings/qr/scan"
              className="rounded-xl bg-gray-900 text-white px-4 py-2 font-semibold shadow hover:bg-black"
            >
              読み取りページへ
            </Link>
          </div>
        </div>

        {/* 説明文（スマホ・PC共通） */}
        <p className="mt-2 text-sm text-slate-600">
          定例会を選び、各参加者のQRコードを印刷・配布できます。メールで配る場合は「メール一斉送信へ」からどうぞ。
        </p>

        {/* スマホ用ボタン：説明文の下に配置（md未満で表示） */}
        <div className="mt-4 flex flex-col sm:flex-row gap-2 md:hidden">
          <Link
            href="/exec/meetings/qr/scan"
            className="rounded-xl bg-gray-900 text-white px-4 py-2 font-semibold text-center shadow hover:bg-black"
          >
            読み取りページへ
          </Link>
        </div>

        <section className="mt-6">
          <QRListClient />
        </section>
      </main>
    </div>
  );
}
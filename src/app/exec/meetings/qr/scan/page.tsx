// app/exec/meetings/qr/scan/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ArcHeader from "@/src/components/ArcHeader";
import Link from "next/link";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import QRScanClient from "../scan-client";

export default async function QRScanPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value ?? "";
  const session = token ? await verifyToken(token) : null;
  if (!session) redirect("/?auth=required");

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <div className="h-2 w-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400" />
      <ArcHeader />

      <main className="mx-auto max-w-7xl px-4 md:px-8 py-8">
        {/* ヘッダー行：モバイルでも1行固定 */}
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          {/* タイトル：<md は短縮表示＋省略、md以上は元の長文 */}
          <h1 className="flex-1 min-w-0 font-extrabold tracking-tight text-2xl md:text-2xl whitespace-nowrap truncate">
            <span className="md:hidden">QRチェックイン</span>
            <span className="hidden md:inline">QR 読み取り（チェックイン）</span>
          </h1>

          {/* 右側ボタン：折り返し禁止＆縮まない */}
          <Link
            href="/exec/meetings/qr"
            className="shrink-0 whitespace-nowrap rounded-xl bg-gray-900 text-white px-3 md:px-4 py-2 text-sm md:text-base font-semibold shadow hover:bg-black"
          >
            <span className="md:hidden">QRリスト</span>
            <span className="hidden md:inline">QR リストへ</span>
          </Link>
        </div>

        {/* 説明文：モバイルでは少し短く */}
        <p className="mt-2 text-sm text-slate-600">
          <span className="md:hidden">
            カメラで QR を読み取り、出席を記録します。開始を押すと全画面スキャンに切り替わります。
          </span>
          <span className="hidden md:inline">
            スマホ/PC カメラで QR を読み取り、出席を記録します。開始を押すと全画面スキャンに切り替わります。
          </span>
        </p>

        <section className="mt-6">
          <QRScanClient />
        </section>
      </main>
    </div>
  );
}

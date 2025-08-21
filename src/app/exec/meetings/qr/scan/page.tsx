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
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight">QR 読み取り（チェックイン）</h1>
          <Link href="/exec/meetings/qr" className="rounded-xl bg-gray-900 text-white px-4 py-2 font-semibold shadow hover:bg-black">
            QR リストへ
          </Link>
        </div>
        <p className="mt-2 text-sm text-slate-600">スマホ/PC カメラで QR を読み取り、出席を記録します。</p>

        <section className="mt-6">
          <QRScanClient />
        </section>
      </main>
    </div>
  );
}

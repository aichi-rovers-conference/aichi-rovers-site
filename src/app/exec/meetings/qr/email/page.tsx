// app/exec/meetings/qr/email/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, verifyToken } from "@/lib/auth";
import ArcHeader from "@/src/components/ArcHeader";
import Link from "next/link";
import EmailQRClient from "./EmailQRClient";
import { ArrowLeft, Mail } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function QREmailPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value ?? "";
  const session = token ? await verifyToken(token) : null;
  if (!session) redirect("/?auth=required");

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <div className="h-2 w-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400" />
      <ArcHeader />

      <main className="mx-auto max-w-7xl px-4 md:px-8 py-10">
        {/* 見出し */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-xl bg-blue-50 text-blue-700 px-2.5 py-1 text-xs font-semibold border border-blue-100">
              <Mail className="h-4 w-4" />
              QRメール一斉送信
            </div>
            <h1 className="mt-2 text-2xl md:text-3xl font-extrabold tracking-tight">
              定例会QRコードをメールで一括配信
            </h1>
            <p className="mt-2 text-sm md:text-base text-slate-600">
              参加者のメール宛に、各自のQRコード（またはリンク）をまとめて送信します。テンプレート内では{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5">{"{{name}}"}</code>、{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5">{"{{meeting}}"}</code>、{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5">{"{{qr_url}}"}</code> が使えます。
            </p>
          </div>
        </div>

        {/* 本体 */}
        <section className="mt-8">
          <EmailQRClient />
        </section>
      </main>
    </div>
  );
}

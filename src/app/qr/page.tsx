// app/qr/page.tsx
import { Suspense } from "react";
import QRPublicPage from "./QRPublicPage";

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xl font-bold">QR</div>
            <p className="mt-2 text-slate-600 text-sm">読み込み中…</p>
          </div>
        </main>
      }
    >
      <QRPublicPage />
    </Suspense>
  );
}

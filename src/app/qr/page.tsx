// src/app/qr/page.tsx
import { Suspense } from "react";
import QrClient from "./QrClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="w-full py-10 text-center text-slate-500">読み込み中…</div>}>
      <QrClient />
    </Suspense>
  );
}

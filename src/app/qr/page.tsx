"use client";

import { useMemo } from "react";
import QRCode from "qrcode";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function QRPublicPage() {
  const sp = useSearchParams();
  const meeting = sp.get("meeting") || "";
  const id = sp.get("id") || "";
  const name = sp.get("name") || "";
  const [url, setUrl] = useState<string>("");

  const payload = useMemo(() => {
    if (!meeting || !id) return null;
    return JSON.stringify({ v: 1, type: "arc-attendance", meeting, participantId: id, name });
  }, [meeting, id, name]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!payload) return;
      const dataUrl = await QRCode.toDataURL(payload, { width: 480, margin: 1 });
      if (alive) setUrl(dataUrl);
    })();
    return () => { alive = false; };
  }, [payload]);

  if (!meeting || !id) {
    return <div className="p-6 text-sm text-rose-600">リンクが不完全です。</div>;
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-sm text-slate-500">{meeting}</div>
        <div className="text-xl font-bold">{name}</div>
        <div className="mt-4 aspect-square grid place-items-center bg-slate-50 rounded-lg overflow-hidden">
          {url ? <img src={url} alt={`${name} - ${meeting}`} className="w-full h-full object-contain" /> : "生成中…"}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          会場受付でこのQRを提示してください。
        </p>
      </div>
    </div>
  );
}

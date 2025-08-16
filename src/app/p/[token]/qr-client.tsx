"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function QRClient({
  meeting,
  participantId,
  name,
}: {
  meeting: string;
  participantId: string;
  name: string;
}) {
  const [url, setUrl] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const payload = { v: 1, type: "arc-attendance", meeting, participantId, name };
        const dataUrl = await QRCode.toDataURL(JSON.stringify(payload), {
          width: 360,
          margin: 1,
        });
        if (alive) setUrl(dataUrl);
      } catch (e: any) {
        if (alive) setErr(e?.message || "QRの生成に失敗しました");
      }
    })();
    return () => {
      alive = false;
    };
  }, [meeting, participantId, name]);

  return (
    <div className="grid gap-3">
      <div className="aspect-square rounded-xl bg-slate-50 grid place-items-center overflow-hidden">
        {url ? (
          <img src={url} alt="出席用QRコード" className="w-full h-full object-contain" />
        ) : err ? (
          <span className="text-sm text-rose-600">{err}</span>
        ) : (
          <span className="text-sm text-slate-500">生成中…</span>
        )}
      </div>

      {url && (
        <a
          href={url}
          download={`${meeting}_${name}.png`}
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
        >
          画像を保存（PNG）
        </a>
      )}
    </div>
  );
}

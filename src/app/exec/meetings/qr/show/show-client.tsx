// app/exec/meetings/qr/show/show-client.tsx
"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function ShowQRClient({
  meeting,
  participantId,
  name,
}: {
  meeting: string;
  participantId: string;
  name?: string;
}) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    const payload = JSON.stringify({
      v: 1,
      type: "arc-attendance",
      meeting,
      participantId,
      name,
    });

    (async () => {
      try {
        const dataUrl = await QRCode.toDataURL(payload, {
          width: 1024,        // 高解像度生成 → CSSで縮小
          margin: 0,          // 画像側の余白はゼロ
          color: { dark: "#111827", light: "#ffffff" }, // 背景は白で統一
        });
        setUrl(dataUrl);
      } catch {
        setUrl("");
      }
    })();
  }, [meeting, participantId, name]);

  return (
    <div className="h-full w-full select-none">
      {url ? (
        <img
          src={url}
          alt="QR"
          className="block h-full w-full object-contain rounded-xl bg-white"
          draggable={false}
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-slate-400 text-sm">生成中…</div>
      )}
    </div>
  );
}

// app/exec/meetings/qr/qr-list-client.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import QRCode, { type QRCodeToDataURLOptions } from "qrcode";
import { ChevronDown } from "lucide-react";

type Participant = {
  id: string;
  name: string;
  troop: string;
  district: string;
  rsAge: number | null;
};

export default function QRListClient() {
  const [meetingCodes, setMeetingCodes] = useState<string[]>([]);
  const [meeting, setMeeting] = useState<string>("");
  const [list, setList] = useState<Participant[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/meetings/list", { cache: "no-store" });
        const j = await r.json();
        const codes: string[] = Array.isArray(j?.codes) ? j.codes : [];
        setMeetingCodes(codes);
        if (!meeting && codes.length) setMeeting(codes[codes.length - 1]);
      } catch {}
    })();
    (async () => {
      try {
        const r = await fetch("/api/participants", { cache: "no-store" });
        const j = await r.json();
        setList(Array.isArray(j?.items) ? j.items : []);
      } catch {}
    })();
  }, []);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return list;
    return list.filter(p =>
      [p.name, p.troop, p.district, String(p.rsAge ?? "")]
        .join(" ")
        .toLowerCase()
        .includes(k)
    );
  }, [q, list]);

  return (
    <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <select
            value={meeting}
            onChange={(e) => setMeeting(e.target.value)}
            className="appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-8 text-sm font-medium shadow-sm focus:outline-none focus:ring-4 focus:ring-violet-100 focus:border-violet-500"
            title="定例会を選択"
          >
            {meetingCodes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="名前 / 団 / 地区 で検索"
          className="ml-auto w-64 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none shadow-sm focus:ring-4 focus:ring-violet-100 focus:border-violet-500"
        />

        {/* ← ここ追加：選択中の会を引き継いでメールページへ */}
        <Link
          href={`/exec/meetings/qr/email${meeting ? `?meeting=${encodeURIComponent(meeting)}` : ""}`}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
          title="この会のQRをメールで配布"
        >
          メール配布へ
        </Link>
      </div>

      {!meeting && (
        <p className="mt-3 text-sm text-rose-600">定例会コードがありません。先に /exec/meetings/sheet で列を追加してください。</p>
      )}

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filtered.map(p => (
          <QRCard key={p.id} p={p} meeting={meeting} />
        ))}
      </div>
    </div>
  );
}

function QRCard({ p, meeting }: { p: Participant; meeting: string }) {
  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const payload = {
        v: 1,
        type: "arc-attendance",
        meeting,
        participantId: p.id,
        name: p.name,
      };
      const text = JSON.stringify(payload);
      try {
        const dataUrl = await QRCode.toDataURL(text, { width: 320, margin: 1 } satisfies QRCodeToDataURLOptions as any);
        if (alive) setUrl(dataUrl);
      } catch {}
    })();
    return () => { alive = false; };
  }, [p.id, p.name, meeting]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-slate-500">{meeting || "未選択"}</div>
      <div className="mt-1 font-semibold text-slate-900">{p.name}</div>
      <div className="text-xs text-slate-500">{p.district} / {p.troop}</div>
      <div className="mt-3 aspect-square grid place-items-center bg-slate-50 rounded-lg overflow-hidden">
        {url ? <img src={url} alt={`${p.name} - ${meeting}`} className="w-full h-full object-contain" /> : <span className="text-slate-400 text-sm">生成中…</span>}
      </div>
      {url && (
        <a download={`${meeting}_${p.name}.png`} href={url} className="mt-3 inline-block rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
          ダウンロード
        </a>
      )}
    </div>
  );
}

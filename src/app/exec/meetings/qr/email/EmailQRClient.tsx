// src/app/exec/meetings/qr/email/EmailQRClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, Send, MailCheck, Loader2, Filter, QrCode, AlertTriangle } from "lucide-react";
import QRCode from "qrcode";
import { renderTemplate } from "@/src/lib/mailTemplate";
import { buildPreviewQrUrl, buildQrPayload } from "@/src/lib/qr";

type Participant = {
  id: string;
  name: string;
  troop: string;
  district: string;
  rsAge: number | null;
  email?: string | null;
};

type SendFailure = {
  id: string;
  to: string;
  error: string;
  reason: string;
  code?: any;
  respCode?: any;
};

export default function EmailQRClient() {
  const params = useSearchParams();
  const meetingParam = params.get("meeting") || "";

  const [meetingCodes, setMeetingCodes] = useState<string[]>([]);
  const [meeting, setMeeting] = useState("");
  const [list, setList] = useState<Participant[]>([]);
  const [q, setQ] = useState("");
  const [onlyHasEmail, setOnlyHasEmail] = useState(true);

  const [subject, setSubject] = useState("【ARC】{{meeting}} 受付用QRコードのご案内");
  const [body, setBody] = useState(
    [
      "こんにちは、{{name}} さん。",
      "",
      "次回の定例会 {{meeting}} の受付用QRコードです。",
      "当日、受付でこのQRを提示してください。",
      "",
      "▼QRを表示するリンク",
      "{{qr_url}}",
      "",
      "※このメールに画像としてQRを添付している場合は、画像を提示してもOKです。",
      "",
      "Aichi Rovers Conference 事務局",
    ].join("\n")
  );

  const [sending, setSending] = useState(false);
  const [queued, setQueued] = useState<{ ok: number; ng: number } | null>(null);
  const [sentReport, setSentReport] = useState<{ sent: number; failed: number; remaining: number } | null>(null);
  const [lastFailures, setLastFailures] = useState<SendFailure[] | null>(null);
  const [hints, setHints] = useState<string[] | null>(null);

  // 初期ロード
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/meetings/list", { cache: "no-store" });
        const j = await r.json();
        const codes: string[] = Array.isArray(j?.codes) ? j.codes : [];
        setMeetingCodes(codes);
        if (meetingParam && codes.includes(meetingParam)) {
          setMeeting(meetingParam);
        } else if (!meeting && codes.length) {
          setMeeting(codes[codes.length - 1]);
        }
      } catch {}
    })();
    (async () => {
      try {
        const r = await fetch("/api/participants?limit=1000", { cache: "no-store" });
        const j = await r.json();
        setList(Array.isArray(j?.items) ? j.items : []);
      } catch {}
    })();
  }, [meetingParam]); // eslint-disable-line react-hooks/exhaustive-deps

  // フィルタリング
  const filtered = useMemo(() => {
    const key = q.trim().toLowerCase();
    let arr = list;
    if (onlyHasEmail) arr = arr.filter((p) => !!p.email);
    if (!key) return arr;
    return arr.filter((p) =>
      [p.name, p.troop, p.district, p.email || ""].join(" ").toLowerCase().includes(key)
    );
  }, [q, list, onlyHasEmail]);

  // 選択管理
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const allChecked = filtered.length > 0 && filtered.every((p) => selected[p.id]);
  const anyChecked = filtered.some((p) => selected[p.id]);
  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected]);

  const toggleAll = () => {
    if (allChecked) {
      const next = { ...selected };
      for (const p of filtered) delete next[p.id];
      setSelected(next);
    } else {
      const next = { ...selected };
      for (const p of filtered) if (p.email) next[p.id] = true;
      setSelected(next);
    }
  };

  // キュー投入
  const enqueueBulk = async () => {
    if (!meeting) return alert("定例会コードを選択してください");
    if (selectedIds.length === 0) return alert("送信対象を選んでください");
    setSending(true);
    setQueued(null);
    setSentReport(null);
    setLastFailures(null);
    setHints(null);
    try {
      const res = await fetch("/api/meetings/qr/email/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          meetingCode: meeting,
          subject,
          body, // サーバー側で renderTemplate & /p/[token] を組み立て
          participantIds: selectedIds,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || j?.error || `enqueue failed: ${res.status}`);
      setQueued({ ok: Number(j?.enqueued || j?.ok || 0), ng: Number(j?.failed || 0) });
    } catch (e: any) {
      alert(e?.message || "キュー投入に失敗しました");
    } finally {
      setSending(false);
    }
  };

  // 即送信
  const sendNow = async (max = 100) => {
    setSending(true);
    setSentReport(null);
    setLastFailures(null);
    setHints(null);
    try {
      const res = await fetch("/api/meetings/qr/email/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ max }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || j?.error || `send failed: ${res.status}`);

      setSentReport({
        sent: Number(j?.sent || 0),
        failed: Number(j?.failed || 0),
        remaining: Number(j?.remaining || 0),
      });

      if (Array.isArray(j?.failures)) setLastFailures(j.failures as SendFailure[]);
      if (Array.isArray(j?.hints)) setHints(j.hints as string[]);
    } catch (e: any) {
      alert(e?.message || "送信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  // プレビュー関連
  const previewTarget = filtered.find((p) => selected[p.id]) || filtered[0];
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string>("");

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!previewTarget || !meeting) {
        setQrPreviewUrl("");
        return;
      }
      try {
        const payload = buildQrPayload(meeting, previewTarget.id, previewTarget.name);
        const dataUrl = await QRCode.toDataURL(payload, { width: 240, margin: 1 });
        if (alive) setQrPreviewUrl(dataUrl);
      } catch {
        if (alive) setQrPreviewUrl("");
      }
    })();
    return () => {
      alive = false;
    };
  }, [previewTarget?.id, previewTarget?.name, meeting]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const previewQrUrl = previewTarget && meeting ? buildPreviewQrUrl(origin, meeting, previewTarget.id) : "";

  const previewSubject =
    previewTarget && meeting
      ? renderTemplate(subject, { name: previewTarget.name, meeting, qr_url: previewQrUrl })
      : subject;

  const previewBody =
    previewTarget && meeting
      ? renderTemplate(body, { name: previewTarget.name, meeting, qr_url: previewQrUrl })
      : body;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr),minmax(22rem,28rem)] gap-6">
      {/* 左側：対象選択とテンプレ編集 */}
      <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-4 md:p-5">
        {/* 上段：会選択 / 検索 */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <select
              value={meeting}
              onChange={(e) => setMeeting(e.target.value)}
              className="appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-8 text-sm font-medium shadow-sm focus:outline-none focus:ring-4 focus:ring-violet-100 focus:border-violet-500"
              title="定例会を選択"
            >
              {meetingCodes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <Filter className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="名前 / 団 / 地区 / メール"
                className="w-64 rounded-lg border border-slate-300 bg-white pl-7 pr-3 py-2 text-sm outline-none shadow-sm focus:ring-4 focus:ring-violet-100 focus:border-violet-500"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-xs text-slate-700 select-none">
              <input
                type="checkbox"
                className="size-4"
                checked={onlyHasEmail}
                onChange={(e) => setOnlyHasEmail(e.target.checked)}
              />
              メールありのみ
            </label>
          </div>
        </div>

        {/* リスト */}
        <div className="mt-4 rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between bg-slate-50 px-3 py-2">
            <div className="text-sm">
              対象者 <b>{filtered.length}</b> 名
              <span className="text-slate-400">（チェック中: {selectedIds.length}）</span>
            </div>
            <button
              type="button"
              onClick={toggleAll}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-slate-50"
            >
              {allChecked ? "全て外す" : "全て選ぶ"}
            </button>
          </div>

          <div className="max-h-[360px] overflow-auto divide-y divide-slate-200">
            {filtered.map((p) => {
              const checked = !!selected[p.id];
              const disabled = !p.email;
              return (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 px-3 py-2 text-sm ${
                    disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="size-4"
                    disabled={disabled}
                    checked={checked}
                    onChange={(e) => setSelected((s) => ({ ...s, [p.id]: e.target.checked }))}
                  />
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900">
                      {p.name}
                      <span className="ml-2 text-xs text-slate-500">
                        {p.district} / {p.troop}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 break-all">{p.email || "（メール未登録）"}</div>
                  </div>
                </label>
              );
            })}
            {filtered.length === 0 && (
              <div className="px-3 py-6 text-sm text-slate-500">該当する参加者がいません。</div>
            )}
          </div>
        </div>

        {/* テンプレ編集 */}
        <div className="mt-6 grid gap-3">
          <label className="text-sm font-semibold text-slate-800">件名</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none shadow-sm focus:ring-4 focus:ring-violet-100 focus:border-violet-500"
          />
          <label className="mt-3 text-sm font-semibold text-slate-800">本文（テキスト）</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none shadow-sm focus:ring-4 focus:ring-violet-100 focus:border-violet-500"
          />
          <p className="text-xs text-slate-500">
            使える変数： <code className="bg-slate-100 px-1 py-0.5 rounded">{"{{name}}"}</code>{" "}
            <code className="bg-slate-100 px-1 py-0.5 rounded">{"{{meeting}}"}</code>{" "}
            <code className="bg-slate-100 px-1 py-0.5 rounded">{"{{qr_url}}"}</code>
          </p>
        </div>

        {/* アクション */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={enqueueBulk}
            disabled={sending || !anyChecked || !meeting}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 text-white px-5 h-11 text-sm md:text-base shadow hover:bg-black transition disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
            選択した宛先をキューに追加
          </button>

          <button
            onClick={() => sendNow(100)}
            disabled={sending}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 h-11 text-sm hover:bg-slate-50"
            title="保留中のメールを即送信（最大100通）"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            キューを送信（100通）
          </button>

          {queued && (
            <span className="text-sm text-slate-600">
              キュー追加: <b className="text-emerald-700">{queued.ok}</b> 件 / 失敗:{" "}
              <b className="text-rose-700">{queued.ng}</b> 件
            </span>
          )}
          {sentReport && (
            <span className="text-sm text-slate-600">
              送信: <b className="text-emerald-700">{sentReport.sent}</b> 件 / 失敗:{" "}
              <b className="text-rose-700">{sentReport.failed}</b> 件 / 残り: {sentReport.remaining}
            </span>
          )}
        </div>

        {/* 失敗のヒント */}
        {hints && hints.length > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 mt-0.5" />
            <div>
              <b>ヒント:</b> {hints.join(" / ")}
            </div>
          </div>
        )}

        {/* 詳細（折りたたみ） */}
        {lastFailures && lastFailures.length > 0 && (
          <details className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <summary className="cursor-pointer text-sm text-slate-700">
              失敗の詳細（{lastFailures.length}件）
            </summary>
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              {lastFailures.map((f) => (
                <li key={f.id} className="break-all">
                  <b>{f.to}</b> … {f.reason}{" "}
                  <span className="text-slate-400">({f.error})</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {/* 右：プレビュー */}
      <aside className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-4 md:p-5">
        <h3 className="text-sm font-semibold text-slate-800">プレビュー</h3>
        {!previewTarget ? (
          <p className="mt-2 text-sm text-slate-500">対象者を選ぶとプレビューが表示されます。</p>
        ) : (
          <>
            <div className="mt-2 rounded-xl border border-slate-200 p-3 bg-slate-50">
              <div className="text-sm text-slate-700">
                <b>To:</b> {previewTarget.name}{" "}
                <span className="text-slate-400">({previewTarget.email || "メール未登録"})</span>
              </div>
              <div className="mt-1 text-sm text-slate-700">
                <b>件名:</b> {previewSubject}
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs text-slate-500 mb-1">本文（差し込み後イメージ）</div>
              <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm whitespace-pre-wrap">
                {previewBody}
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <QrCode className="h-3.5 w-3.5" />
                QR画像プレビュー（メールに埋め込む/リンク先で表示）
              </div>
              <div className="aspect-square rounded-lg border border-slate-200 bg-slate-50 grid place-items-center overflow-hidden">
                {qrPreviewUrl ? (
                  <img src={qrPreviewUrl} alt="QR preview" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-slate-400 text-xs">未選択</span>
                )}
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

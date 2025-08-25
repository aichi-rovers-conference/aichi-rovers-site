// app/exec/meetings/qr/scan-client.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { CheckCircle2, Camera, CameraOff, List, History } from "lucide-react";

type ScanResult = {
  ok: boolean;
  message?: string;
  meeting?: { code: string };
  participant?: { id: string; name: string; troop?: string; district?: string };
  attendance?: { checkedAt?: string; already: boolean };
};

const LIST_URL = "/exec/meetings/sheet"; // ← 環境に合わせて変更

export default function QRScanClient() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [mounted, setMounted] = useState(false);       // Portal準備
  const [running, setRunning] = useState(false);       // 開始で全画面に
  const [last, setLast] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [histOpen, setHistOpen] = useState(false);     // 履歴ドロワー
  const [showConfirm, setShowConfirm] = useState(false); // 前面トースト
  const lastTextRef = useRef<string>("");

  useEffect(() => setMounted(true), []);

  // 起動中はボディスクロール無効化（iOS含む）
  useEffect(() => {
    const el = document.documentElement;
    const body = document.body;
    if (running) {
      el.classList.add("overflow-hidden", "overscroll-none");
      body.classList.add("overflow-hidden", "overscroll-none");
    } else {
      el.classList.remove("overflow-hidden", "overscroll-none");
      body.classList.remove("overflow-hidden", "overscroll-none");
    }
    return () => {
      el.classList.remove("overflow-hidden", "overscroll-none");
      body.classList.remove("overflow-hidden", "overscroll-none");
    };
  }, [running]);

  useEffect(() => {
    let controls: import("@zxing/browser").IScannerControls | null = null;

    async function start() {
      if (!videoRef.current) return;
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();

      controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        async (result) => {
          if (!result) return;
          try {
            const text = result.getText();
            if (text === lastTextRef.current) return;
            lastTextRef.current = text;

            let payload: any;
            try {
              payload = JSON.parse(text);
            } catch {
              setLast({ ok: false, message: "QRの内容が不正です（JSONではありません）" });
              setShowConfirm(true);
              return;
            }
            if (!payload || payload.type !== "arc-attendance" || !payload.meeting || !payload.participantId) {
              setLast({ ok: false, message: "不正なQRです（必須フィールド不足）" });
              setShowConfirm(true);
              return;
            }

            const r = await fetch("/api/attendance/checkin", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload),
            });

            const j = await r.json().catch(() => ({}));
            let normalized: ScanResult;
            if (r.ok && j?.ok) {
              const meetingCode: string = j?.meeting?.code ?? j?.meeting ?? payload.meeting ?? "";
              const already: boolean = j?.attendance?.already ?? j?.already ?? false;
              const checkedAt: string | undefined = j?.attendance?.checkedAt ?? j?.checkedAt ?? undefined;
              const participant = {
                id: j?.participant?.id ?? j?.participantId ?? payload.participantId,
                name: j?.participant?.name ?? j?.name ?? "",
                troop: j?.participant?.troop,
                district: j?.participant?.district,
              };
              normalized = {
                ok: true,
                meeting: { code: meetingCode },
                participant,
                attendance: { already, checkedAt },
              };
            } else {
              normalized = { ok: false, message: j?.error || r.statusText || "保存に失敗しました" };
            }

            setLast(normalized);
            setHistory((h) => [normalized, ...h].slice(0, 20));
            setShowConfirm(true);
          } catch {
            setLast({ ok: false, message: "読み取り処理に失敗しました" });
            setShowConfirm(true);
          } finally {
            setTimeout(() => { lastTextRef.current = ""; }, 600);
            setTimeout(() => setShowConfirm(false), 2200);
          }
        }
      );
    }

    if (running) {
      start().catch(() => {
        setLast({ ok: false, message: "カメラの初期化に失敗しました" });
        setShowConfirm(true);
      });
    }

    return () => {
      if (controls) {
        try { controls.stop(); } catch {}
      }
    };
  }, [running]);

  const confirmText =
    last?.ok
      ? `${last.participant?.name || "（氏名不明）"} さん\n${last.meeting?.code ?? "—"} の出席を記録しました${last.attendance?.already ? "（既出席）" : ""}`
      : (last?.message ?? "");

  // ===== 開始前：通常カードUI =====
  const PreView = (
    <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setRunning(true)}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm bg-emerald-600 text-white"
        >
          <Camera className="h-4 w-4" />
          カメラ開始
        </button>
        <button
          onClick={() => setHistOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold shadow-sm bg-white text-slate-900 ring-1 ring-slate-200"
        >
          <History className="h-4 w-4" />
          履歴を見る
        </button>
        <span className="text-xs text-slate-500">カメラ許可が必要です。暗い場所では読み取り精度が落ちます。</span>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-black/5 aspect-video grid place-items-center">
        <div className="text-center p-6 text-slate-600">
          <div className="text-lg font-semibold">QR読み取りを開始できます</div>
          <div className="mt-1 text-sm">「カメラ開始」を押すと全画面スキャンに切り替わります。</div>
        </div>
      </div>

      {/* 履歴（開始前は中央モーダル） */}
      {histOpen && (
        <div className="fixed inset-0 z-[999] grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-center justify-between p-3">
              <h3 className="text-sm font-semibold text-slate-800">読み取り履歴（直近20件）</h3>
              <button onClick={() => setHistOpen(false)} className="text-sm rounded-md px-2 py-1 ring-1 ring-slate-200">
                閉じる
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-3 pb-4 space-y-2">
              {history.length === 0 && <div className="text-xs text-slate-500">まだありません</div>}
              {history.map((h, i) => (
                <div key={i} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  {h.ok ? (
                    <div className="truncate">
                      <b>{h.participant?.name || "（氏名不明）"}</b> / {h.meeting?.code ?? "—"} /{" "}
                      {h.attendance?.already ? "既出席" : "新規"} /{" "}
                      {h.attendance?.checkedAt ? new Date(h.attendance.checkedAt).toLocaleString() : "—"}
                    </div>
                  ) : (
                    <span className="text-rose-600">{h.message}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <button className="fixed inset-0 -z-10" onClick={() => setHistOpen(false)} aria-label="close history" />
        </div>
      )}
    </div>
  );

  // ===== 開始後：全画面オーバーレイ（Portalでbody直下に、超高z-index） =====
  const Overlay = (
    <div
      className="fixed inset-0 z-[1000] bg-black"
      // iPhoneノッチ対策：セーフエリア余白
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      {/* カメラ映像 */}
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover" />

      {/* 上バー */}
      <div className="pointer-events-auto absolute left-0 right-0 top-0 z-[1001] p-3">
        <div className="flex flex-nowrap gap-2">
          <button
            onClick={() => setRunning(false)}
            className="shrink-0 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold shadow-sm bg-rose-600 text-white"
          >
            <CameraOff className="h-4 w-4" />
            停止
          </button>

          

          <button
            onClick={() => setHistOpen(true)}
            className="shrink-0 inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold shadow-sm bg-white/90 text-slate-900 backdrop-blur"
            aria-expanded={histOpen}
          >
            <History className="h-4 w-4" />
            履歴
          </button>
        </div>
      </div>

      {/* 読み取り確認：前面トースト */}
      {showConfirm && last && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1001] p-4 pb-6">
          <div
            className={`pointer-events-auto w-full rounded-2xl px-4 py-3 text-base font-semibold shadow-2xl ring-1 backdrop-blur ${
              last.ok ? "bg-emerald-600/95 text-white ring-emerald-300/50" : "bg-rose-600/95 text-white ring-rose-300/50"
            }`}
          >
            <div className="flex items-start gap-2">
              {last.ok && <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />}
              <div className="whitespace-pre-line leading-tight">
                {last?.ok
                  ? `${last.participant?.name || "（氏名不明）"} さん\n${last.meeting?.code ?? "—"} の出席を記録しました${
                      last.attendance?.already ? "（既出席）" : ""
                    }`
                  : last?.message}
                {last?.ok && last?.attendance?.checkedAt && (
                  <div className="text-xs opacity-90 mt-1">時刻: {new Date(last.attendance.checkedAt).toLocaleString()}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 履歴ドロワー */}
      <div
        className={`absolute inset-x-0 bottom-0 z-[1001] max-h-[60svh] translate-y-full rounded-t-2xl bg-white shadow-lg ring-1 ring-slate-200 transition-transform duration-300 ${
          histOpen ? "!translate-y-0" : ""
        }`}
      >
        <div className="px-4 pt-2 pb-3">
          <div className="mx-auto mt-1 h-1.5 w-12 rounded-full bg-slate-300" />
          <div className="mt-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">読み取り履歴（直近20件）</h3>
            <button onClick={() => setHistOpen(false)} className="text-sm rounded-md px-2 py-1 ring-1 ring-slate-200">
              閉じる
            </button>
          </div>
          <div className="mt-2 max-h-[44svh] overflow-y-auto space-y-2">
            {history.length === 0 && <div className="text-xs text-slate-500">まだありません</div>}
            {history.map((h, i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                {h.ok ? (
                  <div className="truncate">
                    <b>{h.participant?.name || "（氏名不明）"}</b> / {h.meeting?.code ?? "—"} /{" "}
                    {h.attendance?.already ? "既出席" : "新規"} /{" "}
                    {h.attendance?.checkedAt ? new Date(h.attendance.checkedAt).toLocaleString() : "—"}
                  </div>
                ) : (
                  <span className="text-rose-600">{h.message}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ドロワー外クリックで閉じる */}
      {histOpen && (
        <button
          aria-label="close history"
          onClick={() => setHistOpen(false)}
          className="absolute inset-0 z-[1000] bg-black/10"
        />
      )}
    </div>
  );

  // 表示
  if (!running) return PreView;
  return mounted ? createPortal(Overlay, document.body) : null;
}

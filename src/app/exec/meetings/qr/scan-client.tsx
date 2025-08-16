// app/exec/meetings/qr/scan-client.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Camera, CameraOff } from "lucide-react";

type ScanResult = {
  ok: boolean;
  message?: string;
  meeting?: { code: string };
  participant?: { id: string; name: string; troop?: string; district?: string };
  attendance?: { checkedAt?: string; already: boolean };
};

export default function QRScanClient() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [running, setRunning] = useState(false);
  const [last, setLast] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanResult[]>([]);
  const lastTextRef = useRef<string>(""); // 連続同一QRの弾き用

  useEffect(() => {
    let controls: import("@zxing/browser").IScannerControls | null = null;

    async function start() {
      if (!videoRef.current) return;
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();

      controls = await reader.decodeFromVideoDevice(
        undefined, // 既定カメラ
        videoRef.current,
        async (result, err) => {
          if (!result) return; // 読み取り無し（初期化中など）は無視

          try {
            const text = result.getText();
            // 同一フレーム/連続読み取りの揺れを軽減
            if (text === lastTextRef.current) return;
            lastTextRef.current = text;

            // QR payload の検証
            let payload: any;
            try {
              payload = JSON.parse(text);
            } catch {
              setLast({ ok: false, message: "QRの内容が不正です（JSONではありません）" });
              return;
            }
            if (
              !payload ||
              payload.type !== "arc-attendance" ||
              !payload.meeting ||
              !payload.participantId
            ) {
              setLast({ ok: false, message: "不正なQRです（必須フィールド不足）" });
              return;
            }

            // サーバーに QR をそのまま送る（キー名のズレ回避）
            const r = await fetch("/api/attendance/checkin", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload),
            });

            const j = await r.json().catch(() => ({}));

            // 応答の正規化：どちらの形でも UI に載せられるように吸収
            // 1) { ok, already, meeting:"R6-1", participantId, name, checkedAt }
            // 2) { ok, meeting:{code}, participant:{...}, attendance:{checkedAt, already} }
            let normalized: ScanResult;
            if (r.ok && j?.ok) {
              const meetingCode: string =
                j?.meeting?.code ?? j?.meeting ?? payload.meeting ?? "";
              const already: boolean =
                j?.attendance?.already ?? j?.already ?? false;
              const checkedAt: string | undefined =
                j?.attendance?.checkedAt ?? j?.checkedAt ?? undefined;
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
              normalized = {
                ok: false,
                message: j?.error || r.statusText || "保存に失敗しました",
              };
            }

            setLast(normalized);
            setHistory((h) => [normalized, ...h].slice(0, 20));
          } catch {
            setLast({ ok: false, message: "読み取り処理に失敗しました" });
          } finally {
            // 少し待って同一QRの連続判定を解除
            setTimeout(() => {
              lastTextRef.current = "";
            }, 600);
          }
        }
      );
    }

    if (running) {
      start().catch(() => {
        setLast({ ok: false, message: "カメラの初期化に失敗しました" });
      });
    }

    return () => {
      if (controls) {
        try {
          controls.stop();
        } catch {}
      }
    };
  }, [running]);

  return (
    <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-4 md:p-5">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setRunning((v) => !v)}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold shadow-sm ${
            running ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
          }`}
        >
          {running ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
          {running ? "停止" : "カメラ開始"}
        </button>
        <span className="text-xs text-slate-500">カメラ許可が必要です。暗い場所では読み取り精度が落ちます。</span>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-black/5">
        <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-video bg-black/60" />
      </div>

      {last && (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 ${
            last.ok ? "border-emerald-300 bg-emerald-50" : "border-rose-300 bg-rose-50"
          }`}
        >
          {last.ok ? (
            <>
              <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                <CheckCircle2 className="h-5 w-5" />
                出席を記録しました
              </div>
              <div className="mt-1 text-sm text-emerald-800">
                {last.participant?.name || "（氏名不明）"}
                {last.participant?.district ? `（${last.participant.district}` : ""}
                {last.participant?.troop ? ` / ${last.participant.troop}` : ""}
                {last.participant?.district ? "）" : ""}
                <br />
                {last.meeting?.code ?? "—"} / {last.attendance?.already ? "既に出席済み（時刻を保持）" : "新規出席"} / 時刻:{" "}
                {last.attendance?.checkedAt ? new Date(last.attendance.checkedAt).toLocaleString() : "—"}
              </div>
            </>
          ) : (
            <div className="text-rose-700 font-semibold">{last.message}</div>
          )}
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-slate-800">読み取り履歴（直近20件）</h3>
        <div className="mt-2 space-y-2">
          {history.length === 0 && <div className="text-xs text-slate-500">まだありません</div>}
          {history.map((h, i) => (
            <div key={i} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              {h.ok ? (
                <>
                  <b>{h.participant?.name || "（氏名不明）"}</b> / {h.meeting?.code ?? "—"} /{" "}
                  {h.attendance?.already ? "既出席" : "新規"} /{" "}
                  {h.attendance?.checkedAt ? new Date(h.attendance.checkedAt).toLocaleString() : "—"}
                </>
              ) : (
                <span className="text-rose-600">{h.message}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

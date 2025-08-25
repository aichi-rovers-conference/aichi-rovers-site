// app/exec/meetings/qr/scan-client.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Camera, CameraOff, History, Sun, Loader2 } from "lucide-react";

type ScanResult = {
  ok: boolean;
  message?: string;
  meeting?: { code: string };
  participant?: { id: string; name: string; troop?: string; district?: string };
  attendance?: { checkedAt?: string; already: boolean };
};

const LIST_URL = "/exec/meetings/sheet";

// エスカレーションの閾値（秒）
const SEC_TO_TRY_HARDER = 2.5;
const SEC_TO_FULLHD = 5.0;

type ScanMode = "fast-720p" | "hard-720p" | "hard-1080p";

type PendingConfirm = {
  rawText: string;
  meetingCode: string;
  participantId: string;
  name?: string;
};

export default function QRScanClient() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [running, setRunning] = useState(false);
  const [last, setLast] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [histOpen, setHistOpen] = useState(false);
  const [showConfirmToast, setShowConfirmToast] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  // ステータス表示
  const [mode, setMode] = useState<ScanMode>("fast-720p");

  // 確認モーダル & ロック
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const lockedRef = useRef(false);

  // 送信中フラグ（UI反映）
  const [submitting, setSubmitting] = useState(false);

  const controlsRef = useRef<import("@zxing/browser").IScannerControls | null>(null);
  const mediaTrackRef = useRef<MediaStreamTrack | null>(null);
  const lastTextRef = useRef<string>("");
  const lastSuccessAtRef = useRef<number>(0);

  useEffect(() => setMounted(true), []);

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

  async function toggleTorch() {
    const track = mediaTrackRef.current;
    if (!track) return;
    const caps: any = (track as any).getCapabilities?.();
    if (!caps || !caps.torch) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] as any });
      setTorchOn((v) => !v);
    } catch {}
  }

  async function startScanner(nextMode: ScanMode) {
    if (controlsRef.current) {
      try { controlsRef.current.stop(); } catch {}
      controlsRef.current = null;
    }
    try {
      const track = mediaTrackRef.current;
      mediaTrackRef.current = null;
      if (track) track.stop();
    } catch {}

    setMode(nextMode);

    const [{ BrowserMultiFormatReader }, lib] = await Promise.all([
      import("@zxing/browser"),
      import("@zxing/library"),
    ]);
    const { BarcodeFormat, DecodeHintType } = lib as any;

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
    hints.set(DecodeHintType.ALSO_INVERTED, true);
    hints.set(DecodeHintType.TRY_HARDER, nextMode !== "fast-720p");

    const reader = new BrowserMultiFormatReader(hints);

    const base720 = { width: { ideal: 1280, max: 1280 }, height: { ideal: 720, max: 720 } };
    const base1080 = { width: { ideal: 1920, max: 1920 }, height: { ideal: 1080, max: 1080 } };
    const use1080 = nextMode === "hard-1080p";

    const constraints: MediaStreamConstraints = {
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        ...(use1080 ? base1080 : base720),
        frameRate: { ideal: 30, max: 30 },
        advanced: [{ focusMode: "continuous" } as any],
      },
    };

    controlsRef.current = await reader.decodeFromConstraints(constraints, videoRef.current!, async (result) => {
      if (!result) return;
      if (lockedRef.current) return;

      try {
        const text = result.getText();
        if (!text || text === lastTextRef.current) return;
        lastTextRef.current = text;

        let payload: any;
        try {
          payload = JSON.parse(text);
        } catch {
          setLast({ ok: false, message: "QRの内容が不正です（JSONではありません）" });
          setShowConfirmToast(true);
          setTimeout(() => { lastTextRef.current = ""; }, 800);
          setTimeout(() => setShowConfirmToast(false), 2200);
          return;
        }
        if (!payload || payload.type !== "arc-attendance" || !payload.meeting || !payload.participantId) {
          setLast({ ok: false, message: "不正なQRです（必須フィールド不足）" });
          setShowConfirmToast(true);
          setTimeout(() => { lastTextRef.current = ""; }, 800);
          setTimeout(() => setShowConfirmToast(false), 2200);
          return;
        }

        const meetingCode: string = payload.meeting ?? "";
        const participantId: string = payload.participantId ?? "";
        const name: string | undefined = payload.name;
        setPending({ rawText: text, meetingCode, participantId, name });
        lockedRef.current = true;
        setConfirmOpen(true);
      } catch {
        lockedRef.current = false;
        setLast({ ok: false, message: "読み取り処理に失敗しました" });
        setShowConfirmToast(true);
        setTimeout(() => { lastTextRef.current = ""; }, 800);
        setTimeout(() => setShowConfirmToast(false), 2200);
      }
    });

    try {
      const stream = (videoRef.current!.srcObject as MediaStream) ?? null;
      mediaTrackRef.current = stream?.getVideoTracks?.()[0] ?? null;
    } catch {
      mediaTrackRef.current = null;
    }
  }

  useEffect(() => {
    if (!running) return;

    let mounted = true;
    lastSuccessAtRef.current = performance.now();

    const tick = async () => {
      if (!mounted) return;
      const elapsedSec = (performance.now() - lastSuccessAtRef.current) / 1000;

      if (mode === "fast-720p" && elapsedSec >= SEC_TO_TRY_HARDER) {
        await startScanner("hard-720p");
      } else if (mode === "hard-720p" && elapsedSec >= SEC_TO_FULLHD) {
        await startScanner("hard-1080p");
      }
      timer = window.setTimeout(tick, 500);
    };

    let timer = window.setTimeout(tick, 500);
    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [running, mode]);

  useEffect(() => {
    if (!running) return;

    startScanner("fast-720p").catch(() => {
      setLast({ ok: false, message: "カメラの初期化に失敗しました" });
      setShowConfirmToast(true);
    });

    return () => {
      if (controlsRef.current) {
        try { controlsRef.current.stop(); } catch {}
        controlsRef.current = null;
      }
      try {
        const track = mediaTrackRef.current;
        mediaTrackRef.current = null;
        if (track) track.stop();
      } catch {}
      setTorchOn(false);
      setMode("fast-720p");
      lockedRef.current = false;
      setConfirmOpen(false);
      setPending(null);
      setSubmitting(false);
    };
  }, [running]);

  // ====== 確認モーダルの操作 ======
  async function onConfirmRecord() {
    if (!pending || submitting) return;
    setSubmitting(true);
    // 軽い触覚フィードバック（対応端末のみ）
    try { (navigator as any).vibrate?.(10); } catch {}

    try {
      const r = await fetch("/api/attendance/checkin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: pending.rawText,
      });
      const j = await r.json().catch(() => ({}));

      let normalized: ScanResult;
      if (r.ok && j?.ok) {
        const meetingCode: string = j?.meeting?.code ?? j?.meeting ?? pending.meetingCode ?? "";
        const already: boolean = j?.attendance?.already ?? j?.already ?? false;
        const checkedAt: string | undefined = j?.attendance?.checkedAt ?? j?.checkedAt ?? undefined;
        const participant = {
          id: j?.participant?.id ?? pending.participantId,
          name: j?.participant?.name ?? pending.name ?? "",
          troop: j?.participant?.troop,
          district: j?.participant?.district,
        };
        normalized = { ok: true, meeting: { code: meetingCode }, participant, attendance: { already, checkedAt } };
        lastSuccessAtRef.current = performance.now();
      } else {
        normalized = { ok: false, message: j?.error || r.statusText || "保存に失敗しました" };
      }

      setLast(normalized);
      setHistory((h) => [normalized, ...h].slice(0, 20));
      setShowConfirmToast(true);
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
      setPending(null);
      lockedRef.current = false;
      lastTextRef.current = "";
      setTimeout(() => setShowConfirmToast(false), 2200);
    }
  }

  function onCancelRecord() {
    if (submitting) return; // 送信中はキャンセル不可
    setConfirmOpen(false);
    setPending(null);
    lockedRef.current = false;
    lastTextRef.current = "";
  }

  // ===== UI（開始前） =====
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
        <span className="text-xs text-slate-500">QRをかざすと毎回確認画面が出ます。</span>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-black/5 aspect-video grid place-items-center">
        <div className="text-center p-6 text-slate-600">
          <div className="text-lg font-semibold">QR読み取りを開始できます</div>
          <div className="mt-1 text-sm">「カメラ開始」を押すと全画面スキャンに切り替わります。</div>
        </div>
      </div>
    </div>
  );

  // ===== 開始後：全画面オーバーレイ =====
  const Overlay = (
    <div
      className="fixed inset-0 z-[1000] bg-black"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover" />

      {/* 上バー */}
      <div className="pointer-events-auto absolute left-0 right-0 top-0 z-[1001] p-3">
        <div className="flex flex-nowrap items-center gap-2">
          <button
            onClick={() => setRunning(false)}
            className="shrink-0 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold shadow-sm bg-rose-600 text-white"
          >
            <CameraOff className="h-4 w-4" />
            停止
          </button>

          <button
            onClick={toggleTorch}
            className={`shrink-0 inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold shadow-sm ${
              torchOn ? "bg-amber-500 text-white" : "bg-white/90 text-slate-900 backdrop-blur"
            }`}
            title="トーチ（対応端末のみ）"
          >
            <Sun className="h-4 w-4" />
            {torchOn ? "点灯中" : "トーチ"}
          </button>

          <span className="ml-auto text-xs rounded-md bg-white/80 px-2 py-1 ring-1 ring-slate-300 text-slate-700">
            Mode: {mode}
          </span>

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

      {/* 確認モーダル */}
      {confirmOpen && pending && (
        <div className="absolute inset-0 z-[1002] grid place-items-center bg-black/40 p-4">
          <div
            className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
            aria-busy={submitting}
          >
            {/* 送信中の上部薄いプログレス */}
            {submitting && (
              <div className="absolute inset-x-0 top-0 h-1 overflow-hidden rounded-t-2xl">
                <div className="h-full w-full animate-pulse bg-emerald-500/70" />
              </div>
            )}

            <div className="p-4">
              <div className="text-sm text-slate-600">出席の確認</div>
              <div className="mt-1 text-base font-semibold text-slate-900">
                {pending.name ? `${pending.name} さん` : "（氏名不明）"}
              </div>
              <div className="mt-1 text-sm text-slate-700">
                ミーティング: <b>{pending.meetingCode || "—"}</b>
              </div>
              <div className="mt-0.5 text-xs text-slate-500">参加者ID: {pending.participantId}</div>

              {/* SR向けライブ領域 */}
              <div className="sr-only" aria-live="polite">
                {submitting ? "記録中です…" : ""}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={onCancelRecord}
                  disabled={submitting}
                  aria-disabled={submitting}
                  className="rounded-lg px-4 py-2 text-sm font-semibold ring-1 ring-slate-200 bg-white text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  いいえ、やり直す
                </button>

                <button
                  onClick={onConfirmRecord}
                  disabled={submitting}
                  aria-disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-emerald-600 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      記録中…
                    </>
                  ) : (
                    "はい、記録する"
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* 背景クリックで閉じないようダミーを置く（フォーカス抜け防止） */}
          <button className="fixed inset-0 -z-10" aria-label="no-close" />
        </div>
      )}

      {/* 保存結果トースト */}
      {showConfirmToast && last && (
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

      {/* 履歴ドロワー（割愛：前回と同じ） */}
      {histOpen && (
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
      )}

      {histOpen && (
        <button
          aria-label="close history"
          onClick={() => setHistOpen(false)}
          className="absolute inset-0 z-[1000] bg-black/10"
        />
      )}
    </div>
  );

  if (!running) return PreView;
  return mounted ? createPortal(Overlay, document.body) : null;
}

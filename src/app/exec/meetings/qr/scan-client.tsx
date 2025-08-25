// app/exec/meetings/qr/scan-client.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Camera, CameraOff, History, Sun } from "lucide-react";

type ScanResult = {
  ok: boolean;
  message?: string;
  meeting?: { code: string };
  participant?: { id: string; name: string; troop?: string; district?: string };
  attendance?: { checkedAt?: string; already: boolean };
};

const ROI_RATIO = 0.6; // 画面中央の 60% 四方だけを解析（0.5~0.7程度がおすすめ）

export default function QRScanClient() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [running, setRunning] = useState(false);
  const [last, setLast] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [histOpen, setHistOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const mediaTrackRef = useRef<MediaStreamTrack | null>(null);
  const lastTextRef = useRef<string>("");

  // ZXing フォールバック用
  const zxingReaderRef = useRef<any>(null);
  const rafIdRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => setMounted(true), []);

  // ボディスクロール無効
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

  // トーチ切替
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

  // 1) BarcodeDetector（対応なら高速）→ ROI検出
  async function startWithBarcodeDetector(stream: MediaStream) {
    if (!videoRef.current) return;
    const Det: any = (window as any).BarcodeDetector;
    if (!Det) throw new Error("BarcodeDetector not supported");

    const detector = new Det({ formats: ["qr_code"] });
    // hidden canvas（描画＆ROI切り出し）
    if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
    const cvs = canvasRef.current!;
    const ctx = cvs.getContext("2d", { willReadFrequently: true })!;

    const loop = async () => {
      if (!running || !videoRef.current) return;

      const vw = videoRef.current.videoWidth || 1280;
      const vh = videoRef.current.videoHeight || 720;
      if (vw === 0 || vh === 0) {
        rafIdRef.current = requestAnimationFrame(loop);
        return;
      }

      // ROI 計算（中央の正方形寄り領域）
      const roiW = Math.floor(vw * ROI_RATIO);
      const roiH = Math.floor(vh * ROI_RATIO);
      const sx = Math.floor((vw - roiW) / 2);
      const sy = Math.floor((vh - roiH) / 2);

      cvs.width = roiW;
      cvs.height = roiH;
      ctx.drawImage(videoRef.current, sx, sy, roiW, roiH, 0, 0, roiW, roiH);

      try {
        // キャンバスから ImageBitmap を作成して検出
        const bmp = await createImageBitmap(cvs);
        const codes = await detector.detect(bmp);
        // 複数出ても「一番中央に近い or 面積が大きい」順で採用
        if (codes && codes.length > 0) {
          const pick = codes
            .map((c: any) => {
              const box = c.boundingBox;
              const area = box.width * box.height;
              const cx = box.x + box.width / 2;
              const cy = box.y + box.height / 2;
              const dx = Math.abs(cx - roiW / 2);
              const dy = Math.abs(cy - roiH / 2);
              const centerDist = Math.hypot(dx, dy);
              return { code: c, area, centerDist };
            })
            .sort((a: any, b: any) => a.centerDist - b.centerDist || b.area - a.area)[0];

          const text = pick.code.rawValue as string;
          await handleText(text);
        }
      } catch {
        // 無視（次フレームへ）
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);
  }

  // 2) ZXing フォールバック（ROIだけを切り出してデコード）
  async function startWithZXing(stream: MediaStream) {
    const [{ BrowserMultiFormatReader }, lib] = await Promise.all([
      import("@zxing/browser"),
      import("@zxing/library"),
    ]);
    const { BarcodeFormat, DecodeHintType, RGBLuminanceSource, BinaryBitmap, HybridBinarizer } = lib as any;

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
    hints.set(DecodeHintType.TRY_HARDER, false);

    zxingReaderRef.current = new BrowserMultiFormatReader(hints);

    if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
    const cvs = canvasRef.current!;
    const ctx = cvs.getContext("2d", { willReadFrequently: true })!;

    const loop = () => {
      if (!running || !videoRef.current) return;

      const vw = videoRef.current.videoWidth || 1280;
      const vh = videoRef.current.videoHeight || 720;
      if (vw === 0 || vh === 0) {
        rafIdRef.current = requestAnimationFrame(loop);
        return;
      }

      const roiW = Math.floor(vw * ROI_RATIO);
      const roiH = Math.floor(vh * ROI_RATIO);
      const sx = Math.floor((vw - roiW) / 2);
      const sy = Math.floor((vh - roiH) / 2);

      cvs.width = roiW;
      cvs.height = roiH;
      ctx.drawImage(videoRef.current, sx, sy, roiW, roiH, 0, 0, roiW, roiH);

      try {
        const img = ctx.getImageData(0, 0, roiW, roiH);
        const luminance = new RGBLuminanceSource(img.data, roiW, roiH);
        const bitmap = new BinaryBitmap(new HybridBinarizer(luminance));
        const result = zxingReaderRef.current.decode(bitmap);
        if (result?.getText) {
          handleText(result.getText());
        }
      } catch {
        // デコード失敗は普通に起きるので握りつぶし
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);
  }

  // 共通：デコード後のハンドリング
  async function handleText(text: string) {
    try {
      if (!text || text === lastTextRef.current) return;
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
        normalized = { ok: true, meeting: { code: meetingCode }, participant, attendance: { already, checkedAt } };
      } else {
        normalized = { ok: false, message: j?.error || r.statusText || "保存に失敗しました" };
      }

      setLast(normalized);
      setHistory((h) => [normalized, ...h].slice(0, 20));
      setShowConfirm(true);
    } finally {
      // 同一QR連発防止の短い冷却
      setTimeout(() => (lastTextRef.current = ""), 600);
      setTimeout(() => setShowConfirm(false), 2200);
    }
  }

  // カメラ開始
  useEffect(() => {
    let stopped = false;

    async function start() {
      if (!videoRef.current) return;

      // 720p 背面カメラ（過度な高解像度は避ける）
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280, max: 1280 },
          height: { ideal: 720, max: 720 },
          frameRate: { ideal: 30, max: 30 },
          advanced: [{ focusMode: "continuous" } as any],
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      videoRef.current.srcObject = stream;
      mediaTrackRef.current = stream.getVideoTracks?.()[0] ?? null;

      // BarcodeDetector が速いので、まず試す
      try {
        await startWithBarcodeDetector(stream);
      } catch {
        // 非対応なら ZXing にフォールバック
        await startWithZXing(stream);
      }
    }

    if (running) {
      start().catch(() => {
        setLast({ ok: false, message: "カメラの初期化に失敗しました" });
        setShowConfirm(true);
      });
    }

    return () => {
      stopped = true;
      // ループ停止
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      // ZXing 後始末
      if (zxingReaderRef.current) {
        try { zxingReaderRef.current.reset?.(); } catch {}
        zxingReaderRef.current = null;
      }
      // カメラ停止
      try {
        const track = mediaTrackRef.current;
        mediaTrackRef.current = null;
        if (track) track.stop();
      } catch {}
      setTorchOn(false);
    };
  }, [running]);

  // ===== UI =====
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
        <span className="text-xs text-slate-500">
          カメラ許可が必要です。中央の枠内にQRを入れてください（誤読を防ぎ高速化）。
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-black/5 aspect-video grid place-items-center">
        <div className="text-center p-6 text-slate-600">
          <div className="text-lg font-semibold">QR読み取りを開始できます</div>
          <div className="mt-1 text-sm">「カメラ開始」を押すと全画面スキャンに切り替わります。</div>
        </div>
      </div>

      {/* 履歴モーダル（省略：元コードと同じ） */}
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

  // 全画面オーバーレイ
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

      {/* 中央ROIの可視ガイド（解析はこの枠内のみ） */}
      <div className="absolute inset-0 z-[1001] pointer-events-none">
        <div className="relative h-full w-full">
          {/* 黒マスク */}
          <div className="absolute inset-0 bg-black/40" />
          {/* 透明な窓（中央） */}
          <div
            className="absolute border-2"
            style={{
              width: `${ROI_RATIO * 100}%`,
              height: `${ROI_RATIO * 100}%`,
              left: `${(1 - ROI_RATIO) * 50}%`,
              top: `${(1 - ROI_RATIO) * 50}%`,
              transform: "translate(0, 0)",
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.4) inset",
              borderColor: "rgba(255,255,255,0.9)",
              borderRadius: "16px",
            }}
          />
        </div>
      </div>

      {/* 上バー */}
      <div className="pointer-events-auto absolute left-0 right-0 top-0 z-[1002] p-3">
        <div className="flex flex-nowrap gap-2">
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

      {/* トースト */}
      {showConfirm && last && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1002] p-4 pb-6">
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

      {/* 履歴ドロワー（省略：元コードと同じ） */}
      <div
        className={`absolute inset-x-0 bottom-0 z-[1002] max-h-[60svh] translate-y-full rounded-t-2xl bg-white shadow-lg ring-1 ring-slate-200 transition-transform duration-300 ${
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

      {histOpen && (
        <button
          aria-label="close history"
          onClick={() => setHistOpen(false)}
          className="absolute inset-0 z-[1001] bg-black/10"
        />
      )}
    </div>
  );

  if (!running) return PreView;
  return mounted ? createPortal(Overlay, document.body) : null;
}

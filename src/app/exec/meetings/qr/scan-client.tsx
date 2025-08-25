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

// ===== 設定 =====
const ROI_SEQUENCE = [0.6, 0.7, 0.8, 1.0]; // 失敗が続いたら順に拡大（最後は全画面）
const FRAMES_BEFORE_ROI_STEP_UP = 60;      // これだけ連続で失敗したら次のROIへ
const FRAMES_BEFORE_TRY_HARDER = 90;       // これだけ失敗したら TRY_HARDER を有効化
const DEBUG_PREVIEW_SIZE = 120;            // ROIプレビューのピクセル（右下）

export default function QRScanClient() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [running, setRunning] = useState(false);
  const [last, setLast] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [histOpen, setHistOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  // 状態表示用
  const [engine] = useState<"ZXing">("ZXing");
  const [debugInfo, setDebugInfo] = useState({ frames: 0, roi: ROI_SEQUENCE[0], tryHarder: false });

  // Media / Canvas
  const mediaTrackRef = useRef<MediaStreamTrack | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null); // 右下の小プレビュー

  // ZXing
  const zxingRef = useRef<{
    QRCodeReader: any;
    RGBLuminanceSource: any;
    BinaryBitmap: any;
    HybridBinarizer: any;
    DecodeHintType: any;
    BarcodeFormat: any;
    reader: any;
    hints: any;
  } | null>(null);

  // カウンタ
  const frameCounterRef = useRef(0);
  const failsInRowRef = useRef(0);
  const roiIndexRef = useRef(0);
  const tryHarderRef = useRef(false);
  const lastTextRef = useRef<string>("");

  // rAF / rVFC
  const rafIdRef = useRef<number | null>(null);
  const rvfcHandleRef = useRef<number | null>(null);

  useEffect(() => setMounted(true), []);

  // スクロール無効
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

  // トーチ
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

  // ZXing 初期化
  async function ensureZXing() {
    if (zxingRef.current) return zxingRef.current;
    const lib = await import("@zxing/library");
    const {
      QRCodeReader,
      RGBLuminanceSource,
      BinaryBitmap,
      HybridBinarizer,
      DecodeHintType,
      BarcodeFormat,
    } = lib as any;

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
    hints.set(DecodeHintType.ALSO_INVERTED, true); // 反転QR対応
    // TRY_HARDER は最初は false。一定失敗で true に切り替える

    const reader = new QRCodeReader();
    reader.setHints(hints);

    zxingRef.current = {
      QRCodeReader,
      RGBLuminanceSource,
      BinaryBitmap,
      HybridBinarizer,
      DecodeHintType,
      BarcodeFormat,
      reader,
      hints,
    };
    return zxingRef.current;
  }

  // 正方形ROIを切り出して canvas に描く（返り値は side, ctx）
  function drawSquareRoiToCanvas(video: HTMLVideoElement, canvas: HTMLCanvasElement, ratio: number) {
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;
    if (!vw || !vh) return null;

    const short = Math.min(vw, vh);
    const side = Math.floor(short * ratio);
    const sx = Math.floor((vw - side) / 2);
    const sy = Math.floor((vh - side) / 2);

    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(video, sx, sy, side, side, 0, 0, side, side);
    return { side, ctx };
  }

  // 1フレーム処理
  function processFrame() {
    if (!running || !videoRef.current) return;

    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) {
      scheduleNextFrame();
      return;
    }

    if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
    const cvs = canvasRef.current!;
    const ratio = ROI_SEQUENCE[roiIndexRef.current];

    const drawn = drawSquareRoiToCanvas(video, cvs, ratio);
    if (!drawn) {
      scheduleNextFrame();
      return;
    }
    const { side, ctx } = drawn;

    // 右下のデバッグプレビュー（ROIがちゃんと描けているか視覚化）
    if (previewCanvasRef.current) {
      const pctx = previewCanvasRef.current.getContext("2d")!;
      pctx.imageSmoothingEnabled = false;
      pctx.clearRect(0, 0, DEBUG_PREVIEW_SIZE, DEBUG_PREVIEW_SIZE);
      pctx.drawImage(cvs, 0, 0, side, side, 0, 0, DEBUG_PREVIEW_SIZE, DEBUG_PREVIEW_SIZE);
    }

    // ZXing デコード
    ensureZXing().then(({ RGBLuminanceSource, BinaryBitmap, HybridBinarizer, DecodeHintType, reader, hints }) => {
      try {
        // TRY_HARDER の動的切替
        if (tryHarderRef.current) {
          if (!hints.get(DecodeHintType.TRY_HARDER)) {
            hints.set(DecodeHintType.TRY_HARDER, true);
            reader.setHints(hints);
          }
        }

        const img = ctx.getImageData(0, 0, side, side);
        const luminance = new RGBLuminanceSource(img.data, side, side);
        const bitmap = new BinaryBitmap(new HybridBinarizer(luminance));

        // setHints() 済み reader に対しては decodeWithState を使うのが確実
        const result = reader.decodeWithState(bitmap);
        const text = result?.getText?.();
        if (text) {
          failsInRowRef.current = 0;
          frameCounterRef.current++;
          setDebugInfo({ frames: frameCounterRef.current, roi: ratio, tryHarder: tryHarderRef.current });
          handleText(text);
          scheduleNextFrame();
          return;
        }
      } catch {
        // NotFound/Checksum/Format などは普通に起きる
        failsInRowRef.current++;
        frameCounterRef.current++;

        // 失敗が続いたら ROI を段階的に広げる
        if (failsInRowRef.current % FRAMES_BEFORE_ROI_STEP_UP === 0) {
          roiIndexRef.current = Math.min(roiIndexRef.current + 1, ROI_SEQUENCE.length - 1);
        }
        // さらに続いたら TRY_HARDER を有効化
        if (failsInRowRef.current >= FRAMES_BEFORE_TRY_HARDER) {
          tryHarderRef.current = true;
        }

        setDebugInfo({ frames: frameCounterRef.current, roi: ROI_SEQUENCE[roiIndexRef.current], tryHarder: tryHarderRef.current });
      } finally {
        scheduleNextFrame();
      }
    });
  }

  // 次フレームのスケジューリング
  function scheduleNextFrame() {
    // requestVideoFrameCallback があればそれを使う（iOS Safari で安定）
    const rvfc = (videoRef.current as any)?.requestVideoFrameCallback as
      | undefined
      | ((cb: (now: number, metadata: any) => void) => number);
    if (rvfc) {
      if (rvfcHandleRef.current != null) (videoRef.current as any).cancelVideoFrameCallback?.(rvfcHandleRef.current);
      rvfcHandleRef.current = rvfc((_now: number, _meta: any) => processFrame());
    } else {
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(processFrame);
    }
  }

  // デコード後処理
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
      setTimeout(() => (lastTextRef.current = ""), 600);
      setTimeout(() => setShowConfirm(false), 2200);
    }
  }

  // カメラ開始/終了
  useEffect(() => {
    let stopped = false;

    async function start() {
      if (!videoRef.current) return;

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280, max: 1280 },
          height: { ideal: 720, max: 720 },
          frameRate: { ideal: 30, max: 30 },
          advanced: [{ focusMode: "continuous" } as any], // 型対策
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      videoRef.current.srcObject = stream;
      mediaTrackRef.current = stream.getVideoTracks?.()[0] ?? null;

      // 初期化リセット
      frameCounterRef.current = 0;
      failsInRowRef.current = 0;
      roiIndexRef.current = 0;
      tryHarderRef.current = false;
      setDebugInfo({ frames: 0, roi: ROI_SEQUENCE[0], tryHarder: false });

      // メタデータが出たらループ開始
      const onLoaded = () => {
        videoRef.current?.removeEventListener("loadedmetadata", onLoaded);
        scheduleNextFrame();
      };
      if (videoRef.current.readyState >= 1) {
        scheduleNextFrame();
      } else {
        videoRef.current.addEventListener("loadedmetadata", onLoaded);
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

      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (rvfcHandleRef.current != null) {
        (videoRef.current as any)?.cancelVideoFrameCallback?.(rvfcHandleRef.current);
        rvfcHandleRef.current = null;
      }

      try {
        const track = mediaTrackRef.current;
        mediaTrackRef.current = null;
        if (track) track.stop();
      } catch {}

      setTorchOn(false);
    };
  }, [running]);

  // ====== UI ======
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
        <span className="text-xs text-slate-500">中央の枠内にQRを入れてください（失敗時は自動で条件を広げます）。</span>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-black/5 aspect-video grid place-items-center">
        <div className="text-center p-6 text-slate-600">
          <div className="text-lg font-semibold">QR読み取りを開始できます</div>
          <div className="mt-1 text-sm">「カメラ開始」を押すと全画面スキャンに切り替わります。</div>
        </div>
      </div>
    </div>
  );

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

      {/* 正方形ガイド（内側は透明のまま） */}
      <div className="absolute inset-0 z-[1001] pointer-events-none">
        <div
          className="absolute border-2 border-white/90 rounded-2xl"
          style={{
            width: `${ROI_SEQUENCE[roiIndexRef.current] * 100}vmin`,
            aspectRatio: "1 / 1",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.28)",
          }}
        />
      </div>

      {/* 上バー（状態表示つき） */}
      <div className="pointer-events-auto absolute left-0 right-0 top-0 z-[1002] p-3">
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
          <span className="ml-auto text-xs rounded-md bg-white/85 px-2 py-1 ring-1 ring-slate-300 text-slate-700">
            Engine: {engine} · Frames: {debugInfo.frames} · ROI: {Math.round(debugInfo.roi * 100)}% · TRY_HARDER:{" "}
            {debugInfo.tryHarder ? "ON" : "OFF"}
          </span>
        </div>
      </div>

      {/* 右下：ROIプレビュー（実際に解析している画を小さく表示） */}
      <div className="absolute right-2 bottom-2 z-[1002] pointer-events-none">
        <canvas
          ref={previewCanvasRef}
          width={DEBUG_PREVIEW_SIZE}
          height={DEBUG_PREVIEW_SIZE}
          style={{ width: DEBUG_PREVIEW_SIZE, height: DEBUG_PREVIEW_SIZE, borderRadius: 8, border: "1px solid rgba(255,255,255,0.6)" }}
        />
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
    </div>
  );

  if (!running) return PreView;
  return mounted ? createPortal(Overlay, document.body) : null;
}

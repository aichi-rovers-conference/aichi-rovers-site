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

// ROI は画面短辺×比率の正方形
const ROI_RATIO = 0.6;
// BarcodeDetector が検出0件でフォールバックする閾値
const BD_EMPTY_FRAMES_BEFORE_FALLBACK = 45;

export default function QRScanClient() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [running, setRunning] = useState(false);
  const [last, setLast] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [histOpen, setHistOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [engine, setEngine] = useState<"BarcodeDetector" | "ZXing" | "-">("-");

  const mediaTrackRef = useRef<MediaStreamTrack | null>(null);
  const lastTextRef = useRef<string>("");

  // 走査ループ用
  const rafIdRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ZXing（library 側クラス群）保持
  const zxingRef = useRef<{
    MultiFormatReader: any;
    RGBLuminanceSource: any;
    BinaryBitmap: any;
    HybridBinarizer: any;
    DecodeHintType: any;
    BarcodeFormat: any;
    reader: any;
    hints: any;
  } | null>(null);

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

  // 中央の正方形ROIを canvas に描画
  function drawSquareRoiToCanvas(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;
    const short = Math.min(vw, vh);
    const side = Math.floor(short * ROI_RATIO);
    const sx = Math.floor((vw - side) / 2);
    const sy = Math.floor((vh - side) / 2);

    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(video, sx, sy, side, side, 0, 0, side, side);

    return { side, ctx };
  }

  // ====== BarcodeDetector (対応時は爆速) ======
  async function startWithBarcodeDetector(): Promise<boolean> {
    const BD: any = (window as any).BarcodeDetector;
    if (!BD) return false;

    // 本当に qr_code をサポートしているか確認
    try {
      const formats: string[] | undefined = await BD.getSupportedFormats?.();
      if (!formats || !formats.includes("qr_code")) return false;
    } catch {
      // 未実装端末もあるので、その場合は試してみる
    }

    if (!videoRef.current) return false;
    if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
    const cvs = canvasRef.current!;
    const detector = new BD({ formats: ["qr_code"] });

    setEngine("BarcodeDetector");
    let emptyCount = 0;

    const loop = async () => {
      if (!running || !videoRef.current) return;

      if (!videoRef.current.videoWidth || !videoRef.current.videoHeight) {
        rafIdRef.current = requestAnimationFrame(loop);
        return;
      }

      drawSquareRoiToCanvas(videoRef.current, cvs);

      try {
        const codes = await detector.detect(cvs);
        if (codes && codes.length > 0) {
          emptyCount = 0;
          // 面積最大を採用
          const pick = codes
            .map((c: any) => {
              const box = c.boundingBox || {};
              const area = (box.width || 0) * (box.height || 0);
              return { c, area };
            })
            .sort((a: any, b: any) => b.area - a.area)[0];
          const text: string = pick.c.rawValue;
          await handleText(text);
        } else {
          emptyCount++;
          if (emptyCount >= BD_EMPTY_FRAMES_BEFORE_FALLBACK) {
            await switchToZXing();
            return;
          }
        }
      } catch {
        await switchToZXing();
        return;
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);
    return true;
  }

  // ====== ZXing 強化版（確実性を上げたデコード） ======
  async function startWithZXing() {
    // 必要クラスを動的読み込み
    const lib = await import("@zxing/library");
    const {
      MultiFormatReader,
      RGBLuminanceSource,
      BinaryBitmap,
      HybridBinarizer,
      DecodeHintType,
      BarcodeFormat,
    } = lib as any;

    // ヒント強化：QR限定 + 反転も試す
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
    hints.set(DecodeHintType.TRY_HARDER, false);
    hints.set(DecodeHintType.ALSO_INVERTED, true);

    const reader = new MultiFormatReader();
    reader.setHints(hints);

    zxingRef.current = {
      MultiFormatReader,
      RGBLuminanceSource,
      BinaryBitmap,
      HybridBinarizer,
      DecodeHintType,
      BarcodeFormat,
      reader,
      hints,
    };

    setEngine("ZXing");
    if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
    const cvs = canvasRef.current!;

    const loop = () => {
      if (!running || !videoRef.current) return;

      if (!videoRef.current.videoWidth || !videoRef.current.videoHeight) {
        rafIdRef.current = requestAnimationFrame(loop);
        return;
      }

      const { side, ctx } = drawSquareRoiToCanvas(videoRef.current, cvs);

      try {
        const img = ctx.getImageData(0, 0, side, side);
        const luminance = new RGBLuminanceSource(img.data, side, side);
        const bitmap = new BinaryBitmap(new HybridBinarizer(luminance));
        const result = zxingRef.current!.reader.decode(bitmap); // ← ALSO_INVERTED 有効
        if (result?.getText) handleText(result.getText());
      } catch {
        // NotFoundException などは普通に出るので握りつぶし
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);
  }

  // BD → ZXing 切替
  async function switchToZXing() {
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    await startWithZXing();
  }

  // 共通：デコード後処理
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
          advanced: [{ focusMode: "continuous" } as any], // 型回避
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      videoRef.current.srcObject = stream;
      mediaTrackRef.current = stream.getVideoTracks?.()[0] ?? null;

      // まず BD、ダメなら ZXing
      const ok = await startWithBarcodeDetector();
      if (!ok) await startWithZXing();
    }

    if (running) {
      start().catch(() => {
        setEngine("-");
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
      // ZXing の reader を開放（再起動時の安定性向上）
      try {
        zxingRef.current?.reader?.reset?.();
      } catch {}
      zxingRef.current = null;

      try {
        const track = mediaTrackRef.current;
        mediaTrackRef.current = null;
        if (track) track.stop();
      } catch {}

      setTorchOn(false);
      setEngine("-");
    };
  }, [running]);

  // ===== UI（ガイドは正方形・内側無塗り） =====
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
        <span className="text-xs text-slate-500">中央の枠内にQRを入れてください。</span>
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
      {/* 正方形の可視ガイド（内側は透明） */}
      <div className="absolute inset-0 z-[1001] pointer-events-none">
        <div
          className="absolute border-2 border-white/90 rounded-2xl"
          style={{
            width: `${ROI_RATIO * 100}vmin`,
            aspectRatio: "1 / 1",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.28)",
          }}
        />
      </div>

      {/* 上バー（現在のエンジン表示） */}
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
          <span className="ml-auto text-xs rounded-md bg-white/80 px-2 py-1 ring-1 ring-slate-300 text-slate-700">
            Engine: {engine}
          </span>
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
    </div>
  );

  if (!running) return PreView;
  return mounted ? createPortal(Overlay, document.body) : null;
}

// src/lib/qr.ts
/** クライアント安全な QR ヘルパー（同期版） */

export type QrPayload = {
  v: number;
  type: "arc-attendance";
  meeting: string;
  participantId: string;
  name: string;
};

/** メール/プレビューで使う JSON 文字列ペイロードを生成（同期） */
export function buildQrPayload(meeting: string, participantId: string, name: string): string {
  const payload: QrPayload = { v: 1, type: "arc-attendance", meeting, participantId, name };
  return JSON.stringify(payload);
}

/** UIプレビュー用のリンクを組み立て（同期）。/p/[token] ではなく表示用の /exec/meetings/qr/show にします */
export function buildPreviewQrUrl(origin: string, meetingCode: string, participantId: string): string {
  const o = (origin || "").replace(/\/+$/, "");
  const qs = new URLSearchParams({ meeting: meetingCode, pid: participantId }).toString();
  return `${o}/exec/meetings/qr/show?${qs}`;
}

// src/lib/qr.ts（追記/修正）

// src/lib/qr.ts

// 参加者に見せるQRページのベースパス（必要なら .env で変更できるように）
const PREVIEW_BASE_PATH =
  process.env.NEXT_PUBLIC_QR_PREVIEW_BASE_PATH ?? "/p";

/**
 * 参加者向けの「QR表示ページ」のURLを作る
 * 例: https://example.com/p/<participantId>?meeting=R7-3
 *
 * ※もしあなたの実装が /exec/meetings/qr/p/... なら
 *   NEXT_PUBLIC_QR_PREVIEW_BASE_PATH="/exec/meetings/qr/p"
 *   にすればOK
 */
export function buildPreviewQrUrl(origin: string, meeting: string, participantId: string) {
  const base = (origin || "").replace(/\/$/, "");
  const basePath = PREVIEW_BASE_PATH.startsWith("/") ? PREVIEW_BASE_PATH : `/${PREVIEW_BASE_PATH}`;
  return `${base}${basePath}/${encodeURIComponent(participantId)}?meeting=${encodeURIComponent(meeting)}`;
}

/**
 * ✅ スキャン側(scan-client.tsx)が要求している JSON 形式のQR文字列
 * payload.type === "arc-attendance"
 * payload.meeting / payload.participantId 必須
 * payload.name は表示用として任意
 */
export function buildQrPayload(meeting: string, participantId: string, name?: string) {
  return JSON.stringify({
    type: "arc-attendance",
    meeting,
    participantId,
    ...(name ? { name } : {}),
  });
}


export type QrPayloadV1 = {
  v: 1;
  meeting: string;
  participantId: string;
  name?: string; // 表示用（改ざんされ得るので信用しない）
};

const PREFIX = "ARCQR:";



// ✅ スキャン側で使う（新旧互換）
export function parseQrPayload(raw: string): QrPayloadV1 | null {
  const s = (raw || "").trim();

  // 新形式: ARCQR:{...}
  if (s.startsWith(PREFIX)) {
    try {
      const obj = JSON.parse(s.slice(PREFIX.length));
      if (obj?.meeting && obj?.participantId) return obj as QrPayloadV1;
    } catch {}
    return null;
  }

  // 旧形式救済（例: meeting|participantId など）
  const parts = s.split("|");
  if (parts.length >= 2) {
    const [meeting, participantId, name] = parts;
    if (meeting && participantId) {
      return { v: 1, meeting, participantId, ...(name ? { name } : {}) };
    }
  }

  return null;
}

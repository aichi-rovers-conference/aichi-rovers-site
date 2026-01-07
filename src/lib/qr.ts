// src/lib/qr.ts（追記/修正）
export type QrPayloadV1 = {
  v: 1;
  meeting: string;
  participantId: string;
  name?: string; // 表示用（改ざんされ得るので信用しない）
};

const PREFIX = "ARCQR:";

// ✅ 既存の buildQrPayload をこの形に置き換え（name を任意で含める）
export function buildQrPayload(meeting: string, participantId: string, name?: string) {
  // scan-client.tsx が payload.type === "arc-attendance" を要求しているので合わせる
  const payload: any = {
    type: "arc-attendance",
    meeting,
    participantId,
  };

  // ✅ 名前を入れたい時だけ入れる
  if (name) payload.name = name;

  return JSON.stringify(payload);
}

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

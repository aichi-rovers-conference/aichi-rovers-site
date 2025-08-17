// app/api/polls/_normalize.ts

/** 内部ユーティリティ（非エクスポート） */
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
function toInt(v: unknown): number | undefined {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
    return Number(v);
  }
  return undefined;
}
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function pick(obj: unknown, path: readonly string[]): unknown {
  let cur: unknown = obj;
  for (const key of path) {
    if (!isRecord(cur)) return undefined;
    cur = cur[key];
  }
  return cur;
}

/** ここから公開API */
type RatingShape = "star" | "heart" | "thumb";
type NormalizedRating = {
  rating: { count: number; shape: RatingShape };
  config: Record<string, unknown> & {
    count: number;
    ratingCount: number;
    max: number;
    shape: RatingShape;
  };
  max: number;
};

/**
 * サーバ側で設問を正規化。
 * - type !== "rating" の場合はそのまま返す
 * - "rating" の場合:
 *    - count を 3〜9 に丸めて決定（各種場所から拾う）
 *    - shape を "star" | "heart" | "thumb" に正規化
 *    - rating / config / max にミラー
 */
export function normalizeQuestionOnServer<T extends Record<string, unknown>>(
  q: T
): T & Partial<NormalizedRating> {
  const typeRaw = (q as Record<string, unknown>)["type"];
  const t = typeof typeRaw === "string" ? typeRaw.toLowerCase() : "";

  if (t !== "rating") {
    // 変更なしで返す
    return q as T & Partial<NormalizedRating>;
  }

  // count: いろんな場所から拾う（既存互換）
  const rawCount =
    toInt(pick(q, ["rating", "count"])) ??
    toInt(pick(q, ["config", "count"])) ??
    toInt(pick(q, ["config", "ratingCount"])) ??
    toInt(pick(q, ["config", "max"])) ??
    toInt(pick(q, ["max"])) ??
    toInt(pick(q, ["count"])) ??
    5;

  const count = clamp(Math.floor(rawCount), 3, 9);

  // shape: 不正値は star。config からも拾う
  const shapeInput = String(
    (pick(q, ["rating", "shape"]) ??
      pick(q, ["config", "shape"]) ??
      "star") as string
  ).toLowerCase();

  const shape: RatingShape =
    shapeInput === "heart" ? "heart" : shapeInput === "thumb" ? "thumb" : "star";

  const cfgRaw = pick(q, ["config"]);
  const cfgBase = isRecord(cfgRaw) ? cfgRaw : {};

  return {
    ...(q as unknown as object),
    rating: { count, shape },
    config: {
      ...cfgBase,
      count,
      ratingCount: count,
      max: count,
      shape,
    },
    max: count,
  } as T & Partial<NormalizedRating>;
}

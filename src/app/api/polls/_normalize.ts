// app/api/polls/_normalize.ts
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
function toInt(v: unknown): number | undefined {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return undefined;
}

export function normalizeQuestionOnServer(q: any) {
  const t = String(q?.type ?? "").toLowerCase();
  if (t !== "rating") return q;

  // count はいろんな場所から来ても拾えるように
  const raw =
    toInt(q?.rating?.count) ??
    toInt(q?.config?.count) ??
    toInt(q?.config?.ratingCount) ??
    toInt(q?.config?.max) ??
    toInt(q?.max) ??
    toInt(q?.count) ??
    5;

  const count = clamp(Math.floor(raw), 3, 9);

  // ★ shape を厳密に正規化（config からも拾う / 不正値は star）
  const shapeInput = String(q?.rating?.shape ?? q?.config?.shape ?? "star").toLowerCase();
  const shape: "star" | "heart" | "thumb" =
    shapeInput === "heart" ? "heart" : shapeInput === "thumb" ? "thumb" : "star";

  return {
    ...q,
    // フロント（回答・編集）どちらも参照できる正規の置き場所
    rating: { count, shape },

    // 既存APIが config.* や max を読む場合にも反映（ミラー）
    config: {
      ...(q?.config ?? {}),
      count,
      ratingCount: count,
      max: count,
      shape,
    },
    max: count,
  };
}

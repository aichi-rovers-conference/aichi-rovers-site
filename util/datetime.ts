// utils/datetime.ts など
export function coerceJstDate(input: unknown): Date {
  const s = String(input ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    // 例: 2025-08-24 → 2025-08-24T00:00:00+09:00
    return new Date(`${s}T00:00:00.000+09:00`);
  }
  const d = new Date(s);
  if (!isNaN(d.valueOf())) return d;
  return new Date(); // フォールバック（お好みで 400 を返す等にしてもOK）
}

export function nullIfEmpty<T extends Record<string, any>>(obj: T): T {
  const out: any = { ...obj };
  for (const k of Object.keys(out)) {
    if (typeof out[k] === "string" && out[k].trim() === "") out[k] = null;
  }
  return out;
}

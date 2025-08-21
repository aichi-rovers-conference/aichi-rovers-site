export const uid = () => Math.random().toString(36).slice(2, 10);
export const todayISO = () => new Date().toISOString().slice(0, 10);

export function fyFromDateISO(iso: string): number {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return m < 4 ? y - 1 : y;        // 4月起点
}
export function latestFiscalYear(): number {
  return fyFromDateISO(new Date().toISOString());
}
export function reiwaFromFY(fy: number) {
  return Math.max(1, fy - 2018);
}
export function fyOptionsAsc(from = 2019, to = latestFiscalYear()): number[] {
  const arr: number[] = [];
  for (let y = from; y <= to; y++) arr.push(y);
  return arr;
}
export function toSlugByFYRound(fy: number, round: number) {
  const r = reiwaFromFY(fy);
  return `r${r}-${round}`;
}

/* YouTube URL/ID → ID抽出 */
export function extractYouTubeId(input: string): string {
  const s = (input ?? "").trim();
  if (!s) return "";
  if (/^[\w-]{8,}$/.test(s)) return s;
  const m =
    s.match(/[?&]v=([\w-]{8,})/) ||
    s.match(/youtu\.be\/([\w-]{8,})/) ||
    s.match(/youtube\.com\/embed\/([\w-]{8,})/);
  return m ? m[1] : s;
}

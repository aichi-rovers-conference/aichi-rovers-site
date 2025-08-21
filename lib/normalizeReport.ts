// lib/normalizeReport.ts
import { SectionGroup } from "@/src/app/exec/meetings/archive/types";

// 旧構造の型（ある場合だけ使われます）
type LegacySimpleSection = { heading: string; body: string };
type LegacyScheduleRow = { time?: string; label: string; note?: string };

export function normalizeGroupsFromDb(input: {
  groups?: unknown;                // 新: SectionGroup[] を想定
  simpleSections?: unknown;        // 旧: [{heading, body}]
  schedule?: unknown;              // 旧: [{time,label,note}]
}): SectionGroup[] {
  // 1) 新構造（groups）があれば最優先で使用
  if (Array.isArray(input.groups)) {
    const safe: SectionGroup[] = (input.groups as any[]).map((g, i) => ({
      id: String(g?.id ?? `g${i}`),
      type: "group", // ★ 必須
      heading: String(g?.heading ?? ""),
      children: Array.isArray(g?.children) ? g.children : [],
    }));
    return safe;
  }

  // 2) 旧: simpleSections のみがある場合 → SectionGroup[] に変換
  if (Array.isArray(input.simpleSections)) {
    const arr = input.simpleSections as LegacySimpleSection[];
    const groups: SectionGroup[] = arr.map((s, i) => ({
      id: `legacy-simple-${i}`,
      type: "group", // ★ 必須
      heading: s.heading ?? "",
      children: [
        { id: `legacy-text-${i}`, kind: "text", body: s.body ?? "" } as const,
      ],
    }));
    return groups;
  }

  // 3) 旧: schedule のみがある場合 → タイムライン1本として変換
  if (Array.isArray(input.schedule)) {
    const rows = input.schedule as LegacyScheduleRow[];
    const groups: SectionGroup[] = [
      {
        id: "legacy-schedule",
        type: "group", // ★ 必須
        heading: "スケジュール",
        children: [
          {
            id: "legacy-timeline",
            kind: "timeline",
            items: rows.map((r, i) => ({
              id: `legacy-row-${i}`,
              time: r.time ?? "",
              label: r.label ?? "",
              note: r.note ?? "",
            })),
          } as const,
        ],
      },
    ];
    return groups;
  }

  // 4) 何も無ければ空
  return [];
}

// Prisma の Enum <-> フロントの union を吸収（必要なら）
export type UiGalleryLayout = "grid" | "slideshow";
export function fromDbGalleryLayout(v: any): UiGalleryLayout | undefined {
  if (v == null) return undefined;
  const s = String(v);
  if (s === "grid" || s === "slideshow") return s as UiGalleryLayout;
  if (s === "GRID") return "grid";
  if (s === "SLIDESHOW") return "slideshow";
  return undefined;
}

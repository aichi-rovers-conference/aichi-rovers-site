/* 共有型（編集画面 & API） */

export type GalleryLayout = "grid" | "slideshow";

export type GalleryItem = { id: string; url: string; caption?: string };

export type ChildText = { id: string; kind: "text"; body: string };

export type ChildTimelineItem = { id: string; time?: string; label: string; note?: string };
export type ChildTimeline = { id: string; kind: "timeline"; items: ChildTimelineItem[] };

/** ← layout を追加（未指定は grid 扱い相当。保存時は省略でもOK） */
export type ChildGallery = {
  id: string;
  kind: "gallery";
  images: GalleryItem[];
  layout?: GalleryLayout;
};

export type Child = ChildText | ChildTimeline | ChildGallery;

export type SectionGroup = { id: string; type: "group"; heading: string; children: Child[] };

export type MeetingReportPayload = {
  title: string;
  slug: string;                 // 自動生成（令和&回）
  date: string;                 // YYYY-MM-DD
  round: 1 | 2 | 3 | 4;
  fiscalYear: number;           // 4月起点
  reportUrl?: string | null;
  coverUrl?: string | null;
  youtubeId?: string | null;
  isPublished: boolean;

  pageGallery?: GalleryItem[];

  /** ← 追加：ページ全体ギャラリーの表示モード（grid/slideshow） */
  pageGalleryLayout?: GalleryLayout;

  /** 新構造（本文セクション） */
  sections?: SectionGroup[];
};

export type APIReport = Partial<MeetingReportPayload> & {
  id?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type SaveModalInfo = { url: string; isPublished: boolean; title: string };

/* =========================================================
   runtime 型補正（DB/API復元や enum 文字列のバラつきを吸収）
   ========================================================= */

/** Prisma enum など大文字/その他入力を UI 用に正規化 */
export function normalizeGalleryLayout(input: any): GalleryLayout | undefined {
  if (input == null) return undefined;
  const s = String(input).toLowerCase();
  if (s === "grid") return "grid";
  if (s === "slideshow") return "slideshow";
  return undefined;
}

/** ページ全体ギャラリー用のレイアウト（DB値→UI値へ） */
export function normalizePageGalleryLayout(input: any): GalleryLayout | undefined {
  return normalizeGalleryLayout(input);
}

/**
 * groups(JSON相当) → SectionGroup[] に安全復元。
 * - 旧 simpleSections: [{heading, body}] にも対応（1:1で group + text 化）
 * - 子 gallery の layout も正規化
 */
export function normalizeSectionGroups(input: any): SectionGroup[] {
  if (!Array.isArray(input)) return [];

  // 旧: [{ heading, body }] の配列だけが来た場合
  const looksLikeLegacySimple = input.every(
    (x) =>
      x &&
      typeof x === "object" &&
      ("heading" in x || "body" in x) &&
      !("children" in x) &&
      !("kind" in x)
  );
  if (looksLikeLegacySimple) {
    return input.map((s: any, i: number) => ({
      id: String(s?.id ?? `legacy-simple-${i}`),
      type: "group" as const,
      heading: String(s?.heading ?? ""),
      children: [
        {
          id: String(s?.textId ?? `legacy-text-${i}`),
          kind: "text" as const,
          body: String(s?.body ?? ""),
        },
      ],
    }));
  }

  // 新: SectionGroup[] らしき配列
  return input.map((g: any, gi: number) => {
    const gid = String(g?.id ?? `g${gi}`);
    const heading = String(g?.heading ?? "");

    const childrenArr: any[] = Array.isArray(g?.children) ? g.children : [];

    const children: Child[] = childrenArr.map((c: any, ci: number) => {
      const cid = String(c?.id ?? `${gid}-c${ci}`);
      const kind = String(c?.kind ?? "");

      if (kind === "text") {
        return {
          id: cid,
          kind: "text" as const,
          body: String(c?.body ?? ""),
        };
      }

      if (kind === "timeline") {
        const items = Array.isArray(c?.items)
          ? c.items.map((r: any, ri: number) => ({
              id: String(r?.id ?? `${cid}-r${ri}`),
              time: r?.time != null ? String(r.time) : undefined,
              label: String(r?.label ?? ""),
              note: r?.note != null ? String(r.note) : undefined,
            }))
          : [];
        return {
          id: cid,
          kind: "timeline" as const,
          items,
        };
      }

      // gallery（その他は gallery にフォールバック）
      const images = Array.isArray(c?.images)
        ? c.images.map((im: any, ii: number) => ({
            id: String(im?.id ?? `${cid}-im${ii}`),
            url: String(im?.url ?? ""),
            caption: im?.caption != null ? String(im.caption) : undefined,
          }))
        : [];
      const layout = normalizeGalleryLayout(c?.layout);

      const gallery: ChildGallery = {
        id: cid,
        kind: "gallery",
        images,
        ...(layout ? { layout } : {}), // 未指定ならプロパティごと省略（= grid 扱い相当）
      };
      return gallery;
    });

    return {
      id: gid,
      type: "group" as const,
      heading,
      children,
    };
  });
}

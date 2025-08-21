// app/arc/conference/reports/types.ts

export type GalleryLayout = "grid" | "slideshow";

export type GalleryItem = { id: string; url: string; caption?: string };

export type ChildText = { id: string; kind: "text"; body: string };
export type ChildTimelineItem = { id: string; time?: string; label: string; note?: string };
export type ChildTimeline = { id: string; kind: "timeline"; items: ChildTimelineItem[] };

export type ChildGallery = {
  id: string;
  kind: "gallery";
  images: GalleryItem[];
  layout?: GalleryLayout; // 未指定は grid 扱い
};

export type Child = ChildText | ChildTimeline | ChildGallery;

export type SectionGroup = {
  id: string;
  type: "group";
  heading: string;
  children: Child[];
};

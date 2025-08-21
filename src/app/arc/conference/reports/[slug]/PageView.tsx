// app/arc/conference/reports/[slug]/PageView.tsx
"use client";

import GallerySlider from "./GallerySlider";
import {
  normalizeGroupsFromDb,
  fromDbGalleryLayout,
} from "../../../../../../lib/normalizeReport";
import type {
  GalleryItem,
  SectionGroup,
  GalleryLayout
} from "../types";


function PageGallery({
  items,
  layout,
}: {
  items: GalleryItem[];
  layout?: GalleryLayout;
}) {
  if (!items || items.length === 0) return null;
  if (layout === "slideshow") return <GallerySlider items={items} />;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {items.map((g) => (
        <figure key={g.id} className="overflow-hidden rounded-xl border bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={g.url}
            alt={g.caption ?? ""}
            className="h-64 w-full object-cover"
          />
          {g.caption && (
            <figcaption className="px-3 py-2 text-sm text-slate-700">
              {g.caption}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}

export default function PageView({
  report,
}: {
  // MeetingReport の「生」レコードを丸ごと受け取る想定
  report: {
    title: string;
    pageGallery?: unknown; // JSON (GalleryItem[])
    groups?: unknown; // JSON (SectionGroup[])
    simpleSections?: unknown; // 旧
    schedule?: unknown; // 旧
    pageGalleryLayout?: any; // Prisma enum (grid|slideshow) or null
  };
}) {
  // ページ全体ギャラリー
  const pageGallery: GalleryItem[] = Array.isArray(report.pageGallery)
    ? (report.pageGallery as GalleryItem[])
    : [];
  const layout: GalleryLayout | undefined = fromDbGalleryLayout(
    report.pageGalleryLayout,
  );

  // 本文セクション（新/旧データを吸収）
  const sections: SectionGroup[] = normalizeGroupsFromDb({
    groups: report.groups,
    simpleSections: (report as any).simpleSections,
    schedule: (report as any).schedule,
  });

  return (
    <main className="mx-auto max-w-5xl px-4 md:px-8 py-8">
      <h1 className="mb-6 text-2xl font-bold">{report.title}</h1>

      {/* ページ全体ギャラリー（編集で選んだレイアウトを反映） */}
      <PageGallery items={pageGallery} layout={layout} />

      {/* 本文セクション */}
      <div className="mt-10 space-y-10">
        {sections.map((g) => (
          <section key={g.id} className="space-y-4">
            {g.heading && <h2 className="text-xl font-bold">{g.heading}</h2>}

            {g.children.map((c) => {
              if (c.kind === "text") {
                return (
                  <p
                    key={c.id}
                    className="whitespace-pre-wrap leading-7 text-slate-800"
                  >
                    {c.body}
                  </p>
                );
              }

              if (c.kind === "timeline") {
                return (
                  <ul key={c.id} className="space-y-2">
                    {c.items.map((r) => (
                      <li key={r.id} className="flex items-start gap-3">
                        <span className="w-16 shrink-0 text-slate-600">
                          {r.time ?? ""}
                        </span>
                        <span className="font-medium">{r.label}</span>
                        {r.note && (
                          <span className="text-slate-500">（{r.note}）</span>
                        )}
                      </li>
                    ))}
                  </ul>
                );
              }

              if (c.kind === "gallery") {
                return c.layout === "slideshow" ? (
                  <div key={c.id}>
                    <GallerySlider items={c.images as GalleryItem[]} />
                  </div>
                ) : (
                  <div
                    key={c.id}
                    className="grid grid-cols-1 gap-4 md:grid-cols-2"
                  >
                    {c.images.map((im) => (
                      <figure
                        key={im.id}
                        className="overflow-hidden rounded-xl border bg-white"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={im.url}
                          alt={im.caption ?? ""}
                          className="h-64 w-full object-cover"
                        />
                        {im.caption && (
                          <figcaption className="px-3 py-2 text-sm text-slate-700">
                            {im.caption}
                          </figcaption>
                        )}
                      </figure>
                    ))}
                  </div>
                );
              }

              return null;
            })}
          </section>
        ))}
      </div>
    </main>
  );
}

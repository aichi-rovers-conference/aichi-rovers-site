import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import ArcHeader1 from "@/src/components/ArcHeader1";
import GallerySlider from "./GallerySlider";

/** ===== データ型 ===== */
type APIResponse<T> = { ok: boolean; data?: T; message?: string };

type GalleryLayout = "grid" | "slideshow";
const normLayout = (v: any): GalleryLayout | undefined => {
  if (v == null) return undefined;
  const s = String(v).toLowerCase();
  return s === "slideshow" ? "slideshow" : s === "grid" ? "grid" : undefined;
};

type GalleryItem = { id: string; url: string; caption?: string };

type ChildText = { id: string; kind: "text"; body: string };
type ChildTimelineItem = { id: string; time?: string; label: string; note?: string };
type ChildTimeline = { id: string; kind: "timeline"; items: ChildTimelineItem[] };
type ChildGallery = { id: string; kind: "gallery"; images: GalleryItem[]; layout?: GalleryLayout };
type Child = ChildText | ChildTimeline | ChildGallery;

type SectionGroup = { id: string; type: "group"; heading: string; children: Child[] };

type ReportDetail = {
  id: number;
  title: string;
  slug: string;
  date: string;
  fiscalYear: number;
  round: number;
  reportUrl?: string | null;
  coverUrl?: string | null;
  youtubeId?: string | null;
  updatedAt?: string | null;
  subtitle?: string | null;
  lead?: string | null;
  schedule?: { time: string; label: string; note?: string }[];
  sections?: { heading?: string; body?: string }[];
  pageGallery?: GalleryItem[];
  pageGalleryLayout?: any; // grid/slideshow or GRID/SLIDESHOW
  groups?: SectionGroup[];
  sectionsGroups?: SectionGroup[];
};

/** ===== ユーティリティ ===== */
function DateBlock({ iso }: { iso: string }) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const md = `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, "0")}`;
  return (
    <div className="shrink-0 pr-4 border-r border-slate-200">
      <div className="text-xs text-slate-500 leading-none">{y}</div>
      <div className="text-2xl md:text-3xl font-extrabold -mt-0.5">{md}</div>
    </div>
  );
}

async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (process.env.VERCEL ? "https" : "http");
  return `${proto}://${host}`;
}

async function fetchReport(slug: string): Promise<ReportDetail | null> {
  const base = process.env.NEXT_PUBLIC_BASE_URL || (await getBaseUrl());
  const res = await fetch(`${base}/api/meeting-reports/${encodeURIComponent(slug)}`, {
    cache: "no-store",
  });
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return null;
  const json: APIResponse<ReportDetail> = await res.json();
  if (!res.ok || !json.ok || !json.data) return null;
  return json.data;
}

/** 旧→新 互換マッパ */
function normalizeGroups(data: ReportDetail): SectionGroup[] {
  if (Array.isArray((data as any).groups)) return (data as any).groups as SectionGroup[];
  if (Array.isArray((data as any).sectionsGroups)) return (data as any).sectionsGroups as SectionGroup[];

  const out: SectionGroup[] = [];

  if (Array.isArray(data.schedule) && data.schedule.length > 0) {
    out.push({
      id: "legacy-group-timeline",
      type: "group",
      heading: "タイムスケジュール",
      children: [
        {
          id: "legacy-timeline",
          kind: "timeline",
          items: data.schedule.map((s, i) => ({
            id: `legacy-tl-${i}`,
            time: s.time,
            label: s.label,
            note: s.note,
          })),
        },
      ] as Child[],
    });
  }

  if (Array.isArray(data.sections) && data.sections.length > 0) {
    data.sections.forEach((sec, idx) => {
      const children: Child[] = [];
      if (sec.body && sec.body.trim()) {
        children.push({ id: `legacy-text-${idx}`, kind: "text", body: sec.body });
      }
      if (children.length > 0 || sec.heading) {
        out.push({
          id: `legacy-group-${idx}`,
          type: "group",
          heading: sec.heading || "",
          children,
        });
      }
    });
  }

  return out;
}

/** 部品描画 */
function TopMedia({
  coverUrl,
  youtubeId,
  title,
}: {
  coverUrl?: string | null;
  youtubeId?: string | null;
  title: string;
}) {
  if (coverUrl) {
    return (
      <div className="mt-6">
        <Image
          src={coverUrl}
          alt={title}
          width={1280}
          height={720}
          sizes="(max-width:768px) 92vw, 1000px"
          className="w-full h-auto rounded-xl border shadow-sm object-cover"
        />
      </div>
    );
  }
  if (youtubeId) {
    return (
      <div className="mt-6">
        <div className="aspect-video w-full rounded-xl overflow-hidden border bg-black/5">
          <iframe
            className="w-full h-full"
            src={`https://www.youtube.com/embed/${youtubeId}`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            loading="lazy"
          />
        </div>
      </div>
    );
  }
  return null;
}

function GroupBlock({ group }: { group: SectionGroup }) {
  const hasChildren = Array.isArray(group.children) && group.children.length > 0;
  if (!group.heading && !hasChildren) return null;

  return (
    <section className="mt-12">
      {group.heading ? (
        <div>
          <h2 className="text-[22px] md:text-2xl font-extrabold text-slate-900 tracking-tight">
            {group.heading}
          </h2>
          <div className="mt-2 h-[3px] w-16 rounded-full bg-red-600" />
        </div>
      ) : null}

      <div className="mt-4 space-y-6">
        {group.children.map((c) => {
          if (c.kind === "text") {
            return (
              <div key={c.id} className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                {c.body}
              </div>
            );
          }
          if (c.kind === "timeline") {
            const rows = c.items || [];
            if (!rows.length) return null;
            return (
              <div key={c.id} className="divide-y rounded-xl border overflow-hidden">
                {rows.map((r) => (
                  <div key={r.id} className="grid grid-cols-[100px,1fr] gap-4 px-4 py-3">
                    <div className="font-mono font-semibold">{r.time}</div>
                    <div>
                      <div className="font-medium">{r.label}</div>
                      {r.note && <div className="text-slate-600 text-sm mt-0.5">{r.note}</div>}
                    </div>
                  </div>
                ))}
              </div>
            );
          }
          if (c.kind === "gallery") {
            const imgs = c.images || [];
            if (!imgs.length) return null;

            const childLayout: GalleryLayout = c.layout ?? "grid";
            return childLayout === "slideshow" ? (
              <div key={c.id}>
                <GallerySlider items={imgs} />
              </div>
            ) : (
              <div key={c.id} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {imgs.map((im) => (
                  <figure key={im.id} className="overflow-hidden rounded-xl border bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={im.url} alt={im.caption ?? ""} className="h-64 w-full object-cover" />
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
      </div>
    </section>
  );
}

/** ===== ページ本体 ===== */
export default async function Page(ctx: { params: Promise<{ slug: string }> }) {
  const navItems = [
    { name: "ホーム", path: "/" },
    { name: "ARCとは", path: "/arc" },
    { name: "事業カレンダー", path: "/arc/calendar" },
    { name: "ARC定例会", path: "/arc/conference" },
    { name: "ARC運営委員会", path: "/arc/executive-committee" },
    { name: "ARCアンケート", path: "/polls" },
    { name: "ミニゲーム", path: "/games" },
  ];

  const { slug } = await ctx.params;
  const data = await fetchReport(slug);

  if (!data) {
    return (
      <main className="min-h-screen bg-white">
        <ArcHeader1 navItems={navItems} />
        <div className="mx-auto max-w-5xl px-4 md:px-8 py-16">
          <Link
            href="/arc/conference"
            className="inline-flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900 mb-6"
          >
            ← ARC定例会に戻る
          </Link>
          <h1 className="text-2xl font-bold">レポートが見つかりません</h1>
          <p className="mt-2 text-slate-600">公開されていないか、URL が間違っている可能性があります。</p>
        </div>
      </main>
    );
  }

  const updated = data.updatedAt || data.date;
  const groups = normalizeGroups(data);
  const pageGallery = Array.isArray(data.pageGallery) ? data.pageGallery : [];
  const pageLayout: GalleryLayout = normLayout(data.pageGalleryLayout) ?? "grid";

  return (
    <main className="min-h-screen bg-white">
      <ArcHeader1 navItems={navItems} />

      <div className="mx-auto w-full max-w-5xl px-4 md:px-8 py-6 md:py-8">
        <div className="mb-5">
          <Link
            href="/arc/conference"
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50"
          >
            ← ARC定例会に戻る
          </Link>
        </div>

        <header className="flex items-end gap-4 md:gap-6">
          <DateBlock iso={updated} />
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-extrabold leading-tight break-words text-slate-900">
              {data.title}
            </h1>
            {data.subtitle && <p className="text-slate-600 mt-1">{data.subtitle}</p>}
          </div>
        </header>

        <TopMedia coverUrl={data.coverUrl} youtubeId={data.youtubeId} title={data.title} />

        {data.lead && (
          <p className="mt-6 text-slate-800 leading-relaxed whitespace-pre-wrap">{data.lead}</p>
        )}

        {/* ページ単位ギャラリー：layout に従う */}
        {pageGallery.length > 0 && (
          <section className="mt-10">
            <div>
              <h2 className="text-[22px] md:text-2xl font-extrabold text-slate-900 tracking-tight">ギャラリー</h2>
              <div className="mt-2 h-[3px] w-16 rounded-full bg-red-600" />
            </div>

            <div className="mt-4">
              {pageLayout === "slideshow" ? (
                <GallerySlider items={pageGallery} />
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {pageGallery.map((g) => (
                    <figure key={g.id} className="overflow-hidden rounded-xl border bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={g.url} alt={g.caption ?? ""} className="h-64 w-full object-cover" />
                      {g.caption && (
                        <figcaption className="px-3 py-2 text-sm text-slate-700">{g.caption}</figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* 本文セクション */}
        {groups.map((g) => (
          <GroupBlock key={g.id} group={g} />
        ))}
      </div>
    </main>
  );
}

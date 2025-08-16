import { prisma } from "../../../../../../lib/prisma";
import GalleryClient from "./GalleryClient";

function canonFy(input: string) {
  const m = String(input).trim().match(/^r\s*(\d+)$/i);
  return m ? `R${Number(m[1])}` : String(input).toUpperCase();
}
function canonRound(input: string) {
  const n = Number(String(input).trim());
  return Number.isFinite(n) ? String(n) : String(input).trim();
}

export default async function ConferenceRoundPage({
  params,
}: {
  // ★ Nextの新仕様では Promise を受け取り、await が必要
  params: Promise<{ fy: string; round: string }>;
}) {
  const { fy: fyRaw, round: roundRaw } = await params; // ★ await する
  const fy = canonFy(fyRaw);
  const round = canonRound(roundRaw);

  const data = await prisma.conferenceRound.findUnique({
    where: { fy_round: { fy, round } },
  });

  if (!data || !data.published) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        この回のページは準備中です。
      </main>
    );
  }

  const sections = (data.sections as any[]) ?? [];
  const gallery = (data.gallery as any[]) ?? [];
  const imageUrls: string[] = gallery
    .map((g) => (g?.url ? String(g.url) : ""))
    .filter((u) => u.length > 0);

  return (
    <main className="w-full bg-white">
      {/* Hero */}
      <section className="relative w-full h-[38vh] md:h-[46vh] overflow-hidden">
        {data.heroUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.heroUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gray-200" />
        )}
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6">
          <div className="mb-2 text-sm font-semibold text-white/90 tracking-wide">
            {fy} / 第{round}回
          </div>
          <h1 className="text-white text-4xl md:text-5xl font-extrabold drop-shadow-lg">
            {data.title}
          </h1>
          {data.subtitle && (
            <p className="text-white/90 mt-3 text-lg md:text-xl font-medium">{data.subtitle}</p>
          )}
        </div>
      </section>

      {/* Intro */}
      {data.intro && (
        <section className="w-full py-6 px-6 md:px-16">
          <div className="max-w-6xl mx-auto">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
              <div className="h-[3px] w-10 bg-red-600 rounded-full mb-3" />
              <p className="leading-7 text-gray-700 whitespace-pre-wrap">{data.intro}</p>
            </div>
          </div>
        </section>
      )}

      {/* Sections */}
      {sections.length > 0 && (
        <section className="w-full py-4 px-6 md:px-16">
          <div className="max-w-6xl mx-auto space-y-6">
            {sections.map((s: any) => (
              <article key={s.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
                {s.title && (
                  <div className="mb-3">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">{s.title}</h2>
                    <div className="mt-2 h-[2px] w-16 bg-red-600 rounded-full" />
                  </div>
                )}
                {s.type === "text" ? (
                  <div className="text-gray-800 leading-7 whitespace-pre-wrap">{s.body}</div>
                ) : (
                  <ol className="relative ml-2 pl-6">
                    <div className="absolute left-[10px] top-0 bottom-0 w-px bg-gray-200" />
                    {(s.items ?? []).map((it: any) => (
                      <li key={it.id} className="mb-4 last:mb-0">
                        <span className="absolute -left-[18px] mt-2 h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-white shadow border border-red-600" />
                        {it.date && <div className="text-xs text-gray-500 mb-1 leading-none">{it.date}</div>}
                        <div className="font-semibold text-gray-900">{it.title}</div>
                        {it.description && <div className="text-gray-700 text-sm mt-0.5">{it.description}</div>}
                      </li>
                    ))}
                  </ol>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Gallery */}
      {imageUrls.length > 0 && (
        <section className="w-full py-10 px-6 md:px-16">
          <div className="max-w-6xl mx-auto">
            <div className="mb-4">
              <h2 className="text-gray-900 text-2xl font-extrabold tracking-tight">ギャラリー</h2>
              <div className="mt-2 h-[2px] w-16 bg-red-600 rounded-full" />
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-3">
              <GalleryClient images={imageUrls} autoplayMs={5000} className="mb-3" />
              {imageUrls.length > 1 && (
                <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
                  {gallery.map((g: any) => (
                    <figure key={g.id} className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50" title={g.caption ?? ""}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={g.url} alt={g.caption ?? ""} className="h-20 w-full object-cover transition-transform duration-200 hover:scale-105" loading="lazy" />
                      {g.caption && (
                        <figcaption className="hidden md:block px-2 py-1 text-[10px] text-gray-600">
                          {g.caption}
                        </figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="max-w-6xl mx-auto mt-6 mb-10 px-6 md:px-16">
        <div className="border-t border-gray-300" />
      </div>
    </main>
  );
}

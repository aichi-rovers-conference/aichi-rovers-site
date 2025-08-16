// app/(public)/exec/meetings/qr/show/page.tsx
import ShowQRClient from "./show-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] ?? "" : v ?? "");

/** "&" が "&amp;"（や二重エンコード）になっても meeting/pid を復元する */
function normalizeParams(sp: SP) {
  let meeting = first(sp.meeting);
  let pid = first(sp.pid);
  const name = first(sp.name);

  if (!pid) {
    const altPidKeys = ["amp;pid", "amp%3Bpid", "amp;amp;pid", "amp;amp%3Bpid", "pid;"];
    for (const k of altPidKeys) {
      const v = first((sp as any)[k]);
      if (v) { pid = v; break; }
    }
    if (!pid) {
      for (const k of Object.keys(sp)) {
        if (k.toLowerCase().endsWith("pid")) {
          const v = first((sp as any)[k]);
          if (v) { pid = v; break; }
        }
      }
    }
  }

  if (!meeting) {
    const altMeetingKeys = ["amp;meeting", "amp%3Bmeeting", "amp;amp;meeting", "amp;amp%3Bmeeting"];
    for (const k of altMeetingKeys) {
      const v = first((sp as any)[k]);
      if (v) { meeting = v; break; }
    }
    if (!meeting) {
      for (const k of Object.keys(sp)) {
        if (k.toLowerCase().endsWith("meeting")) {
          const v = first((sp as any)[k]);
          if (v) { meeting = v; break; }
        }
      }
    }
  }

  // meeting の値が "R7-1&amp;pid=..." になっているケース
  if (meeting && !pid) {
    let mStr = meeting;
    try { mStr = decodeURIComponent(mStr); } catch {}
    mStr = mStr.replace(/&amp;/gi, "&");
    const m = /^([^&?#]+)[&?]pid=([^&?#]+)/.exec(mStr);
    if (m) { meeting = m[1]; pid = m[2]; }
  }

  return { meeting, pid, name };
}

export default async function Page({
  // ★ Next.js 14 では Promise。必ず await してから使う
  searchParams,
}: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { meeting, pid, name } = normalizeParams(sp);
  const ok = Boolean(meeting && pid);

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-b from-white to-slate-50">
      {/* ARC のアクセントバー */}
      <div className="h-1.5 w-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500" />

      {/* 画面を2段でフィット */}
      <div className="h-[calc(100vh_-_6px)] grid grid-rows-[auto,1fr]">
        <header className="px-4 md:px-6 py-3">
          <div className="mx-auto max-w-5xl flex items-center justify-between">
            <div className="min-w-0">
              <h1 className="text-base md:text-lg font-extrabold tracking-tight text-slate-900">
                Aichi Rovers Conference
              </h1>
              <p className="text-[12px] md:text-sm text-slate-600">出席用 QR コード（受付で提示してください）</p>
            </div>
            {meeting && (
              <span className="hidden sm:inline-block rounded-full bg-violet-600/10 text-violet-700 border border-violet-200 px-3 py-1 text-xs font-semibold">
                {meeting}
              </span>
            )}
          </div>
        </header>

        <main className="px-4 md:px-6">
          <div className="mx-auto h-full max-w-5xl grid place-items-center">
            <div
              className="
                w-full mx-auto rounded-3xl bg-white/95 backdrop-blur p-5 sm:p-6
                ring-1 ring-slate-200 shadow-sm
                max-w-[min(92svw,88svh,640px)]
              "
            >
              {!ok ? (
                <div className="text-center">
                  <h2 className="text-lg font-bold text-slate-900">パラメータが不正です</h2>
                  <p className="mt-2 text-sm text-rose-600">
                    例）<code className="bg-slate-100 px-1 py-0.5 rounded">?meeting=R7-1&amp;pid=xxxxxxxx</code>
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-lg font-extrabold text-slate-900 leading-tight truncate">出席用 QR</h2>
                      <p className="mt-0.5 text-sm text-slate-600 truncate">
                        {name ? `${name} / ` : ""}Meeting: {meeting}
                      </p>
                    </div>
                    <span className="shrink-0 sm:hidden rounded-full bg-violet-600/10 text-violet-700 border border-violet-200 px-2.5 py-1 text-[11px] font-semibold">
                      {meeting}
                    </span>
                  </div>

                  {/* QR ボックス（はみ出し防止 & 画面内フィット） */}
                  <div className="mt-4 grid place-items-center">
                    <div className="w-full aspect-square rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 overflow-hidden">
                      <div className="h-full w-full rounded-xl bg-white overflow-hidden">
                        <ShowQRClient meeting={meeting!} participantId={pid!} name={name || ""} />
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-[11px] leading-relaxed text-slate-500 text-center">
                    画面の明るさを上げてご提示ください。<br className="sm:hidden" />
                    スクリーンショットでも読み取れます。
                  </p>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

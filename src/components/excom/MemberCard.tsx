// src/components/excom/MemberCard.tsx
import Image from "next/image";

type ExtraKV = { label: string; value: string };

function parseExtras(extras: unknown): ExtraKV[] {
  if (!extras) return [];

  // JSON文字列 → パース
  if (typeof extras === "string") {
    try {
      const j = JSON.parse(extras);
      return parseExtras(j);
    } catch {
      return [];
    }
  }

  // 配列 [{label, value}] / [{key, value}] / [{name, value}] などを吸収
  if (Array.isArray(extras)) {
    return extras
      .map((it: any) => {
        if (!it) return null;
        const label = String(it.label ?? it.key ?? it.name ?? "").trim();
        const value = String(it.value ?? "").trim();
        if (!label || !value) return null;
        return { label, value };
      })
      .filter(Boolean) as ExtraKV[];
  }

  // オブジェクト {label:value, ...}
  if (typeof extras === "object") {
    return Object.entries(extras as Record<string, unknown>)
      .map(([k, v]) => {
        const label = String(k ?? "").trim();
        const value = String(v ?? "").trim();
        if (!label || !value) return null;
        return { label, value };
      })
      .filter(Boolean) as ExtraKV[];
  }

  return [];
}

export default function MemberCard({
  m,
  showExtras = true,
}: {
  m: any;
  /** 公開ページでも extras を出したい場合は true（既定） */
  showExtras?: boolean;
}) {
  const name = m?.name ?? "";
  const unit = m?.unit ?? "";
  const role = m?.role ?? "";
  const photoUrl = m?.photoUrl ?? "";
  const extras = showExtras ? parseExtras(m?.extras) : [];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-4">
        {/* 写真 or プレースホルダ */}
        <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
          {photoUrl ? (
            // next/imageを使わずimgでもOK。remote画像をnext/imageで使うならnext.config.jsにremotePatterns設定を
            <Image
              src={photoUrl}
              alt={name ? `${name} の写真` : "member photo"}
              fill
              sizes="80px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-400">
              <span className="text-sm">No Photo</span>
            </div>
          )}
        </div>

        <div className="min-w-0">
          <h3 className="text-lg font-bold text-gray-900 leading-tight">{name}</h3>
          <p className="mt-0.5 text-sm text-gray-600">
            {unit}
            {role ? <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{role}</span> : null}
          </p>

          {/* 任意項目（extras） */}
          {extras.length > 0 && (
            <dl className="mt-3 space-y-1.5">
              {extras.map((kv, i) => (
                <div key={`${kv.label}-${i}`} className="grid grid-cols-[auto,1fr] gap-x-2">
                  <dt className="shrink-0 text-xs font-medium text-gray-500">{kv.label}</dt>
                  <dd className="min-w-0 text-sm text-gray-800 break-words">{kv.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}

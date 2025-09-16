// src/components/excom/MemberCard.tsx
import Image from "next/image";
import { motion } from "framer-motion";
// ...他のimport

type MemberCardProps = {
  m: {
    name: string;
    unit: string;
    role?: string;
    birthDate?: string;      // "YYYY-MM-DD" など
    photo?: string | null;   // どちらでもOKにする
    photoUrl?: string | null;
    extras?: Record<string, string>;
  };
};

function formatBirthDateJP(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return undefined;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function MemberCard({ m }: MemberCardProps) {
  // ▼ ここで“どちらでも”受けられるように統一
  const raw = (m.photo ?? m.photoUrl ?? "").trim();
  const photo = raw.length > 0 ? raw : undefined;

  const initials =
    m.name?.split(/\s+/).map((s) => s[0]).join("").slice(0, 2) || "ARC";
  const birth = formatBirthDateJP(m.birthDate);

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="group overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-md"
    >
      <div className="flex items-center gap-5 p-5 md:p-6">
        {photo ? (
          <Image
            src={photo}
            alt={`${m.name} の写真`}
            width={112}
            height={112}
            sizes="(max-width: 640px) 96px, 112px"
            className="h-[96px] w-[96px] rounded-2xl border object-cover md:h-[112px] md:w-[112px]"
            // 外部ドメイン未許可でも表示できるように
            unoptimized
          />
        ) : (
          // “No Photo” テキストはやめて、イニシャルのプレースホルダーに統一
          <div className="grid h-[96px] w-[96px] place-items-center rounded-2xl border bg-gradient-to-br from-gray-50 to-gray-100 font-bold text-black md:h-[112px] md:w-[112px]">
            <span className="text-[18px] md:text-[20px]">{initials}</span>
          </div>
        )}

        <div className="min-w-0 flex-1 leading-relaxed">
          <div className="truncate font-extrabold text-black" style={{ fontSize: "clamp(18px, 4.2vw, 22px)" }}>
            {m.name}
          </div>

          <div className="mt-1 text-black" style={{ fontSize: "clamp(13px, 3.4vw, 15px)" }}>
            {m.unit}
          </div>

          <div className="mt-2 grid grid-cols-1 gap-1 text-black sm:grid-cols-2" style={{ fontSize: "clamp(13px, 3.4vw, 15px)" }}>
            {m.role && <div className="truncate">役職：{m.role}</div>}
            {birth && <div className="truncate">生年月日：{birth}</div>}
          </div>

          {m.extras && Object.keys(m.extras).length > 0 && (
            <div className="mt-3">
              <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                {Object.entries(m.extras).map(([k, v]) => (
                  <div key={k} className="min-w-0">
                    <dt className="font-semibold text-black" style={{ fontSize: "clamp(12px, 3.2vw, 14px)" }}>
                      {k}
                    </dt>
                    <dd
                      className="break-words text-black"
                      style={{ fontSize: "clamp(13px, 3.6vw, 15px)" }}
                      title={`${k}: ${v}`}
                    >
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// app/arc/executive-committee/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import ArcHeader1 from "@/src/components/ArcHeader1";
import ArcFooter from "@/src/components/ArcFooter";
import HeroImage from "@/src/components/HeroImage";

/* ===== データソース ===== */
const DATA_URL_PRIMARY = "/api/excom/members";   // まずはDB(API)
const DATA_URL_FALLBACK = "/excom/members.json"; // ダメなら従来のJSON

/* ===== 型 ===== */
type ApiMember = {
  id?: string;
  name: string;
  unit: string;
  role?: string | null;
  birthDate?: string | Date | null;         // ← 生年月日（API）
  photoUrl?: string | null;
  order?: number | null;
  extras?: Record<string, string> | null;   // ← 任意項目（API）
};

type JsonMember = {
  name: string;
  unit: string;   // 所属団
  role?: string;  // 役職
  photo?: string; // /public 配下推奨
  order?: number;
  birthDate?: string;                        // ← 生年月日（JSONでもOK）
  extras?: Record<string, string> | null;    // ← 任意項目（JSONでもOK）
};

type Member = {
  name: string;
  unit: string;
  role?: string;
  photo?: string;
  order?: number;
  birthDate?: string;                        // ← 表示用にISO(YYYY-MM-DD)推奨
  extras?: Record<string, string>;
};

/* ===== ユーティリティ ===== */
function normalizeBirthDate(b?: string | Date | null): string | undefined {
  if (!b) return undefined;
  const d = new Date(b);
  if (isNaN(d.getTime())) return undefined;
  // YYYY-MM-DD に正規化して保持（表示時に和文整形）
  return d.toISOString().slice(0, 10);
}

function formatBirthDateJP(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return undefined;
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}年${m}月${day}日`;
}

/* ===== 見出し（赤棒付き） ===== */
function SectionHeading({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mx-auto max-w-6xl">
      <h2
        className="font-extrabold tracking-tight text-gray-900 leading-tight"
        style={{ fontSize: "clamp(20px, 4.6vw, 30px)" }}
      >
        {title}
      </h2>
      <div className="mt-2 h-[2px] w-16 rounded-full bg-red-600" />
      {sub && (
        <p
          className="mt-3 text-gray-800"
          style={{ fontSize: "clamp(13px, 3.2vw, 16px)" }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

/* ===== カード：運営委員 ===== */
function MemberCard({ m }: { m: Member }) {
  const initials = m.name?.split(/\s+/).map((s) => s[0]).join("").slice(0, 2) || "ARC";
  const birth = formatBirthDateJP(m.birthDate);

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="group overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-md"
    >
      <div className="flex items-center gap-5 p-5 md:p-6">
        {/* 画像 / イニシャル：サイズUP */}
        {m.photo ? (
          <Image
            src={m.photo}
            alt={`${m.name} の写真`}
            width={112}
            height={112}
            sizes="(max-width: 640px) 96px, 112px"
            className="h-[96px] w-[96px] rounded-2xl border object-cover md:h-[112px] md:w-[112px]"
          />
        ) : (
          <div className="grid h-[96px] w-[96px] place-items-center rounded-2xl border bg-gradient-to-br from-gray-50 to-gray-100 font-bold text-gray-700 md:h-[112px] md:w-[112px]">
            <span className="text-[18px] md:text-[20px]">{initials}</span>
          </div>
        )}

        {/* テキスト領域：行間＆文字濃度UP、モバイル優先 */}
        <div className="min-w-0 flex-1 leading-relaxed">
          <div className="truncate font-extrabold text-gray-950" style={{ fontSize: "clamp(18px, 4.2vw, 22px)" }}>
            {m.name}
          </div>

          <div className="mt-1 text-gray-900" style={{ fontSize: "clamp(13px, 3.4vw, 15px)" }}>
            {m.unit}
          </div>

          {/* 基本属性（役職 / 生年月日） */}
          <div
            className="mt-2 grid grid-cols-1 gap-1 text-gray-900 sm:grid-cols-2"
            style={{ fontSize: "clamp(13px, 3.4vw, 15px)" }}
          >
            {m.role && <div className="truncate">役職：{m.role}</div>}
            {birth && <div className="truncate">生年月日：{birth}</div>}
          </div>

          {/* 任意項目：2カラム定義リスト、コントラスト強め・折り返し可 */}
          {m.extras && Object.keys(m.extras).length > 0 && (
            <div className="mt-3">
              <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                {Object.entries(m.extras)
                  .filter(([, v]) => String(v ?? "").trim() !== "")
                  .map(([k, v]) => (
                    <div key={k} className="min-w-0">
                      <dt className="font-semibold text-gray-950" style={{ fontSize: "clamp(12px, 3.2vw, 14px)" }}>
                        {k}
                      </dt>
                      <dd
                        className="break-words text-gray-900"
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


/* ===== Coming Soon（ウェーブアニメ） ===== */
function ComingSoonWave({ text = "▼Coming soon　ARC年次総会にて承認されます" }: { text?: string }) {
  const chars = Array.from(text);
  return (
    <div className="py-8 text-center sm:py-10">
      <div className="inline-flex flex-wrap items-end justify-center gap-[2px]">
        {chars.map((ch, i) => (
          <motion.span
            key={`${ch}-${i}`}
            className="inline-block font-extrabold text-gray-800"
            style={{ fontSize: "clamp(16px, 4vw, 22px)" }}
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.06 }}
          >
            {ch === " " ? "\u00A0" : ch}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

/* ===== ページ本体 ===== */
export default function ExecCommitteePage() {
  // ヘッダーナビ
  const navItems = [
    { name: "ホーム", path: "/" },
    { name: "ARCとは", path: "/arc" },
    { name: "事業カレンダー", path: "/arc/calendar" },
    { name: "ARC定例会", path: "/arc/conference" },
    { name: "ARC運営委員会", path: "/arc/executive-committee" },
    // { name: "ARCアンケート", path: "/polls" },
    { name: "目安箱", path: "/suggestion-box"},
  ];

  // データ読込（API → JSON フォールバック）
  const [members, setMembers] = useState<Member[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // ①API を試す
        const r1 = await fetch(DATA_URL_PRIMARY, { cache: "no-store" });
        if (r1.ok) {
          const arr: ApiMember[] = await r1.json();
          if (Array.isArray(arr)) {
            const mapped: Member[] = arr.map((m) => ({
              name: m.name,
              unit: m.unit,
              role: m.role ?? undefined,
              birthDate: normalizeBirthDate(m.birthDate),
              photo: m.photoUrl ?? undefined,
              order: typeof m.order === "number" ? m.order : 0,
              extras: m.extras ?? undefined,
            }));
            setMembers(mapped);
            return;
          }
        }

        // ②フォールバック JSON
        const r2 = await fetch(DATA_URL_FALLBACK, { cache: "no-store" });
        const arr2: JsonMember[] = r2.ok ? await r2.json() : [];
        const safe = (Array.isArray(arr2) ? arr2 : [])
          .filter((m) => m?.name && m?.unit)
          .map<Member>((m) => ({
            name: m.name,
            unit: m.unit,
            role: m.role ?? undefined,
            photo: m.photo ?? undefined,
            order: typeof m.order === "number" ? m.order : 0,
            birthDate: normalizeBirthDate(m.birthDate),
            extras: m.extras ?? undefined,
          }));
        setMembers(safe);
      } catch {
        setMembers([]);
      }
    })();
  }, []);

  const list = useMemo(() => {
    const arr = members ?? [];
    // order があれば優先して昇順に
    return [...arr].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [members]);

  return (
    <div className="w-full bg-white">
      {/* ヘッダー */}
      <ArcHeader1 navItems={navItems} />

      {/* ★ 共通ヒーロー適用 */}
      <HeroImage
        src="/images/R6-3.JPG"
        alt="Aichi Rovers Conference"
        heightClass="h-[40vh] sm:h-[46vh]"
        parallaxAmount={180}
        overlayOpacityRange={[0.45, 0.6]}
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="text-center"
        >
          <h1
            className="font-extrabold text-white drop-shadow-lg leading-tight"
            style={{ fontSize: "clamp(28px, 7vw, 48px)" }}
          >
            ARC運営委員会
          </h1>
          <p className="mt-2 font-medium text-white/90" style={{ fontSize: "clamp(14px, 4.6vw, 24px)" }}>
            Executive Committee
          </p>
        </motion.div>
      </HeroImage>

      {/* 本文：紹介テキスト */}
      <section className="w-full bg-white py-10 sm:py-12 md:py-14 px-4 sm:px-6 md:px-10 lg:px-16">
        <div
          className="mx-auto max-w-6xl space-y-5 text-gray-800"
          style={{ fontSize: "clamp(14px, 3.6vw, 18px)", lineHeight: "1.8" }}
        >
          <p>愛知ローバース会議では、年次総会で任命された「運営委員」が中心となり、組織の持続的な運営を目指しています。</p>
          <p>議長と副議長は総会の決議にて選任、運営委員は議長の推薦した候補者を全体会にて承認されることで任命されます。</p>
          <p>運営委員は月に一度の運営委員会に出席し、愛知のローバースカウトがより良い活動に取り組めるよう、定例会の運営や情報共有に日々励んでいます。</p>
        </div>
      </section>

      {/* 運営委員の紹介（レスポンシブカード） */}
      <section className="w-full bg-white pb-10 sm:pb-12 md:pb-14 px-4 sm:px-6 md:px-10 lg:px-16">
        <SectionHeading title="運営委員の紹介" sub="承認後に順次公開されます。" />
        <div className="mx-auto mt-6 max-w-6xl">
          {list.length === 0 ? (
            <ComingSoonWave />
          ) : (
            // ▼ 列数を抑えてカードを大きく（モバイル1 / md 2 / xl 3）
            <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
              {list.map((m, i) => (
                <MemberCard key={`${m.name}-${i}`} m={m} />
              ))}
            </div>
          )}
        </div>
      </section>


      {/* 仕切り線 */}
      <div className="mx-auto mb-10 mt-6 max-w-6xl px-4 sm:px-6 md:px-10 lg:px-16">
        <div className="border-t border-gray-300" />
      </div>

      <ArcFooter />
    </div>
  );
}

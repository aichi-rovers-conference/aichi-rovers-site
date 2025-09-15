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
  birthDate?: string | Date | null;
  photoUrl?: string | null;
  order?: number | null;
};

type JsonMember = {
  name: string;
  unit: string;   // 所属団
  age?: number;
  role?: string;  // 役職
  photo?: string; // /public 配下推奨
  order?: number;
};

type Member = {
  name: string;
  unit: string;
  age?: number;
  role?: string;
  photo?: string;
  order?: number;
};

/* ===== ユーティリティ ===== */
function ageFromBirthDate(b?: string | Date | null): number | undefined {
  if (!b) return undefined;
  const d = new Date(b);
  if (isNaN(d.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

/* ===== 見出し（赤棒付き） ===== */
function SectionHeading({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-6xl">
      <h2
        className="font-extrabold tracking-tight text-gray-800 leading-tight"
        style={{ fontSize: "clamp(20px, 4.6vw, 30px)" }}
      >
        {title}
      </h2>
      <div className="mt-2 h-[2px] w-16 rounded-full bg-red-600" />
    </div>
  );
}

/* ===== カード：運営委員 ===== */
function MemberCard({ m }: { m: Member }) {
  const initials =
    m.name?.split(/\s+/).map((s) => s[0]).join("").slice(0, 2) || "ARC";

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
    >
      <div className="flex items-center gap-4 p-4">
        {/* 画像 or イニシャル */}
        {m.photo ? (
          <Image
            src={m.photo}
            alt={`${m.name} の写真`}
            width={72}
            height={72}
            sizes="72px"
            className="h-[72px] w-[72px] rounded-full border object-cover"
          />
        ) : (
          <div className="grid h-[72px] w-[72px] place-items-center rounded-full border bg-gray-50 font-bold text-gray-700">
            <span style={{ fontSize: "clamp(14px, 3.8vw, 18px)" }}>{initials}</span>
          </div>
        )}

        <div className="min-w-0">
          <div className="truncate font-bold text-gray-900" style={{ fontSize: "clamp(16px, 3.6vw, 20px)" }}>
            {m.name}
          </div>
          <div className="mt-0.5 truncate text-gray-700" style={{ fontSize: "clamp(12px, 3.2vw, 14px)" }}>
            {m.unit}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-gray-600" style={{ fontSize: "clamp(12px, 3.2vw, 14px)" }}>
            {typeof m.age === "number" && <span>年齢：{m.age}</span>}
            {m.role && <span>役職：{m.role}</span>}
          </div>
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
    { name: "ARCアンケート", path: "/polls" },
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
              age: ageFromBirthDate(m.birthDate),
              photo: m.photoUrl ?? undefined,
              order: typeof m.order === "number" ? m.order : 0,
            }));
            setMembers(mapped);
            return;
          }
        }

        // ②フォールバック JSON
        const r2 = await fetch(DATA_URL_FALLBACK, { cache: "no-store" });
        const arr2: JsonMember[] = r2.ok ? await r2.json() : [];
        const safe = Array.isArray(arr2) ? arr2.filter((m) => m?.name && m?.unit) : [];
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
          <p>
            愛知ローバース会議では、年次総会で任命された「運営委員」が中心となり、組織の持続的な運営を目指しています。
          </p>
          <p>
            議長と副議長は総会の決議にて選任、運営委員は議長の推薦した候補者を全体会にて承認されることで任命されます。
          </p>
          <p>
            運営委員は月に一度の運営委員会に出席し、愛知のローバースカウトがより良い活動に取り組めるよう、定例会の運営や情報共有に日々励んでいます。
          </p>
        </div>
      </section>

      {/* 運営委員の紹介（レスポンシブカード） */}
      <section className="w-full bg-white pb-10 sm:pb-12 md:pb-14 px-4 sm:px-6 md:px-10 lg:px-16">
        <SectionHeading title="運営委員の紹介" />
        <div className="mx-auto mt-6 max-w-6xl">
          {list.length === 0 ? (
            <ComingSoonWave />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
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

// app/api/participants/import/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { District as DistrictEnum } from "@prisma/client";
import { rebuildMeetingSheet } from "@/src/lib/buildMeetingSheet";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 日本語ラベル <-> Enum
const LABEL_BY_ENUM: Record<DistrictEnum, string> = {
  [DistrictEnum.NAGOYA_CHIKUSA]: "名古屋千種地区",
  [DistrictEnum.NAGOYA_SEIBU]:   "名古屋西部地区",
  [DistrictEnum.NAGOYA_HOKUTO]:  "名古屋北斗地区",
  [DistrictEnum.NAGOYA_TATSUMI]: "名古屋巽地区",
  [DistrictEnum.OWARI_NISHI]:    "尾張西地区",
  [DistrictEnum.OWARI_HIGASHI]:  "尾張東地区",
  [DistrictEnum.OWARI_MINAMI]:   "尾張南地区",
  [DistrictEnum.CHITA_HOKUBU]:   "知多北部地区",
  [DistrictEnum.CHITA_HIGASHI]:  "知多東地区",
  [DistrictEnum.CHITA_SEINAN]:   "知多西南地区",
  [DistrictEnum.TOYOTA]:         "豊田地区",
  [DistrictEnum.MIKAWA_AOI]:     "三河葵地区",
  [DistrictEnum.HEKIKAI]:        "碧海地区",
  [DistrictEnum.HONOKUNI]:       "穂の国地区",
  [DistrictEnum.OTHERS]:         "その他地区",
};
const ENUM_BY_LABEL: Record<string, DistrictEnum> =
  Object.fromEntries(Object.entries(LABEL_BY_ENUM).map(([k, v]) => [v, k as DistrictEnum])) as any;

function parseDistrict(input?: string | null): DistrictEnum | undefined {
  if (!input) return undefined;
  const s = String(input).trim();
  if ((Object.keys(LABEL_BY_ENUM) as string[]).includes(s)) return s as DistrictEnum; // Enum記号
  if (ENUM_BY_LABEL[s]) return ENUM_BY_LABEL[s]; // 日本語ラベル
  const norm = s.replace(/[\s　]/g, "");
  const hit = Object.entries(LABEL_BY_ENUM).find(([, label]) => label.replace(/[\s　]/g, "") === norm);
  return hit ? (hit[0] as DistrictEnum) : undefined;
}

type Row = { name: string; troop: string; rsAge: number; district: DistrictEnum };

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawText = typeof body?.text === "string" ? body.text : "";
    const lines = rawText
      .split(/\r?\n/)
      .map((s: string) => s.trim())  // ★ 型注釈
      .filter(Boolean);

    if (!lines.length) {
      return NextResponse.json({ ok: false, error: "no_lines" }, { status: 400 });
    }

    // 先頭行がヘッダーならスキップ
    const hasHeader = /氏名|名前|団|RS|地区/.test(lines[0]);
    const rows = hasHeader ? lines.slice(1) : lines;

    const accepted: Row[] = [];
    const rejected: Array<{ line: string; reason: string }> = [];
    const seen = new Set<string>(); // 同一アップロード内の重複排除

    for (const line of rows) {
      const cols = line.split(/,|\t/).map((s: string) => (s ?? "").trim());
      const [name, troop, rsAgeStr, districtRaw] = [
        cols[0] || "",
        cols[1] || "",
        cols[2] || "",
        cols[3] || "",
      ];

      const rsAgeNum = Number(rsAgeStr);
      const districtEnum = parseDistrict(districtRaw);

      if (!name || !troop || !Number.isFinite(rsAgeNum) || !districtEnum) {
        rejected.push({
          line,
          reason: !name
            ? "name missing"
            : !troop
            ? "troop missing"
            : !Number.isFinite(rsAgeNum)
            ? "rsAge invalid"
            : "district invalid",
        });
        continue;
      }

      const key = `${name}__${troop}__${Math.floor(rsAgeNum)}__${districtEnum}`;
      if (seen.has(key)) {
        rejected.push({ line, reason: "duplicate in upload" });
        continue;
      }
      seen.add(key);

      accepted.push({
        name,
        troop,
        rsAge: Math.floor(rsAgeNum),
        district: districtEnum,
      });
    }

    if (!accepted.length) {
      return NextResponse.json({ ok: false, created: 0, rejected }, { status: 400 });
    }

    // === 挿入（skipDuplicates が使えないため 1件ずつ）===
    // DB側のユニーク制約（例: email 等）に当たったら P2002 を握りつぶし
    let created = 0;
    const duplicates: Row[] = [];
    for (const data of accepted) {
      try {
        await prisma.participant.create({ data });
        created++;
      } catch (e: any) {
        if (e?.code === "P2002") {
          duplicates.push(data); // 既に存在
        } else {
          // 想定外のエラーは終了
          throw e;
        }
      }
    }

    // シート再生成（失敗してもレスポンスは成功で返す）
    try {
      await rebuildMeetingSheet();
    } catch (e) {
      console.error("rebuildMeetingSheet failed:", e);
    }

    return NextResponse.json({
      ok: true,
      requested: rows.length,
      accepted: accepted.length,
      created,
      skippedAsDuplicateInDB: duplicates.length,
      rejected,
    });
  } catch (e: any) {
    const code = e?.code || "SERVER_ERROR";
    const message = e?.message || String(e);
    return NextResponse.json({ ok: false, error: code, message }, { status: 500 });
  }
}

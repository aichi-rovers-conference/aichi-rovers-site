// app/api/participants/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { District as DistrictEnum, Prisma } from "@prisma/client";
import { rebuildMeetingSheet } from "@/lib/buildMeetingSheet";

export const dynamic = "force-dynamic";
export const revalidate = 0;
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

function parseDistrictParam(input?: string | null): DistrictEnum | undefined {
  if (!input) return undefined;
  const s = String(input).trim();
  if ((Object.keys(LABEL_BY_ENUM) as string[]).includes(s)) return s as DistrictEnum; // Enum記号
  if (ENUM_BY_LABEL[s]) return ENUM_BY_LABEL[s]; // 日本語ラベル
  return undefined;
}

function toDTO(p: any) {
  return {
    id: p.id,
    name: p.name,
    troop: p.troop,
    rsAge: p.rsAge,
    district: LABEL_BY_ENUM[p.district as DistrictEnum],
    email: p.email ?? null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

// GET /api/participants?district=...&q=...&limit=50&hasEmail=true
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const districtParam = searchParams.get("district");
    const q = (searchParams.get("q") || "").trim();
    const limitRaw = Number(searchParams.get("limit") || 50);
    const limit = Number.isFinite(limitRaw) ? Math.min(200, Math.max(1, limitRaw)) : 50;
    const hasEmail = (searchParams.get("hasEmail") || "").toLowerCase() === "true";

    const where: Prisma.ParticipantWhereInput = {};
    const andParts: Prisma.ParticipantWhereInput[] = [];

    const districtEnum = parseDistrictParam(districtParam);
    if (districtEnum) where.district = districtEnum;

    if (q) {
      // ※ あなたの Prisma 型では email/name/troop の filter に mode が無いようなので、純粋な contains のみ
      where.OR = [
        { name:  { contains: q } },
        { troop: { contains: q } },
        { email: { contains: q } },
      ];
    }

    if (hasEmail) {
      andParts.push({ email: { not: null } });
      andParts.push({ NOT: { email: "" } });
    }

    if (andParts.length) {
      const existing = where.AND;
      if (Array.isArray(existing)) where.AND = [...existing, ...andParts];
      else if (existing) where.AND = [existing, ...andParts];
      else where.AND = andParts;
    }

    const items = await prisma.participant.findMany({
      where,
      orderBy: [{ name: "asc" }],
      take: limit,
    });

    return NextResponse.json({ items: items.map(toDTO) });
  } catch (e: any) {
    return NextResponse.json(
      { items: [], error: e?.code || "SERVER_ERROR", message: e?.message || String(e) },
      { status: 500 },
    );
  }
}

// POST /api/participants  { name, troop, rsAge, district, email? }
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body?.name ?? "").trim();
    const troop = String(body?.troop ?? "").trim();
    const rsAge = Number(body?.rsAge);
    const districtEnum = parseDistrictParam(body?.district);
    const emailRaw = (body?.email == null ? null : String(body.email).trim()) || null;

    if (!name || !troop || !Number.isFinite(rsAge) || !districtEnum) {
      return NextResponse.json({ error: "invalid payload" }, { status: 400 });
    }
    if (emailRaw && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailRaw)) {
      return NextResponse.json({ error: "invalid email" }, { status: 400 });
    }

    const p = await prisma.participant.create({
      data: { name, troop, rsAge, district: districtEnum, email: emailRaw },
    });

    try {
      await rebuildMeetingSheet();
    } catch (rebuildErr) {
      console.error("rebuildMeetingSheet failed:", rebuildErr);
    }

    return NextResponse.json({ ok: true, item: toDTO(p) }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json(
        { ok: false, error: "DUPLICATE", message: "email is already registered" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { ok: false, error: e?.code || "SERVER_ERROR", message: e?.message || String(e) },
      { status: 500 },
    );
  }
}

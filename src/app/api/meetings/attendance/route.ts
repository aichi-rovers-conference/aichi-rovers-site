// app/api/participants/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { District, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function bad(message = "Bad Request", status = 400) {
  return NextResponse.json({ ok: false, error: "BAD_REQUEST", message }, { status });
}
function errJson(e: any) {
  return NextResponse.json(
    { ok: false, error: e?.code || "SERVER_ERROR", message: e?.message || String(e) },
    { status: 500 }
  );
}

/* District 日本語⇔Enum マップ（必要ならGETの返却で使う） */
const LABEL_BY_ENUM: Record<District, string> = {
  [District.NAGOYA_CHIKUSA]: "名古屋千種地区",
  [District.NAGOYA_SEIBU]:   "名古屋西部地区",
  [District.NAGOYA_HOKUTO]:  "名古屋北斗地区",
  [District.NAGOYA_TATSUMI]: "名古屋巽地区",
  [District.OWARI_NISHI]:    "尾張西地区",
  [District.OWARI_HIGASHI]:  "尾張東地区",
  [District.OWARI_MINAMI]:   "尾張南地区",
  [District.CHITA_HOKUBU]:   "知多北部地区",
  [District.CHITA_HIGASHI]:  "知多東地区",
  [District.CHITA_SEINAN]:   "知多西南地区",
  [District.TOYOTA]:         "豊田地区",
  [District.MIKAWA_AOI]:     "三河葵地区",
  [District.HEKIKAI]:        "碧海地区",
  [District.HONOKUNI]:       "穂の国地区",
  [District.OTHERS]:         "その他地区",
};
const ENUM_BY_LABEL: Record<string, District> = Object.fromEntries(
  Object.entries(LABEL_BY_ENUM).map(([e, label]) => [label, e as District])
) as Record<string, District>;

function parseDistrictParam(input?: string | null): District | undefined {
  if (!input) return undefined;
  if ((Object.keys(LABEL_BY_ENUM) as string[]).includes(input)) return input as District; // Enum文字列
  return ENUM_BY_LABEL[input]; // 日本語ラベル
}

/* ========== GET ========== */
// /api/participants?district=...&q=...&limit=50&hasEmail=true
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const districtParam = (searchParams.get("district") || "").trim();
    const q = (searchParams.get("q") || "").trim();
    const hasEmail = (searchParams.get("hasEmail") || "").toLowerCase() === "true";

    const limitRaw = Number(searchParams.get("limit") || 50);
    const limit = Math.max(1, Math.min(200, Number.isFinite(limitRaw) ? limitRaw : 50));

    const district = parseDistrictParam(districtParam);

    const where: Prisma.ParticipantWhereInput = {};
    if (district) where.district = district;
    if (q) {
      // ※ あなたの Client に `mode: "insensitive"` が無いので通常の contains のみ
      where.OR = [
        { name:  { contains: q } },
        { troop: { contains: q } },
        { email: { contains: q } },
      ];
    }
    if (hasEmail) where.email = { not: null };

    const items = await prisma.participant.findMany({
      where,
      orderBy: [{ name: "asc" }],
      take: limit,
      select: {
        id: true,
        name: true,
        troop: true,
        district: true,
        rsAge: true,
        email: true,
        // createdAt/updatedAt はスキーマに無いなら選ばない
      },
    });

    return NextResponse.json(
      { ok: true, items },
      { headers: { "Cache-Control": "no-store, must-revalidate" } }
    );
  } catch (e: any) {
    return errJson(e);
  }
}

/* ========== POST ========== */
// { name, troop, rsAge, district, email? }  ※district は Enum でも日本語でもOK
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body?.name ?? "").trim();
    const troop = String(body?.troop ?? "").trim();
    const rsAgeNum = Number(body?.rsAge);
    const districtInput = String(body?.district ?? "").trim();
    const emailRaw = body?.email == null ? null : (String(body.email).trim() || null);

    if (!name) return bad("name is required");
    if (!troop) return bad("troop is required");
    if (!Number.isFinite(rsAgeNum)) return bad("rsAge must be a number");

    const district = parseDistrictParam(districtInput);
    if (!district) return bad("invalid district");

    if (emailRaw && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailRaw)) {
      return bad("invalid email");
    }

    const participant = await prisma.participant.create({
      data: {
        name,
        troop,
        rsAge: Math.max(0, Math.floor(rsAgeNum)),
        district,
        email: emailRaw,
      },
    });

    return NextResponse.json(
      { ok: true, item: participant, participant },
      { status: 201, headers: { "Cache-Control": "no-store, must-revalidate" } }
    );
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json(
        { ok: false, error: "DUPLICATE", message: "email is already registered" },
        { status: 409 }
      );
    }
    return errJson(e);
  }
}

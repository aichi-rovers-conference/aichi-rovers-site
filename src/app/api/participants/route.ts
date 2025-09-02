// src/app/api/participants/route.ts
import { NextResponse } from "next/server";
import * as PrismaLib from "@/lib/prisma"; // prisma / prisma2 / writeClients を任意で export しておく
import { District as DistrictEnum, Prisma } from "@prisma/client";
import { rebuildMeetingSheet } from "@/src/lib/buildMeetingSheet";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

/** lib/prisma 側の export を吸収して、書き込み対象クライアント配列を構築 */
function getWriteClients(): any[] {
  const clients: any[] = [];
  const anyLib: any = PrismaLib as any;
  if (anyLib.prisma) clients.push(anyLib.prisma);
  if (anyLib.prisma2) clients.push(anyLib.prisma2);
  if (Array.isArray(anyLib.writeClients)) clients.push(...anyLib.writeClients);
  // 重複除去（同一参照）念のため
  return Array.from(new Set(clients));
}

/** 日本語ラベル <-> Enum */
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
  if ((Object.keys(LABEL_BY_ENUM) as string[]).includes(s)) return s as DistrictEnum; // Enumキー
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

// ======================== GET ========================
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
      // Email/Name/Troop を部分一致（mode 指定なし）
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

    // 読み取りは第一クライアント優先（複数DBの整合は運用ポリシーに依存）
    const [primary] = getWriteClients();
    if (!primary) {
      return NextResponse.json({ items: [], error: "NO_DB_CLIENT" }, { status: 500 });
    }

    const items = await primary.participant.findMany({
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

// ======================== POST ========================
// POST /api/participants { name, troop, rsAge, district, email? }
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body?.name ?? "").trim();
    const troop = String(body?.troop ?? "").trim();
    const rsAge = Number(body?.rsAge);
    const districtEnum = parseDistrictParam(body?.district);
    const emailRaw = (body?.email == null ? null : String(body.email).trim()) || null;

    if (!name || !troop || !Number.isFinite(rsAge) || !districtEnum) {
      return NextResponse.json({ ok: false, error: "INVALID_PAYLOAD" }, { status: 400 });
    }
    if (emailRaw && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailRaw)) {
      return NextResponse.json({ ok: false, error: "INVALID_EMAIL" }, { status: 400 });
    }

    const clients = getWriteClients();
    if (!clients.length) {
      return NextResponse.json({ ok: false, error: "NO_DB_CLIENT" }, { status: 500 });
    }

    // ---- まず第一DBに作成（正準DB）----
    let created: any | null = null;
    try {
      created = await clients[0].participant.create({
        data: { name, troop, rsAge, district: districtEnum, email: emailRaw },
      });
    } catch (e: any) {
      if (e?.code === "P2002") {
        return NextResponse.json(
          { ok: false, error: "DUPLICATE", message: "email is already registered" },
          { status: 409 },
        );
      }
      throw e;
    }

    // ---- 残りのDBにもベストエフォートで反映（存在すれば）----
    // 同一emailの unique 制約競合はスキップ（ログのみ）
    await Promise.all(
      clients.slice(1).map(async (c, idx) => {
        try {
          await c.participant.create({
            data: {
              id: created.id, // 同一IDで複製したい場合（※DB設定によっては不要/不可なら外してください）
              name,
              troop,
              rsAge,
              district: districtEnum,
              email: emailRaw,
              createdAt: created.createdAt,
              updatedAt: created.updatedAt,
            },
          });
        } catch (e: any) {
          if (e?.code === "P2002") {
            console.warn(`[POST /participants] secondary#${idx} duplicate email, skip`);
            return;
          }
          console.error(`[POST /participants] secondary#${idx} write failed:`, e);
        }
      })
    );

    // ---- 付随処理（失敗しても登録自体は成功扱い）----
    try {
      await rebuildMeetingSheet();
    } catch (rebuildErr) {
      console.error("rebuildMeetingSheet failed:", rebuildErr);
    }

    return NextResponse.json({ ok: true, item: toDTO(created) }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.code || "SERVER_ERROR", message: e?.message || String(e) },
      { status: 500 },
    );
  }
}

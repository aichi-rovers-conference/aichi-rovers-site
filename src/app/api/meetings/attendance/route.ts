// app/api/participants/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma"; 
import { District } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** 400 */
function bad(message = "Bad Request", status = 400) {
  return NextResponse.json({ ok: false, error: "BAD_REQUEST", message }, { status });
}

/** 500 */
function errJson(e: any) {
  return NextResponse.json(
    { ok: false, error: e?.code || "SERVER_ERROR", message: e?.message || String(e) },
    { status: 500 }
  );
}

// GET /api/participants?district=...&q=...&limit=50
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const districtParam = (searchParams.get("district") || "").trim();
    const q = (searchParams.get("q") || "").trim();
    const limitRaw = Number(searchParams.get("limit") || 50);
    const limit = Math.max(1, Math.min(200, Number.isFinite(limitRaw) ? limitRaw : 50));

    // district のバリデーション
    const districtValues = Object.values(District) as string[];
    const district =
      districtParam && districtValues.includes(districtParam) ? (districtParam as District) : undefined;

    const where: any = {};
    if (district) where.district = district;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" as const } },
        { troop: { contains: q, mode: "insensitive" as const } },
      ];
    }

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
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return errJson(e);
  }
}

// POST /api/participants  { name, troop, rsAge, district }
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body?.name ?? "").trim();
    const troop = String(body?.troop ?? "").trim();
    const rsAgeNum = Number(body?.rsAge);
    const districtStr = String(body?.district ?? "").trim();

    if (!name) return bad("name is required");
    if (!troop) return bad("troop is required");
    if (!Number.isFinite(rsAgeNum)) return bad("rsAge must be a number");
    const districtValues = Object.values(District) as string[];
    if (!districtValues.includes(districtStr)) return bad("invalid district");

    const participant = await prisma.participant.create({
      data: {
        name,
        troop,
        rsAge: Math.max(0, Math.floor(rsAgeNum)),
        district: districtStr as District,
      },
    });

    // 両対応: 既存の { item } と今後統一の { participant } を両方返す
    return NextResponse.json({ ok: true, item: participant, participant }, { status: 201 });
  } catch (e: any) {
    return errJson(e);
  }
}

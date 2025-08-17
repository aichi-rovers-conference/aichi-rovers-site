// app/api/games/fire-start/scores/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_LIMIT = 50;

async function fetchTop(limit = 20) {
  const take = Math.max(1, Math.min(MAX_LIMIT, limit));
  return prisma.fireScore.findMany({
    orderBy: [{ score: "desc" }, { createdAt: "asc" }],
    take,
    select: { id: true, name: true, score: true, createdAt: true },
  });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limitParam = Number(url.searchParams.get("limit") ?? 20);
  const items = await fetchTop(Number.isFinite(limitParam) ? limitParam : 20);
  return NextResponse.json(
    { ok: true, items },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function DELETE() {
  try {
    await prisma.fireScore.deleteMany();
    return NextResponse.json({ ok: true });
  } catch {
    // テーブル未作成などでも 200 を返していた仕様を踏襲
    return NextResponse.json({ ok: false });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any));
  const rawName = typeof body?.name === "string" ? body.name.trim() : "";
  const rawScore = Number(body?.score);

  if (!rawName) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!Number.isFinite(rawScore)) {
    return NextResponse.json({ error: "score must be number" }, { status: 400 });
  }

  const name = rawName.replace(/\s+/g, " ").slice(0, 40);
  const score = Math.max(0, Math.min(200_000, Math.round(rawScore)));

  try {
    await prisma.fireScore.create({ data: { name, score } });
  } catch {
    return NextResponse.json({ ok: false, error: "CREATE_FAILED" }, { status: 500 });
  }

  const items = await fetchTop();
  return NextResponse.json(
    { ok: true, items },
    { status: 201, headers: { "Cache-Control": "no-store" } }
  );
}

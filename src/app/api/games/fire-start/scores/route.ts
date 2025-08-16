import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma"; 

export const dynamic = "force-dynamic";

const fetchTop = async () => {
  const items = await prisma.fireScore.findMany({
    orderBy: [{ score: "desc" }, { createdAt: "asc" }],
    take: 20,
    select: { id: true, name: true, score: true, createdAt: true },
  });
  return items;
};

export async function GET() {
  const items = await fetchTop();
  return NextResponse.json({ items });
}

export async function DELETE() {
  try {
    await prisma.fireScore.deleteMany({});
    return NextResponse.json({ ok: true });
  } catch {
    // テーブル未作成などでも 200 を返し、フロントは localStorage 側も消す
    return NextResponse.json({ ok: false });
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const rawName = String(body?.name ?? "").trim();
  const rawScore = Number(body?.score);

  if (!rawName) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!Number.isFinite(rawScore)) {
    return NextResponse.json({ error: "score must be number" }, { status: 400 });
  }

  const name = rawName.slice(0, 40);
  const score = Math.max(0, Math.min(200000, Math.round(rawScore)));

  await prisma.fireScore.create({ data: { name, score } });
  const items = await fetchTop();
  return NextResponse.json({ ok: true, items });
}

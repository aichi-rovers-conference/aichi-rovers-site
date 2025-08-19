import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma"; 

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const items = await prisma.gameScore.findMany({
      where: { game: "scout-crush" },
      orderBy: [{ score: "desc" }, { createdAt: "asc" }], // 同点は早い者順
      take: 50,
      select: { name: true, score: true, createdAt: true },
    });
    return NextResponse.json(items);
  } catch (e) {
    console.error("[GET /api/games/scout-crush/top]", e);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

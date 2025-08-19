import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma"; 

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body?.name ?? "Scout").trim().slice(0, 30);
    const scoreRaw = body?.score;
    const movesUsedRaw = body?.movesUsed;

    const score = Number(scoreRaw);
    const movesUsed = movesUsedRaw == null ? null : Number(movesUsedRaw);

    if (!Number.isFinite(score)) {
      return NextResponse.json({ error: "bad score" }, { status: 400 });
    }

    await prisma.gameScore.create({
      data: {
        game: "scout-crush",
        name,
        score,
        ...(Number.isFinite(movesUsed as number) ? { movesUsed: movesUsed as number } : {}),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[POST /api/games/scout-crush/score]", e);
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
}

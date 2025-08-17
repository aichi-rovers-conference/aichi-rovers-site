// app/api/p/[token]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> } // ← Promise で受ける
) {
  const { token } = await ctx.params;              // ← await して展開
  if (!token || token.trim() === "") {
    return NextResponse.json({ error: "bad_token" }, { status: 400 });
  }

  const rec = await prisma.emailToken.findUnique({
    where: { token },
    include: { participant: true },
  });

  if (!rec) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: { "Cache-Control": "no-store, must-revalidate" } });
  }
  if (rec.expiresAt && rec.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "expired" }, { status: 410, headers: { "Cache-Control": "no-store, must-revalidate" } });
  }

  const p = rec.participant;
  const payload = {
    v: 1,
    type: "arc-attendance",
    meeting: rec.meetingCode,
    participantId: p.id,
    name: p.name,
  };

  return NextResponse.json(
    {
      ok: true,
      meeting: { code: rec.meetingCode },
      participant: { id: p.id, name: p.name, troop: p.troop, district: p.district },
      payload,
    },
    { headers: { "Cache-Control": "no-store, must-revalidate" } }
  );
}

// app/api/meetings/[id]/attendance/by-district/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> } // ← Promise にする
) {
  const { id: meetingId } = await ctx.params;
  if (!meetingId) {
    return NextResponse.json({ error: "Missing meeting id" }, { status: 400 });
  }

  const rows = await prisma.attendance.findMany({
    where: { meetingId },
    select: { participant: { select: { district: true } } }, // selectで十分
  });

  const counts = new Map<string, number>();
  for (const r of rows) {
    const d = String(r.participant.district); // Prisma Enum → string
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }

  const items = Array.from(counts, ([district, count]) => ({ district, count }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json(
    { items, total: rows.length },
    { headers: { "Cache-Control": "no-store, must-revalidate" } }
  );
}

import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma"; 

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const meetingId = params.id;
  const rows = await prisma.attendance.findMany({
    where: { meetingId },
    include: { participant: { select: { district: true } } },
  });
  const map = new Map<string, number>();
  for (const r of rows) {
    const d = r.participant.district as string;
    map.set(d, (map.get(d) || 0) + 1);
  }
  const items = Array.from(map.entries()).map(([district, count]) => ({ district, count }))
    .sort((a, b) => b.count - a.count);
  return NextResponse.json({ items, total: rows.length });
}

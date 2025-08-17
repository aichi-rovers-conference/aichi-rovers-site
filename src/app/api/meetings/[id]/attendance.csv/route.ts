// app/api/meetings/[id]/attendance/export/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> } // ← Promise を受け取り
) {
  const { id: meetingId } = await ctx.params;      // ← await で展開

  const rows = await prisma.attendance.findMany({
    where: { meetingId },
    include: { participant: true },
    orderBy: { checkedAt: "asc" },
  });

  const header = "name,troop,rsAge,district,checkedAt\n";
  const body = rows
    .map((r) =>
      [
        r.participant?.name ?? "",
        r.participant?.troop ?? "",
        r.participant?.rsAge ?? "",
        r.participant?.district ?? "",
        r.checkedAt.toISOString(),
      ]
        .map((s) => `"${String(s).replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");

  // Excel での文字化け防止に UTF-8 BOM を付与
  const csv = "\uFEFF" + header + body;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="attendance-${meetingId}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

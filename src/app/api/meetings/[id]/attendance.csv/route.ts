import { prisma } from "../../../../../../lib/prisma"; 

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const meetingId = params.id;
  const rows = await prisma.attendance.findMany({
    where: { meetingId },
    include: { participant: true },
    orderBy: { checkedAt: "asc" },
  });
  const header = "name,troop,rsAge,district,checkedAt\n";
  const body = rows.map(r =>
    [
      r.participant.name,
      r.participant.troop,
      r.participant.rsAge,
      r.participant.district,
      r.checkedAt.toISOString(),
    ].map(s => `"${String(s).replace(/"/g, '""')}"`).join(",")
  ).join("\n");
  return new Response(header + body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="attendance-${meetingId}.csv"`,
    },
  });
}

import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const token = params.token;
  const rec = await prisma.emailToken.findUnique({
    where: { token },
    include: { participant: true },
  });

  if (!rec) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (rec.expiresAt && rec.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }
  const p = rec.participant;
  // スキャナが読むQRのペイロード（既存フォーマットに一致）
  const payload = {
    v: 1,
    type: "arc-attendance",
    meeting: rec.meetingCode,
    participantId: p.id,
    name: p.name,
  };

  return NextResponse.json({
    ok: true,
    meeting: { code: rec.meetingCode },
    participant: { id: p.id, name: p.name, troop: p.troop, district: p.district },
    payload,
  });
}

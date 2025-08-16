// app/api/attendance/checkin/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

function parseCode(code: string) {
  const m = /^R(\d+)-(\d+)$/.exec(code);
  if (!m) return null;
  return { reiwa: Number(m[1]), seq: Number(m[2]) };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const meetingCode = String(body?.meetingCode || "");
  const participantId = String(body?.participantId || "");
  const via = String(body?.via || "qr");

  if (!meetingCode || !participantId) return bad("meetingCode / participantId が必要です");

  const p = await prisma.participant.findUnique({ where: { id: participantId } });
  if (!p) return bad("participant not found", 404);

  // Meeting を code で取得/作成
  let meeting = await prisma.meeting.findUnique({ where: { code: meetingCode } });
  if (!meeting) {
    const parsed = parseCode(meetingCode);
    if (!parsed) return bad("invalid meeting code");
    meeting = await prisma.meeting.create({
      data: {
        code: meetingCode,
        title: meetingCode,
        date: new Date(),
        reiwa: parsed.reiwa,
        seq: parsed.seq,
      },
    });
  }

  // 既存出席があるか
  const existing = await prisma.attendance.findUnique({
    where: { meetingId_participantId: { meetingId: meeting.id, participantId: p.id } },
  });

  if (existing) {
    return NextResponse.json({
      ok: true,
      meeting: { code: meeting.code },
      participant: { id: p.id, name: p.name, troop: p.troop, district: p.district },
      attendance: { checkedAt: existing.checkedAt, already: true },
    });
  }

  const newAtt = await prisma.attendance.create({
    data: {
      meetingId: meeting.id,
      participantId: p.id,
      checkedAt: new Date(),
      via,
    },
  });

  return NextResponse.json({
    ok: true,
    meeting: { code: meeting.code },
    participant: { id: p.id, name: p.name, troop: p.troop, district: p.district },
    attendance: { checkedAt: newAtt.checkedAt, already: false },
  });
}

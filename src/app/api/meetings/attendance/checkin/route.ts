// app/api/attendance/checkin/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma"; // プロジェクトの階層に合わせて調整
export const runtime = "nodejs";
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
  const via = String(body?.via || "qr"); // ← 常に string に正規化

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

  // 既存の重複を考慮。via が DB 上で null になり得るので union 型で受ける
  let already = false;
  let rec:
    | { checkedAt: Date; meetingId: string; participantId: string; via: string | null }
    | null = null;

  try {
    rec = await prisma.attendance.create({
      data: {
        meetingId: meeting.id,
        participantId: p.id,
        checkedAt: new Date(),
        via, // 作成時は string
      },
      select: { checkedAt: true, meetingId: true, participantId: true, via: true },
    });
  } catch (e: any) {
    if (e?.code === "P2002") {
      // 一意制約違反＝既に打刻済み
      already = true;
      rec = await prisma.attendance.findUnique({
        where: { meetingId_participantId: { meetingId: meeting.id, participantId: p.id } },
        select: { checkedAt: true, meetingId: true, participantId: true, via: true },
      });
    } else {
      throw e;
    }
  }

  return NextResponse.json({
    ok: true,
    meeting: { code: meeting.code },
    participant: { id: p.id, name: p.name, troop: p.troop, district: p.district },
    attendance: {
      checkedAt: rec?.checkedAt ?? new Date(),
      already,
      via: rec?.via ?? via, // ← null ならフォールバック
    },
  });
}

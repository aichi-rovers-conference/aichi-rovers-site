// app/api/attendance/checkin/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifyToken } from "@/lib/auth";

/**
 * 期待するQRペイロード例:
 * {"v":1,"type":"arc-attendance","meeting":"R6-1","participantId":"<cuid>","name":"任意"}
 */
type QrPayload = {
  v: number;
  type: "arc-attendance";
  meeting: string;          // Meeting.code (ユニーク)
  participantId: string;    // Participant.id (cuid)
  name?: string;
};

async function requireSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value ?? "";
  const session = token ? await verifyToken(token) : null;
  if (!session) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  return session;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  let body: QrPayload | undefined;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  if (!body || body.v !== 1 || body.type !== "arc-attendance" || !body.meeting || !body.participantId) {
    return NextResponse.json({ ok: false, error: "INVALID_QR_PAYLOAD" }, { status: 400 });
  }

  // ミーティング・参加者の存在確認
  const meeting = await prisma.meeting.findUnique({ where: { code: body.meeting } });
  if (!meeting) {
    return NextResponse.json({ ok: false, error: "MEETING_NOT_FOUND", meeting: body.meeting }, { status: 404 });
  }
  const participant = await prisma.participant.findUnique({ where: { id: body.participantId } });
  if (!participant) {
    return NextResponse.json({ ok: false, error: "PARTICIPANT_NOT_FOUND", participantId: body.participantId }, { status: 404 });
  }

  // すでにチェックイン済みなら idempotent にOK返す
  const existing = await prisma.attendance.findFirst({
    where: { meetingId: meeting.id, participantId: participant.id },
    select: { id: true, checkedAt: true, via: true },
  });
  if (existing) {
    return NextResponse.json({
      ok: true,
      already: true,
      meeting: meeting.code,
      participantId: participant.id,
      name: participant.name,
      checkedAt: existing.checkedAt,
    });
  }

  // 新規チェックイン
  const created = await prisma.attendance.create({
    data: {
      meetingId: meeting.id,
      participantId: participant.id,
      via: "qr",
    },
    select: { id: true, checkedAt: true },
  });

  return NextResponse.json({
    ok: true,
    already: false,
    attendanceId: created.id,
    checkedAt: created.checkedAt,
    meeting: meeting.code,
    participantId: participant.id,
    name: participant.name,
  });
}

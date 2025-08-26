// app/api/meetings/attendance/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function bad(message = "Bad Request", status = 400) {
  return NextResponse.json({ ok: false, error: "BAD_REQUEST", message }, { status });
}
function errJson(e: any, status = 500) {
  return NextResponse.json(
    { ok: false, error: e?.code || "SERVER_ERROR", message: e?.message || String(e) },
    { status }
  );
}

// "R7-2" / "R7-02" 両対応で正規化
function normalizeMeetingCode(raw: string) {
  const s = String(raw || "").trim().toUpperCase();
  const m = /^R(\d+)-(\d+)$/.exec(s);
  if (!m) return null;
  const reiwa = Number(m[1]);
  const seq = Number(m[2]);
  if (!Number.isFinite(reiwa) || !Number.isFinite(seq)) return null;
  const codePadded = `R${reiwa}-${String(seq).padStart(2, "0")}`;
  return { reiwa, seq, codeRaw: s, codePadded };
}

async function findMeetingByCode(raw: string) {
  const n = normalizeMeetingCode(raw);
  if (!n) return null;
  // ゼロ埋め優先、見つからなければ raw も試す（既存データが R7-2 で入っている可能性のケア）
  const codes = [n.codePadded, n.codeRaw].filter((v, i, a) => a.indexOf(v) === i);
  return prisma.meeting.findFirst({ where: { code: { in: codes } } });
}

/** POST: 出欠の付け外し（present: true/false） */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const participantId = String(body?.participantId ?? "").trim();
    const meetingInput = String(body?.meeting ?? body?.meetingCode ?? "").trim();
    const present = Boolean(body?.present);
    const via = String(body?.via ?? "api");

    if (!participantId) return bad("participantId is required");
    if (!meetingInput) return bad("meeting (e.g. R7-2) is required");

    // 参加者の存在確認
    const p = await prisma.participant.findUnique({
      where: { id: participantId },
      select: { id: true },
    });
    if (!p) return NextResponse.json(
      { ok: false, error: "NOT_FOUND", message: "participant not found" },
      { status: 404 }
    );

    // Meeting をコードで取得
    const meeting = await findMeetingByCode(meetingInput);
    if (!meeting) {
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND", message: "meeting not found (code mismatch?). Use R7-02 style." },
        { status: 404 }
      );
    }

    if (present) {
      // 出席を付ける（存在しなければ作成、あれば更新）
      const attendance = await prisma.attendance.upsert({
        where: { meetingId_participantId: { meetingId: meeting.id, participantId } },
        update: { checkedAt: new Date(), via },
        create: { meetingId: meeting.id, participantId, via },
      });
      return NextResponse.json({ ok: true, attendance });
    } else {
      // 出席を外す（冪等）
      await prisma.attendance.deleteMany({
        where: { meetingId: meeting.id, participantId },
      });
      return NextResponse.json({ ok: true, deleted: true });
    }
  } catch (e) {
    return errJson(e);
  }
}

/** DELETE: 直接削除（外す）
 * /api/meetings/attendance?participantId=...&meeting=R7-2
 */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const participantId = String(searchParams.get("participantId") ?? "").trim();
    const meetingInput = String(searchParams.get("meeting") ?? searchParams.get("meetingCode") ?? "").trim();

    if (!participantId) return bad("participantId is required");
    if (!meetingInput) return bad("meeting (e.g. R7-2) is required");

    const meeting = await findMeetingByCode(meetingInput);
    if (!meeting) {
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND", message: "meeting not found (code mismatch?). Use R7-02 style." },
        { status: 404 }
      );
    }

    await prisma.attendance.deleteMany({ where: { meetingId: meeting.id, participantId } });
    return NextResponse.json({ ok: true, deleted: true });
  } catch (e) {
    return errJson(e);
  }
}

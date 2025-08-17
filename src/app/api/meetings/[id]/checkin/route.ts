// app/api/meetings/[id]/attendance/mark/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Body = {
  participantId?: unknown;
  name?: unknown;
};

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> } // ← Promise を await する
) {
  const { id: meetingId } = await ctx.params;
  if (!meetingId) {
    return NextResponse.json({ ok: false, error: "Missing meeting id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const participantId =
    typeof body.participantId === "string" ? body.participantId.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";

  // participant を特定（id が優先。無ければ name でフォールバック）
  let participant: { id: string; name: string } | null = null;
  if (participantId) {
    participant = await prisma.participant.findUnique({
      where: { id: participantId },
      select: { id: true, name: true },
    });
  } else if (name) {
    participant = await prisma.participant.findFirst({
      where: { name },
      select: { id: true, name: true },
    });
  }

  if (!participant) {
    return NextResponse.json({ ok: false, error: "participant not found" }, { status: 404 });
  }

  // 既に出席済みかチェック（ユニーク制約に頼らず先に確認）
  const existing = await prisma.attendance.findUnique({
    where: {
      meetingId_participantId: {
        meetingId,
        participantId: participant.id,
      },
    },
  });

  if (existing) {
    return NextResponse.json({
      ok: true,
      created: false,
      participant,
      attendance: { checkedAt: existing.checkedAt, via: existing.via, already: true },
    });
  }

  // 新規作成
  const via: "qr" | "name" = participantId ? "qr" : "name";
  try {
    const rec = await prisma.attendance.create({
      data: {
        meetingId,
        participantId: participant.id,
        checkedAt: new Date(), // ← 必須フィールド
        via,                   // ← string を必ず渡す（null にならない）
      },
    });

    return NextResponse.json({
      ok: true,
      created: true,
      participant,
      attendance: { checkedAt: rec.checkedAt, via: rec.via, already: false },
    });
  } catch (e: any) {
    // ユニーク衝突などは既出席として扱う
    if (e?.code === "P2002") {
      return NextResponse.json({
        ok: true,
        created: false,
        participant,
        attendance: { already: true },
      });
    }
    console.error(e);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

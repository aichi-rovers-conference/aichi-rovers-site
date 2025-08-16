import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";

export const dynamic = "force-dynamic";

// POST { participantId } もしくは { name }（←既存のQRが氏名ならフォールバック）
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const meetingId = params.id;
  const b = await req.json().catch(()=> ({}));
  const participantId = typeof b?.participantId === "string" ? b.participantId : "";
  const name = typeof b?.name === "string" ? b.name.trim() : "";

  let participant = null as null | { id: string; name: string };
  if (participantId) {
    participant = await prisma.participant.findUnique({ where: { id: participantId }, select: { id: true, name: true } });
  } else if (name) {
    participant = await prisma.participant.findFirst({ where: { name }, select: { id: true, name: true } });
  }
  if (!participant) return NextResponse.json({ error: "participant not found" }, { status: 404 });

  let created = false;
  try {
    await prisma.attendance.create({ data: { meetingId, participantId: participant.id, via: participantId ? "qr" : "name" } });
    created = true;
  } catch { created = false; }

  return NextResponse.json({ ok: true, created, participant });
}

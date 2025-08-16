// app/api/meetings/list/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  // Meeting テーブルから code を昇順（R5-1 … R6-1 …）で返す
  const ms = await prisma.meeting.findMany({
    orderBy: [{ reiwa: "asc" }, { seq: "asc" }],
    select: { code: true },
  });
  // fallback: ミーティングが未登録なら MeetingSheet の data.meetings を返す（任意）
  if (ms.length === 0) {
    const sheet = await prisma.meetingSheet.findFirst({ where: { key: "default" } });
    const codes = (sheet?.data as any)?.meetings ?? [];
    return NextResponse.json({ codes });
  }
  return NextResponse.json({ codes: ms.map(m => m.code) });
}

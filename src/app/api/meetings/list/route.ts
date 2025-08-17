// app/api/meetings/list/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function extractCodesFromSheetData(data: unknown): string[] {
  if (typeof data !== "object" || data === null) return [];
  const meetings = (data as Record<string, unknown>).meetings;
  if (!Array.isArray(meetings)) return [];
  return meetings.map((v) => String(v)).filter(Boolean);
}

export async function GET() {
  try {
    // Meeting テーブルから昇順（R5-1 → R6-1 …）で返す
    const ms = await prisma.meeting.findMany({
      orderBy: [{ reiwa: "asc" }, { seq: "asc" }],
      select: { code: true },
    });

    if (ms.length > 0) {
      return NextResponse.json(
        { codes: ms.map((m) => m.code) },
        { headers: { "Cache-Control": "no-store, must-revalidate" } }
      );
    }

    // fallback: ミーティング未登録なら MeetingSheet の data.meetings を返す
    const sheet = await prisma.meetingSheet.findFirst({
      where: { key: "default" },
      select: { data: true },
    });
    const codes = extractCodesFromSheetData(sheet?.data);
    return NextResponse.json(
      { codes },
      { headers: { "Cache-Control": "no-store, must-revalidate" } }
    );
  } catch {
    return NextResponse.json(
      { codes: [] },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

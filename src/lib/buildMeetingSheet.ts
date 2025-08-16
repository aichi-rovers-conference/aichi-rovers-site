// lib/buildMeetingSheet.ts
import { prisma } from "../../lib/prisma";
import type { District } from "@prisma/client";

type PeopleByRegion = Record<District | "TOTAL", number>;

export async function buildMeetingSheetData() {
  // 参加者一覧（必要なフィールドだけ）
  const participants = await prisma.participant.findMany({
    select: { id: true, name: true, troop: true, rsAge: true, district: true, email: true, createdAt: true },
    orderBy: [{ district: "asc" }, { troop: "asc" }, { name: "asc" }],
  });

  // 直近の会議一覧（必要なら期間/件数を制限）
  const meetings = await prisma.meeting.findMany({
    orderBy: [{ date: "desc" }],
    select: { id: true, title: true, date: true, code: true, reiwa: true, seq: true },
  });

  // 地区ごとの人数カウント
  const peopleByRegion = participants.reduce<PeopleByRegion>((acc, p) => {
    acc[p.district] = (acc[p.district] ?? 0) + 1;
    acc.TOTAL = (acc.TOTAL ?? 0) + 1;
    return acc;
  }, {} as PeopleByRegion);

  // 返す JSON の例（フロントの期待形に合わせて調整）
  const data = {
    generatedAt: new Date().toISOString(),
    meetings,
    participants,
    peopleByRegion,
  };

  return data;
}

// MeetingSheet.key = "default" に保存
export async function rebuildMeetingSheet() {
  const data = await buildMeetingSheetData();
  await prisma.meetingSheet.upsert({
    where: { key: "default" },
    create: { key: "default", data },
    update: { data },
  });
  return data;
}

// app/api/meetings/sheet/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../lib/prisma";
import { COOKIE_NAME, verifyToken } from "@/lib/auth";
import { District as DistrictEnum } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// UI 側と一致させるための地区リスト（日本語ラベル）
const REGIONS = [
  "名古屋千種地区","名古屋西部地区","名古屋北斗地区","名古屋巽地区",
  "尾張西地区","尾張東地区","尾張南地区",
  "知多北部地区","知多東地区","知多西南地区",
  "豊田地区","三河葵地区","碧海地区","穂の国地区","その他地区",
] as const;
type Region = typeof REGIONS[number];

// Prisma の Enum（英字キー）→ 日本語ラベルへの確実なマッピング
const DISTRICT_LABEL_MAP: Record<DistrictEnum, Region> = {
  [DistrictEnum.NAGOYA_CHIKUSA]: "名古屋千種地区",
  [DistrictEnum.NAGOYA_SEIBU]:   "名古屋西部地区",
  [DistrictEnum.NAGOYA_HOKUTO]:  "名古屋北斗地区",
  [DistrictEnum.NAGOYA_TATSUMI]: "名古屋巽地区",
  [DistrictEnum.OWARI_NISHI]:    "尾張西地区",
  [DistrictEnum.OWARI_HIGASHI]:  "尾張東地区",
  [DistrictEnum.OWARI_MINAMI]:   "尾張南地区",
  [DistrictEnum.CHITA_HOKUBU]:   "知多北部地区",
  [DistrictEnum.CHITA_HIGASHI]:  "知多東地区",
  [DistrictEnum.CHITA_SEINAN]:   "知多西南地区",
  [DistrictEnum.TOYOTA]:         "豊田地区",
  [DistrictEnum.MIKAWA_AOI]:     "三河葵地区",
  [DistrictEnum.HEKIKAI]:        "碧海地区",
  [DistrictEnum.HONOKUNI]:       "穂の国地区",
  [DistrictEnum.OTHERS]:         "その他地区",
};

async function requireSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value ?? "";
  const session = token ? await verifyToken(token) : null;
  if (!session) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return session;
}

function nextMeetingLabel(prev: string | undefined): { code: string; reiwa: number; seq: number } {
  if (!prev) return { code: "R5-1", reiwa: 5, seq: 1 };
  const m = /^R(\d+)-(\d+)$/.exec(prev);
  if (!m) return { code: "R5-1", reiwa: 5, seq: 1 };
  const y = Number(m[1]);
  const n = Number(m[2]);
  const next = n >= 4 ? { reiwa: y + 1, seq: 1 } : { reiwa: y, seq: n + 1 };
  return { code: `R${next.reiwa}-${next.seq}`, ...next };
}

// GET: meetings + participants + attendance を合成して返す
export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  // 会議一覧（昇順で表示したい前提）
  const meetings = await prisma.meeting.findMany({
    orderBy: [{ reiwa: "asc" }, { seq: "asc" }],
    select: { id: true, code: true },
  });
  const meetingCodes = meetings.map((m) => m.code);

  // 参加者（district は英字 Enum で返ってくる点に注意）
  const participants = await prisma.participant.findMany({
    orderBy: [{ district: "asc" }, { name: "asc" }],
    select: { id: true, name: true, troop: true, rsAge: true, district: true },
  });

  // 出欠（存在しないときも安全に処理）
  const attendance = meetings.length
    ? await prisma.attendance.findMany({
        where: { meetingId: { in: meetings.map((m) => m.id) } },
        select: { meetingId: true, participantId: true },
      })
    : [];

  const presentSet = new Set(attendance.map((a) => `${a.meetingId}:${a.participantId}`));

  // peopleByRegion の初期化
  const peopleByRegion: Record<Region, any[]> = REGIONS.reduce((acc, r) => {
    acc[r] = [];
    return acc;
  }, {} as Record<Region, any[]>);

  // 地区ごとに参加者を振り分け & 出欠マトリクス生成
  for (const p of participants) {
    const region: Region = DISTRICT_LABEL_MAP[p.district] ?? "その他地区";
    const att: Record<string, boolean> = {};
    for (const m of meetings) {
      att[m.code] = presentSet.has(`${m.id}:${p.id}`);
    }
    peopleByRegion[region].push({
      id: p.id,
      name: p.name,
      rsAge: String(p.rsAge ?? ""),
      region,
      troop: p.troop ?? "",
      attendance: att,
    });
  }

  return NextResponse.json({
    meetings: meetingCodes,
    peopleByRegion,
  });
}

// POST: 「定例会列を追加」→ 次の Meeting を作成して meetings を返す
export async function POST(_req: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  // 末尾コードから次を決定
  const last = await prisma.meeting.findFirst({
    orderBy: [{ reiwa: "desc" }, { seq: "desc" }],
    select: { code: true, reiwa: true, seq: true },
  });
  const { code, reiwa, seq } = nextMeetingLabel(last?.code);

  await prisma.meeting.create({
    data: {
      code,
      title: `定例会 ${code}`,
      date: new Date(),
      reiwa,
      seq,
    },
  });

  const all = await prisma.meeting.findMany({
    orderBy: [{ reiwa: "asc" }, { seq: "asc" }],
    select: { code: true },
  });

  return NextResponse.json({ ok: true, created: code, meetings: all.map((a) => a.code) });
}

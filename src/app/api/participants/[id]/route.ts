// app/api/participants/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { District as DistrictEnum, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const LABEL_BY_ENUM: Record<DistrictEnum, string> = {
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
const ENUM_BY_LABEL: Record<string, DistrictEnum> =
  Object.fromEntries(Object.entries(LABEL_BY_ENUM).map(([k, v]) => [v, k as DistrictEnum])) as any;

// 日本語/Enum記号/空白ゆらぎを吸収
function parseDistrictParam(input?: string | null): DistrictEnum | undefined {
  if (!input) return undefined;
  const s = String(input).trim();
  if ((Object.keys(LABEL_BY_ENUM) as string[]).includes(s)) return s as DistrictEnum;
  if (ENUM_BY_LABEL[s]) return ENUM_BY_LABEL[s];
  const norm = s.replace(/[\s　]/g, "");
  const hit = Object.entries(LABEL_BY_ENUM).find(([, label]) => label.replace(/[\s　]/g, "") === norm);
  return hit ? (hit[0] as DistrictEnum) : undefined;
}

function toDTO(p: any) {
  return {
    id: p.id,
    name: p.name,
    troop: p.troop,
    rsAge: p.rsAge,
    district: LABEL_BY_ENUM[p.district as DistrictEnum],
    email: p.email ?? null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

// GET /api/participants/[id]
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const p = await prisma.participant.findUnique({ where: { id } });
  if (!p) return NextResponse.json({ error: "Not Found" }, { status: 404 });
  return NextResponse.json({ participant: toDTO(p) });
}

// PATCH /api/participants/[id]
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({} as any));

  const data: Prisma.ParticipantUpdateInput = {};

  if (typeof body?.name === "string")  data.name = body.name.trim();
  if (typeof body?.troop === "string") data.troop = body.troop.trim();

  // rsAge: スキーマが NULL 許容のときだけ null を反映してください（非NULLならこの行は削除）
  if (body?.rsAge === null) data.rsAge = null as any;
  if (Number.isFinite(Number(body?.rsAge))) data.rsAge = Number(body.rsAge);

  if (typeof body?.email === "string") {
    const e = body.email.trim();
    const val = e === "" ? null : e;
    if (val && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val)) {
      return NextResponse.json({ error: "invalid email" }, { status: 400 });
    }
    (data as any).email = val; // Prisma の nullable 型と衝突しないよう any で吸収
  }

  const d = parseDistrictParam(body?.district);
  if (d) (data as any).district = d;

  try {
    const p = await prisma.participant.update({ where: { id }, data });
    return NextResponse.json({ item: toDTO(p) });
  } catch (e: any) {
    if (e?.code === "P2002") {
      // 例: email の一意制約に抵触
      return NextResponse.json({ ok: false, error: "DUPLICATE" }, { status: 409 });
    }
    if (e?.code === "P2025") {
      return NextResponse.json({ ok: false, error: "Not Found" }, { status: 404 });
    }
    console.error("PATCH /participants/[id] failed:", e);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

type PrismaKnownError = Error & { code?: string; meta?: any };

// DELETE /api/participants/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  try {
    const exists = await prisma.participant.findUnique({ where: { id } });
    if (!exists) return NextResponse.json({ ok: false, error: "Participant not found" }, { status: 404 });

    // 参照がある場合の手動カスケード（あなたの schema に合わせて調整）
    await prisma.$transaction([
      prisma.attendance.deleteMany({ where: { participantId: id } }),
      prisma.emailQueue.deleteMany({ where: { participantId: id } }),
      prisma.emailToken.deleteMany({ where: { participantId: id } }),
      prisma.participant.delete({ where: { id } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    const err = e as PrismaKnownError;
    if (err.code === "P2003") {
      return NextResponse.json(
        { ok: false, error: "Cannot delete participant due to existing references.", detail: err.meta ?? null },
        { status: 409 }
      );
    }
    if (err.code === "P2025") {
      return NextResponse.json({ ok: false, error: "Already deleted" }, { status: 404 });
    }
    console.error("DELETE /api/participants/[id] failed:", err);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}

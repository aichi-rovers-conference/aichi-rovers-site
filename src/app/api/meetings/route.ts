// app/api/participants/[id]/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../lib/prisma"; 
import { COOKIE_NAME, verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function requireSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value ?? "";
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  return session;
}

const REGIONS = [
  "名古屋千種地区","名古屋西部地区","名古屋北斗地区","名古屋巽地区",
  "尾張西地区","尾張東地区","尾張南地区",
  "知多北部地区","知多東地区","知多西南地区",
  "豊田地区","三河葵地区","碧海地区","穂の国地区","その他地区",
] as const;
type Region = typeof REGIONS[number];

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const id = params.id;
  if (!id) return new NextResponse("Bad Request", { status: 400 });

  const body = await req.json().catch(() => ({} as any));
  const data: any = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return new NextResponse("Name required", { status: 400 });
    data.name = name;
  }

  if (typeof body.troop === "string") {
    data.troop = body.troop.trim();
  }

  if (typeof body.rsAge === "number") {
    if (!Number.isFinite(body.rsAge) || body.rsAge < 0 || body.rsAge > 50) {
      return new NextResponse("Invalid rsAge", { status: 400 });
    }
    data.rsAge = body.rsAge;
  }

  if (typeof body.district === "string") {
    if (!REGIONS.includes(body.district as Region)) {
      return new NextResponse("Invalid district", { status: 400 });
    }
    data.district = body.district;
  }

  if (Object.keys(data).length === 0) {
    return new NextResponse("No changes", { status: 400 });
  }

  const participant = await prisma.participant.update({
    where: { id },
    data,
  });

  return NextResponse.json({ ok: true, participant });
}

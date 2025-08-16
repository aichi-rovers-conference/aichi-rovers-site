import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const COOKIE_NAME = "arc_session";
const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");

export async function GET() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({}, { status: 401 });

  let userId: number | null = null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    const idNum = Number(payload?.id);
    userId = Number.isFinite(idNum) ? idNum : null;
  } catch {
    return NextResponse.json({}, { status: 401 });
  }

  if (!userId) return NextResponse.json({}, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, role: true, isSuper: true },
  });
  if (!me) return NextResponse.json({}, { status: 401 });

  return NextResponse.json(me);
}

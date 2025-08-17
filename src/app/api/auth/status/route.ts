import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifyToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const jar = await cookies(); // ← await が必要
  const token = jar.get(COOKIE_NAME)?.value ?? "";
  if (!token) return NextResponse.json({}, { status: 401 });

  const session = await verifyToken(token).catch(() => null);
  if (!session || typeof session.id !== "number") {
    return NextResponse.json({}, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, username: true, role: true, isSuper: true, isActive: true },
  });
  if (!me || !me.isActive) return NextResponse.json({}, { status: 401 });

  // isActive は内部チェックのみで、返却からは外してもOK
  const { id, username, role, isSuper } = me;
  return NextResponse.json(
    { id, username, role, isSuper },
    { headers: { "Cache-Control": "no-store, must-revalidate" } }
  );
}

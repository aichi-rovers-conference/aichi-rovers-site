import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../../lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import type { Role } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const COOKIE_NAME = "arc_session";
const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");
const ROLES: Role[] = ["ADMIN", "EDITOR", "VIEWER"];

async function getMe() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    const id = Number(payload?.id);
    if (!Number.isFinite(id)) return null;
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, role: true, isSuper: true, isActive: true },
    });
  } catch {
    return null;
  }
}

export async function GET(_req: NextRequest) {
  const me = await getMe();
  if (!me) return new NextResponse("Unauthorized", { status: 401 });

  // 閲覧は ADMIN または SUPER のみ（必要なら緩めてOK）
  if (!(me.isSuper || me.role === "ADMIN")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: [{ isActive: "desc" }, { role: "asc" }, { username: "asc" }],
    select: { id: true, username: true, role: true, isActive: true, createdAt: true, updatedAt: true },
  });
  return NextResponse.json({ items: users });
}

export async function POST(req: NextRequest) {
  const me = await getMe();
  if (!me) return new NextResponse("Unauthorized", { status: 401 });
  if (!me.isSuper) return new NextResponse("Forbidden", { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    username?: string; role?: Role; password?: string;
  };

  const username = String(body.username ?? "").trim();
  const role = body.role;
  const rawPwd = String(body.password ?? "");

  if (!username || !role || !ROLES.includes(role)) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const pwd = rawPwd.length >= 8 ? rawPwd : genTempPassword();
  const passwordHash = await bcrypt.hash(pwd, 10);

  const user = await prisma.user.create({
    data: { username, role, passwordHash, isActive: true },
    select: { id: true, username: true, role: true, isActive: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({ user, tempPassword: pwd }, { status: 201 });
}

function genTempPassword(len = 14) {
  const s = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+";
  return Array.from({ length: len }, () => s[Math.floor(Math.random() * s.length)]).join("");
}

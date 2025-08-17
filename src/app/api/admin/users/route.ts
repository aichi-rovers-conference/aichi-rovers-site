// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../../lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import type { Role, Prisma } from "@prisma/client";

export const runtime = "nodejs";
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

function genTempPassword(len = 14) {
  const s = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+";
  return Array.from({ length: len }, () => s[Math.floor(Math.random() * s.length)]).join("");
}

/** 一覧取得（ADMIN 以上） */
export async function GET(_req: NextRequest) {
  const me = await getMe();
  if (!me) return new NextResponse("Unauthorized", { status: 401 });
  if (!(me.isSuper || me.role === "ADMIN")) return new NextResponse("Forbidden", { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: [{ isActive: "desc" }, { role: "asc" }, { username: "asc" }],
    select: { id: true, username: true, role: true, isActive: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({ items: users }, { headers: { "Cache-Control": "no-store, must-revalidate" } });
}

/** 追加（SUPER 限定） */
export async function POST(req: NextRequest) {
  const me = await getMe();
  if (!me) return new NextResponse("Unauthorized", { status: 401 });
  if (!me.isSuper) return new NextResponse("Forbidden", { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    username?: string;
    role?: Role | string;
    password?: string;
  };

  const username = String(body.username ?? "").trim();
  const roleStr = String(body.role ?? "").toUpperCase() as Role;
  const rawPwd = String(body.password ?? "");

  if (!username || !roleStr || !ROLES.includes(roleStr)) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const pwd = rawPwd.length >= 8 ? rawPwd : genTempPassword();
  const passwordHash = await bcrypt.hash(pwd, 10);

  try {
    const user = await prisma.user.create({
      data: { username, role: roleStr, passwordHash, isActive: true },
      select: { id: true, username: true, role: true, isActive: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json({ user, tempPassword: pwd }, { status: 201 });
  } catch (e: unknown) {
    const err = e as Prisma.PrismaClientKnownRequestError;
    if (err?.code === "P2002") {
      // unique constraint (e.g. username)
      return NextResponse.json({ error: "USERNAME_TAKEN" }, { status: 409 });
    }
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}

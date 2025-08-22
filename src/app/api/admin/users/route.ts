// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../../lib/prisma";
import { cookies } from "next/headers";
import type { Role as PrismaRole, Prisma } from "@prisma/client";
import { COOKIE_NAME, verifyToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Role = "ADMIN" | "EDITOR" | "VIEWER";
const ROLES: Role[] = ["ADMIN", "EDITOR", "VIEWER"];

function jsonNoStore(body: any, status = 200) {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store, must-revalidate");
  return res;
}

async function getMe() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const payload = await verifyToken(token); // ★ iss/aud つきで厳密検証
    const id = Number((payload as any)?.id);
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
  if (!me) return jsonNoStore({ ok: false, error: "unauthenticated" }, 401);
  if (!(me.isSuper || me.role === "ADMIN")) return jsonNoStore({ ok: false, error: "forbidden" }, 403);

  const users = await prisma.user.findMany({
    orderBy: [{ isActive: "desc" }, { role: "asc" }, { username: "asc" }],
    select: { id: true, username: true, role: true, isActive: true, createdAt: true, updatedAt: true },
  });

  return jsonNoStore({ items: users }, 200);
}

/** 追加（SUPER 限定） */
export async function POST(req: NextRequest) {
  const me = await getMe();
  if (!me) return jsonNoStore({ ok: false, error: "unauthenticated" }, 401);
  if (!me.isSuper) return jsonNoStore({ ok: false, error: "forbidden" }, 403);

  const body = (await req.json().catch(() => ({}))) as {
    username?: string;
    role?: PrismaRole | string;
    password?: string;
  };

  const username = String(body.username ?? "").trim();
  const roleStr = String(body.role ?? "").toUpperCase() as Role;
  const rawPwd = String(body.password ?? "");

  if (!username || !roleStr || !ROLES.includes(roleStr)) {
    return jsonNoStore({ ok: false, error: "bad_request" }, 400);
  }

  const pwd = rawPwd.length >= 8 ? rawPwd : genTempPassword();
  const passwordHash = await bcrypt.hash(pwd, 10);

  try {
    const user = await prisma.user.create({
      data: { username, role: roleStr as PrismaRole, passwordHash, isActive: true },
      select: { id: true, username: true, role: true, isActive: true, createdAt: true, updatedAt: true },
    });

    return jsonNoStore({ user, tempPassword: pwd }, 201);
  } catch (e: unknown) {
    const err = e as Prisma.PrismaClientKnownRequestError;
    if (err?.code === "P2002") {
      // unique constraint (e.g. username)
      return jsonNoStore({ error: "USERNAME_TAKEN" }, 409);
    }
    return jsonNoStore({ error: "SERVER_ERROR" }, 500);
  }
}

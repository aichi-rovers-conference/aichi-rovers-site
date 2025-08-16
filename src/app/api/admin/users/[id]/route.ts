// app/api/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
// ※ パスはあなたのプロジェクトに合わせて調整してください
import { prisma } from "../../../../../../lib/prisma";
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

function genTempPassword(len = 14) {
  const s = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+";
  return Array.from({ length: len }, () => s[Math.floor(Math.random() * s.length)]).join("");
}

/** PATCH: 有効/無効、ロール、パスワードの更新（SUPER限定） */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> } // ← params は Promise
) {
  const me = await getMe();
  if (!me) return new NextResponse("Unauthorized", { status: 401 });
  if (!me.isSuper) return new NextResponse("Forbidden", { status: 403 });

  // ★ params を await → 数値化
  const { id: idParam } = await ctx.params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) return new NextResponse("Bad Request", { status: 400 });

  const body = (await req.json().catch(() => ({}))) as {
    isActive?: boolean;
    role?: string | Role;
    resetPassword?: boolean;
    newPassword?: string;
  };

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true, role: true, isActive: true },
  });
  if (!target) return new NextResponse("Not Found", { status: 404 });

  // 自分自身の無効化/ロール変更は禁止
  if (me.id === id) {
    if (body.isActive === false) {
      return new NextResponse("You cannot deactivate yourself", { status: 400 });
    }
    if (body.role && body.role !== target.role) {
      return new NextResponse("You cannot change your own role", { status: 400 });
    }
  }

  let tempPassword: string | undefined;

  // パスワードリセット（仮パス生成）
  if (body.resetPassword) {
    tempPassword = genTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  // パスワード変更（任意文字列）
  if (typeof body.newPassword === "string") {
    const pwd = body.newPassword.trim();
    if (pwd.length < 8 || pwd.length > 128) {
      return new NextResponse("Password length must be 8-128", { status: 400 });
    }
    const passwordHash = await bcrypt.hash(pwd, 10);
    await prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  // ロール更新
  if (typeof body.role === "string") {
    const nextRole = body.role.toUpperCase() as Role;
    if (!ROLES.includes(nextRole)) {
      return new NextResponse("Invalid role", { status: 400 });
    }
    await prisma.user.update({ where: { id }, data: { role: nextRole } });
  }

  // 有効/無効
  if (typeof body.isActive === "boolean") {
    await prisma.user.update({ where: { id }, data: { isActive: body.isActive } });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true, role: true, isActive: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({ user, ...(tempPassword ? { tempPassword } : {}) });
}

/** DELETE: ユーザー削除（SUPER限定・自分は削除不可） */
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> } // ← こちらも Promise
) {
  const me = await getMe();
  if (!me) return new NextResponse("Unauthorized", { status: 401 });
  if (!me.isSuper) return new NextResponse("Forbidden", { status: 403 });

  const { id: idParam } = await ctx.params; // ★ await
  const id = Number(idParam);
  if (!Number.isFinite(id)) return new NextResponse("Bad Request", { status: 400 });
  if (me.id === id) return new NextResponse("You cannot delete yourself", { status: 400 });

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

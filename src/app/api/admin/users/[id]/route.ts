// app/api/admin/users/[id]/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

type Role = "ADMIN" | "EDITOR" | "VIEWER";
const ROLES: Role[] = ["ADMIN", "EDITOR", "VIEWER"];

async function getSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value ?? "";
  return token ? await verifyToken(token) : null;
}

function sanitizeUser(u: any) {
  return {
    id: u.id,
    username: u.username,
    role: u.role as Role,
    isActive: !!u.isActive,
    isSuper: !!u.isSuper,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

function randomPassword(len = 14) {
  return crypto.randomBytes(24).toString("base64url").slice(0, len);
}

async function hashPassword(plain: string) {
  return await bcrypt.hash(plain, 10);
}

/** PATCH /api/admin/users/:id
 *  - role: "ADMIN" | "EDITOR" | "VIEWER"        → SUPERのみ
 *  - isActive: boolean                           → SUPERのみ
 *  - resetPassword: true                         → SUPERのみ（ランダム再発行）
 *  - newPassword: string (8〜128)                → SUPERのみ（※必要なら self-change も可）
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const uid = Number(id);
  if (!Number.isFinite(uid)) return NextResponse.json({ error: "Bad Request" }, { status: 400 });

  const body = await req.json().catch(() => ({} as any));
  const patch: any = {};
  let tempPassword: string | undefined;

  // --- 権限チェックとパッチ組み立て ---
  if ("role" in body) {
    if (!s.isSuper) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const role = String(body.role ?? "").toUpperCase() as Role;
    if (!ROLES.includes(role)) return NextResponse.json({ error: "role が不正です" }, { status: 400 });
    patch.role = role;
  }

  if ("isActive" in body) {
    if (!s.isSuper) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    patch.isActive = !!body.isActive;
  }

  if (body?.resetPassword) {
    if (!s.isSuper) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    tempPassword = randomPassword(14);
    patch.passwordHash = await hashPassword(tempPassword);
  }

  if (typeof body?.newPassword === "string") {
    if (!s.isSuper) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const npw = body.newPassword.trim();
    if (npw.length < 8 || npw.length > 128) {
      return NextResponse.json({ error: "newPassword は 8〜128 文字で指定してください" }, { status: 400 });
    }
    patch.passwordHash = await hashPassword(npw);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "変更項目がありません" }, { status: 400 });
  }

  // 自分自身を削除・無効化・降格等する場合の安全策が必要ならここで追加（任意）

  try {
    const user = await prisma.user.update({
      where: { id: uid },
      data: patch,
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        isSuper: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ user: sanitizeUser(user), tempPassword });
  } catch (e: any) {
    const msg = e?.code === "P2025" ? "対象のユーザーが見つかりません" : e?.message || "更新に失敗しました";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

/** DELETE /api/admin/users/:id  : SUPERのみ */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!s.isSuper) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const uid = Number(id);
  if (!Number.isFinite(uid)) return NextResponse.json({ error: "Bad Request" }, { status: 400 });

  // 自分自身の削除禁止など入れるならここで
  if (s.id === uid) {
    return NextResponse.json({ error: "自分自身は削除できません" }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id: uid } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.code === "P2025" ? "対象のユーザーが見つかりません" : e?.message || "削除に失敗しました";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

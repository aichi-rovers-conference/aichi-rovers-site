// app/api/admin/users/route.ts
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
  // URL セーフで記号も少し含む
  const s = crypto.randomBytes(24).toString("base64url"); // 32～ chars
  // 見やすさのために先頭 len 文字に
  return s.slice(0, len);
}

async function hashPassword(plain: string) {
  return await bcrypt.hash(plain, 10);
}

/** GET /api/admin/users  : SUPER or ADMIN が一覧閲覧 */
export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(s.isSuper || s.role === "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const items = await prisma.user.findMany({
    orderBy: [{ id: "desc" }],
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

  return NextResponse.json({ items: items.map(sanitizeUser) });
}

/** POST /api/admin/users  : SUPER が作成。password が空ならランダム発行 */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!s.isSuper) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({} as any));
  const username = String(body?.username ?? "").trim();
  const role = String(body?.role ?? "").trim().toUpperCase() as Role;
  let password: string | undefined = String(body?.password ?? "").trim() || undefined;

  if (!username || !ROLES.includes(role)) {
    return NextResponse.json({ error: "username / role は必須です" }, { status: 400 });
  }

  // 一時パス発行（空なら生成）
  if (!password) password = randomPassword(14);
  const passwordHash = await hashPassword(password);

  try {
    const user = await prisma.user.create({
      data: {
        username,
        role,
        passwordHash,
        isActive: true,
        // isSuper はこの API からは付与しない（安全のため）
      },
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

    return NextResponse.json({ user: sanitizeUser(user), tempPassword: password }, { status: 201 });
  } catch (e: any) {
    const msg =
      e?.code === "P2002" ? "そのユーザー名は既に使われています" : e?.message || "作成に失敗しました";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

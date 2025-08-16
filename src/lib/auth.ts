// src/lib/auth.ts あるいは arc/lib/auth.ts
import { NextRequest } from "next/server";
import { cookies as serverCookies } from "next/headers";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";

export const COOKIE_NAME = "arc_session" as const;
const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");

export type Role = "ADMIN" | "EDITOR" | "VIEWER";

export type AuthPayload = {
  id: number;
  username: string;
  role: Role;
  isSuper: boolean;
  isActive: boolean;
  iat?: number;
  exp?: number;
};

export async function hashPassword(plain: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}
export async function verifyPassword(plain: string, hash: string) {
  try { return await bcrypt.compare(plain, hash); } catch { return false; }
}

export async function signSession(payload: AuthPayload, exp: string = "30d") {
  return await new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(SECRET);
}

export async function createSession(payload: AuthPayload) {
  return signSession(payload, "8h");
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    const idNum = Number((payload as any)?.id);
    if (!Number.isFinite(idNum)) return null;
    return {
      id: idNum,
      username: String((payload as any)?.username ?? ""),
      role: String((payload as any)?.role ?? "VIEWER") as Role,
      isSuper: Boolean((payload as any)?.isSuper),
      isActive: Boolean((payload as any)?.isActive),
      iat: (payload as any)?.iat,
      exp: (payload as any)?.exp,
    };
  } catch {
    return null;
  }
}

/** サーバー側で認証情報を復元（req がない場合は await cookies() を使用） */
export async function getAuthContext(req?: NextRequest | null) {
  let token: string | undefined;

  if (req) {
    // Route Handler など NextRequest がある場合（こちらは同期でOK）
    token = req.cookies.get(COOKIE_NAME)?.value;
  } else {
    // Server Component / Action など：Next 15 では await が必要
    try {
      const jar = await serverCookies();
      token = jar.get(COOKIE_NAME)?.value;
    } catch {
      token = undefined;
    }
  }

  if (!token) return null;

  const payload = await verifyToken(token);
  const id = Number(payload?.id);
  if (!Number.isFinite(id)) return null;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true, role: true, isSuper: true, isActive: true },
  });
  if (!user || !user.isActive) return null;

  const finalPayload: AuthPayload = {
    id: user.id,
    username: user.username,
    role: user.role as Role,
    isSuper: user.isSuper,
    isActive: user.isActive,
  };

  return { user, payload: finalPayload, token };
}

export function canAdmin(payload: Pick<AuthPayload, "role" | "isSuper"> | null) {
  return !!payload && (payload.isSuper || payload.role === "ADMIN");
}

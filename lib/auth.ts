// /lib/auth.ts — 正本（全ランタイム共通）
import { SignJWT, jwtVerify } from "jose";

export const COOKIE_NAME = "arc_session";
export type Role = "ADMIN" | "EDITOR" | "VIEWER" | string;

// すべてのランタイムで同一値になるよう環境変数を読む
const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");
export const ISS = process.env.AUTH_ISSUER ?? "https://aichirovers.com";
export const AUD = process.env.AUTH_AUDIENCE ?? "arc-web";

export type SessionClaims = {
  id: number;
  username: string;
  role: Role;
  isSuper?: boolean;
  isActive?: boolean;
  remember?: boolean;
  // 以下は jose が付与/検証する標準クレーム
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
};

export async function signSession(
  payload: Omit<SessionClaims, "iat" | "exp" | "iss" | "aud">,
  ttl: string // 例: "30d" | "8h"
): Promise<string> {
  return await new SignJWT({
    id: payload.id,
    username: payload.username,
    role: payload.role,
    isSuper: !!payload.isSuper,
    isActive: !!payload.isActive,
    remember: !!payload.remember,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISS)
    .setAudience(AUD)
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<SessionClaims> {
  const { payload } = await jwtVerify(token, SECRET, {
    issuer: ISS,
    audience: AUD,
    clockTolerance: "60s",
  });
  return payload as SessionClaims;
}

// 後方互換のための別名
export const verifySession = verifyToken;

export async function verifyPassword(plain: string, hash: string) {
  const bcrypt = await import("bcryptjs").then((m) => m.default || m);
  return bcrypt.compare(plain, hash);
}

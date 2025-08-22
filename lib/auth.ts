// /lib/auth.ts
import { SignJWT, jwtVerify } from "jose";

export const COOKIE_NAME = "arc_session_v3"; // 新名：旧Cookieに影響されない
export type Role = "ADMIN" | "EDITOR" | "VIEWER" | string;

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
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
};

export async function signSession(
  payload: Omit<SessionClaims, "iat" | "exp" | "iss" | "aud">,
  ttl: string // "30d" | "8h" など
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
    .setIssuer(ISS)       // ★ 必須：ミドルウェアと一致
    .setAudience(AUD)     // ★ 必須：ミドルウェアと一致
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

export async function verifyPassword(plain: string, hash: string) {
  const bcrypt = await import("bcryptjs").then(m => m.default || m);
  return bcrypt.compare(plain, hash);
}

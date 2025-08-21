// lib/auth.ts
import { SignJWT, jwtVerify } from "jose";

export const COOKIE_NAME = "arc_session";

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");
const ISS = process.env.AUTH_ISSUER ?? "https://aichirovers.com";
const AUD = process.env.AUTH_AUDIENCE ?? "arc-web";

export type Role = "ADMIN" | "EDITOR" | "VIEWER" | string;

export async function signSession(
  payload: { id: number; username: string; role: Role; isSuper?: boolean; isActive?: boolean; remember?: boolean },
  exp: string // 例: "30d" | "8h"
) {
  return await new SignJWT({
    id: payload.id,
    username: payload.username,
    role: payload.role,
    isSuper: payload.isSuper,
    isActive: payload.isActive,
    remember: payload.remember,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ISS)      // ★ middleware と一致
    .setAudience(AUD)    // ★ middleware と一致
    .setExpirationTime(exp)
    .sign(SECRET);
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, SECRET, {
    issuer: ISS,
    audience: AUD,
    clockTolerance: "60s",
  });
  return payload as any;
}

export async function verifyPassword(plain: string, hash: string) {
  const bcrypt = await import("bcryptjs").then(m => m.default || m);
  return bcrypt.compare(plain, hash);
}

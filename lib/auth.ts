// lib/auth.ts
import { SignJWT, jwtVerify } from "jose";

export type Role = "ADMIN" | "EDITOR" | "VIEWER" | string;

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

// ==== 環境値（開発/本番で既定を分ける） ====
const isProd = !!process.env.VERCEL;

/** Cookie 名は env 優先。未指定なら v3 に。 */
export const COOKIE_NAME = process.env.COOKIE_NAME ?? "arc_session_v3";

/** 既定の issuer は本番: aichirovers.com / 開発: localhost:3000 */
export const ISS =
  process.env.AUTH_ISSUER ?? (isProd ? "https://aichirovers.com" : "http://localhost:3000");

/** audience は固定で良ければこれを共通に */
export const AUD = process.env.AUTH_AUDIENCE ?? "arc-web";

/** 署名鍵（HS256） */
const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev-secret");
const ALG = "HS256" as const;

// ==== 発行（ttl は "30d" | "8h" 等の jose 形式でOK） ====
export async function signSession(
  payload: Omit<SessionClaims, "iat" | "exp" | "iss" | "aud">,
  ttl: string
): Promise<string> {
  return await new SignJWT({
    id: payload.id,
    username: payload.username,
    role: payload.role,
    isSuper: !!payload.isSuper,
    isActive: !!payload.isActive,
    remember: !!payload.remember,
  })
    .setProtectedHeader({ alg: ALG })
    .setIssuer(ISS)
    .setAudience(AUD)
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(SECRET);
}

// ==== 検証（失敗時は例外にせず null を返す） ====
export async function verifyToken(token: string): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET, {
      issuer: ISS,
      audience: AUD,
      clockTolerance: "60s",
    });

    // 必須クレームの型を確認
    const id = (payload as any).id;
    const username = (payload as any).username;
    const role = (payload as any).role;
    if (typeof id !== "number" || typeof username !== "string" || typeof role !== "string") {
      return null;
    }

    return {
      id,
      username,
      role,
      isSuper: !!(payload as any).isSuper,
      isActive: !!(payload as any).isActive,
      remember: !!(payload as any).remember,
      iat: payload.iat,
      exp: payload.exp,
      iss: payload.iss,
      aud: payload.aud,
    };
  } catch {
    // 不正/期限切れ/ISS・AUD不一致など → 未ログイン扱い
    return null;
  }
}

// ==== パスワード検証（Edge互換の遅延import） ====
export async function verifyPassword(plain: string, hash: string) {
  const bcrypt = await import("bcryptjs").then((m) => m.default ?? m);
  return bcrypt.compare(plain, hash);
}

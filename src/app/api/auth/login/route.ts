// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { signSession, verifyPassword, COOKIE_NAME, type Role } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    // 入力の正規化
    const rawUser = String(body?.id ?? body?.username ?? "");
    const usernameNorm = rawUser.trim();
    const password = String(body?.password ?? "").trim();
    const remember = Boolean(body?.remember);

    // 簡易バリデーション
    if (!usernameNorm || !password || usernameNorm.length > 64 || password.length > 200) {
      return jsonNoStore({ ok: false, error: "missing" }, 400);
    }

    // ★ 大文字小文字を無視して検索（findUniqueは厳密一致のみのためfindFirstを使う）
    const user = await prisma.user.findFirst({
      where: { username: { equals: usernameNorm, mode: "insensitive" } },
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        isSuper: true,
        passwordHash: true,
      },
    });

    if (!user || !user.isActive) {
      return jsonNoStore({ ok: false, error: "invalid" }, 401);
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return jsonNoStore({ ok: false, error: "invalid" }, 401);
    }

    const payload = {
      id: user.id,
      username: user.username,
      role: user.role as Role,
      isSuper: user.isSuper,
      isActive: user.isActive,
    };

    // remember: true => 30日 / false => 8時間
    const token = await signSession(payload, remember ? "30d" : "8h");
    const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 8;

    // レスポンス本体
    const res = jsonNoStore({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        isSuper: user.isSuper,
        isActive: user.isActive,
      },
      remember,
    });

    // Cookie 発行（domain は条件付きで付与）
    const isProd = process.env.NODE_ENV === "production";
    const CANONICAL_HOST = process.env.CANONICAL_HOST ?? "aichirovers.com";
    const cookieDomain = process.env.COOKIE_DOMAIN ?? `.${CANONICAL_HOST}`;

    const host = (req.headers.get("host") || "").toLowerCase();
    const shouldSetDomain =
      isProd && !!host && (host === CANONICAL_HOST || host === `www.${CANONICAL_HOST}` || host.endsWith(`.${CANONICAL_HOST}`));

    const cookieOpts: Parameters<typeof res.cookies.set>[2] = {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge,
      ...(shouldSetDomain ? { domain: cookieDomain } : {}), // ← 条件付き
    };

    res.cookies.set(COOKIE_NAME, token, cookieOpts);

    // レガシーCookie掃除
    for (const legacy of ["admin", "admin_id", "admin_role", "session"]) {
      res.cookies.set(legacy, "", { path: "/", maxAge: 0, ...(shouldSetDomain ? { domain: cookieDomain } : {}) });
    }

    return res;
  } catch (e: any) {
    return jsonNoStore({ ok: false, error: "server", message: e?.message || String(e) }, 500);
  }
}

function jsonNoStore(body: any, status = 200) {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}

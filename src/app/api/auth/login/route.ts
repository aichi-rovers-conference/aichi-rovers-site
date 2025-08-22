// app/api/auth/login/route.ts（完全版：フォーム / JSON 両対応）
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { signSession, verifyPassword, COOKIE_NAME, type Role } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const rawNext = url.searchParams.get("next");
  const safeNext = validateNext(rawNext) || "/exec";

  const wantsJSON = (req.headers.get("accept") || "").includes("application/json");

  try {
    // ---- フォーム or JSON の両対応で入力取得 ----
    let usernameNorm = "";
    let password = "";
    let remember = true;

    const ctype = (req.headers.get("content-type") || "").toLowerCase();
    if (ctype.includes("application/x-www-form-urlencoded") || ctype.includes("multipart/form-data")) {
      const form = await req.formData();
      const rawUser = String(form.get("username") ?? form.get("id") ?? "");
      usernameNorm = rawUser.trim();
      password = String(form.get("password") ?? "").trim();
      remember = (form.get("remember") ?? "on") !== ""; // チェック時 "on"
    } else {
      const body = await req.json().catch(() => ({}));
      const rawUser = String(body?.id ?? body?.username ?? "");
      usernameNorm = rawUser.trim();
      password = String(body?.password ?? "").trim();
      remember = Boolean(body?.remember ?? true);
    }

    // ---- バリデーション ----
    if (!usernameNorm || !password || usernameNorm.length > 64 || password.length > 200) {
      return fail(req, wantsJSON, safeNext, "missing", 400);
    }

    // ---- 認証 ----
    const user = await prisma.user.findFirst({
      where: { username: { equals: usernameNorm, mode: "insensitive" } },
      select: { id: true, username: true, role: true, isActive: true, isSuper: true, passwordHash: true },
    });
    if (!user || !user.isActive) return fail(req, wantsJSON, safeNext, "invalid", 401);

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return fail(req, wantsJSON, safeNext, "invalid", 401);

    // ---- セッショントークン ----
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role as Role,
      isSuper: user.isSuper,
      isActive: user.isActive,
    };
    const token = await signSession(payload, remember ? "30d" : "8h");
    const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 8;

    // ---- Cookie 属性 ----
    const isProd = process.env.NODE_ENV === "production";
    const CANONICAL_HOST = process.env.CANONICAL_HOST ?? "aichirovers.com";
    const cookieDomain = process.env.COOKIE_DOMAIN ?? `.${CANONICAL_HOST}`;

    const host = (req.headers.get("host") || "").toLowerCase();
    const shouldSetDomain =
      isProd && !!host && (host === CANONICAL_HOST || host === `www.${CANONICAL_HOST}` || host.endsWith(`.${CANONICAL_HOST}`));

    const res = NextResponse.redirect(new URL(safeNext, req.url), 303);
    res.headers.set("Cache-Control", "no-store, max-age=0");
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge,
      ...(shouldSetDomain ? { domain: cookieDomain } : {}),
    });
    for (const legacy of ["admin", "admin_id", "admin_role", "session"]) {
      res.cookies.set(legacy, "", { path: "/", maxAge: 0, ...(shouldSetDomain ? { domain: cookieDomain } : {}) });
    }
    return res;
  } catch (e: any) {
    if (wantsJSON) return jsonNoStore({ ok: false, error: "server", message: e?.message || String(e) }, 500);
    const back = new URL(`/login?error=server&next=${encodeURIComponent(safeNext)}`, req.url);
    const res = NextResponse.redirect(back, 303);
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
  }
}

function validateNext(n: string | null): string | null {
  if (!n) return null;
  try {
    // 相対パスのみ許可（オープンリダイレクト防止）
    return n.startsWith("/") && !n.startsWith("//") ? n : null;
  } catch {
    return null;
  }
}

function fail(req: Request, wantsJSON: boolean, safeNext: string, code: "missing" | "invalid", status: number) {
  if (wantsJSON) return jsonNoStore({ ok: false, error: code }, status);
  const back = new URL(`/login?error=${code}&next=${encodeURIComponent(safeNext)}`, req.url);
  const res = NextResponse.redirect(back, 303);
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}

function jsonNoStore(body: any, status = 200) {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}

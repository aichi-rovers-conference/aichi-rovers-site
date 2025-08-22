// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { signSession, verifyPassword, COOKIE_NAME, type Role } from "@/lib/auth";

export const dynamic = "force-dynamic";

// 軽いマスク（username をログに出すとき用）
function maskUser(u: string) {
  if (!u) return "(empty)";
  if (u.length <= 2) return u[0] + "*";
  return u[0] + "*".repeat(Math.min(u.length - 2, 4)) + u.slice(-1);
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const rawNext = url.searchParams.get("next");
  const safeNext = validateNext(rawNext) || "/exec";

  const accept = (req.headers.get("accept") || "").toLowerCase();
  const ctype  = (req.headers.get("content-type") || "").toLowerCase();
  const wantsJSON = accept.includes("application/json") || ctype.includes("application/json");

  try {
    // ---- 入力取得（フォーム/JSON 両対応） ----
    let usernameNorm = "";
    let password = "";
    let remember = true;

    if (ctype.includes("application/x-www-form-urlencoded") || ctype.includes("multipart/form-data")) {
      const form = await req.formData();
      const rawUser = String(form.get("username") ?? form.get("id") ?? "");
      usernameNorm = rawUser.trim();
      password = String(form.get("password") ?? "").trim();
      remember = form.has("remember"); // チェック時のみキーが存在
      console.log("[login] input=form user=%s remember=%s next=%s", maskUser(usernameNorm), String(remember), safeNext);
    } else {
      const body = await req.json().catch(() => ({}));
      const rawUser = String(body?.id ?? body?.username ?? "");
      usernameNorm = rawUser.trim();
      password = String(body?.password ?? "").trim();
      remember = Boolean(body?.remember ?? true);
      console.log("[login] input=json user=%s remember=%s next=%s", maskUser(usernameNorm), String(remember), safeNext);
    }

    // ---- バリデーション ----
    if (!usernameNorm || !password || usernameNorm.length > 64 || password.length > 200) {
      console.log("[login] validate: missing");
      return fail(req, wantsJSON, safeNext, "missing", 400);
    }

    // ---- 認証 ----
    const user = await prisma.user.findFirst({
      where: { username: { equals: usernameNorm, mode: "insensitive" } },
      select: { id: true, username: true, role: true, isActive: true, isSuper: true, passwordHash: true },
    });

    if (!user || !user.isActive) {
      console.log("[login] auth: user-not-found-or-inactive user=%s", maskUser(usernameNorm));
      return fail(req, wantsJSON, safeNext, "invalid", 401);
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      console.log("[login] auth: password-mismatch user=%s", maskUser(usernameNorm));
      return fail(req, wantsJSON, safeNext, "invalid", 401);
    }

    // ---- セッション発行（iss/aud/remember 付き）----
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role as Role,
      isSuper: user.isSuper,
      isActive: user.isActive,
      remember,
    };
    const token = await signSession(payload, remember ? "30d" : "8h");
    const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 8;

    // ---- Cookie ----
    const isProd = process.env.NODE_ENV === "production";
    const CANONICAL_HOST = process.env.CANONICAL_HOST ?? "aichirovers.com";
    const cookieDomain = process.env.COOKIE_DOMAIN ?? `.${CANONICAL_HOST}`;

    const res = wantsJSON
      ? jsonNoStore({ ok: true, next: safeNext }, 200)
      : NextResponse.redirect(new URL(safeNext, req.url), 303);

    res.headers.set("Cache-Control", "no-store, max-age=0");

    // 先に旧Cookieを両バリアントで掃除（host-only / domain付き）
    res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
    if (isProd) {
      res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0, domain: cookieDomain });
    }

    // 新しいセッションクッキー（本番は常に Domain 付与）
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge,
      ...(isProd ? { domain: cookieDomain } : {}),
    });

    // レガシーCookie掃除（両バリアント）
    for (const legacy of ["admin", "admin_id", "admin_role", "session"]) {
      res.cookies.set(legacy, "", { path: "/", maxAge: 0 });
      if (isProd) {
        res.cookies.set(legacy, "", { path: "/", maxAge: 0, domain: cookieDomain });
      }
    }

    console.log("[login] success user=%s remember=%s domain=%s redirect=%s json=%s",
      maskUser(user.username), String(remember), isProd ? cookieDomain : "(none)", safeNext, String(wantsJSON));

    return res;
  } catch (e: any) {
    console.log("[login] error: %s", e?.message || String(e));
    if (wantsJSON) return jsonNoStore({ ok: false, error: "server", message: e?.message || String(e) }, 500);
    const back = new URL(`/login?error=server&next=${encodeURIComponent(safeNext)}`, req.url);
    const res = NextResponse.redirect(back, 303);
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
  }
}

function validateNext(n: string | null): string | null {
  if (!n) return null;
  return n.startsWith("/") && !n.startsWith("//") ? n : null;
}

function fail(req: Request, wantsJSON: boolean, safeNext: string, code: "missing" | "invalid", status: number) {
  if (wantsJSON) return jsonNoStore({ ok: false, error: code }, status);
  const back = new URL(`/login?error=${code}&next=${encodeURIComponent(safeNext)}`, req.url);
  const res = NextResponse.redirect(back, 303);
  res.headers.set("Cache-Control", "no-store, max-age=0");
  console.log("[login] fail code=%s status=%d redirect=%s", code, status, back.pathname + back.search);
  return res;
}

function jsonNoStore(body: any, status = 200) {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}

// src/app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import {
  signSession,
  verifyPassword,
  COOKIE_NAME,
  type Role,
  ISS,
  AUD,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

// URL-safe Base64 → JSON（署名検証なし）
function b64urlToJSON(b: string): any | null {
  try {
    let s = b.replace(/-/g, "+").replace(/_/g, "/");
    if (s.length % 4) s += "=".repeat(4 - (s.length % 4));
    const txt = Buffer.from(s, "base64").toString("utf-8");
    return JSON.parse(txt);
  } catch { return null; }
}
function peekJwt(t: string){
  const p = (t || "").split(".");
  return { segs: p.length, payload: b64urlToJSON(p[1]) };
}
const maskUser = (u: string) => !u ? "(empty)" : (u.length <= 2 ? u[0] + "*" : u[0] + "*".repeat(Math.min(u.length - 2, 4)) + u.slice(-1));

// フォームPOST時に使う：200で小さなHTMLを返し、JSで遷移（Cookie定着を安定化）
function htmlRedirect(next: string) {
  const escaped = next.replace(/"/g, '&quot;');
  const body = `<!doctype html>
<html lang="ja"><meta charset="utf-8">
<meta http-equiv="refresh" content="0;url=${escaped}">
<title>Signing in…</title>
<p>サインイン中…遷移しない場合は <a href="${escaped}">こちら</a></p>
<script>location.replace("${escaped}")</script>
</html>`;
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const rawNext = url.searchParams.get("next");
  const safeNext =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/exec";

  const accept = (req.headers.get("accept") || "").toLowerCase();
  const ctype  = (req.headers.get("content-type") || "").toLowerCase();
  const isForm = ctype.includes("application/x-www-form-urlencoded") || ctype.includes("multipart/form-data");
  const wantsJSON = accept.includes("application/json") || ctype.includes("application/json");

  try {
    // 入力
    let username = "", password = "", remember = true;
    if (isForm) {
      const form = await req.formData();
      username = String(form.get("username") ?? form.get("id") ?? "").trim();
      password = String(form.get("password") ?? "").trim();
      remember = form.has("remember");
      console.log("[login] input=form user=%s remember=%s next=%s", maskUser(username), String(remember), safeNext);
    } else {
      const body = await req.json().catch(() => ({}));
      username = String(body?.id ?? body?.username ?? "").trim();
      password = String(body?.password ?? "").trim();
      remember = Boolean(body?.remember ?? true);
      console.log("[login] input=json user=%s remember=%s next=%s", maskUser(username), String(remember), safeNext);
    }

    if (!username || !password || username.length > 64 || password.length > 200) {
      return fail(req, wantsJSON, safeNext, "missing", 400, isForm);
    }

    // 認証
    const user = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" } },
      select: { id: true, username: true, role: true, isActive: true, isSuper: true, passwordHash: true },
    });
    if (!user || !user.isActive) return fail(req, wantsJSON, safeNext, "invalid", 401, isForm);

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return fail(req, wantsJSON, safeNext, "invalid", 401, isForm);

    // セッション発行（iss/aud 付き）
    const token = await signSession({
      id: user.id,
      username: user.username,
      role: user.role as Role,
      isSuper: user.isSuper,
      isActive: user.isActive,
      remember,
    }, remember ? "30d" : "8h");

    // 発行payloadを覗くだけ（署名検証なし）
    const peek = peekJwt(token);
    console.log("[login] token peek iss=%s aud=%s exp=%s segs=%d",
      peek.payload?.iss, peek.payload?.aud, peek.payload?.exp, peek.segs);

    const isProd = process.env.NODE_ENV === "production";
    const CANONICAL_HOST = process.env.CANONICAL_HOST ?? "aichirovers.com";
    const cookieDomain = process.env.COOKIE_DOMAIN ?? `.${CANONICAL_HOST}`;
    const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 8;

    // レスポンス（フォーム→200HTML, JSON→200 JSON）
    const res = isForm
      ? new NextResponse(htmlRedirect(safeNext).body, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, max-age=0" },
        })
      : NextResponse.json({ ok: true, next: safeNext }, { status: 200 });

    // 旧Cookie掃除（host-only / domain付き）
    res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
    if (isProd) res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0, domain: cookieDomain });

    // 新Cookie（本番は Domain 付与）
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge,
      ...(isProd ? { domain: cookieDomain } : {}),
    });

    // レガシー掃除
    for (const legacy of ["admin", "admin_id", "admin_role", "session"]) {
      res.cookies.set(legacy, "", { path: "/", maxAge: 0 });
      if (isProd) res.cookies.set(legacy, "", { path: "/", maxAge: 0, domain: cookieDomain });
    }

    console.log("[login] success user=%s remember=%s domain=%s next=%s mode=%s",
      maskUser(user.username), String(remember), isProd ? cookieDomain : "(none)", safeNext, isForm ? "form-200" : "json-200");

    return res;
  } catch (e: any) {
    console.log("[login] error: %s", e?.message || String(e));
    return fail(req, wantsJSON, "/exec", "server", 500, isForm);
  }
}

function fail(req: Request, wantsJSON: boolean, next: string, code: "missing" | "invalid" | "server", status: number, isForm: boolean) {
  if (wantsJSON) {
    const r = NextResponse.json({ ok: false, error: code }, { status });
    r.headers.set("Cache-Control", "no-store, max-age=0");
    return r;
  }
  if (isForm) {
    const u = new URL(req.url);
    const back = `/login?error=${code}&next=${encodeURIComponent(next)}`;
    return htmlRedirect(back);
  }
  const u = new URL(req.url);
  const back = new URL(`/login?error=${code}&next=${encodeURIComponent(next)}`, u);
  const r = NextResponse.redirect(back, 303);
  r.headers.set("Cache-Control", "no-store, max-age=0");
  return r;
}

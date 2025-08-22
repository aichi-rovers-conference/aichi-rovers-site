// src/app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import {
  signSession, verifyPassword, COOKIE_NAME, type Role,
  ISS, AUD, AUTH_LIB_SOURCE
} from "@/lib/auth";

export const dynamic = "force-dynamic";

// URL-safe Base64 → JSON（署名検証なし）
function b64urlToJSON(b: string): any | null {
  try { let s=b.replace(/-/g,"+").replace(/_/g,"/"); if (s.length%4) s+="=".repeat(4-(s.length%4));
    return JSON.parse(Buffer.from(s,"base64").toString("utf-8")); } catch { return null; } }
function peekJwt(t: string){const p=t.split(".");return{segs:p.length,header:b64urlToJSON(p[0]),payload:b64urlToJSON(p[1])};}
const maskUser=(u:string)=>!u?"(empty)":u.length<=2?u[0]+"*":u[0]+"*".repeat(Math.min(u.length-2,4))+u.slice(-1);

export async function POST(req: Request) {
  const url = new URL(req.url);
  const rawNext = url.searchParams.get("next");
  const safeNext = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/exec";

  const accept = (req.headers.get("accept") || "").toLowerCase();
  const ctype  = (req.headers.get("content-type") || "").toLowerCase();
  const wantsJSON = accept.includes("application/json") || ctype.includes("application/json");

  try {
    let username = "", password = "", remember = true;
    if (ctype.includes("application/x-www-form-urlencoded") || ctype.includes("multipart/form-data")) {
      const form = await req.formData();
      username = String(form.get("username") ?? form.get("id") ?? "").trim();
      password = String(form.get("password") ?? "").trim();
      remember = form.has("remember");
      console.log("[login] input=form user=%s remember=%s next=%s", maskUser(username), String(remember), safeNext);
    } else {
      const body = await req.json().catch(()=> ({}));
      username = String(body?.id ?? body?.username ?? "").trim();
      password = String(body?.password ?? "").trim();
      remember = Boolean(body?.remember ?? true);
      console.log("[login] input=json user=%s remember=%s next=%s", maskUser(username), String(remember), safeNext);
    }

    if (!username || !password || username.length>64 || password.length>200) {
      return back(req, wantsJSON, safeNext, "missing", 400);
    }

    const user = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" } },
      select: { id:true, username:true, role:true, isActive:true, isSuper:true, passwordHash:true },
    });
    if (!user || !user.isActive) return back(req, wantsJSON, safeNext, "invalid", 401);
    if (!(await verifyPassword(password, user.passwordHash))) return back(req, wantsJSON, safeNext, "invalid", 401);

    console.log("[login] using auth lib: %s iss=%s aud=%s", AUTH_LIB_SOURCE, ISS, AUD);

    const token = await signSession({
      id: user.id, username: user.username, role: user.role as Role,
      isSuper: user.isSuper, isActive: user.isActive, remember
    }, remember ? "30d" : "8h");

    const peek = peekJwt(token);
    console.log("[login] token peek iss=%s aud=%s exp=%s segs=%d", peek.payload?.iss, peek.payload?.aud, peek.payload?.exp, peek.segs);

    const maxAge = remember ? 60*60*24*30 : 60*60*8;
    const isProd = process.env.NODE_ENV === "production";
    const CANONICAL_HOST = process.env.CANONICAL_HOST ?? "aichirovers.com";
    const cookieDomain = process.env.COOKIE_DOMAIN ?? `.${CANONICAL_HOST}`;

    const res = wantsJSON
      ? NextResponse.json({ ok:true, next:safeNext }, { status:200 })
      : NextResponse.redirect(new URL(safeNext, isProd ? `https://${CANONICAL_HOST}` : req.url), 303);

    res.headers.set("Cache-Control","no-store, max-age=0");

    // 旧Cookie掃除（host-only と domain付きの両方）
    res.cookies.set(COOKIE_NAME, "", { path:"/", maxAge:0 });
    if (isProd) res.cookies.set(COOKIE_NAME, "", { path:"/", maxAge:0, domain: cookieDomain });

    // 新Cookie（本番は常に Domain 付与）
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly:true, secure:isProd, sameSite:"lax", path:"/", maxAge,
      ...(isProd ? { domain: cookieDomain } : {}),
    });

    // レガシー掃除
    for (const legacy of ["admin","admin_id","admin_role","session"]) {
      res.cookies.set(legacy, "", { path:"/", maxAge:0 });
      if (isProd) res.cookies.set(legacy, "", { path:"/", maxAge:0, domain: cookieDomain });
    }

    console.log("[login] success user=%s remember=%s domain=%s redirect=%s json=%s",
      maskUser(user.username), String(remember), isProd?cookieDomain:"(none)", safeNext, String(wantsJSON));

    return res;
  } catch (e:any) {
    console.log("[login] error: %s", e?.message || String(e));
    return back(req, wantsJSON, safeNext, "server", 500);
  }
}

function back(req: Request, wantsJSON: boolean, safeNext: string, code:"missing"|"invalid"|"server", status:number){
  if (wantsJSON) {
    const r = NextResponse.json({ ok:false, error: code }, { status }); r.headers.set("Cache-Control","no-store, max-age=0"); return r;
  }
  const u = new URL(req.url);
  const back = new URL(`/login?error=${code}&next=${encodeURIComponent(safeNext)}`, u);
  const r = NextResponse.redirect(back, 303); r.headers.set("Cache-Control","no-store, max-age=0"); return r;
}

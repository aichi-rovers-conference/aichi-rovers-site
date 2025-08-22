// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";

function deleteSessionCookie(res: NextResponse, req: Request) {
  const url = new URL(req.url);
  const host = url.hostname;                 // 例) "aichirovers.com" or "www.aichirovers.com"
  const apex = host.startsWith("www.") ? host.slice(4) : host; // "aichirovers.com"

  // まずは基本（nameだけ or path付き）を削除
  res.cookies.delete(COOKIE_NAME);
  res.cookies.delete({ name: COOKIE_NAME, path: "/" });

  // domain を付けて発行していた場合にも対応（オブジェクト“1個”で渡す）
  const candidates = new Set<string>([host, apex, `.${apex}`]);
  for (const d of candidates) {
    res.cookies.delete({ name: COOKIE_NAME, path: "/", domain: d });
  }
}

function buildRedirect(req: Request, next?: string | null) {
  const url = new URL(req.url);
  const to = new URL(next || "/?loggedOut=1", url.origin); // 絶対URL化
  return NextResponse.redirect(to, { status: 303 });
}

export async function POST(req: Request) {
  const next = new URL(req.url).searchParams.get("next");
  const res = buildRedirect(req, next);
  deleteSessionCookie(res, req);
  return res;
}

export async function GET(req: Request) {
  const next = new URL(req.url).searchParams.get("next");
  const res = buildRedirect(req, next);
  deleteSessionCookie(res, req);
  return res;
}

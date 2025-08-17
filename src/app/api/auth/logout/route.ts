// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next") || "/?loggedOut=1";

  const res = NextResponse.redirect(new URL(next, req.url), { status: 303 });
  // レスポンス側で削除（Set-Cookie に expire 付与）
  res.cookies.delete(COOKIE_NAME); // ※ Cookie を set した時の path/domain と合わせたい場合は第2引数で指定
  return res;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next") || "/?loggedOut=1";

  const res = NextResponse.redirect(new URL(next, req.url), { status: 303 });
  res.cookies.delete(COOKIE_NAME);
  return res;
}

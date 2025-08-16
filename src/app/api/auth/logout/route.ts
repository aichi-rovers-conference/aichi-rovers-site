// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME } from "@/lib/auth";

export async function POST(req: Request) {
  const jar = await cookies();
  jar.delete(COOKIE_NAME); // セッションCookieを削除

  const url = new URL(req.url);
  const next = url.searchParams.get("next") || "/?loggedOut=1";

  // 303 See Other で確実にGET遷移
  return NextResponse.redirect(new URL(next, req.url), { status: 303 });
}

// GET アクセスでも同様に動くようにしておくと便利（リンク遷移対応）
export async function GET(req: Request) {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);

  const url = new URL(req.url);
  const next = url.searchParams.get("next") || "/?loggedOut=1";
  return NextResponse.redirect(new URL(next, req.url), { status: 303 });
}

// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";

const COOKIE_NAME = "arc_session";
const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");
const isProd = process.env.NODE_ENV === "production";

type Payload = {
  id: number;
  username: string;
  role: "ADMIN" | "EDITOR" | "VIEWER" | string;
  remember?: boolean;
  exp?: number;
};

async function verify(token: string): Promise<Payload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as Payload;
  } catch {
    return null;
  }
}

// 公開で通したい /exec 配下のパス（未ログインでも表示OK）
const PUBLIC_EXEC_PATHS = [
  "/exec/meetings/qr/show", // QR配布・プレビュー用（?meeting=...&pid=...）
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // まずは /exec 内でも公開で通すパスを除外
  if (PUBLIC_EXEC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 保護対象: /exec と /polls/admin
  const needsAuth =
    pathname.startsWith("/exec") || pathname.startsWith("/polls/admin");
  if (!needsAuth) return NextResponse.next();

  // セッションクッキー確認
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("auth", "required");
    return NextResponse.redirect(url);
  }

  const payload = await verify(token);
  if (!payload) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("auth", "expired");
    return NextResponse.redirect(url);
  }

  // 権限チェック: /polls/admin は ADMIN or EDITOR のみ
  if (pathname.startsWith("/polls/admin")) {
    const role = String(payload.role || "");
    if (role !== "ADMIN" && role !== "EDITOR") {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("auth", "forbidden");
      return NextResponse.redirect(url);
    }
  }

  // スライディング延長: 期限が1日未満なら再発行
  const nowSec = Math.floor(Date.now() / 1000);
  const expSec = Number(payload.exp || 0);
  const needsRefresh = expSec > 0 && expSec - nowSec < 60 * 60 * 24; // < 1day
  const res = NextResponse.next();

  if (needsRefresh) {
    const remember = !!payload.remember;
    const expStr = remember ? "30d" : "8h";
    const refreshed = await new SignJWT({
      id: payload.id,
      username: payload.username,
      role: payload.role,
      remember,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(expStr)
      .sign(SECRET);

    res.cookies.set(COOKIE_NAME, refreshed, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: remember ? 60 * 60 * 24 * 30 : 60 * 60 * 8,
    });
  }

  return res;
}

export const config = {
  matcher: ["/exec/:path*", "/polls/admin/:path*"],
};

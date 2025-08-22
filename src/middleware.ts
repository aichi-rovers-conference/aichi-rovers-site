// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import { COOKIE_NAME } from "@/lib/auth";

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");
const isProd = process.env.NODE_ENV === "production";

const ISS = process.env.AUTH_ISSUER ?? "https://aichirovers.com";
const AUD = process.env.AUTH_AUDIENCE ?? "arc-web";

const CANONICAL_HOST = process.env.CANONICAL_HOST ?? "aichirovers.com";
const ALLOWED_HOSTS = new Set([CANONICAL_HOST, `www.${CANONICAL_HOST}`]);
const COOKIE_DOMAIN_DEFAULT = process.env.COOKIE_DOMAIN ?? `.${CANONICAL_HOST}`;

// 公開扱いにするパス（/exec の一部など）
const PUBLIC_EXEC_PATHS = ["/exec/meetings/qr/show"];

// “公開”判定（認可をかけない）
const ALWAYS_PUBLIC = (p: string) =>
  p.startsWith("/api/auth/login") ||
  p.startsWith("/api/auth/logout") ||
  p.startsWith("/p/") ||
  PUBLIC_EXEC_PATHS.some((s) => p.startsWith(s)) ||
  p === "/login" ||
  p === "/";

// ログイン/ログアウト API は全処理（正規化含む）をバイパス
function shouldBypassAll(req: NextRequest) {
  const p = req.nextUrl.pathname;
  return p.startsWith("/api/auth/login") || p.startsWith("/api/auth/logout");
}

function validateNext(n?: string | null) {
  if (!n) return null;
  return n.startsWith("/") && !n.startsWith("//") ? n : null;
}

export async function middleware(req: NextRequest) {
  // 0) /api/auth/login|logout は完全素通し
  if (shouldBypassAll(req)) {
    return NextResponse.next();
  }

  // 1) HTTPS/ホスト正規化（本番のみ）
  if (isProd) {
    const proto = (req.headers.get("x-forwarded-proto") || "").toLowerCase();
    const host = (req.headers.get("host") || "").toLowerCase();
    if (proto && proto !== "https") {
      const url = new URL(req.url);
      url.protocol = "https:";
      return NextResponse.redirect(url, 308);
    }
    if (host && !ALLOWED_HOSTS.has(host)) {
      const url = new URL(req.url);
      url.host = CANONICAL_HOST;
      return NextResponse.redirect(url, 308);
    }
  }

  const url = req.nextUrl;
  const { pathname, search } = url;

  // 2) 既ログインなら /login と / から /exec に誘導
  if (pathname === "/login" || pathname === "/") {
    const bypass = url.searchParams.get("home") === "1" || url.searchParams.get("noexec") === "1";
    if (!bypass) {
      const tokens = req.cookies
        .getAll()
        .filter((c) => c.name === COOKIE_NAME)
        .map((c) => c.value)
        .slice()
        .reverse();

      for (const token of tokens) {
        try {
          await jwtVerify(token, SECRET, {
            issuer: ISS,
            audience: AUD,
            clockTolerance: "60s",
          });
          const paramNext = url.searchParams.get("next");
          const dest = validateNext(paramNext) || "/exec";
          return NextResponse.redirect(new URL(dest, url), 303);
        } catch {
          // 検証失敗 → 次の候補へ
        }
      }
    }
  }

  // 3) 認可（/exec, /polls/admin）
  if (!ALWAYS_PUBLIC(pathname)) {
    const needsAuth = pathname.startsWith("/exec") || pathname.startsWith("/polls/admin");
    if (needsAuth) {
      const tokens = req.cookies
        .getAll()
        .filter((c) => c.name === COOKIE_NAME)
        .map((c) => c.value)
        .slice()
        .reverse();

      let payload: any | null = null;
      for (const token of tokens) {
        try {
          const { payload: pl } = await jwtVerify(token, SECRET, {
            issuer: ISS,
            audience: AUD,
            clockTolerance: "60s",
          });
          payload = pl;
          break;
        } catch {
          // 次へ
        }
      }

      // セッションなし → ログインへ（古いCookie掃除も同時に）
      if (!payload) {
        const back = new URL(`/login?next=${encodeURIComponent(pathname + search)}&auth=expired`, url);
        const res = NextResponse.redirect(back, 303);

        // host-only
        res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
        res.cookies.set("arc_session", "", { path: "/", maxAge: 0 });
        res.cookies.set("arc_session_v2", "", { path: "/", maxAge: 0 });

        // domain 付き（本番）
        if (isProd) {
          const kill = { path: "/", maxAge: 0, domain: COOKIE_DOMAIN_DEFAULT as string };
          res.cookies.set(COOKIE_NAME, "", kill);
          res.cookies.set("arc_session", "", kill);
          res.cookies.set("arc_session_v2", "", kill);
        }
        return res;
      }

      // 4) 残り < 1日ならスライディング延長
      const now = Math.floor(Date.now() / 1000);
      const exp = Number(payload.exp || 0);
      const needsRefresh = exp > 0 && exp - now < 60 * 60 * 24;

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
          .setIssuer(ISS)
          .setAudience(AUD)
          .setExpirationTime(expStr)
          .sign(SECRET);

        res.cookies.set(COOKIE_NAME, refreshed, {
          httpOnly: true,
          secure: isProd,
          sameSite: "lax",
          path: "/",
          maxAge: remember ? 60 * 60 * 24 * 30 : 60 * 60 * 8,
          ...(isProd ? { domain: COOKIE_DOMAIN_DEFAULT } : {}),
        });
      }
      return res;
    }
  }

  // 何もしない
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|images|public|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map)).*)",
  ],
};

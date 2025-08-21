// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";

/* ========= 基本定数 ========= */
const COOKIE_NAME = "arc_session";
const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");
const isProd = process.env.NODE_ENV === "production";

/* JWT 厳格化（/api・lib・middlewareで必ず同値） */
const ISS = process.env.AUTH_ISSUER ?? "https://aichirovers.com";
const AUD = process.env.AUTH_AUDIENCE ?? "arc-web";

/* ホスト正規化（www 許可） */
const CANONICAL_HOST = process.env.CANONICAL_HOST ?? "aichirovers.com";
const ALLOWED_HOSTS = new Set([CANONICAL_HOST, `www.${CANONICAL_HOST}`]);

/* Cookie domain（本番・正規ホスト系のみ付与） */
const COOKIE_DOMAIN_DEFAULT = `.${CANONICAL_HOST}`;

/* CSRF: 同一オリジン/サイトを許可 */
const ALLOWED_ORIGINS = new Set<string>([
  `https://${CANONICAL_HOST}`,
  `https://www.${CANONICAL_HOST}`,
  ...(process.env.EXTRA_ORIGINS?.split(",").map(s => s.trim()).filter(Boolean) ?? []),
]);

/* 公開で通すパス（/exec 配下の例外など） */
const PUBLIC_EXEC_PATHS = ["/exec/meetings/qr/show"];

/* ========= ユーティリティ ========= */
type Payload = {
  id: number;
  username: string;
  role: "ADMIN" | "EDITOR" | "VIEWER" | string;
  remember?: boolean;
  exp?: number;
};

async function verify(token: string): Promise<Payload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET, {
      issuer: ISS,
      audience: AUD,
      clockTolerance: "60s",
    });
    return payload as unknown as Payload;
  } catch {
    return null;
  }
}

/* Edge Runtime で動く nonce 生成（128bit） */
function genNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function buildCsp(nonce: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'strict-dynamic' 'nonce-${nonce}' https: 'report-sample'`,
    `style-src-elem 'self' 'nonce-${nonce}' https:`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "connect-src 'self' https: wss:",
    "media-src 'self' blob: https:",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

function setSecurityHeaders(req: NextRequest, res: NextResponse, nonce: string) {
  const csp = buildCsp(nonce);
  if (isProd) res.headers.set("Content-Security-Policy", csp);
  else res.headers.set("Content-Security-Policy-Report-Only", csp);

  const host = req.headers.get("host") ?? "";
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
  if (isProd && !isLocal) {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set(
    "Permissions-Policy",
    ["camera=()", "microphone=()", "geolocation=()", "payment=()", "usb=()", "bluetooth=()"].join(", ")
  );
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Cross-Origin-Resource-Policy", "same-site");
}

function isStateChangingMethod(m: string) {
  return m === "POST" || m === "PUT" || m === "PATCH" || m === "DELETE";
}

/* /api の状態変更メソッドに対する SameSite CSRF ガード */
function sameSiteCsrfGuard(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl;
  if (!(pathname.startsWith("/api") && isStateChangingMethod(req.method))) return null;

  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const sfs = (req.headers.get("sec-fetch-site") || "").toLowerCase();

  const fromAllowedOrigin =
    (!!origin && ALLOWED_ORIGINS.has(origin)) ||
    (!!referer && ALLOWED_ORIGINS.has(new URL(referer).origin));

  const fromSameSite = sfs === "" || sfs === "same-origin" || sfs === "same-site";

  if (fromAllowedOrigin || fromSameSite) return null;
  return new NextResponse("Forbidden (CSRF)", { status: 403 });
}

/* HTTPS 強制 & ホスト正規化 */
function httpsAndHostRedirect(req: NextRequest): NextResponse | null {
  if (!isProd) return null;

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

  return null;
}

/* ========= Middleware 本体 ========= */
export async function middleware(req: NextRequest) {
  // 1) HTTPS/ホスト正規化
  const hop = httpsAndHostRedirect(req);
  if (hop) return hop;

  const { pathname } = req.nextUrl;

  // 2) CSRF ガード
  const csrf = sameSiteCsrfGuard(req);
  if (csrf) return csrf;

  // 3) 認可（/exec と /polls/admin を保護。PUBLIC_EXEC_PATHS は免除）
  if (!PUBLIC_EXEC_PATHS.some((p) => pathname.startsWith(p))) {
    const needsAuth = pathname.startsWith("/exec") || pathname.startsWith("/polls/admin");
    if (needsAuth) {
      const token = req.cookies.get(COOKIE_NAME)?.value;
      if (!token) {
        const url = req.nextUrl.clone();
        url.pathname = "/login";                // 未ログイン → /login
        url.searchParams.set("next", pathname || "/exec");
        url.searchParams.set("auth", "required");
        return NextResponse.redirect(url);
      }

      const payload = await verify(token);
      if (!payload) {
        const url = req.nextUrl.clone();
        url.pathname = "/login";                // 期限切れ → /login
        url.searchParams.set("next", pathname || "/exec");
        url.searchParams.set("auth", "expired");
        return NextResponse.redirect(url);
      }

      // 4) スライディング延長（残り < 1日）
      const nowSec = Math.floor(Date.now() / 1000);
      const expSec = Number(payload.exp || 0);
      const needsRefresh = expSec > 0 && expSec - nowSec < 60 * 60 * 24;

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

        // Cookie の domain は本番・正規ホストの場合のみ付与（プレビュー/localhost を壊さない）
        const host = (req.headers.get("host") || "").toLowerCase();
        const shouldSetDomain =
          isProd &&
          !!host &&
          (host === CANONICAL_HOST || host === `www.${CANONICAL_HOST}` || host.endsWith(`.${CANONICAL_HOST}`));

        res.cookies.set(COOKIE_NAME, refreshed, {
          httpOnly: true,
          secure: isProd,
          sameSite: "lax",
          path: "/",
          maxAge: remember ? 60 * 60 * 24 * 30 : 60 * 60 * 8,
          ...(shouldSetDomain ? { domain: COOKIE_DOMAIN_DEFAULT } : {}),
        });
      }

      const nonce = genNonce();
      res.headers.set("x-csp-nonce", nonce);
      setSecurityHeaders(req, res, nonce);
      return res;
    }
  }

  // 5) 共通CSP/セキュリティヘッダ（全ページ）
  const res = NextResponse.next();
  const nonce = genNonce();
  res.headers.set("x-csp-nonce", nonce);
  setSecurityHeaders(req, res, nonce);
  return res;
}

/* ========= 適用範囲 ========= */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};

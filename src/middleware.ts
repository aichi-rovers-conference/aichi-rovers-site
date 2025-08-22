// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";

/* ========= 基本定数 ========= */
const COOKIE_NAME = "arc_session";
const SECRET_RAW = process.env.AUTH_SECRET || "dev-secret";
const SECRET = new TextEncoder().encode(SECRET_RAW);
const SECRET_SRC = process.env.AUTH_SECRET ? "env" : "default"; // ★ 既定値かどうか
const isProd = process.env.NODE_ENV === "production";

/* JWT 厳格化（/api・lib・middlewareで必ず同値） */
const ISS = process.env.AUTH_ISSUER ?? "https://aichirovers.com";
const AUD = process.env.AUTH_AUDIENCE ?? "arc-web";

/* ホスト正規化（www 許可） */
const CANONICAL_HOST = process.env.CANONICAL_HOST ?? "aichirovers.com";
const ALLOWED_HOSTS = new Set([CANONICAL_HOST, `www.${CANONICAL_HOST}`]);

/* Cookie domain（本番は常に付与して apex/www 共有） */
const COOKIE_DOMAIN_DEFAULT = `.${CANONICAL_HOST}`;

/* CSRF: 同一オリジン/サイトを許可 */
const ALLOWED_ORIGINS = new Set<string>([
  `https://${CANONICAL_HOST}`,
  `https://www.${CANONICAL_HOST}`,
  ...(process.env.EXTRA_ORIGINS?.split(",").map(s => s.trim()).filter(Boolean) ?? []),
]);

/* 公開で通すパス */
const PUBLIC_EXEC_PATHS = ["/exec/meetings/qr/show"];

/* 認証不要で常に素通しするパス（ログイン関連など） */
function isAlwaysPublic(pathname: string) {
  return (
    pathname === "/login" ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/p/") ||
    PUBLIC_EXEC_PATHS.some(p => pathname.startsWith(p))
  );
}

/* ========= ユーティリティ ========= */
type Payload = {
  id: number;
  username: string;
  role: "ADMIN" | "EDITOR" | "VIEWER" | string;
  remember?: boolean;
  exp?: number;
};

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
  res.headers.set("Permissions-Policy", ["camera=()", "microphone=()", "geolocation=()", "payment=()", "usb=()", "bluetooth=()"].join(", "));
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Cross-Origin-Resource-Policy", "same-site");
}

function isStateChangingMethod(m: string) {
  return m === "POST" || m === "PUT" || m === "PATCH" || m === "DELETE";
}

/* URL-safe Base64 → JSON（署名検証なしの“覗き”） */
function b64urlToJSON(b: string): any | null {
  try {
    let s = b.replace(/-/g, "+").replace(/_/g, "/");
    if (s.length % 4) s += "=".repeat(4 - (s.length % 4));
    const txt = atob(s);
    return JSON.parse(txt);
  } catch {
    return null;
  }
}
function peekJwt(token: string) {
  const parts = (token || "").split(".");
  const segs = parts.length;
  const header = segs >= 1 ? b64urlToJSON(parts[0]) : null;
  const payload = segs >= 2 ? b64urlToJSON(parts[1]) : null;
  return { segs, header, payload };
}

/* /api の状態変更メソッドに対する SameSite CSRF ガード */
function sameSiteCsrfGuard(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/auth/login")) return null; // ログインAPIは対象外
  if (!(pathname.startsWith("/api") && isStateChangingMethod(req.method))) return null;

  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const sfs = (req.headers.get("sec-fetch-site") || "").toLowerCase();

  const fromAllowedOrigin =
    (!!origin && ALLOWED_ORIGINS.has(origin)) ||
    (!!referer && ALLOWED_ORIGINS.has(new URL(referer).origin));

  const fromSameSite = sfs === "" || sfs === "same-origin" || sfs === "same-site";

  if (fromAllowedOrigin || fromSameSite) return null;

  console.log("[mw][csrf] blocked path=%s origin=%s referer=%s sfs=%s", pathname, origin, referer, sfs);
  return new NextResponse("Forbidden (CSRF)", { status: 403 });
}

/* HTTPS 強制 & ホスト正規化（最上流） */
function httpsAndHostRedirect(req: NextRequest): NextResponse | null {
  if (!isProd) return null;

  const proto = (req.headers.get("x-forwarded-proto") || "").toLowerCase();
  const host = (req.headers.get("host") || "").toLowerCase();

  if (proto && proto !== "https") {
    const url = new URL(req.url);
    url.protocol = "https:";
    console.log("[mw][redirect] force-https host=%s path=%s", host, url.pathname);
    return NextResponse.redirect(url, 308);
  }

  if (host && !ALLOWED_HOSTS.has(host)) {
    const url = new URL(req.url);
    console.log("[mw][redirect] host-normalize from=%s to=%s path=%s", host, CANONICAL_HOST, url.pathname);
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

  const url = req.nextUrl;
  const { pathname, search } = url;

  // 2) CSRF ガード
  const csrf = sameSiteCsrfGuard(req);
  if (csrf) return csrf;

  // 3) 認可（/exec と /polls/admin を保護）—公開/ログイン系は素通し
  if (!isAlwaysPublic(pathname)) {
    const needsAuth = pathname.startsWith("/exec") || pathname.startsWith("/polls/admin");
    if (needsAuth) {
      // 現在見えている arc_session の本数と末尾
      const cookieVals = req.cookies.getAll(COOKIE_NAME).map(c => c.value);
      const tails = cookieVals.map(v => (v ?? "").slice(-12));
      console.log("[mw][auth] path=%s host=%s cookies=%d tails=%j iss=%s aud=%s secret=%s",
        pathname, req.headers.get("host"), cookieVals.length, tails, ISS, AUD, SECRET_SRC);

      if (cookieVals.length === 0) {
        const back = new URL(`/login?next=${encodeURIComponent(pathname + search)}&auth=required`, url);
        console.log("[mw][auth] no-cookie -> 303 %s", back.pathname + back.search);
        return NextResponse.redirect(back, 303);
      }

      // 新しいものから順に検証
      let payload: Payload | null = null;
      for (const token of cookieVals.slice().reverse()) {
        try {
          const { payload: pl } = await jwtVerify(token, SECRET, {
            issuer: ISS,
            audience: AUD,
            clockTolerance: "60s",
          });
          payload = pl as unknown as Payload;
          break;
        } catch (err: any) {
          const peek = peekJwt(token);
          const exp = peek.payload?.exp ? new Date(peek.payload.exp * 1000).toISOString() : null;
          console.log("[mw][auth] verify fail name=%s msg=%s segs=%d peek.iss=%s peek.aud=%s peek.exp=%s",
            err?.name || "Err", String(err?.message || ""), peek.segs, peek.payload?.iss, peek.payload?.aud, exp);
        }
      }

      if (!payload) {
  const back = new URL(`/login?next=${encodeURIComponent(pathname + search)}&auth=expired`, url);
  const res = NextResponse.redirect(back, 303);

  // ★ 端末に残っている古い/壊れたCookieを確実に消す（host-only / domain 付き 両方）
  res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  if (isProd) {
    res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0, domain: COOKIE_DOMAIN_DEFAULT });
  }

  console.log("[mw][auth] all-invalid -> purge cookie & 303 %s", back.pathname + back.search);
  return res;
}

      // 残り < 1日ならスライディング延長
      const nowSec = Math.floor(Date.now() / 1000);
      const expSec = Number(payload.exp || 0);
      const needsRefresh = expSec > 0 && expSec - nowSec < 60 * 60 * 24;

      const res = NextResponse.next();

      if (needsRefresh) {
        const remember = !!payload.remember;
        const expStr = remember ? "30d" : "8h";

        const refreshed = await new SignJWT({
          id: (payload as any).id,
          username: (payload as any).username,
          role: (payload as any).role,
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

        console.log("[mw][auth] sliding-refresh remember=%s exp=%s", String(remember), expStr);
      }

      const nonce = genNonce();
      res.headers.set("x-csp-nonce", nonce);
      setSecurityHeaders(req, res, nonce);
      console.log("[mw][pass] %s", pathname);
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
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|images|public|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map)).*)",
  ],
};
